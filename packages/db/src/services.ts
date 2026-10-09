/**
 * Serviços de leitura: montam os modelos de página a partir da fonte de dados (demo ou Postgres).
 * Toda a lógica de negócio vem de @veredito/core — notas, preço, melhor oferta, comparação.
 * Nenhuma função aqui lê comissão (firewall comercial).
 */
import {
  advertisedDiscount,
  autoConclusions,
  categories,
  comparisonRows,
  computePriceStats,
  criterionLabels,
  dealOpportunity,
  isMisleadingDiscount,
  priceVerdict,
  rankOffers,
  realDiscount,
  scoreProduct,
  winnersByCriterion,
  type CategoryConfig,
  type DailyPrice,
  type PriceStats,
  type PriceVerdict,
  type ProductScores,
  type RankedOffer,
} from "@veredito/core";
import type { AdvisorProduct, CatalogPort, Fact, KnowledgeDocument } from "@veredito/ai";
import { PROGRAMS } from "@veredito/integrations";
import type { ContentRow, DataSource, OfferRow, ProductRow } from "./source.ts";

export type OfferView = RankedOffer & { url: string; programKey: string; priceList: number | null; merchantId: string };

export interface VariantView {
  id: string;
  slug: string;
  label: string;
  offers: OfferView[];
  best: OfferView | null;
  series: DailyPrice[];
  stats: PriceStats;
  verdict: PriceVerdict;
  realDiscount: number | null;
  advertisedDiscount: number | null;
  misleadingDiscount: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  url: string;
  summary: string;
  specs: ProductRow["specs"];
  scores: ProductScores;
  bestPrice: number | null;
  bestMerchant: string | null;
  bestMerchantSlug: string | null;
  bestVariantSlug: string | null;
  verdict: PriceVerdict | null;
  isDemo: boolean;
  releaseDate: string | null;
}

export interface ProductPage {
  summary: ProductSummary;
  product: ProductRow;
  config: CategoryConfig;
  variants: VariantView[];
  selected: VariantView;
  review: ContentRow | null;
  alternatives: { role: "cheaper" | "premium" | "value" | "successor"; product: ProductSummary }[];
  guides: ContentRow[];
}

const DEFAULT_MAX_PRICE_AGE_H = 24;
export const BEST_MERCHANT = "melhor";

function maxAgeFor(programKey: string): number {
  return PROGRAMS.find((p) => p.key === programKey)?.terms.maxPriceAgeHours ?? DEFAULT_MAX_PRICE_AGE_H;
}

export function productUrl(category: string, slug: string): string {
  return `/${category}/${slug}`;
}

interface CategoryBundle {
  config: CategoryConfig;
  rows: ProductRow[];
  variants: Map<string, VariantView[]>;
  summaries: ProductSummary[];
}

export class CatalogService {
  private cache = new Map<string, { at: number; bundle: Promise<CategoryBundle> }>();

  readonly source: DataSource;
  private readonly ttlMs: number;

  constructor(source: DataSource, ttlMs = 60_000) {
    this.source = source;
    this.ttlMs = ttlMs;
  }

  /** "Agora" para frescor de preço: no modo demo, ancorado na data dos dados de demonstração. */
  now(): Date {
    return this.source.mode === "demo" ? new Date(`${this.source.today()}T18:00:00-03:00`) : new Date();
  }

  invalidate(): void {
    this.cache.clear();
  }

  private bundle(category: string): Promise<CategoryBundle> {
    const hit = this.cache.get(category);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.bundle;
    const bundle = this.build(category);
    this.cache.set(category, { at: Date.now(), bundle });
    bundle.catch(() => this.cache.delete(category));
    return bundle;
  }

  private async build(category: string): Promise<CategoryBundle> {
    const config = categories[category];
    if (!config) throw new Error(`Categoria desconhecida: ${category}`);
    const rows = await this.source.listProducts(category);
    const variantIds = rows.flatMap((r) => r.variants.map((v) => v.id));
    const [offers, series] = await Promise.all([this.source.listOffers(variantIds), this.source.getSeries(variantIds)]);
    const byVariant = new Map<string, OfferRow[]>();
    for (const o of offers) byVariant.set(o.variantId, [...(byVariant.get(o.variantId) ?? []), o]);
    const now = this.now();
    const today = this.source.today();

    const variants = new Map<string, VariantView[]>();
    for (const r of rows) {
      variants.set(r.id, r.variants.map((v) => this.variantView(v, byVariant.get(v.id) ?? [], series.get(v.id) ?? [], now, today)));
    }
    const bestOf = (r: ProductRow) =>
      (variants.get(r.id) ?? []).filter((v) => v.best).sort((a, b) => a.best!.total - b.best!.total)[0] ?? null;
    const population = rows.map((r) => ({ specs: r.specs, price: bestOf(r)?.best?.total ?? null }));

    const summaries = rows.map((r): ProductSummary => {
      const bv = bestOf(r);
      return {
        id: r.id, slug: r.slug, name: r.name, brand: r.brand, category, url: productUrl(category, r.slug), summary: r.summary,
        specs: r.specs,
        scores: scoreProduct({ specs: r.specs, price: bv?.best?.total ?? null, population, methodology: config.methodology }),
        bestPrice: bv?.best?.total ?? null, bestMerchant: bv?.best?.merchantName ?? null, bestMerchantSlug: bv?.best?.merchantSlug ?? null,
        bestVariantSlug: bv?.slug ?? r.variants[0]?.slug ?? null, verdict: bv?.verdict ?? null, isDemo: r.isDemo, releaseDate: r.releaseDate,
      };
    });
    return { config, rows, variants, summaries };
  }

  private variantView(
    v: ProductRow["variants"][number],
    offers: OfferRow[],
    rawSeries: DailyPrice[],
    now: Date,
    today: string,
  ): VariantView {
    const extra = new Map(offers.map((o) => [o.id, o]));
    const ranked = rankOffers(
      offers.map((o) => ({
        id: o.id, merchantSlug: o.merchantSlug, merchantName: o.merchantName, priceCash: o.priceCash, priceInstallment: o.priceInstallment,
        installments: o.installments, shippingCost: o.shippingCost, availability: o.availability, condition: o.condition,
        merchantTrust: o.merchantTrust, lastCheckedAt: o.lastCheckedAt, maxPriceAgeHours: maxAgeFor(o.programKey),
      })),
      now,
    ).map((o) => {
      const e = extra.get(o.id)!;
      return { ...o, url: e.url, programKey: e.programKey, priceList: e.priceList, merchantId: e.merchantId };
    });
    const best = ranked[0] ?? null;
    // O ponto de hoje da série é o menor preço exibível agora.
    const series = best ? [...rawSeries.filter((p) => p.day !== today), { day: today, min: best.total }] : rawSeries;
    const stats = computePriceStats(series, best?.total ?? null, today);
    const real = best ? realDiscount(best.total, stats.median90d) : null;
    const adv = best ? advertisedDiscount(best.priceCash!, best.priceList) : null;
    return {
      id: v.id, slug: v.slug, label: v.label, offers: ranked, best, series, stats, verdict: priceVerdict(stats),
      realDiscount: real, advertisedDiscount: adv, misleadingDiscount: isMisleadingDiscount(real, adv),
    };
  }

  async listCategory(category: string, sort: "relevance" | "price" | "score" = "relevance"): Promise<ProductSummary[]> {
    const { summaries } = await this.bundle(category);
    const list = [...summaries];
    if (sort === "price") list.sort((a, b) => (a.bestPrice ?? Infinity) - (b.bestPrice ?? Infinity));
    else list.sort((a, b) => (b.scores.overall ?? 0) - (a.scores.overall ?? 0));
    return list;
  }

  async getProductPage(category: string, slug: string, variantSlug?: string | null): Promise<ProductPage | null> {
    if (!categories[category]) return null;
    const b = await this.bundle(category);
    const product = b.rows.find((r) => r.slug === slug);
    if (!product) return null;
    const summary = b.summaries.find((s) => s.id === product.id)!;
    const variants = b.variants.get(product.id) ?? [];
    const selected = variants.find((v) => v.slug === variantSlug) ?? variants.find((v) => v.slug === summary.bestVariantSlug) ?? variants[0]!;
    const [reviews, guides] = await Promise.all([
      this.source.listContent({ type: "review", productSlug: slug }),
      this.source.listContent({ type: "best_list", productSlug: slug }),
    ]);
    return { summary, product, config: b.config, variants, selected, review: reviews[0] ?? null, alternatives: this.alternatives(summary, b), guides };
  }

  private alternatives(p: ProductSummary, b: CategoryBundle): ProductPage["alternatives"] {
    const others = b.summaries.filter((s) => s.id !== p.id && s.bestPrice != null);
    const out: ProductPage["alternatives"] = [];
    const used = new Set<string>();
    const push = (role: ProductPage["alternatives"][number]["role"], s: ProductSummary | undefined) => {
      if (s && !used.has(s.id)) {
        used.add(s.id);
        out.push({ role, product: s });
      }
    };
    const price = p.bestPrice ?? Infinity;
    const row = b.rows.find((r) => r.id === p.id);
    if (row?.successorSlug) push("successor", b.summaries.find((s) => s.slug === row.successorSlug));
    push("cheaper", others.filter((s) => s.bestPrice! <= price * 0.85).sort((a, c) => (c.scores.overall ?? 0) - (a.scores.overall ?? 0))[0]);
    push("premium", others.filter((s) => s.bestPrice! > price * 1.1).sort((a, c) => (c.scores.overall ?? 0) - (a.scores.overall ?? 0))[0]);
    push("value", others.sort((a, c) => (c.scores.criteria.value?.final ?? 0) - (a.scores.criteria.value?.final ?? 0))[0]);
    return out;
  }

  async compare(category: string, slugs: string[]) {
    const b = await this.bundle(category);
    const products = slugs.map((s) => b.summaries.find((x) => x.slug === s)).filter((x): x is ProductSummary => x != null).slice(0, 4);
    const criteria = b.config.methodology.criteria.map((c) => c.key);
    const compared = products.map((p) => ({ id: p.id, name: p.name, scores: p.scores, price: p.bestPrice }));
    return {
      config: b.config,
      products,
      rows: comparisonRows(products.map((p) => p.specs), b.config.compareAttrs),
      winners: winnersByCriterion(compared, criteria),
      conclusions: autoConclusions(compared, criteria, criterionLabels(b.config.methodology)),
    };
  }

  async deals(category: string, sort: "opportunity" | "real_discount" | "recent_drop" | "price" | "value" = "opportunity") {
    const b = await this.bundle(category);
    const items = b.summaries.flatMap((s) =>
      (b.variants.get(s.id) ?? [])
        .filter((v) => v.best)
        .map((v) => ({
          product: s,
          variant: v,
          opportunity: dealOpportunity({
            realDiscount: v.realDiscount,
            editorialScore: s.scores.overall,
            merchantTrust: v.best!.merchantTrust,
            inStock: v.best!.availability === "in_stock",
          }),
        })),
    );
    const key: Record<typeof sort, (x: (typeof items)[number]) => number> = {
      opportunity: (x) => -x.opportunity,
      real_discount: (x) => -(x.variant.realDiscount ?? -1),
      recent_drop: (x) => x.variant.stats.change["7d"] ?? 0,
      price: (x) => x.variant.best!.total,
      value: (x) => -(x.product.scores.criteria.value?.final ?? 0),
    };
    return items.filter((x) => sort !== "opportunity" || x.opportunity > 0).sort((a, c) => key[sort](a) - key[sort](c));
  }

  /** Resolve /go/{produto}/{loja}: oferta daquela loja na variante pedida (ou a melhor variante). Nunca aceita URL externa. */
  async resolveRedirect(productSlug: string, merchantSlug: string, variantSlug?: string | null) {
    for (const category of Object.keys(categories)) {
      const b = await this.bundle(category);
      const row = b.rows.find((r) => r.slug === productSlug);
      if (!row) continue;
      const vs = b.variants.get(row.id) ?? [];
      const pool = variantSlug ? vs.filter((v) => v.slug === variantSlug) : vs;
      // "melhor" = melhor oferta entre todas as lojas (usado quando a página não fixa uma loja).
      const candidates = pool
        .flatMap((v) => v.offers.filter((o) => merchantSlug === BEST_MERCHANT || o.merchantSlug === merchantSlug).map((o) => ({ v, o })))
        .sort((a, c) => a.o.total - c.o.total);
      const hit = candidates[0];
      return { product: row, summary: b.summaries.find((s) => s.id === row.id)!, hit: hit ?? null };
    }
    return null;
  }

  async bestList(path: string) {
    const content = (await this.source.listContent({ type: "best_list" })).find((c) => c.path === path);
    if (!content?.category) return null;
    const b = await this.bundle(content.category);
    const resolve = (slug: string) => b.summaries.find((s) => s.slug === slug) ?? null;
    return {
      content,
      picks: content.picks.map((p) => ({ ...p, product: resolve(p.productSlug) })).filter((p) => p.product),
      products: content.productSlugs.map(resolve).filter((x): x is ProductSummary => x != null),
    };
  }

  /** Conteúdo publicado num endereço (guias e explicadores). */
  async contentAt(path: string) {
    return (await this.source.listContent()).find((c) => c.path === path) ?? null;
  }

  /** Endereço novo de uma página que mudou (produto renomeado etc.), para responder 301 em vez de 404. */
  async redirectFor(path: string) {
    return this.source.findRedirect(path);
  }

  async listContent(type?: ContentRow["type"]) {
    return this.source.listContent(type ? { type } : undefined);
  }

  async allSummaries(): Promise<ProductSummary[]> {
    const lists = await Promise.all(Object.keys(categories).map((c) => this.bundle(c).then((b) => b.summaries)));
    return lists.flat();
  }

  /** Porta de catálogo do consultor (sem comissão). */
  catalogPort(): CatalogPort {
    return {
      listCandidates: async (category, opts) => {
        const b = await this.bundle(category);
        const brands = (opts?.brands ?? []).map((x) => x.toLowerCase());
        return b.summaries
          .filter((s) => s.bestPrice != null)
          .filter((s) => brands.length === 0 || brands.some((br) => s.brand.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(br)))
          .map((s): AdvisorProduct => ({
            id: s.id, slug: s.slug, name: s.name, brand: s.brand, category, url: s.url, specs: s.specs, scores: s.scores,
            bestPrice: s.bestPrice, bestMerchant: s.bestMerchant, priceVerdict: s.verdict,
          }));
      },
      getFacts: async (productId) => {
        for (const category of Object.keys(categories)) {
          const b = await this.bundle(category);
          const s = b.summaries.find((x) => x.id === productId);
          if (s) return productFacts(s, b.config, this.source.today(), this.source.mode === "demo");
        }
        return [];
      },
    };
  }

  /** Documentos publicados para o índice de RAG. */
  async knowledgeDocuments(): Promise<KnowledgeDocument[]> {
    const all = await this.allSummaries();
    const idBySlug = new Map(all.map((s) => [s.slug, s.id]));
    return (await this.source.listContent()).map((c) => ({
      id: c.id,
      type: c.type === "best_list" ? "best_list" : c.type,
      title: c.title,
      url: c.path,
      category: c.category,
      productIds: c.productSlugs.map((s) => idBySlug.get(s)).filter((x): x is string => x != null),
      publishedAt: c.publishedAt,
      updatedAt: c.updatedAt,
      evidenceLevel: c.evidenceLevel,
      sections: [...(c.intro ? [{ heading: "Introdução", text: c.intro }] : []), ...c.sections],
    }));
  }
}

export function productFacts(s: ProductSummary, config: CategoryConfig, today: string, demo: boolean): Fact[] {
  const source = demo ? "ficha técnica (dados de demonstração)" : "ficha técnica verificada";
  const facts: Fact[] = [];
  for (const a of config.attributes) {
    const value = s.specs[a.key];
    if (value == null || a.comparable === false) continue;
    const enumLabel = a.enumValues?.find((e) => e.key === value)?.label;
    facts.push({
      id: `${s.id}:${a.key}`, productId: s.id, key: a.key, label: `${a.label} do ${s.name}`,
      value: enumLabel ?? (value as string | number | boolean), unit: a.unit ?? null, source, lastVerifiedAt: today, confidence: 0.9,
    });
  }
  const labels = criterionLabels(config.methodology);
  for (const [k, c] of Object.entries(s.scores.criteria)) {
    if (c.final == null) continue;
    facts.push({ id: `${s.id}:score.${k}`, productId: s.id, key: `score.${k}`, label: `Nota de ${labels[k] ?? k} do ${s.name}`, value: c.final, unit: "/10", source: `metodologia ${s.scores.methodologyVersion}`, lastVerifiedAt: today, confidence: 1 });
  }
  if (s.scores.overall != null) {
    facts.push({ id: `${s.id}:score.overall`, productId: s.id, key: "score.overall", label: `Nota geral do ${s.name}`, value: s.scores.overall, unit: "/10", source: `metodologia ${s.scores.methodologyVersion}`, lastVerifiedAt: today, confidence: 1 });
  }
  if (s.bestPrice != null) {
    facts.push({ id: `${s.id}:price.best`, productId: s.id, key: "price.best", label: `Menor preço atual do ${s.name} (R$)`, value: s.bestPrice, unit: null, source: s.bestMerchant ?? "lojas", lastVerifiedAt: today, confidence: 0.9 });
  }
  if (s.verdict && s.verdict.label !== "insufficient_data") {
    facts.push({ id: `${s.id}:price.verdict`, productId: s.id, key: "price.verdict", label: `Avaliação do preço do ${s.name}`, value: s.verdict.text, unit: null, source: "histórico de preços", lastVerifiedAt: today, confidence: 0.9 });
  }
  return facts;
}
