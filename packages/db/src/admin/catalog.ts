/** Operações de catálogo do admin: produtos, variantes e specs com proveniência. */
import { randomUUID } from "node:crypto";
import { getCategory, slugify, validateSpecs, type Specs } from "@veredito/core";
import type { Sql } from "../client.ts";
import { audit } from "./audit.ts";
import type { Staff } from "./auth.ts";
import { can, ForbiddenError, type Permission } from "./rbac.ts";

export function requirePermission(staff: Staff, p: Permission): void {
  if (!can(staff.role, p)) throw new ForbiddenError(p);
}

export class ValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join("; "));
    this.issues = issues;
  }
}

export type SpecSourceKind = "manufacturer" | "editorial_test" | "manual" | "benchmark";

export interface ProductInput {
  id?: string | null;
  category: string;
  brand: string;
  name: string;
  model?: string | null;
  slug?: string | null;
  releaseDate?: string | null;
  summary: string;
  editorial: { forWho: string[]; notForWho: string[]; pros: string[]; cons: string[] };
  specs: Specs;
  publishStatus: "draft" | "published";
  specSource: { kind: SpecSourceKind; url?: string | null };
}

const SOURCE_CONFIDENCE: Record<SpecSourceKind, number> = { editorial_test: 0.95, manufacturer: 0.9, benchmark: 0.85, manual: 0.7 };

async function ensureSource(sql: Sql, kind: SpecSourceKind): Promise<string> {
  const name = `admin:${kind}`;
  const [row] = await sql<{ id: string }[]>`SELECT id FROM ops.data_source WHERE name = ${name}`;
  if (row) return row.id;
  const id = randomUUID();
  await sql`INSERT INTO ops.data_source (id, kind, name, base_confidence) VALUES (${id}, ${kind === "benchmark" ? "benchmark" : kind}, ${name}, ${SOURCE_CONFIDENCE[kind]})`;
  return id;
}

async function ensureBrand(sql: Sql, name: string): Promise<string> {
  const slug = slugify(name);
  const [row] = await sql<{ id: string }[]>`SELECT id FROM catalog.brand WHERE slug = ${slug}`;
  if (row) return row.id;
  const id = randomUUID();
  await sql`INSERT INTO catalog.brand (id, slug, name) VALUES (${id}, ${slug}, ${name.trim()})`;
  return id;
}

export type ProductListFilter = "ativos" | "publicados" | "rascunhos" | "arquivados" | "demo" | "reais";

export async function listProductsAdmin(sql: Sql, opts: { q?: string | null; filter?: ProductListFilter | null } = {}) {
  const q = opts.q?.trim();
  const f = opts.filter ?? "ativos";
  const where = {
    ativos: sql`AND p.publish_status <> 'archived'`,
    publicados: sql`AND p.publish_status = 'published'`,
    rascunhos: sql`AND p.publish_status = 'draft'`,
    arquivados: sql`AND p.publish_status = 'archived'`,
    demo: sql`AND p.is_demo`,
    reais: sql`AND NOT p.is_demo`,
  }[f] ?? sql``;
  return sql<{ id: string; slug: string; name: string; brand: string; category: string; publish_status: string; is_demo: boolean; variants: number; offers: number; reviews: number; updated_at: Date }[]>`
    SELECT p.id, p.slug, p.name, b.name AS brand, c.slug AS category, p.publish_status, p.is_demo, p.updated_at,
      (SELECT count(*)::int FROM catalog.product_variant v WHERE v.product_id = p.id AND v.status = 'active') AS variants,
      (SELECT count(*)::int FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id
         WHERE v.product_id = p.id AND o.status = 'active') AS offers,
      (SELECT count(*)::int FROM editorial.content_product cp JOIN editorial.content ec ON ec.id = cp.content_id
         WHERE cp.product_id = p.id AND ec.type = 'review') AS reviews
    FROM catalog.product p JOIN catalog.brand b ON b.id = p.brand_id JOIN catalog.category c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL ${where} ${q ? sql`AND (p.name ILIKE ${"%" + q + "%"} OR b.name ILIKE ${"%" + q + "%"})` : sql``}
    ORDER BY p.updated_at DESC LIMIT 200`;
}

/** Contagens para as abas da lista de produtos. */
export async function productCounts(sql: Sql) {
  const [r] = await sql<{ ativos: number; publicados: number; rascunhos: number; arquivados: number; demo: number; reais: number; demo_no_ar: number }[]>`
    SELECT count(*) FILTER (WHERE publish_status <> 'archived')::int AS ativos,
           count(*) FILTER (WHERE publish_status = 'published')::int AS publicados,
           count(*) FILTER (WHERE publish_status = 'draft')::int AS rascunhos,
           count(*) FILTER (WHERE publish_status = 'archived')::int AS arquivados,
           count(*) FILTER (WHERE is_demo)::int AS demo,
           count(*) FILTER (WHERE NOT is_demo)::int AS reais,
           count(*) FILTER (WHERE is_demo AND publish_status <> 'archived')::int AS demo_no_ar
    FROM catalog.product WHERE deleted_at IS NULL`;
  return r!;
}

export async function getProductAdmin(sql: Sql, id: string) {
  const [p] = await sql`
    SELECT p.*, b.name AS brand, c.slug AS category FROM catalog.product p
    JOIN catalog.brand b ON b.id = p.brand_id JOIN catalog.category c ON c.id = p.category_id
    WHERE p.id = ${id} AND p.deleted_at IS NULL`;
  if (!p) return null;
  const variants = await sql<{ id: string; slug: string; label: string; axes: { storage?: string; color?: string }; gtin: string | null; status: string; is_default: boolean }[]>`
    SELECT id, slug, label, axes, gtin, status, is_default FROM catalog.product_variant WHERE product_id = ${id} ORDER BY status, label`;
  const provenance = await sql<{ key: string; source: string; source_url: string | null; confidence: string; last_verified_at: Date }[]>`
    SELECT ad.key, ds.name AS source, pav.source_url, pav.confidence, pav.last_verified_at
    FROM catalog.product_attribute_value pav
    JOIN catalog.attribute_definition ad ON ad.id = pav.attribute_id
    JOIN ops.data_source ds ON ds.id = pav.source_id
    WHERE pav.product_id = ${id} AND pav.is_current`;
  const offers = await sql`
    SELECT o.id, o.variant_id, m.name AS merchant, o.price_cash, o.availability, o.status, o.match_status, o.last_checked_at, o.url_original
    FROM commerce.offer o JOIN commerce.merchant m ON m.id = o.merchant_id
    JOIN catalog.product_variant v ON v.id = o.variant_id WHERE v.product_id = ${id} ORDER BY o.price_cash NULLS LAST`;
  // Conteúdo que cita o produto (impede exclusão enquanto estiver no ar).
  const contents = await sql<{ id: string; title: string; status: string; live: boolean }[]>`
    SELECT c.id, c.title, c.status, c.live IS NOT NULL AS live FROM editorial.content_product cp
    JOIN editorial.content c ON c.id = cp.content_id WHERE cp.product_id = ${id} ORDER BY c.title`;
  // Fonte usada na última edição da ficha: vira o padrão do formulário em vez de sempre "Fabricante".
  const [src] = await sql<{ name: string }[]>`
    SELECT ds.name FROM catalog.product_attribute_value pav JOIN ops.data_source ds ON ds.id = pav.source_id
    WHERE pav.product_id = ${id} ORDER BY pav.last_verified_at DESC LIMIT 1`;
  const lastSource = src?.name.startsWith("admin:") ? (src.name.slice(6) as SpecSourceKind) : null;
  return { product: p, variants, provenance, offers, contents, lastSource };
}

/** Cria ou atualiza um produto. Specs são validadas contra a categoria e gravadas com fonte e confiança. */
export async function saveProduct(sql: Sql, staff: Staff, input: ProductInput): Promise<{ id: string; slug: string }> {
  requirePermission(staff, "catalog:write");
  const config = getCategory(input.category);
  const issues: string[] = [];
  if (!config) issues.push(`categoria desconhecida: ${input.category}`);
  if (input.name.trim().length < 3) issues.push("nome muito curto");
  if (input.brand.trim().length < 2) issues.push("marca obrigatória");
  if (input.publishStatus === "published" && input.summary.trim().length < 20) issues.push("veredito curto obrigatório para publicar");
  if (config) issues.push(...validateSpecs(config, input.specs));
  if (issues.length) throw new ValidationError(issues);

  const slug = slugify(input.slug?.trim() || input.name);
  const [clash] = await sql`SELECT id FROM catalog.product WHERE slug = ${slug} AND id IS DISTINCT FROM ${input.id ?? null}`;
  if (clash) throw new ValidationError([`já existe um produto com o endereço "${slug}"`]);

  return sql.begin(async (tx) => {
    const t = tx as unknown as Sql;
    const brandId = await ensureBrand(t, input.brand);
    const [cat] = await tx<{ id: string }[]>`SELECT id FROM catalog.category WHERE slug = ${input.category}`;
    if (!cat) throw new ValidationError(["categoria não cadastrada no banco"]);
    const id = input.id ?? randomUUID();
    const [before] = input.id ? await tx`SELECT slug, name, specs, summary, publish_status FROM catalog.product WHERE id = ${id} AND deleted_at IS NULL` : [];
    if (input.id && !before) throw new ValidationError(["produto não encontrado"]);
    // Salvar um produto arquivado sem marcar "Publicado" não o desarquiva.
    const status = before?.publish_status === "archived" && input.publishStatus === "draft" ? "archived" : input.publishStatus;

    await tx`
      INSERT INTO catalog.product (id, category_id, brand_id, slug, name, model, release_date, specs, summary, editorial, publish_status)
      VALUES (${id}, ${cat.id}, ${brandId}, ${slug}, ${input.name.trim()}, ${input.model ?? null}, ${input.releaseDate || null},
        ${tx.json(input.specs as never)}, ${input.summary.trim()}, ${tx.json(input.editorial as never)}, ${status})
      ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, brand_id = EXCLUDED.brand_id, slug = EXCLUDED.slug,
        name = EXCLUDED.name, model = EXCLUDED.model, release_date = EXCLUDED.release_date, specs = EXCLUDED.specs,
        summary = EXCLUDED.summary, editorial = EXCLUDED.editorial, publish_status = EXCLUDED.publish_status, updated_at = now()`;

    // Mudou o slug: redirect 301 do endereço antigo (docs/05 §5).
    // Sem cadeias (A→B→C vira A→C) e sem laço quando o endereço volta a um antigo.
    if (before && before.slug !== slug) {
      const from = `/${input.category}/${before.slug}`;
      const to = `/${input.category}/${slug}`;
      await tx`DELETE FROM editorial.redirect WHERE from_path = ${to}`;
      await tx`UPDATE editorial.redirect SET to_path = ${to} WHERE to_path = ${from}`;
      await tx`INSERT INTO editorial.redirect (from_path, to_path) VALUES (${from}, ${to})
               ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path`;
    }

    // Proveniência: um valor corrente por atributo; valores alterados viram histórico.
    const sourceId = await ensureSource(t, input.specSource.kind);
    const attrs = await tx<{ id: string; key: string }[]>`SELECT id, key FROM catalog.attribute_definition WHERE category_id = ${cat.id}`;
    const prev = (before?.specs ?? {}) as Specs;
    for (const a of attrs) {
      const v = input.specs[a.key];
      const changed = JSON.stringify(prev[a.key] ?? null) !== JSON.stringify(v ?? null);
      if (!changed && input.id) continue;
      await tx`UPDATE catalog.product_attribute_value SET is_current = false WHERE product_id = ${id} AND attribute_id = ${a.id} AND is_current`;
      if (v == null) continue;
      await tx`
        INSERT INTO catalog.product_attribute_value (id, product_id, attribute_id, value_num, value_text, value_bool,
          source_id, source_url, confidence, last_verified_at, created_by)
        VALUES (${randomUUID()}, ${id}, ${a.id}, ${typeof v === "number" ? v : null}, ${typeof v === "string" ? v : null},
          ${typeof v === "boolean" ? v : null}, ${sourceId}, ${input.specSource.url ?? null}, ${SOURCE_CONFIDENCE[input.specSource.kind]}, now(), ${staff.id})`;
    }
    await audit(t, staff, input.id ? "product.update" : "product.create", { type: "product", id }, { before, after: { slug, name: input.name, publishStatus: status } });
    return { id, slug };
  });
}

function variantFields(input: { storage: string; color: string; gtin?: string | null }) {
  const storage = slugify(input.storage).replace(/-/g, "");
  const color = slugify(input.color);
  const issues: string[] = [];
  if (!/^\d+(gb|tb)$/.test(storage)) issues.push('armazenamento no formato "256gb" ou "1tb"');
  if (!color) issues.push("cor obrigatória");
  if (input.gtin && !/^\d{8,14}$/.test(input.gtin)) issues.push("GTIN deve ter de 8 a 14 dígitos");
  if (issues.length) throw new ValidationError(issues);
  const label = `${storage.replace("gb", " GB").replace("tb", " TB")} · ${input.color.trim()}`;
  return { storage, color, label, slug: `${storage}-${color}`, gtin: input.gtin || null };
}

async function assertVariantFree(sql: Sql, productId: string, v: { storage: string; color: string; gtin: string | null }, exceptId: string | null) {
  const [dupe] = await sql`SELECT 1 FROM catalog.product_variant WHERE product_id = ${productId} AND axes = ${sql.json({ storage: v.storage, color: v.color })}
                           AND id IS DISTINCT FROM ${exceptId}`;
  if (dupe) throw new ValidationError(["este produto já tem uma versão com esse armazenamento e cor"]);
  if (v.gtin) {
    const [g] = await sql<{ name: string }[]>`SELECT p.name FROM catalog.product_variant v JOIN catalog.product p ON p.id = v.product_id
                                             WHERE v.gtin = ${v.gtin} AND v.id IS DISTINCT FROM ${exceptId}`;
    if (g) throw new ValidationError([`o GTIN ${v.gtin} já está em uma versão de "${g.name}"`]);
  }
}

export async function addVariant(sql: Sql, staff: Staff, productId: string, input: { storage: string; color: string; gtin?: string | null }) {
  requirePermission(staff, "catalog:write");
  const v = variantFields(input);
  await assertVariantFree(sql, productId, v, null);
  const id = randomUUID();
  await sql`
    INSERT INTO catalog.product_variant (id, product_id, gtin, axes, label, slug)
    VALUES (${id}, ${productId}, ${v.gtin}, ${sql.json({ storage: v.storage, color: v.color })}, ${v.label}, ${v.slug})`;
  await audit(sql, staff, "variant.create", { type: "product_variant", id }, { after: { productId, label: v.label, gtin: v.gtin } });
  return id;
}

/**
 * Edita armazenamento, cor e GTIN de uma versão. O endereço (?v=) muda junto; links antigos com o ?v= anterior
 * caem na versão padrão do produto, como já acontece com qualquer ?v= desconhecido.
 */
export async function updateVariant(sql: Sql, staff: Staff, variantId: string, input: { storage: string; color: string; gtin?: string | null }) {
  requirePermission(staff, "catalog:write");
  const v = variantFields(input);
  const [before] = await sql<{ product_id: string; label: string; gtin: string | null; slug: string }[]>`
    SELECT product_id, label, gtin, slug FROM catalog.product_variant WHERE id = ${variantId}`;
  if (!before) throw new ValidationError(["versão não encontrada"]);
  await assertVariantFree(sql, before.product_id, v, variantId);
  await sql`UPDATE catalog.product_variant SET axes = ${sql.json({ storage: v.storage, color: v.color })}, label = ${v.label}, slug = ${v.slug}, gtin = ${v.gtin}
            WHERE id = ${variantId}`;
  await audit(sql, staff, "variant.update", { type: "product_variant", id: variantId }, { before, after: { label: v.label, gtin: v.gtin, slug: v.slug } });
  return before.product_id;
}

/** Desativa (some do site, ofertas ficam guardadas) ou reativa uma versão. Sempre resta ao menos uma ativa. */
export async function setVariantActive(sql: Sql, staff: Staff, variantId: string, active: boolean) {
  requirePermission(staff, "catalog:write");
  return sql.begin(async (tx) => {
    const [v] = await tx<{ product_id: string; status: string; is_default: boolean }[]>`
      SELECT product_id, status, is_default FROM catalog.product_variant WHERE id = ${variantId} FOR UPDATE`;
    if (!v) throw new ValidationError(["versão não encontrada"]);
    if (!active) {
      const [others] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM catalog.product_variant
                                                 WHERE product_id = ${v.product_id} AND status = 'active' AND id <> ${variantId}`;
      if (!others?.n) throw new ValidationError(["o produto precisa de ao menos uma versão ativa"]);
    }
    await tx`UPDATE catalog.product_variant SET status = ${active ? "active" : "inactive"}, is_default = ${active ? v.is_default : false} WHERE id = ${variantId}`;
    if (!active && v.is_default) {
      // A padrão saiu: a primeira ativa assume.
      await tx`UPDATE catalog.product_variant SET is_default = true WHERE id = (
                 SELECT id FROM catalog.product_variant WHERE product_id = ${v.product_id} AND status = 'active' ORDER BY label LIMIT 1)`;
    }
    await audit(tx as unknown as Sql, staff, active ? "variant.activate" : "variant.deactivate", { type: "product_variant", id: variantId }, { before: { status: v.status } });
    return v.product_id;
  });
}

/** Arquiva (sai do site, tudo fica guardado) ou restaura como rascunho. */
export async function setProductArchived(sql: Sql, staff: Staff, id: string, archived: boolean) {
  requirePermission(staff, "catalog:write");
  const [before] = await sql<{ publish_status: string }[]>`SELECT publish_status FROM catalog.product WHERE id = ${id} AND deleted_at IS NULL`;
  if (!before) throw new ValidationError(["produto não encontrado"]);
  const to = archived ? "archived" : "draft";
  await sql`UPDATE catalog.product SET publish_status = ${to}, updated_at = now() WHERE id = ${id}`;
  await audit(sql, staff, archived ? "product.archive" : "product.restore", { type: "product", id }, { before, after: { publish_status: to } });
}

/** Marca um produto de demonstração como real (ou o contrário). O site deixa de dizer "dados de demonstração". */
export async function setProductDemo(sql: Sql, staff: Staff, id: string, demo: boolean) {
  requirePermission(staff, "catalog:write");
  const [r] = await sql`UPDATE catalog.product SET is_demo = ${demo}, updated_at = now() WHERE id = ${id} AND deleted_at IS NULL RETURNING id`;
  if (!r) throw new ValidationError(["produto não encontrado"]);
  await audit(sql, staff, demo ? "product.mark_demo" : "product.mark_real", { type: "product", id }, { after: { is_demo: demo } });
}

/**
 * Exclui um produto: só arquivado, sem conteúdo no ar que o cite, e com o endereço digitado como confirmação.
 * A linha fica no banco (deleted_at) para preservar histórico de preços, cliques e auditoria; o endereço é liberado
 * para reuso e as ofertas param de ser coletadas.
 */
export async function deleteProduct(sql: Sql, staff: Staff, id: string, confirmSlug: string) {
  requirePermission(staff, "catalog:write");
  return sql.begin(async (tx) => {
    const [p] = await tx<{ slug: string; name: string; publish_status: string }[]>`
      SELECT slug, name, publish_status FROM catalog.product WHERE id = ${id} AND deleted_at IS NULL FOR UPDATE`;
    if (!p) throw new ValidationError(["produto não encontrado"]);
    if (p.publish_status !== "archived") throw new ValidationError(["arquive o produto antes de excluir"]);
    if (confirmSlug.trim() !== p.slug) throw new ValidationError([`para confirmar, digite o endereço exato: ${p.slug}`]);
    const live = await tx<{ title: string }[]>`SELECT c.title FROM editorial.content_product cp JOIN editorial.content c ON c.id = cp.content_id
                                              WHERE cp.product_id = ${id} AND c.live IS NOT NULL`;
    if (live.length) throw new ValidationError([`o produto aparece em conteúdo no ar: ${live.map((c) => c.title).join(", ")}`]);
    await tx`UPDATE catalog.product SET deleted_at = now(), slug = ${`${p.slug}--excluido-${id.slice(0, 8)}`}, updated_at = now() WHERE id = ${id}`;
    await tx`UPDATE commerce.offer SET status = 'paused' FROM catalog.product_variant v
             WHERE v.id = commerce.offer.variant_id AND v.product_id = ${id} AND commerce.offer.status = 'active'`;
    await audit(tx as unknown as Sql, staff, "product.delete", { type: "product", id }, { before: p });
  });
}

/** Arquiva de uma vez todos os produtos de demonstração (reversível pela aba Arquivados). */
export async function archiveDemoProducts(sql: Sql, staff: Staff, confirm: string) {
  requirePermission(staff, "catalog:write");
  if (confirm.trim().toUpperCase() !== "ARQUIVAR") throw new ValidationError(['para confirmar, digite ARQUIVAR']);
  const rows = await sql<{ id: string }[]>`
    UPDATE catalog.product SET publish_status = 'archived', updated_at = now()
    WHERE is_demo AND deleted_at IS NULL AND publish_status <> 'archived' RETURNING id`;
  await audit(sql, staff, "product.archive_demo", { type: "product", id: null }, { after: { count: rows.length, ids: rows.map((r) => r.id) } });
  return rows.length;
}
