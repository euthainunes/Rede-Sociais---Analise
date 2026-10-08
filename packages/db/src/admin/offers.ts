/**
 * Ingestão de ofertas pelo admin (docs/07 §7.6): feed → normalização → matching → oferta ou fila humana.
 * Atualiza o rollup diário de preço das variantes afetadas.
 */
import { randomUUID } from "node:crypto";
import { matchListing, slugify, type MatchResult, type VariantCandidate } from "@veredito/core";
import { createAwinAdapter, createTemplateAdapter, type RawOffer } from "@veredito/integrations";
import type { Sql } from "../client.ts";
import { audit } from "./audit.ts";
import type { Staff } from "./auth.ts";
import { requirePermission, ValidationError } from "./catalog.ts";

export type FeedFormat = "planilha" | "awin";

function parseFeed(format: FeedFormat, content: string): RawOffer[] {
  const adapter = format === "awin"
    ? createAwinAdapter({ publisherId: "0", advertiserId: "0" })
    : createTemplateAdapter({ key: "planilha", fidelity: "aggregate", linkTemplate: "{url}", allowedHosts: [] });
  return adapter.parseFeed!(content);
}

export async function ensureMerchant(sql: Sql, staff: Staff, name: string, programKey: string | null = null): Promise<string> {
  const slug = slugify(name);
  const [m] = await sql<{ id: string }[]>`SELECT id FROM commerce.merchant WHERE slug = ${slug}`;
  if (m) return m.id;
  const id = randomUUID();
  await sql`INSERT INTO commerce.merchant (id, slug, name, kind, trust_score, program_key) VALUES (${id}, ${slug}, ${name.trim()}, 'retailer', 0.7, ${programKey})`;
  await audit(sql, staff, "merchant.create", { type: "merchant", id }, { after: { name, programKey } });
  return id;
}

async function variantCandidates(sql: Sql): Promise<VariantCandidate[]> {
  const rows = await sql<{ id: string; brand: string; model: string | null; name: string; gtin: string | null; mpn: string | null; axes: Record<string, string> }[]>`
    SELECT v.id, b.name AS brand, p.model, p.name, v.gtin, p.mpn, v.axes
    FROM catalog.product_variant v JOIN catalog.product p ON p.id = v.product_id JOIN catalog.brand b ON b.id = p.brand_id
    WHERE v.status = 'active' AND p.deleted_at IS NULL`;
  return rows.map((r) => ({ variantId: r.id, brand: r.brand, model: r.model || r.name.replace(r.brand, "").trim(), gtin: r.gtin, mpn: r.mpn, axes: r.axes }));
}

async function upsertOffer(sql: Sql, merchantId: string, sourceId: string, variantId: string, o: RawOffer, match: { status: "auto" | "confirmed"; confidence: number }) {
  const id = randomUUID();
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO commerce.offer (id, variant_id, merchant_id, seller_name, condition, external_id, title_raw, url_original,
      price_cash, price_installment, installments, price_list, shipping_cost, availability, match_status, match_confidence,
      source_id, last_checked_at)
    VALUES (${id}, ${variantId}, ${merchantId}, ${o.sellerName ?? ""}, ${o.condition}, ${o.externalId}, ${o.title}, ${o.url},
      ${o.priceCash}, ${o.priceInstallment ?? null}, ${o.installments ?? null}, ${o.priceList ?? null}, ${o.shippingCost ?? null},
      ${o.availability}, ${match.status}, ${match.confidence}, ${sourceId}, now())
    ON CONFLICT (merchant_id, external_id, seller_name, condition) DO UPDATE SET
      variant_id = EXCLUDED.variant_id, price_cash = EXCLUDED.price_cash, price_installment = EXCLUDED.price_installment,
      installments = EXCLUDED.installments, price_list = EXCLUDED.price_list, shipping_cost = EXCLUDED.shipping_cost,
      availability = EXCLUDED.availability, url_original = EXCLUDED.url_original, title_raw = EXCLUDED.title_raw,
      match_status = EXCLUDED.match_status, match_confidence = EXCLUDED.match_confidence, last_checked_at = now(), status = 'active'
    RETURNING id`;
  await sql`
    INSERT INTO pricing.price_observation (offer_id, variant_id, observed_at, price_cash, price_installment, price_list, shipping_cost, availability, source_id)
    VALUES (${row!.id}, ${variantId}, now(), ${o.priceCash}, ${o.priceInstallment ?? null}, ${o.priceList ?? null}, ${o.shippingCost ?? null}, ${o.availability}, ${sourceId})`;
  return row!.id;
}

/** Recalcula o ponto de hoje do histórico (menor, mediana e maior preço à vista entre ofertas ativas em estoque). */
export async function rollupToday(sql: Sql, variantIds: string[]): Promise<void> {
  if (variantIds.length === 0) return;
  await sql`
    INSERT INTO pricing.price_daily (variant_id, day, min_price, median_price, max_price, min_merchant_id, merchants_count, in_stock_count)
    SELECT o.variant_id, current_date,
      min(o.price_cash + coalesce(o.shipping_cost, 0)),
      percentile_cont(0.5) WITHIN GROUP (ORDER BY o.price_cash + coalesce(o.shipping_cost, 0)),
      max(o.price_cash + coalesce(o.shipping_cost, 0)),
      (array_agg(o.merchant_id ORDER BY o.price_cash + coalesce(o.shipping_cost, 0)))[1],
      count(DISTINCT o.merchant_id), count(*) FILTER (WHERE o.availability = 'in_stock')
    FROM commerce.offer o
    WHERE o.variant_id = ANY(${variantIds}::uuid[]) AND o.status = 'active' AND o.availability = 'in_stock'
      AND o.match_status IN ('auto','confirmed') AND o.price_cash IS NOT NULL
    GROUP BY o.variant_id
    ON CONFLICT (variant_id, day) DO UPDATE SET min_price = EXCLUDED.min_price, median_price = EXCLUDED.median_price,
      max_price = EXCLUDED.max_price, min_merchant_id = EXCLUDED.min_merchant_id,
      merchants_count = EXCLUDED.merchants_count, in_stock_count = EXCLUDED.in_stock_count`;
}

export interface ImportStats {
  total: number;
  auto: number;
  queued: number;
  invalid: number;
  runId: string;
}

export async function importFeed(
  sql: Sql,
  staff: Staff,
  input: { merchantName: string; programKey?: string | null; format: FeedFormat; content: string },
): Promise<ImportStats> {
  requirePermission(staff, "offers:write");
  if (input.content.length > 5_000_000) throw new ValidationError(["arquivo maior que 5 MB"]);
  const offers = parseFeed(input.format, input.content);
  if (offers.length === 0) throw new ValidationError(["nenhuma oferta reconhecida — confira o cabeçalho das colunas"]);
  const merchantId = await ensureMerchant(sql, staff, input.merchantName, input.programKey ?? null);
  const sourceName = `feed:${slugify(input.merchantName)}`;
  const [src] = await sql<{ id: string }[]>`SELECT id FROM ops.data_source WHERE name = ${sourceName}`;
  const sourceId = src?.id ?? randomUUID();
  if (!src) await sql`INSERT INTO ops.data_source (id, kind, name, base_confidence) VALUES (${sourceId}, 'affiliate_feed', ${sourceName}, 0.8)`;
  const runId = randomUUID();
  await sql`INSERT INTO ops.ingestion_run (id, source_id, job, started_at, status) VALUES (${runId}, ${sourceId}, 'admin_import', now(), 'running')`;

  const candidates = await variantCandidates(sql);
  const stats: ImportStats = { total: offers.length, auto: 0, queued: 0, invalid: 0, runId };
  const touched = new Set<string>();
  for (const o of offers) {
    if (o.priceCash == null || !/^https:\/\//.test(o.url)) {
      stats.invalid++;
      continue;
    }
    const { best, auto, alternatives } = matchListing({ title: o.title, gtin: o.gtin, mpn: o.mpn, brand: o.brand }, candidates);
    if (best && auto) {
      await upsertOffer(sql, merchantId, sourceId, best.variantId, o, { status: "auto", confidence: best.score });
      touched.add(best.variantId);
      stats.auto++;
    } else {
      const suggestions: MatchResult[] = [best, ...alternatives].filter((x): x is MatchResult => x != null);
      await sql`
        INSERT INTO ops.match_candidate (id, merchant_id, source_id, external_id, title_raw, url, payload, suggestions)
        VALUES (${randomUUID()}, ${merchantId}, ${sourceId}, ${o.externalId}, ${o.title}, ${o.url}, ${sql.json(o as never)}, ${sql.json(suggestions as never)})
        ON CONFLICT (merchant_id, external_id) DO UPDATE SET payload = EXCLUDED.payload, suggestions = EXCLUDED.suggestions,
          title_raw = EXCLUDED.title_raw, url = EXCLUDED.url, status = 'pending'`;
      stats.queued++;
    }
  }
  await rollupToday(sql, [...touched]);
  await sql`UPDATE ops.ingestion_run SET finished_at = now(), status = 'ok', stats = ${sql.json({ ...stats } as never)} WHERE id = ${runId}`;
  await audit(sql, staff, "offers.import", { type: "merchant", id: merchantId }, { after: stats });
  return stats;
}

export async function listMatchQueue(sql: Sql, limit = 50) {
  const rows = await sql<{ id: string; merchant: string; title_raw: string; url: string; payload: RawOffer; suggestions: MatchResult[]; created_at: Date }[]>`
    SELECT mc.id, m.name AS merchant, mc.title_raw, mc.url, mc.payload, mc.suggestions, mc.created_at
    FROM ops.match_candidate mc JOIN commerce.merchant m ON m.id = mc.merchant_id
    WHERE mc.status = 'pending' ORDER BY mc.created_at LIMIT ${limit}`;
  const ids = [...new Set(rows.flatMap((r) => r.suggestions.map((s) => s.variantId)))];
  const labels = ids.length
    ? await sql<{ id: string; label: string }[]>`
        SELECT v.id, p.name || ' — ' || v.label AS label FROM catalog.product_variant v JOIN catalog.product p ON p.id = v.product_id
        WHERE v.id = ANY(${ids}::uuid[])`
    : [];
  const byId = new Map(labels.map((l) => [l.id, l.label]));
  return rows.map((r) => ({ ...r, suggestions: r.suggestions.map((s) => ({ ...s, label: byId.get(s.variantId) ?? s.variantId })) }));
}

export async function decideMatch(sql: Sql, staff: Staff, candidateId: string, decision: { variantId: string } | "reject") {
  requirePermission(staff, "offers:write");
  const [c] = await sql<{ id: string; merchant_id: string; source_id: string; payload: RawOffer; status: string }[]>`
    SELECT * FROM ops.match_candidate WHERE id = ${candidateId}`;
  if (!c || c.status !== "pending") throw new ValidationError(["item já decidido ou inexistente"]);
  if (decision === "reject") {
    await sql`UPDATE ops.match_candidate SET status = 'rejected', decided_by = ${staff.id}, decided_at = now() WHERE id = ${candidateId}`;
    await audit(sql, staff, "match.reject", { type: "match_candidate", id: candidateId });
    return null;
  }
  const [v] = await sql`SELECT id FROM catalog.product_variant WHERE id = ${decision.variantId}`;
  if (!v) throw new ValidationError(["variante inexistente"]);
  const offerId = await upsertOffer(sql, c.merchant_id, c.source_id, decision.variantId, c.payload, { status: "confirmed", confidence: 1 });
  await sql`UPDATE ops.match_candidate SET status = 'accepted', decided_by = ${staff.id}, decided_at = now() WHERE id = ${candidateId}`;
  await rollupToday(sql, [decision.variantId]);
  await audit(sql, staff, "match.accept", { type: "match_candidate", id: candidateId }, { after: { variantId: decision.variantId, offerId } });
  return offerId;
}

export async function listVariantsForPicker(sql: Sql) {
  return sql<{ id: string; label: string }[]>`
    SELECT v.id, p.name || ' — ' || v.label AS label FROM catalog.product_variant v
    JOIN catalog.product p ON p.id = v.product_id WHERE p.deleted_at IS NULL ORDER BY p.name, v.label`;
}
