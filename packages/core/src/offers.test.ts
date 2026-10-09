import { describe, expect, it } from "vitest";
import { bestOffer, rankOffers, type OfferForRanking } from "./offers.ts";

const now = new Date("2026-10-08T15:00:00Z");
const base: Omit<OfferForRanking, "id" | "merchantSlug" | "priceCash"> = {
  merchantName: "Loja",
  availability: "in_stock",
  condition: "new",
  merchantTrust: 0.8,
  lastCheckedAt: "2026-10-08T12:00:00Z",
  maxPriceAgeHours: 24,
};

describe("rankOffers", () => {
  it("prefers lowest total price including shipping", () => {
    const r = rankOffers([
      { ...base, id: "a", merchantSlug: "a", priceCash: 1000, shippingCost: 100 },
      { ...base, id: "b", merchantSlug: "b", priceCash: 1050, shippingCost: 0 },
    ], now);
    expect(r[0]!.id).toBe("b");
  });

  it("drops stale, out-of-stock and price-less offers", () => {
    const r = rankOffers([
      { ...base, id: "stale", merchantSlug: "s", priceCash: 900, lastCheckedAt: "2026-10-06T12:00:00Z" },
      { ...base, id: "oos", merchantSlug: "o", priceCash: 900, availability: "out_of_stock" },
      { ...base, id: "none", merchantSlug: "n", priceCash: null },
      { ...base, id: "ok", merchantSlug: "k", priceCash: 1000 },
    ], now);
    expect(r.map((x) => x.id)).toEqual(["ok"]);
  });

  it("breaks near-ties by merchant trust and ranks new before refurbished", () => {
    const best = bestOffer([
      { ...base, id: "cheap-low-trust", merchantSlug: "x", priceCash: 1000, merchantTrust: 0.5 },
      { ...base, id: "trusted", merchantSlug: "y", priceCash: 1005, merchantTrust: 0.95 },
      { ...base, id: "refurb", merchantSlug: "z", priceCash: 700, condition: "refurbished" },
    ], now);
    expect(best!.id).toBe("trusted");
  });
});
