import { parseBrlNumber, parseCsvObjects } from "../csv.ts";
import type { AffiliateAdapter, AttributionFidelity, ClickContext, CommissionStatus, RawConversion, RawOffer } from "./types.ts";

/**
 * Adaptador genérico por template — usado para programas cujo formato de link é obtido no painel
 * do programa (Mercado Livre, Magalu, Shopee, lojas oficiais) até termos integração por API.
 *
 * Placeholders: {url} {url_encoded} {click_ref} {channel} {page_type}
 */
export interface TemplateConfig {
  key: string;
  fidelity: AttributionFidelity;
  linkTemplate: string;
  allowedHosts: string[];
  /** Mapeamento de colunas para feed CSV manual/planilha. */
  feedColumns?: Partial<Record<FeedField, string>>;
  conversionColumns?: Partial<Record<ConversionField, string>>;
  statusMap?: Record<string, CommissionStatus>;
}

type FeedField = "externalId" | "title" | "url" | "price" | "listPrice" | "installmentPrice" | "installments" | "shipping" | "availability" | "gtin" | "mpn" | "brand" | "seller" | "condition";
type ConversionField = "externalId" | "clickRef" | "tag" | "orderedAt" | "orderValue" | "commission" | "status";

const FEED_DEFAULTS: Record<FeedField, string> = {
  externalId: "id", title: "titulo", url: "url", price: "preco_a_vista", listPrice: "preco_de",
  installmentPrice: "preco_parcelado", installments: "parcelas", shipping: "frete", availability: "disponibilidade",
  gtin: "gtin", mpn: "mpn", brand: "marca", seller: "vendedor", condition: "condicao",
};
const CONV_DEFAULTS: Record<ConversionField, string> = {
  externalId: "pedido", clickRef: "sub_id", tag: "tag", orderedAt: "data", orderValue: "valor", commission: "comissao", status: "status",
};

export function fillTemplate(template: string, originalUrl: string, ctx: ClickContext): string {
  return template
    .replaceAll("{url_encoded}", encodeURIComponent(originalUrl))
    .replaceAll("{url}", originalUrl)
    .replaceAll("{click_ref}", encodeURIComponent(ctx.clickRef))
    .replaceAll("{channel}", encodeURIComponent(ctx.channel))
    .replaceAll("{page_type}", encodeURIComponent(ctx.pageType));
}

export function createTemplateAdapter(config: TemplateConfig): AffiliateAdapter {
  const fc = { ...FEED_DEFAULTS, ...config.feedColumns };
  const cc = { ...CONV_DEFAULTS, ...config.conversionColumns };
  return {
    key: config.key,
    fidelity: config.fidelity,
    buildAffiliateUrl(originalUrl, ctx) {
      const host = new URL(originalUrl).hostname;
      if (!config.allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
        throw new Error(`Host não permitido para ${config.key}: ${host}`);
      }
      const out = fillTemplate(config.linkTemplate, originalUrl, ctx);
      new URL(out); // template precisa produzir URL válida
      return out;
    },
    parseFeed(content) {
      return parseCsvObjects(content)
        .map((r): RawOffer | null => {
          if (!r[fc.externalId] || !r[fc.url]) return null;
          const a = (r[fc.availability] ?? "").toLowerCase();
          const c = (r[fc.condition] ?? "novo").toLowerCase();
          return {
            externalId: r[fc.externalId]!,
            title: r[fc.title] ?? "",
            url: r[fc.url]!,
            priceCash: parseBrlNumber(r[fc.price]),
            priceList: parseBrlNumber(r[fc.listPrice]),
            priceInstallment: parseBrlNumber(r[fc.installmentPrice]),
            installments: parseBrlNumber(r[fc.installments]),
            shippingCost: parseBrlNumber(r[fc.shipping]),
            availability: a === "" ? "unknown" : /^(sim|em estoque|in_stock|1|true)$/.test(a) ? "in_stock" : "out_of_stock",
            condition: c.startsWith("recond") || c.startsWith("refurb") ? "refurbished" : c.startsWith("usad") || c === "used" ? "used" : c.startsWith("import") ? "imported" : "new",
            gtin: r[fc.gtin] || null,
            mpn: r[fc.mpn] || null,
            brand: r[fc.brand] || null,
            sellerName: r[fc.seller] || null,
          };
        })
        .filter((x): x is RawOffer => x != null);
    },
    parseConversions(content): RawConversion[] {
      return parseCsvObjects(content)
        .map((r) => ({
          externalId: r[cc.externalId] ?? "",
          clickRef: r[cc.clickRef] || null,
          trackingTag: r[cc.tag] || null,
          orderedAt: r[cc.orderedAt] ?? "",
          orderValue: parseBrlNumber(r[cc.orderValue]) ?? 0,
          commission: parseBrlNumber(r[cc.commission]) ?? 0,
          status: config.statusMap?.[(r[cc.status] ?? "").toLowerCase()] ?? "estimated",
          raw: r,
        }))
        .filter((c) => c.externalId);
    },
  };
}
