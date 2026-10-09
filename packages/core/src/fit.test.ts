import { describe, expect, it } from "vitest";
import { rankByFit, type FitCandidate } from "./fit.ts";
import type { ProductScores } from "./scoring.ts";

function scores(camera: number, performance: number): ProductScores {
  const c = (key: string, v: number) => ({ key, objective: v, adjust: 0, final: v, evidence: [] });
  return { methodologyVersion: "v1.0", overall: null, criteria: { camera: c("camera", camera), performance: c("performance", performance) } };
}

const cands: FitCandidate[] = [
  { id: "cam", scores: scores(9.5, 6), price: 3000, specs: { nfc: true, os: "android", screen_inches: 6.7 } },
  { id: "perf", scores: scores(6, 9.5), price: 2900, specs: { nfc: true, os: "android", screen_inches: 6.1 } },
  { id: "ios", scores: scores(9, 9), price: 2800, specs: { nfc: true, os: "ios", screen_inches: 6.1 } },
  { id: "pricey", scores: scores(10, 10), price: 5000, specs: { nfc: true, os: "android", screen_inches: 6.7 } },
];
const defaults = { camera: 0.5, performance: 0.5 };

describe("rankByFit", () => {
  it("ranks by user priorities", () => {
    const r = rankByFit(cands, { priorities: { camera: "high", performance: "low" }, exclude: { os: ["ios"] }, budgetMax: 3000 }, defaults);
    expect(r[0]!.id).toBe("cam");
  });

  it("eliminates by budget, os and size", () => {
    const r = rankByFit(cands, { priorities: {}, budgetMax: 3000, exclude: { os: ["ios"] }, ranges: { screen_inches: { max: 6.3 } } }, defaults);
    const ok = r.filter((x) => !x.eliminated).map((x) => x.id);
    expect(ok).toEqual(["perf"]);
    expect(r.find((x) => x.id === "pricey")!.reasons).toContain("acima do orçamento");
  });

  it("penalizes slightly over budget", () => {
    const r = rankByFit([cands[0]!], { priorities: { camera: "high" }, budgetMax: 2800 }, defaults);
    expect(r[0]!.eliminated).toBe(false);
    expect(r[0]!.reasons).toContain("levemente acima do orçamento");
  });
});
