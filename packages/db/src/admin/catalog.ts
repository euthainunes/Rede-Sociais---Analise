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

export async function listProductsAdmin(sql: Sql, opts: { q?: string | null } = {}) {
  const q = opts.q?.trim();
  return sql<{ id: string; slug: string; name: string; brand: string; category: string; publish_status: string; is_demo: boolean; variants: number; offers: number; reviews: number; updated_at: Date }[]>`
    SELECT p.id, p.slug, p.name, b.name AS brand, c.slug AS category, p.publish_status, p.is_demo, p.updated_at,
      (SELECT count(*)::int FROM catalog.product_variant v WHERE v.product_id = p.id) AS variants,
      (SELECT count(*)::int FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id
         WHERE v.product_id = p.id AND o.status = 'active') AS offers,
      (SELECT count(*)::int FROM editorial.content_product cp JOIN editorial.content ec ON ec.id = cp.content_id
         WHERE cp.product_id = p.id AND ec.type = 'review') AS reviews
    FROM catalog.product p JOIN catalog.brand b ON b.id = p.brand_id JOIN catalog.category c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL ${q ? sql`AND (p.name ILIKE ${"%" + q + "%"} OR b.name ILIKE ${"%" + q + "%"})` : sql``}
    ORDER BY p.updated_at DESC LIMIT 200`;
}

export async function getProductAdmin(sql: Sql, id: string) {
  const [p] = await sql`
    SELECT p.*, b.name AS brand, c.slug AS category FROM catalog.product p
    JOIN catalog.brand b ON b.id = p.brand_id JOIN catalog.category c ON c.id = p.category_id
    WHERE p.id = ${id} AND p.deleted_at IS NULL`;
  if (!p) return null;
  const variants = await sql`SELECT id, slug, label, axes, gtin, status FROM catalog.product_variant WHERE product_id = ${id} ORDER BY label`;
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
  return { product: p, variants, provenance, offers };
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
    const [before] = input.id ? await tx`SELECT slug, name, specs, summary, publish_status FROM catalog.product WHERE id = ${id}` : [];
    if (input.id && !before) throw new ValidationError(["produto não encontrado"]);

    await tx`
      INSERT INTO catalog.product (id, category_id, brand_id, slug, name, model, release_date, specs, summary, editorial, publish_status)
      VALUES (${id}, ${cat.id}, ${brandId}, ${slug}, ${input.name.trim()}, ${input.model ?? null}, ${input.releaseDate || null},
        ${tx.json(input.specs as never)}, ${input.summary.trim()}, ${tx.json(input.editorial as never)}, ${input.publishStatus})
      ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, brand_id = EXCLUDED.brand_id, slug = EXCLUDED.slug,
        name = EXCLUDED.name, model = EXCLUDED.model, release_date = EXCLUDED.release_date, specs = EXCLUDED.specs,
        summary = EXCLUDED.summary, editorial = EXCLUDED.editorial, publish_status = EXCLUDED.publish_status, updated_at = now()`;

    // Mudou o slug: redirect 301 do endereço antigo (docs/05 §5).
    if (before && before.slug !== slug) {
      await tx`INSERT INTO editorial.redirect (from_path, to_path) VALUES (${`/${input.category}/${before.slug}`}, ${`/${input.category}/${slug}`})
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
    await audit(t, staff, input.id ? "product.update" : "product.create", { type: "product", id }, { before, after: { slug, name: input.name, publishStatus: input.publishStatus } });
    return { id, slug };
  });
}

export async function addVariant(sql: Sql, staff: Staff, productId: string, input: { storage: string; color: string; gtin?: string | null }) {
  requirePermission(staff, "catalog:write");
  const storage = slugify(input.storage).replace(/-/g, "");
  const color = slugify(input.color);
  if (!/^\d+(gb|tb)$/.test(storage)) throw new ValidationError(['armazenamento no formato "256gb" ou "1tb"']);
  if (!color) throw new ValidationError(["cor obrigatória"]);
  if (input.gtin && !/^\d{8,14}$/.test(input.gtin)) throw new ValidationError(["GTIN deve ter de 8 a 14 dígitos"]);
  const label = `${storage.replace("gb", " GB").replace("tb", " TB")} · ${input.color.trim()}`;
  const id = randomUUID();
  await sql`
    INSERT INTO catalog.product_variant (id, product_id, gtin, axes, label, slug)
    VALUES (${id}, ${productId}, ${input.gtin || null}, ${sql.json({ storage, color })}, ${label}, ${`${storage}-${color}`})`;
  await audit(sql, staff, "variant.create", { type: "product_variant", id }, { after: { productId, label, gtin: input.gtin } });
  return id;
}
