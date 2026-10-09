import { parseBrlNumber, parseCsvObjects } from "../csv.ts";
import type { AffiliateAdapter, ClickContext, CommissionStatus, RawConversion, RawOffer } from "./types.ts";

/**
 * Awin (rede de afiliados): deeplink com `clickref` por clique → atribuição exata.
 * Feed de produtos em CSV (colunas configuráveis; padrão segue o layout comum do feed Awin).
 */
export interface AwinConfig {
  publisherId: string;
  advertiserId: string;
  key?: string;
  columns?: Partial<Record<keyof typeof DEFAULT_COLUMNS, string>>;
}

const DEFAULT_COLUMNS = {
  externalId: "merchant_product_id",
  title: "product_name",
  url: "merchant_deep_link",
  price: "search_price",
  listPrice: "rrp_price",
  shipping: "delivery_cost",
  inStock: "in_stock",
  gtin: "ean",
  mpn: "mpn",
  brand: "brand_name",
  image: "merchant_image_url",
  condition: "condition",
} as const;

export function createAwinAdapter(config: AwinConfig): AffiliateAdapter {
  const col = { ...DEFAULT_COLUMNS, ...config.columns };
  return {
    key: config.key ?? `awin_${config.advertiserId}`,
    fidelity: "click",
    buildAffiliateUrl(originalUrl: string, ctx: ClickContext): string {
      new URL(originalUrl); // valida
      const u = new URL("https://www.awin1.com/cread.php");
      u.searchParams.set("awinmid", config.advertiserId);
      u.searchParams.set("awinaffid", config.publisherId);
      u.searchParams.set("clickref", ctx.clickRef);
      u.searchParams.set("clickref2", ctx.channel);
      u.searchParams.set("ued", originalUrl);
      return u.toString();
    },
    parseFeed(content: string): RawOffer[] {
      return parseCsvObjects(content)
        .map((r): RawOffer | null => {
          const externalId = r[col.externalId];
          const url = r[col.url];
          if (!externalId || !url) return null;
          const inStock = (r[col.inStock] ?? "").toLowerCase();
          const cond = (r[col.condition] ?? "new").toLowerCase();
          return {
            externalId,
            title: r[col.title] ?? "",
            url,
            priceCash: parseBrlNumber(r[col.price]),
            priceList: parseBrlNumber(r[col.listPrice]),
            shippingCost: parseBrlNumber(r[col.shipping]),
            availability: inStock === "" ? "unknown" : ["1", "yes", "true", "sim"].includes(inStock) ? "in_stock" : "out_of_stock",
            condition: cond.startsWith("refurb") ? "refurbished" : cond === "used" ? "used" : "new",
            gtin: r[col.gtin] || null,
            mpn: r[col.mpn] || null,
            brand: r[col.brand] || null,
            imageUrl: r[col.image] || null,
          };
        })
        .filter((x): x is RawOffer => x != null);
    },
    parseConversions(content: string): RawConversion[] {
      return parseCsvObjects(content).map((r) => ({
        externalId: r.transaction_id ?? r.id ?? "",
        clickRef: r.click_ref || r.clickref || null,
        trackingTag: null,
        orderedAt: r.transaction_date ?? r.date ?? "",
        orderValue: parseBrlNumber(r.sale_amount) ?? 0,
        commission: parseBrlNumber(r.commission_amount) ?? 0,
        status: mapAwinStatus(r.commission_status ?? r.status ?? ""),
        raw: r,
      })).filter((c) => c.externalId);
    },
  };
}

export function mapAwinStatus(s: string): CommissionStatus {
  switch (s.toLowerCase()) {
    case "approved":
      return "approved";
    case "declined":
    case "deleted":
      return "reversed";
    case "paid":
      return "paid";
    case "pending":
      return "validating";
    default:
      return "estimated";
  }
}
