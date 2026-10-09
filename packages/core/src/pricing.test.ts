import { describe, expect, it } from "vitest";
import {
  advertisedDiscount,
  computePriceStats,
  dealOpportunity,
  isMisleadingDiscount,
  isPriceAnomaly,
  median,
  priceVerdict,
  realDiscount,
  type DailyPrice,
} from "./pricing.ts";

function series(days: number, price: (i: number) => number, end = "2026-10-08"): DailyPrice[] {
  const endT = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: days }, (_, k) => {
    const i = days - 1 - k;
    return { day: new Date(endT - i * 86_400_000).toISOString().slice(0, 10), min: price(i) };
  });
}

describe("median", () => {
  it("handles odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("priceVerdict", () => {
  it("returns insufficient_data with less than 30 days", () => {
    const s = computePriceStats(series(10, () => 1000), 900, "2026-10-08");
    expect(priceVerdict(s).label).toBe("insufficient_data");
  });

  it("labels a price 9% below the 90d median as good", () => {
    const s = computePriceStats(series(120, (i) => (i % 10 === 0 ? 850 : 1000)), 910, "2026-10-08");
    const v = priceVerdict(s);
    expect(s.median90d).toBe(1000);
    expect(v.label).toBe("good");
    expect(v.deltaVsMedian90d).toBeCloseTo(-0.09);
    expect(v.text).toContain("9% abaixo da mediana dos últimos 90 dias");
  });

  it("labels at or near the 90d minimum as excellent", () => {
    const s = computePriceStats(series(120, (i) => (i === 40 ? 800 : 1000)), 810, "2026-10-08");
    expect(priceVerdict(s).label).toBe("excellent");
  });

  it("labels normal and high", () => {
    const flat = series(120, () => 1000);
    expect(priceVerdict(computePriceStats(flat, 1030, "2026-10-08")).label).toBe("normal");
    expect(priceVerdict(computePriceStats(flat, 1100, "2026-10-08")).label).toBe("high");
  });

  it("mentions all-time low", () => {
    const s = computePriceStats(series(120, () => 1000), 700, "2026-10-08");
    expect(priceVerdict(s).text).toContain("menor preço que já registramos");
  });
});

describe("computePriceStats", () => {
  it("computes changes against past prices", () => {
    const s = computePriceStats(series(400, (i) => 1000 + i), 1000, "2026-10-08");
    expect(s.change["30d"]).toBeCloseTo(1000 / 1030 - 1, 3);
    expect(s.change["365d"]).toBeCloseTo(1000 / 1365 - 1, 3);
    expect(s.minAllTime).toBe(1000);
    expect(s.maxAllTime).toBe(1399);
  });

  it("returns null change when there is no data that far back", () => {
    const s = computePriceStats(series(40, () => 1000), 900, "2026-10-08");
    expect(s.change["90d"]).toBeNull();
    expect(s.change["30d"]).toBeCloseTo(-0.1);
  });
});

describe("discounts", () => {
  it("detects misleading advertised discounts", () => {
    const real = realDiscount(940, 1000);
    const adv = advertisedDiscount(940, 1566);
    expect(real).toBeCloseTo(0.06);
    expect(adv).toBeCloseTo(0.4, 2);
    expect(isMisleadingDiscount(real, adv)).toBe(true);
    expect(isMisleadingDiscount(0.2, 0.25)).toBe(false);
  });

  it("flags anomalies beyond ±60%", () => {
    expect(isPriceAnomaly(300, 1000)).toBe(true);
    expect(isPriceAnomaly(900, 1000)).toBe(false);
  });

  it("deal opportunity ignores out of stock and price increases", () => {
    expect(dealOpportunity({ realDiscount: 0.2, editorialScore: 8, merchantTrust: 1, inStock: false })).toBe(0);
    expect(dealOpportunity({ realDiscount: -0.1, editorialScore: 8, merchantTrust: 1, inStock: true })).toBe(0);
    expect(dealOpportunity({ realDiscount: 0.2, editorialScore: 8, merchantTrust: 0.9, inStock: true })).toBeCloseTo(0.144);
  });
});
