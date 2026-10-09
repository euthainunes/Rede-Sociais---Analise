import type { Availability, Condition } from "@veredito/core";

export type AttributionFidelity = "click" | "tag" | "aggregate";

/** Restrições contratuais de cada programa. Valores marcados "verify" exigem leitura dos termos vigentes. */
export interface ProgramTerms {
  maxPriceAgeHours: number;
  allowAffiliateLinksInEmail: boolean;
  priceHistoryStorage: "allowed" | "forbidden" | "verify";
  subAffiliationAllowed: boolean | "verify";
  brandBiddingAllowed: boolean | "verify";
  disclosureRequired: true;
}

export interface ClickContext {
  clickRef: string;
  /** Canal/tipo de página — usado como tag quando o programa não aceita sub-ID. */
  channel: string;
  pageType: string;
}

export interface RawOffer {
  externalId: string;
  title: string;
  url: string;
  priceCash: number | null;
  priceList?: number | null;
  priceInstallment?: number | null;
  installments?: number | null;
  shippingCost?: number | null;
  availability: Availability;
  condition: Condition;
  gtin?: string | null;
  mpn?: string | null;
  brand?: string | null;
  sellerName?: string | null;
  imageUrl?: string | null;
}

export type CommissionStatus = "estimated" | "validating" | "approved" | "invoiced" | "paid" | "reversed";

export interface RawConversion {
  externalId: string;
  clickRef: string | null;
  trackingTag: string | null;
  orderedAt: string;
  orderValue: number;
  commission: number;
  status: CommissionStatus;
  raw: Record<string, string>;
}

export interface AffiliateAdapter {
  readonly key: string;
  readonly fidelity: AttributionFidelity;
  /** Gera a URL afiliada no momento do clique. Nunca armazenada como verdade. */
  buildAffiliateUrl(originalUrl: string, ctx: ClickContext): string;
  /** Converte um feed (CSV/JSON já baixado) em ofertas brutas. */
  parseFeed?(content: string): RawOffer[];
  /** Converte um relatório de conversões em registros idempotentes. */
  parseConversions?(content: string): RawConversion[];
}
