/**
 * Conversões e comissões (docs/13 §13.6) + atribuição (docs/12 §12.6).
 *
 * - Idempotente: (programa, id externo) é único; reimportar atualiza status/valor e registra a mudança.
 * - Atribuição pelo nível de fidelidade do programa:
 *     click_ref  → a venda é do clique exato (sub-ID devolvido pelo programa)
 *     tag        → a venda é dividida entre os cliques daquele programa dentro da janela do cookie
 *     aggregate  → idem, marcada como "allocated"
 * - Jornada: cada clique atribuído guarda as sessões do visitante nos 30 dias anteriores (com consentimento),
 *   para comparar primeiro toque, último toque, linear e por posição sem recalcular nada.
 * - Só administrador e comercial leem ou escrevem (firewall comercial).
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  createAwinAdapter,
  createTemplateAdapter,
  PROGRAMS,
  type CommissionStatus,
  type RawConversion,
} from "@veredito/integrations";
import {
  ATTRIBUTION_MODELS, classifyChannel, JOURNEY_LOOKBACK_DAYS, JOURNEY_MAX_TOUCHES, type AttributionModel,
} from "@veredito/core";
import type { Sql } from "../client.ts";
import { audit } from "../admin/audit.ts";
import type { Staff } from "../admin/auth.ts";
import { requirePermission, ValidationError } from "../admin/catalog.ts";

export type ConversionFormat = "planilha" | "awin";

const STATUS_ORDER: CommissionStatus[] = ["estimated", "validating", "approved", "invoiced", "paid"];

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  estimated: "Estimada",
  validating: "Em validação",
  approved: "Aprovada",
  invoiced: "Faturada",
  paid: "Paga",
  reversed: "Estornada",
};

/** Transições válidas: só avança, ou estorna. Relatórios do programa às vezes chegam fora de ordem → ignora retrocesso. */
export function nextStatus(current: CommissionStatus | null, incoming: CommissionStatus): CommissionStatus | null {
  if (!current) return incoming;
  if (current === incoming) return null;
  if (incoming === "reversed") return "reversed";
  if (current === "reversed") return null;
  return STATUS_ORDER.indexOf(incoming) > STATUS_ORDER.indexOf(current) ? incoming : null;
}

function parseConversions(format: ConversionFormat, content: string): RawConversion[] {
  if (format === "awin") return createAwinAdapter({ publisherId: "0", advertiserId: "0" }).parseConversions!(content);
  return createTemplateAdapter({
    key: "planilha", fidelity: "tag", linkTemplate: "{url}", allowedHosts: [],
    statusMap: {
      estimada: "estimated", pendente: "validating", "em validação": "validating", validando: "validating",
      aprovada: "approved", aprovado: "approved", faturada: "invoiced", paga: "paid", pago: "paid",
      cancelada: "reversed", cancelado: "reversed", estornada: "reversed", recusada: "reversed",
    },
  }).parseConversions!(content);
}

/** Garante a linha do programa (chave do registro em código). */
export async function ensureProgram(sql: Sql, key: string): Promise<{ id: string; fidelity: "click" | "tag" | "aggregate"; cookieHours: number }> {
  const def = PROGRAMS.find((p) => p.key === key);
  const fidelity = def?.fidelity ?? (key === "demo" ? "click" : "tag");
  const cookieHours = def?.cookieWindowHours ?? 24;
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO commerce.affiliate_program (id, key, network, attribution_fidelity, cookie_window_hours, terms)
    VALUES (${randomUUID()}, ${key}, ${key}, ${fidelity}, ${cookieHours}, ${sql.json((def?.terms ?? {}) as never)})
    ON CONFLICT (key) DO UPDATE SET attribution_fidelity = EXCLUDED.attribution_fidelity, cookie_window_hours = EXCLUDED.cookie_window_hours
    RETURNING id`;
  return { id: row!.id, fidelity, cookieHours };
}

function toTimestamp(raw: string): Date {
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  const d = br ? new Date(`${br[3]}-${br[2]}-${br[1]}T${br[4] ?? "12"}:${br[5] ?? "00"}:00-03:00`) : new Date(raw);
  if (Number.isNaN(d.getTime())) throw new ValidationError([`data inválida: "${raw}"`]);
  return d;
}

/** Recalcula a atribuição de uma conversão (apaga e regrava os pesos). */
async function attribute(sql: Sql, conversionId: string, programKey: string, c: { clickRef: string | null; orderedAt: Date }, cookieHours: number) {
  await sql`DELETE FROM commerce.conversion_attribution WHERE conversion_id = ${conversionId}`;
  type ClickRow = { click_ref: string; product_id: string; source_path: string | null; page_type: string | null; cta_id: string | null; channel: string | null };
  const cols = sql`click_ref, product_id, source_path, page_type, cta_id, coalesce(utm->>'utm_source', 'site') AS channel`;
  if (c.clickRef) {
    const [click] = await sql<ClickRow[]>`SELECT ${cols} FROM analytics.click WHERE click_ref = ${c.clickRef} AND NOT is_bot LIMIT 1`;
    if (click) {
      await sql`
        INSERT INTO commerce.conversion_attribution (conversion_id, click_ref, product_id, source_path, page_type, cta_id, channel, weight, method)
        VALUES (${conversionId}, ${click.click_ref}, ${click.product_id}, ${click.source_path}, ${click.page_type}, ${click.cta_id}, ${click.channel}, 1, 'click_ref')`;
      return "click_ref" as const;
    }
  }
  const since = new Date(c.orderedAt.getTime() - cookieHours * 3_600_000);
  const clicks = await sql<ClickRow[]>`
    SELECT ${cols} FROM analytics.click
    WHERE program_key = ${programKey} AND NOT is_bot AND ts BETWEEN ${since} AND ${c.orderedAt}
    ORDER BY ts DESC LIMIT 500`;
  if (clicks.length === 0) {
    await sql`INSERT INTO commerce.conversion_attribution (conversion_id, weight, method) VALUES (${conversionId}, 1, 'unattributed')`;
    return "allocated" as const;
  }
  const w = Math.round((1 / clicks.length) * 1e6) / 1e6;
  for (const k of clicks) {
    await sql`
      INSERT INTO commerce.conversion_attribution (conversion_id, click_ref, product_id, source_path, page_type, cta_id, channel, weight, method)
      VALUES (${conversionId}, ${k.click_ref}, ${k.product_id}, ${k.source_path}, ${k.page_type}, ${k.cta_id}, ${k.channel}, ${w}, 'allocated')`;
  }
  return "allocated" as const;
}

/**
 * Grava a jornada de cada clique atribuído: sessões do mesmo visitante (cookie "aid") iniciadas até o clique,
 * nos últimos 30 dias, no máximo as 20 mais recentes. Sem sessões (sem consentimento), um único ponto com o
 * canal deduzido do UTM do clique — assim os totais por canal batem em todos os modelos.
 */
export async function buildJourneys(sql: Sql, conversionId: string) {
  await sql`DELETE FROM commerce.conversion_touchpoint WHERE conversion_id = ${conversionId}`;
  await sql`
    WITH a AS (
      SELECT click_ref, weight FROM commerce.conversion_attribution WHERE conversion_id = ${conversionId} AND click_ref IS NOT NULL
    ), ck AS (
      SELECT DISTINCT ON (c.click_ref) c.click_ref, c.anon_id, c.ts, a.weight
      FROM analytics.click c JOIN a ON a.click_ref = c.click_ref
      WHERE c.anon_id IS NOT NULL AND NOT c.is_bot ORDER BY c.click_ref, c.ts
    ), s AS (
      SELECT ck.click_ref, ck.weight, se.id, se.channel, se.utm_source, se.utm_campaign, se.landing_path, se.started_at,
             row_number() OVER (PARTITION BY ck.click_ref ORDER BY se.started_at DESC) AS recent
      FROM ck JOIN analytics.session se ON se.anon_id = ck.anon_id AND NOT se.is_bot
        AND se.started_at <= ck.ts AND se.started_at > ck.ts - make_interval(days => ${JOURNEY_LOOKBACK_DAYS})
    ), kept AS (SELECT * FROM s WHERE recent <= ${JOURNEY_MAX_TOUCHES})
    INSERT INTO commerce.conversion_touchpoint
      (conversion_id, click_ref, click_weight, idx, n, session_id, channel, utm_source, utm_campaign, landing_path, started_at)
    SELECT ${conversionId}, click_ref, weight,
           row_number() OVER (PARTITION BY click_ref ORDER BY started_at), count(*) OVER (PARTITION BY click_ref),
           id, coalesce(channel, 'direct'), utm_source, utm_campaign, landing_path, started_at
    FROM kept`;
  // Cliques sem jornada (e a venda sem clique) viram um ponto único.
  const rest = await sql<{ click_ref: string | null; weight: string; utm: Record<string, string> | null }[]>`
    SELECT a.click_ref, a.weight, (SELECT c.utm FROM analytics.click c WHERE c.click_ref = a.click_ref LIMIT 1) AS utm
    FROM commerce.conversion_attribution a
    WHERE a.conversion_id = ${conversionId}
      AND NOT EXISTS (SELECT 1 FROM commerce.conversion_touchpoint t WHERE t.conversion_id = a.conversion_id AND t.click_ref IS NOT DISTINCT FROM a.click_ref)`;
  if (rest.length === 0) return;
  const rows = rest.map((r) => ({
    conversion_id: conversionId, click_ref: r.click_ref, click_weight: r.weight, idx: 1, n: 1,
    channel: r.click_ref === null ? "unattributed"
      : r.utm?.utm_source || r.utm?.utm_medium ? classifyChannel({ utmSource: r.utm.utm_source, utmMedium: r.utm.utm_medium, siteHost: "" })
      : "unknown",
    utm_source: r.utm?.utm_source ?? null, utm_campaign: r.utm?.utm_campaign ?? null,
  }));
  await sql`INSERT INTO commerce.conversion_touchpoint ${sql(rows, "conversion_id", "click_ref", "click_weight", "idx", "n", "channel", "utm_source", "utm_campaign")}`;
}

export interface ConversionImportStats {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  invalid: number;
  exactAttribution: number;
}

/** Grava uma conversão (idempotente) e sua comissão. `actor = null` = sistema (webhook). */
export async function upsertConversion(sql: Sql, actor: Staff | null, programKey: string, c: RawConversion): Promise<"created" | "updated" | "unchanged"> {
  const program = await ensureProgram(sql, programKey);
  const orderedAt = toTimestamp(c.orderedAt);
  return sql.begin(async (tx) => {
    const t = tx as unknown as Sql;
    const [existing] = await tx<{ id: string; status: CommissionStatus; amount: string }[]>`
      SELECT cv.id, cm.status, cm.amount FROM commerce.conversion cv JOIN commerce.commission cm ON cm.conversion_id = cv.id
      WHERE cv.program_id = ${program.id} AND cv.external_id = ${c.externalId} FOR UPDATE OF cm`;
    if (!existing) {
      const id = randomUUID();
      const method = await (async () => {
        await tx`
          INSERT INTO commerce.conversion (id, program_id, external_id, click_ref, tracking_tag, ordered_at, order_value, attribution_method, raw)
          VALUES (${id}, ${program.id}, ${c.externalId}, ${c.clickRef}, ${c.trackingTag}, ${orderedAt}, ${c.orderValue}, 'allocated', ${tx.json(c.raw as never)})`;
        const m = await attribute(t, id, programKey, { clickRef: c.clickRef, orderedAt }, program.cookieHours);
        await buildJourneys(t, id);
        return m;
      })();
      await tx`UPDATE commerce.conversion SET attribution_method = ${method === "click_ref" ? "click_ref" : program.fidelity === "tag" ? "tag" : "allocated"} WHERE id = ${id}`;
      const commissionId = randomUUID();
      await tx`INSERT INTO commerce.commission (id, conversion_id, amount, status) VALUES (${commissionId}, ${id}, ${c.commission}, ${c.status})`;
      await tx`INSERT INTO commerce.commission_status_history (id, commission_id, from_status, to_status, amount, reason, actor)
               VALUES (${randomUUID()}, ${commissionId}, NULL, ${c.status}, ${c.commission}, 'importação', ${actor?.email ?? "sistema"})`;
      return "created";
    }
    const to = nextStatus(existing.status, c.status);
    const amountChanged = Math.abs(Number(existing.amount) - c.commission) >= 0.01;
    if (!to && !amountChanged) return "unchanged";
    const newStatus = to ?? existing.status;
    await tx`UPDATE commerce.commission SET status = ${newStatus}, amount = ${c.commission}, updated_at = now() WHERE conversion_id = ${existing.id}`;
    const [cm] = await tx<{ id: string }[]>`SELECT id FROM commerce.commission WHERE conversion_id = ${existing.id}`;
    await tx`INSERT INTO commerce.commission_status_history (id, commission_id, from_status, to_status, amount, reason, actor)
             VALUES (${randomUUID()}, ${cm!.id}, ${existing.status}, ${newStatus}, ${c.commission}, ${amountChanged ? "valor ajustado pelo programa" : "status atualizado"}, ${actor?.email ?? "sistema"})`;
    return "updated";
  });
}

export async function importConversions(
  sql: Sql,
  staff: Staff,
  input: { programKey: string; format: ConversionFormat; content: string },
): Promise<ConversionImportStats> {
  requirePermission(staff, "commission:read");
  if (input.content.length > 5_000_000) throw new ValidationError(["arquivo maior que 5 MB"]);
  if (!input.programKey) throw new ValidationError(["escolha o programa"]);
  const rows = parseConversions(input.format, input.content);
  if (rows.length === 0) throw new ValidationError(["nenhuma conversão reconhecida — confira o cabeçalho das colunas"]);
  const stats: ConversionImportStats = { total: rows.length, created: 0, updated: 0, unchanged: 0, invalid: 0, exactAttribution: 0 };
  for (const r of rows) {
    if (!r.externalId || !Number.isFinite(r.commission) || r.commission < 0) {
      stats.invalid++;
      continue;
    }
    try {
      stats[await upsertConversion(sql, staff, input.programKey, r)]++;
    } catch (e) {
      if (e instanceof ValidationError) stats.invalid++;
      else throw e;
    }
  }
  const [x] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM commerce.conversion cv JOIN commerce.affiliate_program p ON p.id = cv.program_id
    WHERE p.key = ${input.programKey} AND cv.attribution_method = 'click_ref'`;
  stats.exactAttribution = x!.n;
  await audit(sql, staff, "conversions.import", { type: "affiliate_program", id: null }, { after: { programKey: input.programKey, ...stats } });
  return stats;
}

/**
 * Postback de rede (webhook): corpo JSON assinado com HMAC-SHA256 no cabeçalho `x-signature` (hex),
 * segredo por rede em `POSTBACK_SECRET_<REDE>`. Aceita um objeto ou uma lista.
 */
export function verifyPostbackSignature(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !signature) return false;
  const want = createHmac("sha256", secret).update(rawBody).digest();
  let got: Buffer;
  try {
    got = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  } catch {
    return false;
  }
  return got.length === want.length && timingSafeEqual(got, want);
}

export function postbackToConversions(body: unknown): RawConversion[] {
  const list = Array.isArray(body) ? body : [body];
  return list.slice(0, 500).flatMap((b): RawConversion[] => {
    if (!b || typeof b !== "object") return [];
    const o = b as Record<string, unknown>;
    const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : typeof o[k] === "number" ? String(o[k]) : "");
    const status = s("status").toLowerCase();
    const map: Record<string, CommissionStatus> = { pending: "validating", approved: "approved", declined: "reversed", paid: "paid", invoiced: "invoiced" };
    if (!s("transaction_id")) return [];
    return [{
      externalId: s("transaction_id"), clickRef: s("click_ref") || null, trackingTag: s("tag") || null, orderedAt: s("date") || new Date().toISOString(),
      orderValue: Number(s("sale_amount")) || 0, commission: Number(s("commission")) || 0, status: map[status] ?? "estimated",
      raw: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])),
    }];
  });
}

// ───────────────────────── Relatórios (painel Receita)

export type RevenueDimension = "source_path" | "product" | "page_type" | "cta_id" | "channel" | "merchant";

export async function revenueSummary(sql: Sql, staff: Staff, days = 30) {
  requirePermission(staff, "commission:read");
  const since = new Date(Date.now() - days * 86_400_000);
  const byStatus = await sql<{ status: CommissionStatus; n: number; amount: number }[]>`
    SELECT cm.status, count(*)::int AS n, coalesce(sum(cm.amount), 0)::float AS amount
    FROM commerce.commission cm JOIN commerce.conversion cv ON cv.id = cm.conversion_id
    WHERE cv.ordered_at >= ${since} GROUP BY cm.status`;
  const [clicks] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM analytics.click WHERE ts >= ${since} AND NOT is_bot`;
  const [attr] = await sql<{ exact: number; total: number }[]>`
    SELECT coalesce(sum(cm.amount) FILTER (WHERE cv.attribution_method = 'click_ref'), 0)::float AS exact, coalesce(sum(cm.amount), 0)::float AS total
    FROM commerce.commission cm JOIN commerce.conversion cv ON cv.id = cm.conversion_id
    WHERE cv.ordered_at >= ${since} AND cm.status <> 'reversed'`;
  const valid = byStatus.filter((s) => s.status !== "reversed").reduce((a, s) => a + s.amount, 0);
  const orders = byStatus.filter((s) => s.status !== "reversed").reduce((a, s) => a + s.n, 0);
  return {
    days,
    byStatus,
    commission: Math.round(valid * 100) / 100,
    orders,
    clicks: clicks!.n,
    epc: clicks!.n ? Math.round((valid / clicks!.n) * 100) / 100 : null,
    exactShare: attr!.total ? attr!.exact / attr!.total : null,
  };
}

/** Comissão atribuída por dimensão (último clique), com cliques e EPC da mesma dimensão no período. */
export async function revenueBy(sql: Sql, staff: Staff, dim: RevenueDimension, days = 30, limit = 20) {
  requirePermission(staff, "commission:read");
  const since = new Date(Date.now() - days * 86_400_000);
  const keyA = {
    source_path: sql`coalesce(a.source_path, '(sem página)')`,
    product: sql`coalesce(p.name, '(sem produto)')`,
    page_type: sql`coalesce(a.page_type, '(desconhecido)')`,
    cta_id: sql`coalesce(a.cta_id, '(sem CTA)')`,
    channel: sql`coalesce(a.channel, '(desconhecido)')`,
    merchant: sql`coalesce(m.name, '(desconhecida)')`,
  }[dim];
  const keyC = {
    source_path: sql`coalesce(c.source_path, '(sem página)')`,
    product: sql`coalesce(p.name, '(sem produto)')`,
    page_type: sql`coalesce(c.page_type, '(desconhecido)')`,
    cta_id: sql`coalesce(c.cta_id, '(sem CTA)')`,
    channel: sql`coalesce(c.utm->>'utm_source', 'site')`,
    merchant: sql`coalesce(m.name, '(desconhecida)')`,
  }[dim];
  return sql<{ key: string; commission: number; orders: number; clicks: number; epc: number | null }[]>`
    WITH rev AS (
      SELECT ${keyA} AS key, sum(cm.amount * a.weight)::float AS commission, sum(a.weight)::float AS orders
      FROM commerce.conversion_attribution a
      JOIN commerce.conversion cv ON cv.id = a.conversion_id
      JOIN commerce.commission cm ON cm.conversion_id = cv.id
      LEFT JOIN catalog.product p ON p.id = a.product_id
      LEFT JOIN analytics.click ck ON ck.click_ref = a.click_ref
      LEFT JOIN commerce.merchant m ON m.id = ck.merchant_id
      WHERE cv.ordered_at >= ${since} AND cm.status <> 'reversed'
      GROUP BY 1
    ), clk AS (
      SELECT ${keyC} AS key, count(*)::int AS clicks
      FROM analytics.click c LEFT JOIN catalog.product p ON p.id = c.product_id LEFT JOIN commerce.merchant m ON m.id = c.merchant_id
      WHERE c.ts >= ${since} AND NOT c.is_bot GROUP BY 1
    )
    SELECT coalesce(rev.key, clk.key) AS key, round(coalesce(rev.commission, 0)::numeric, 2)::float AS commission,
           round(coalesce(rev.orders, 0)::numeric, 2)::float AS orders, coalesce(clk.clicks, 0) AS clicks,
           CASE WHEN coalesce(clk.clicks, 0) > 0 THEN round((coalesce(rev.commission, 0) / clk.clicks)::numeric, 2)::float END AS epc
    FROM rev FULL JOIN clk ON clk.key = rev.key
    ORDER BY commission DESC, clicks DESC LIMIT ${limit}`;
}

/** Peso do modelo para o ponto (idx, n), em SQL — espelha `touchWeights` do core (testado contra ele). */
function modelWeight(sql: Sql, model: AttributionModel) {
  switch (model) {
    case "last": return sql`CASE WHEN t.idx = t.n THEN 1 ELSE 0 END`;
    case "first": return sql`CASE WHEN t.idx = 1 THEN 1 ELSE 0 END`;
    case "linear": return sql`1.0 / t.n`;
    case "position": return sql`CASE WHEN t.n = 1 THEN 1 WHEN t.n = 2 THEN 0.5 WHEN t.idx = 1 OR t.idx = t.n THEN 0.4 ELSE 0.2 / (t.n - 2) END`;
  }
}

export type ChannelAttributionRow = { channel: string } & Record<AttributionModel, number>;

/** Comissão por canal de aquisição em cada modelo de atribuição, mais a cobertura de jornada. */
export async function revenueByJourney(sql: Sql, staff: Staff, days = 30) {
  requirePermission(staff, "commission:read");
  const since = new Date(Date.now() - days * 86_400_000);
  const cols = ATTRIBUTION_MODELS.map((m) => sql`round(sum(cm.amount * t.click_weight * (${modelWeight(sql, m)}))::numeric, 2)::float AS ${sql(m)}`);
  const rows = await sql<ChannelAttributionRow[]>`
    SELECT t.channel, ${cols.reduce((a, c) => sql`${a}, ${c}`)}
    FROM commerce.conversion_touchpoint t
    JOIN commerce.conversion cv ON cv.id = t.conversion_id
    JOIN commerce.commission cm ON cm.conversion_id = cv.id
    WHERE cv.ordered_at >= ${since} AND cm.status <> 'reversed'
    GROUP BY t.channel ORDER BY 2 DESC, 1`;
  const [cov] = await sql<{ conversions: number; with_journey: number; avg_touches: number | null }[]>`
    SELECT count(DISTINCT cv.id)::int AS conversions,
           count(DISTINCT cv.id) FILTER (WHERE t.session_id IS NOT NULL)::int AS with_journey,
           (avg(t.n) FILTER (WHERE t.session_id IS NOT NULL AND t.idx = 1))::float AS avg_touches
    FROM commerce.conversion cv JOIN commerce.commission cm ON cm.conversion_id = cv.id
    LEFT JOIN commerce.conversion_touchpoint t ON t.conversion_id = cv.id
    WHERE cv.ordered_at >= ${since} AND cm.status <> 'reversed'`;
  return { rows, conversions: cov!.conversions, withJourney: cov!.with_journey, avgTouches: cov!.avg_touches };
}

export async function recentConversions(sql: Sql, staff: Staff, limit = 30) {
  requirePermission(staff, "commission:read");
  return sql<{ id: string; program: string; external_id: string; ordered_at: Date; order_value: string; amount: string; status: CommissionStatus; attribution_method: string; source_path: string | null; history: { to: CommissionStatus; at: string }[] }[]>`
    SELECT cv.id, p.key AS program, cv.external_id, cv.ordered_at, cv.order_value, cm.amount, cm.status, cv.attribution_method,
      (SELECT a.source_path FROM commerce.conversion_attribution a WHERE a.conversion_id = cv.id ORDER BY a.weight DESC LIMIT 1) AS source_path,
      (SELECT json_agg(json_build_object('to', h.to_status, 'at', h.created_at) ORDER BY h.created_at)
         FROM commerce.commission_status_history h WHERE h.commission_id = cm.id) AS history
    FROM commerce.conversion cv JOIN commerce.commission cm ON cm.conversion_id = cv.id
    JOIN commerce.affiliate_program p ON p.id = cv.program_id
    ORDER BY cv.ordered_at DESC LIMIT ${limit}`;
}
