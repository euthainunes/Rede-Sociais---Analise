import { describe, expect, it } from "vitest";
import { AdjustmentError, percentileScore, scoreProduct, type Methodology } from "./scoring.ts";

const m: Methodology = {
  category: "test",
  version: "v1.0",
  editorialAdjustMax: 0.5,
  criteria: [
    { key: "battery", label: "Bateria", weight: 0.5, inputs: [{ attr: "mah", weight: 1, direction: "higher" }] },
    { key: "build", label: "Construção", weight: 0.3, inputs: [{ attr: "weight", weight: 1, direction: "lower" }] },
    { key: "value", label: "Custo-benefício", weight: 0.2, inputs: [], computed: "value_for_money" },
  ],
};

const pop = [
  { specs: { mah: 4000, weight: 200 }, price: 1000 },
  { specs: { mah: 4500, weight: 190 }, price: 1500 },
  { specs: { mah: 5000, weight: 180 }, price: 2000 },
  { specs: { mah: 5500, weight: 170 }, price: 3000 },
  { specs: { mah: 6000, weight: 160 }, price: 4000 },
];

describe("percentileScore", () => {
  it("maps extremes to 0 and 10 and handles direction", () => {
    const p = [1, 2, 3, 4, 5];
    expect(percentileScore(5, p, "higher")).toBe(10);
    expect(percentileScore(1, p, "higher")).toBe(0);
    expect(percentileScore(1, p, "lower")).toBe(10);
    expect(percentileScore(3, p, "higher")).toBe(5);
  });
});

describe("scoreProduct", () => {
  it("computes objective scores, overall and value for money", () => {
    const s = scoreProduct({ specs: pop[4]!.specs, price: 4000, population: pop, methodology: m });
    expect(s.criteria.battery!.final).toBe(10);
    expect(s.criteria.build!.final).toBe(10);
    expect(s.criteria.value!.final).not.toBeNull();
    expect(s.overall).not.toBeNull();
  });

  it("gives better value-for-money to a strong cheap product", () => {
    const cheapStrong = scoreProduct({ specs: { mah: 6000, weight: 160 }, price: 1000, population: pop, methodology: m });
    const expensiveWeak = scoreProduct({ specs: { mah: 4000, weight: 200 }, price: 4000, population: pop, methodology: m });
    expect(cheapStrong.criteria.value!.final!).toBeGreaterThan(expensiveWeak.criteria.value!.final!);
  });

  it("redistributes weight when a criterion has no data", () => {
    const s = scoreProduct({ specs: { mah: 6000 }, price: null, population: pop, methodology: m });
    expect(s.criteria.build!.final).toBeNull();
    expect(s.overall).toBe(10);
  });

  it("enforces editorial adjustment limits and justification", () => {
    const base = { specs: pop[2]!.specs, price: 2000, population: pop, methodology: m };
    expect(() => scoreProduct({ ...base, adjustments: { battery: { delta: 0.8, reason: "teste longo realizado" } } })).toThrow(AdjustmentError);
    expect(() => scoreProduct({ ...base, adjustments: { battery: { delta: 0.3, reason: "" } } })).toThrow(AdjustmentError);
    const s = scoreProduct({ ...base, adjustments: { battery: { delta: 0.3, reason: "autonomia real acima do esperado no teste" } } });
    expect(s.criteria.battery!.final).toBe(5.3);
  });
});
