/**
 * Fonte de dados de baixo nível. Duas implementações: demonstração (memória) e Postgres.
 * Os serviços (services.ts) montam as páginas a partir daqui, iguais nos dois modos.
 */
import { classifyChannel, needsNewSession, type Availability, type Condition, type DailyPrice, type IncomingEvent, type Specs } from "@veredito/core";
import * as demo from "./demo-data.ts";
import type { Sql } from "./client.ts";

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  model: string;
  brand: string;
  brandSlug: string;
  category: string;
  releaseDate: string | null;
  summary: string;
  forWho: string[];
  notForWho: string[];
  pros: string[];
  cons: string[];
  specs: Specs;
  isDemo: boolean;
  successorSlug: string | null;
  variants: { id: string; slug: string; label: string; axes: Record<string, string>; gtin: string | null }[];
}

export interface OfferRow {
  id: string;
  variantId: string;
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
  merchantTrust: number;
  programKey: string;
  url: string;
  priceCash: number | null;
  priceList: number | null;
  priceInstallment: number | null;
  installments: number | null;
  shippingCost: number | null;
  availability: Availability;
  condition: Condition;
  lastCheckedAt: string;
}

export interface ContentRow {
  id: string;
  type: "review" | "best_list" | "guide" | "methodology";
  path: string;
  title: string;
  category: string | null;
  productSlugs: string[];
  evidenceLevel: "hands_on" | "data_based" | null;
  author: string;
  publishedAt: string;
  updatedAt: string;
  intro: string | null;
  sections: { heading: string; text: string }[];
  picks: { role: "best" | "budget" | "premium" | "value"; productSlug: string; note: string }[];
}

export interface ClickRecord {
  clickRef: string;
  ts: Date;
  offerId: string;
  productId: string;
  variantId: string;
  merchantId: string;
  programKey: string;
  sourcePath: string | null;
  pageType: string | null;
  ctaId: string | null;
  position: string | null;
  utm: Record<string, string>;
  device: string | null;
  anonId: string | null;
  sessionId: string | null;
  priceShown: number | null;
  isBot: boolean;
}

export interface DataSource {
  readonly mode: "demo" | "postgres";
  today(): string;
  listProducts(category: string): Promise<ProductRow[]>;
  listAllProducts(): Promise<ProductRow[]>;
  listOffers(variantIds: string[]): Promise<OfferRow[]>;
  getSeries(variantIds: string[]): Promise<Map<string, DailyPrice[]>>;
  listContent(filter?: { type?: ContentRow["type"]; productSlug?: string }): Promise<ContentRow[]>;
  /** Novo endereço de uma página que mudou de endereço (301), ou null. */
  findRedirect(path: string): Promise<string | null>;
  recordClick(click: ClickRecord): Promise<void>;
  recordEvents(events: IncomingEvent[], ctx: { anonId: string | null; sessionId?: string | null; ts: Date }): Promise<void>;
  /** Abre ou estende a sessão do visitante (só com consentimento). Devolve o id da sessão, ou null sem banco. */
  trackSession(input: SessionInput): Promise<string | null>;
}

export interface SessionInput {
  anonId: string;
  sessionId: string | null;
  now: Date;
  landingPath: string | null;
  referrerHost: string | null;
  siteHost: string;
  utm: { source: string | null; medium: string | null; campaign: string | null; content: string | null; term: string | null };
  gclid: boolean;
  device: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ───────────────────────── Demonstração (memória)
export function createDemoSource(onClick?: (c: ClickRecord) => void): DataSource {
  const brandById = new Map(demo.brands.map((b) => [b.id, b]));
  const merchantById = new Map(demo.merchants.map((m) => [m.id, m]));
  const succ = new Map<string, string>();
  const rows: ProductRow[] = demo.products.map((p) => {
    const b = brandById.get(p.brandId)!;
    return {
      id: p.id, slug: p.slug, name: p.name, model: p.model, brand: b.name, brandSlug: b.slug, category: p.category,
      releaseDate: p.releaseDate, summary: p.summary, forWho: p.forWho, notForWho: p.notForWho, pros: p.pros, cons: p.cons,
      specs: p.specs, isDemo: true, successorSlug: p.successorSlug ?? succ.get(p.slug) ?? null,
      variants: p.variants.map((v) => ({ id: v.id, slug: v.slug, label: v.label, axes: v.axes, gtin: v.gtin })),
    };
  });
  const variantInfo = new Map(demo.products.flatMap((p) => p.variants.map((v) => [v.id, { v, release: p.releaseDate }] as const)));
  return {
    mode: "demo",
    today: () => demo.DEMO_TODAY,
    listProducts: async (category) => rows.filter((r) => r.category === category),
    listAllProducts: async () => rows,
    listOffers: async (variantIds) =>
      demo.offers
        .filter((o) => variantIds.includes(o.variantId))
        .map((o) => {
          const m = merchantById.get(o.merchantId)!;
          return {
            id: o.id, variantId: o.variantId, merchantId: m.id, merchantSlug: m.slug, merchantName: m.name, merchantTrust: m.trust,
            programKey: m.programKey, url: o.url, priceCash: o.priceCash, priceList: o.priceList, priceInstallment: o.priceInstallment,
            installments: o.installments, shippingCost: o.shippingCost, availability: o.availability, condition: o.condition,
            lastCheckedAt: o.lastCheckedAt,
          };
        }),
    getSeries: async (variantIds) =>
      new Map(variantIds.flatMap((id) => {
        const info = variantInfo.get(id);
        return info ? [[id, demo.demoSeries(info.v, info.release)] as const] : [];
      })),
    listContent: async (filter) =>
      demo.contents
        .filter((c) => (!filter?.type || c.type === filter.type) && (!filter?.productSlug || c.productSlugs.includes(filter.productSlug)))
        .map((c) => ({ ...c, intro: c.intro ?? null, picks: c.picks ?? [] })),
    findRedirect: async () => null,
    recordClick: async (c) => {
      onClick?.(c);
    },
    recordEvents: async () => {},
    trackSession: async () => null,
  };
}

// ───────────────────────── Postgres
export function createPgSource(sql: Sql, opts: { today?: () => string } = {}): DataSource {
  const mapProduct = (r: Record<string, any>): ProductRow => ({
    id: r.id, slug: r.slug, name: r.name, model: r.model ?? "", brand: r.brand, brandSlug: r.brand_slug, category: r.category,
    releaseDate: r.release_date ? new Date(r.release_date).toISOString().slice(0, 10) : null,
    summary: r.summary ?? "", forWho: r.editorial?.forWho ?? [], notForWho: r.editorial?.notForWho ?? [],
    pros: r.editorial?.pros ?? [], cons: r.editorial?.cons ?? [], specs: r.specs ?? {}, isDemo: r.is_demo,
    successorSlug: r.successor_slug ?? null, variants: r.variants ?? [],
  });
  const productQuery = (where: ReturnType<Sql>) => sql`
    SELECT p.id, p.slug, p.name, p.model, p.release_date, p.summary, p.specs, p.is_demo,
           b.name AS brand, b.slug AS brand_slug, c.slug AS category, s.slug AS successor_slug,
           p.editorial,
           COALESCE((SELECT json_agg(json_build_object('id', v.id, 'slug', v.slug, 'label', v.label, 'axes', v.axes, 'gtin', v.gtin) ORDER BY v.label)
              FROM catalog.product_variant v WHERE v.product_id = p.id AND v.status = 'active'), '[]') AS variants
    FROM catalog.product p
    JOIN catalog.brand b ON b.id = p.brand_id
    JOIN catalog.category c ON c.id = p.category_id
    LEFT JOIN catalog.product s ON s.id = p.successor_id
    WHERE p.deleted_at IS NULL AND p.publish_status = 'published' AND ${where}
    ORDER BY p.name`;
  return {
    mode: "postgres",
    today: opts.today ?? (() => new Date().toISOString().slice(0, 10)),
    listProducts: async (category) => (await productQuery(sql`c.slug = ${category}`)).map(mapProduct),
    listAllProducts: async () => (await productQuery(sql`true`)).map(mapProduct),
    listOffers: async (variantIds) => {
      if (variantIds.length === 0) return [];
      const rows = await sql`
        SELECT o.*, m.slug AS merchant_slug, m.name AS merchant_name, COALESCE(m.trust_score, 0.5)::float AS merchant_trust,
               COALESCE(m.program_key, ap.network, 'direct') AS program_key
        FROM commerce.offer o JOIN commerce.merchant m ON m.id = o.merchant_id
        LEFT JOIN commerce.affiliate_program ap ON ap.id = o.program_id
        WHERE o.variant_id = ANY(${variantIds}::uuid[]) AND o.status = 'active' AND o.match_status IN ('auto','confirmed')`;
      return rows.map((o) => ({
        id: o.id, variantId: o.variant_id, merchantId: o.merchant_id, merchantSlug: o.merchant_slug, merchantName: o.merchant_name,
        merchantTrust: Number(o.merchant_trust), programKey: o.program_key, url: o.url_original,
        priceCash: o.price_cash == null ? null : Number(o.price_cash), priceList: o.price_list == null ? null : Number(o.price_list),
        priceInstallment: o.price_installment == null ? null : Number(o.price_installment), installments: o.installments,
        shippingCost: o.shipping_cost == null ? null : Number(o.shipping_cost), availability: o.availability, condition: o.condition,
        lastCheckedAt: new Date(o.last_checked_at).toISOString(),
      }));
    },
    getSeries: async (variantIds) => {
      const out = new Map<string, DailyPrice[]>();
      if (variantIds.length === 0) return out;
      const rows = await sql`
        SELECT variant_id, to_char(day, 'YYYY-MM-DD') AS day, min_price::float AS min
        FROM pricing.price_daily WHERE variant_id = ANY(${variantIds}::uuid[]) AND day > now() - interval '400 days'
        ORDER BY day`;
      for (const r of rows) {
        const list = out.get(r.variant_id) ?? [];
        list.push({ day: r.day, min: r.min });
        out.set(r.variant_id, list);
      }
      return out;
    },
    listContent: async (filter) => {
      const rows = await sql`
        SELECT c.id, c.type, c.url_path AS path, c.live->>'title' AS title, c.live->'body' AS body, c.evidence_level, a.name AS author,
               c.published_at, c.live_at AS updated_at,
               cat.slug AS category,
               COALESCE(array_agg(p.slug ORDER BY cp.position) FILTER (WHERE p.slug IS NOT NULL), '{}') AS product_slugs
        FROM editorial.content c
        LEFT JOIN editorial.author a ON a.id = c.author_id
        LEFT JOIN editorial.content_product cp ON cp.content_id = c.id
        LEFT JOIN catalog.product p ON p.id = cp.product_id
        LEFT JOIN catalog.category cat ON cat.id = c.category_id
        WHERE c.live IS NOT NULL AND c.type IN ('review','best_list','guide')
          AND ${filter?.type ? sql`COALESCE(c.live->'body'->>'kind', c.type) = ${filter.type}` : sql`true`}
        GROUP BY c.id, a.name, cat.slug`;
      return rows
        .map((r) => ({
          id: r.id, type: r.body?.kind ?? r.type, path: r.path, title: r.title, category: r.category ?? null,
          productSlugs: r.product_slugs, evidenceLevel: r.evidence_level, author: r.author ?? "",
          publishedAt: new Date(r.published_at).toISOString().slice(0, 10), updatedAt: new Date(r.updated_at).toISOString().slice(0, 10),
          intro: r.body?.intro ?? null, sections: r.body?.sections ?? [], picks: r.body?.picks ?? [],
        }))
        .filter((c) => !filter?.productSlug || c.productSlugs.includes(filter.productSlug));
    },
    findRedirect: async (path) => {
      const [r] = await sql<{ to_path: string }[]>`SELECT to_path FROM editorial.redirect WHERE from_path = ${path}`;
      return r?.to_path ?? null;
    },
    recordClick: async (c) => {
      await sql`
        INSERT INTO analytics.click (click_ref, ts, session_id, anon_id, offer_id, product_id, variant_id, merchant_id,
          source_path, page_type, cta_id, position, utm, device, price_shown, is_bot, program_key)
        VALUES (${c.clickRef}, ${c.ts},
          ${c.sessionId && c.anonId && UUID.test(c.sessionId) ? sql`(SELECT id FROM analytics.session WHERE id = ${c.sessionId} AND anon_id = ${c.anonId})` : null},
          ${c.anonId}, ${c.offerId}, ${c.productId}, ${c.variantId}, ${c.merchantId},
          ${c.sourcePath}, ${c.pageType}, ${c.ctaId}, ${c.position}, ${sql.json(c.utm)}, ${c.device}, ${c.priceShown}, ${c.isBot}, ${c.programKey})`;
    },
    recordEvents: async (events, ctx) => {
      if (events.length === 0) return;
      const rows = events.map((e) => ({
        ts: ctx.ts, name: e.name, anon_id: ctx.anonId, session_id: ctx.sessionId ?? null, path: e.path,
        product_id: e.productId && UUID.test(e.productId) ? e.productId : null, props: e.props,
      }));
      await sql`INSERT INTO analytics.event ${sql(rows, "ts", "name", "anon_id", "session_id", "path", "product_id", "props")}`;
    },
    trackSession: async (s) => {
      if (s.sessionId && UUID.test(s.sessionId)) {
        const [cur] = await sql<{ last_seen_at: Date; utm_source: string | null; utm_campaign: string | null }[]>`
          SELECT last_seen_at, utm_source, utm_campaign FROM analytics.session WHERE id = ${s.sessionId} AND anon_id = ${s.anonId}`;
        const state = cur ? { lastSeenAt: cur.last_seen_at, utmSource: cur.utm_source, utmCampaign: cur.utm_campaign } : null;
        if (!needsNewSession(state, s.now, { source: s.utm.source, campaign: s.utm.campaign })) {
          await sql`UPDATE analytics.session SET last_seen_at = ${s.now} WHERE id = ${s.sessionId}`;
          return s.sessionId;
        }
      }
      const id = globalThis.crypto.randomUUID();
      const channel = classifyChannel({ referrerHost: s.referrerHost, utmMedium: s.utm.medium, utmSource: s.utm.source, gclid: s.gclid ? "1" : null, siteHost: s.siteHost });
      await sql`
        INSERT INTO analytics.session (id, anon_id, started_at, last_seen_at, landing_path, referrer_host,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term, channel, device)
        VALUES (${id}, ${s.anonId}, ${s.now}, ${s.now}, ${s.landingPath}, ${s.referrerHost},
          ${s.utm.source}, ${s.utm.medium}, ${s.utm.campaign}, ${s.utm.content}, ${s.utm.term}, ${channel}, ${s.device})`;
      return id;
    },
  };
}
