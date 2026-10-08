/**
 * Carrega os dados de DEMONSTRAÇÃO no Postgres (idempotente). Uso: DATABASE_URL=... pnpm db:seed
 * Produtos ficam com is_demo = true.
 */
import { createHash } from "node:crypto";
import { categories } from "@veredito/core";
import { createSql, type Sql } from "./client.ts";
import * as demo from "./demo-data.ts";

/** UUID determinístico (formato v5) a partir de um id de demonstração. */
export function demoUuid(key: string): string {
  const h = createHash("sha1").update(`veredito-demo:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

export async function seedDemo(sql: Sql): Promise<void> {
  const U = demoUuid;
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274002)`;
    const sourceId = U("source:demo");
    await tx`INSERT INTO ops.data_source (id, kind, name, base_confidence, terms_notes)
             VALUES (${sourceId}, 'manual', 'Dados de demonstração', 0.9, 'Fictício') ON CONFLICT (id) DO NOTHING`;
    const verticalId = U("vertical:tecnologia");
    await tx`INSERT INTO catalog.vertical (id, slug, name) VALUES (${verticalId}, 'tecnologia', 'Tecnologia') ON CONFLICT (id) DO NOTHING`;

    for (const cfg of Object.values(categories)) {
      const catId = U(`category:${cfg.slug}`);
      await tx`
        INSERT INTO catalog.category (id, vertical_id, slug, path, name, name_singular, variant_axes, price_bands, config)
        VALUES (${catId}, ${verticalId}, ${cfg.slug}, ${`tecnologia/${cfg.slug}`}, ${cfg.name}, ${cfg.nameSingular},
                ${cfg.variantAxes}, ${cfg.priceBands}, ${tx.json({ profiles: cfg.profiles, synonyms: cfg.synonyms } as never)})
        ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, price_bands = EXCLUDED.price_bands`;
      for (const [i, g] of cfg.groups.entries()) {
        await tx`INSERT INTO catalog.attribute_group (id, category_id, key, label, position)
                 VALUES (${U(`group:${cfg.slug}:${g.key}`)}, ${catId}, ${g.key}, ${g.label}, ${i}) ON CONFLICT (id) DO NOTHING`;
      }
      for (const [i, a] of cfg.attributes.entries()) {
        await tx`
          INSERT INTO catalog.attribute_definition (id, category_id, group_id, key, label, data_type, unit, enum_values,
            higher_is_better, is_filterable, is_comparable, position)
          VALUES (${U(`attr:${cfg.slug}:${a.key}`)}, ${catId}, ${U(`group:${cfg.slug}:${a.group}`)}, ${a.key}, ${a.label}, ${a.type},
            ${a.unit ?? null}, ${a.enumValues ? tx.json(a.enumValues as never) : null}, ${a.higherIsBetter ?? null},
            ${a.filterable ?? false}, ${a.comparable ?? true}, ${i})
          ON CONFLICT (id) DO NOTHING`;
      }
      await tx`
        INSERT INTO editorial.scoring_methodology (id, category_id, version, criteria, published_at)
        VALUES (${U(`methodology:${cfg.slug}:${cfg.methodology.version}`)}, ${catId}, ${cfg.methodology.version},
                ${tx.json(cfg.methodology.criteria as never)}, now())
        ON CONFLICT (id) DO NOTHING`;
    }

    for (const b of demo.brands) {
      await tx`INSERT INTO catalog.brand (id, slug, name) VALUES (${U(b.id)}, ${b.slug}, ${b.name}) ON CONFLICT (id) DO NOTHING`;
    }
    for (const m of demo.merchants) {
      await tx`INSERT INTO commerce.merchant (id, slug, name, kind, trust_score, program_key)
               VALUES (${U(m.id)}, ${m.slug}, ${m.name}, 'retailer', ${m.trust}, ${m.programKey})
               ON CONFLICT (id) DO UPDATE SET trust_score = EXCLUDED.trust_score`;
    }
    for (const p of demo.products) {
      await tx`
        INSERT INTO catalog.product (id, category_id, brand_id, slug, name, model, release_date, specs, summary, editorial,
          publish_status, is_demo)
        VALUES (${U(p.id)}, ${U(`category:${p.category}`)}, ${U(p.brandId)}, ${p.slug}, ${p.name}, ${p.model}, ${p.releaseDate},
          ${tx.json(p.specs as never)}, ${p.summary},
          ${tx.json({ forWho: p.forWho, notForWho: p.notForWho, pros: p.pros, cons: p.cons } as never)}, 'published', true)
        ON CONFLICT (id) DO UPDATE SET specs = EXCLUDED.specs, summary = EXCLUDED.summary, editorial = EXCLUDED.editorial`;
      for (const v of p.variants) {
        await tx`
          INSERT INTO catalog.product_variant (id, product_id, sku, gtin, axes, label, slug, is_default)
          VALUES (${U(v.id)}, ${U(p.id)}, ${v.id}, ${v.gtin}, ${tx.json(v.axes as never)}, ${v.label}, ${v.slug}, ${v === p.variants[0]})
          ON CONFLICT (id) DO NOTHING`;
        const series = demo.demoSeries(v, p.releaseDate);
        await tx`DELETE FROM pricing.price_daily WHERE variant_id = ${U(v.id)}`;
        const rows = series.map((s) => ({ variant_id: U(v.id), day: s.day, min_price: s.min, median_price: s.min, max_price: s.min, merchants_count: 3, in_stock_count: 3 }));
        for (let i = 0; i < rows.length; i += 500) await tx`INSERT INTO pricing.price_daily ${tx(rows.slice(i, i + 500))}`;
      }
    }
    for (const o of demo.offers) {
      await tx`
        INSERT INTO commerce.offer (id, variant_id, merchant_id, seller_name, condition, external_id, title_raw, url_original,
          price_cash, price_installment, installments, price_list, shipping_cost, availability, match_status, match_confidence,
          source_id, last_checked_at)
        VALUES (${U(o.id)}, ${U(o.variantId)}, ${U(o.merchantId)}, ${o.sellerName}, ${o.condition}, ${o.externalId}, ${o.title}, ${o.url},
          ${o.priceCash}, ${o.priceInstallment}, ${o.installments}, ${o.priceList}, ${o.shippingCost}, ${o.availability}, 'confirmed', 1,
          ${sourceId}, ${o.lastCheckedAt})
        ON CONFLICT (id) DO UPDATE SET price_cash = EXCLUDED.price_cash, last_checked_at = EXCLUDED.last_checked_at,
          availability = EXCLUDED.availability`;
    }
    const authorId = U("author:equipe");
    await tx`INSERT INTO editorial.author (id, slug, name, bio) VALUES (${authorId}, 'equipe-veredito', 'Equipe Veredito (demo)', 'Autor de demonstração')
             ON CONFLICT (id) DO NOTHING`;
    const productIdBySlug = new Map(demo.products.map((p) => [p.slug, U(p.id)]));
    for (const c of demo.contents) {
      const cid = U(c.id);
      await tx`
        INSERT INTO editorial.content (id, type, slug, url_path, title, body, status, evidence_level, author_id, category_id,
          published_at, updated_at)
        VALUES (${cid}, ${c.type === "methodology" ? "guide" : c.type}, ${c.path.split("/").pop()!}, ${c.path}, ${c.title},
          ${tx.json({ intro: c.intro ?? null, sections: c.sections, picks: c.picks ?? [], kind: c.type } as never)}, 'published',
          ${c.evidenceLevel}, ${authorId}, ${c.category ? U(`category:${c.category}`) : null}, ${c.publishedAt}, ${c.updatedAt})
        ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, updated_at = EXCLUDED.updated_at`;
      for (const [i, slug] of c.productSlugs.entries()) {
        await tx`INSERT INTO editorial.content_product (content_id, product_id, role, position)
                 VALUES (${cid}, ${productIdBySlug.get(slug)!}, 'subject', ${i}) ON CONFLICT DO NOTHING`;
      }
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definido");
  const sql = createSql(url, { max: 1, onnotice: () => {} });
  await seedDemo(sql);
  console.log("Dados de demonstração carregados.");
  await sql.end();
}
