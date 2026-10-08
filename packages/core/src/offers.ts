/**
 * Escolha da "melhor oferta" entre lojas (docs/13 §13.9).
 * Critérios: preço total, disponibilidade, frescor, condição e confiabilidade.
 * O tipo não tem campo de comissão — por construção, comissão não influencia.
 */

export type Availability = "in_stock" | "out_of_stock" | "preorder" | "unknown";
export type Condition = "new" | "refurbished" | "used" | "imported";

export interface OfferForRanking {
  id: string;
  merchantSlug: string;
  merchantName: string;
  priceCash: number | null;
  priceInstallment?: number | null;
  installments?: number | null;
  shippingCost?: number | null;
  availability: Availability;
  condition: Condition;
  merchantTrust: number;
  lastCheckedAt: string;
  /** Idade máxima exigida pelo programa para exibir o preço. */
  maxPriceAgeHours: number;
}

export interface RankedOffer extends OfferForRanking {
  total: number;
  isFresh: boolean;
}

/** Ofertas com preço exibível (frescas, com preço), ordenadas da melhor para a pior. */
export function rankOffers(offers: readonly OfferForRanking[], now: Date = new Date()): RankedOffer[] {
  const ranked = offers
    .filter((o) => o.priceCash != null && o.availability !== "out_of_stock")
    .map((o) => {
      const ageH = (now.getTime() - Date.parse(o.lastCheckedAt)) / 3_600_000;
      return { ...o, total: o.priceCash! + (o.shippingCost ?? 0), isFresh: ageH <= o.maxPriceAgeHours };
    })
    .filter((o) => o.isFresh);

  const conditionRank: Record<Condition, number> = { new: 0, imported: 1, refurbished: 2, used: 3 };
  return ranked.sort((a, b) => {
    const cond = conditionRank[a.condition] - conditionRank[b.condition];
    if (cond !== 0) return cond;
    const avail = Number(a.availability !== "in_stock") - Number(b.availability !== "in_stock");
    if (avail !== 0) return avail;
    // Empate técnico (≤ 1%): vence a loja mais confiável.
    const rel = Math.abs(a.total - b.total) / Math.min(a.total, b.total);
    if (rel <= 0.01 && a.merchantTrust !== b.merchantTrust) return b.merchantTrust - a.merchantTrust;
    return a.total - b.total;
  });
}

export function bestOffer(offers: readonly OfferForRanking[], now?: Date): RankedOffer | null {
  return rankOffers(offers, now)[0] ?? null;
}
