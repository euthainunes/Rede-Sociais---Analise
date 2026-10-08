import { describe, expect, it } from "vitest";
import { celulares, classifyChannel, evaluateProgrammaticPage, generateClickRef, isLikelyBot, validateSpecs } from "./index.ts";

describe("tracking", () => {
  it("generates base62 refs", () => {
    const refs = new Set(Array.from({ length: 200 }, () => generateClickRef()));
    expect(refs.size).toBe(200);
    for (const r of refs) expect(r).toMatch(/^[0-9A-Za-z]{10}$/);
  });

  it("detects bots and prefetch", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isLikelyBot("curl/8.0")).toBe(true);
    const ua = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";
    expect(isLikelyBot(ua)).toBe(false);
    expect(isLikelyBot(ua, { secPurpose: "prefetch" })).toBe(true);
  });

  it("classifies channels", () => {
    expect(classifyChannel({ referrerHost: "www.google.com.br", siteHost: "x" })).toBe("organic");
    expect(classifyChannel({ referrerHost: "chatgpt.com", siteHost: "x" })).toBe("ai_referral");
    expect(classifyChannel({ referrerHost: "m.youtube.com", siteHost: "x" })).toBe("social");
    expect(classifyChannel({ utmMedium: "email", siteHost: "x" })).toBe("email");
    expect(classifyChannel({ gclid: "abc", siteHost: "x" })).toBe("paid");
    expect(classifyChannel({ siteHost: "x" })).toBe("direct");
  });
});

describe("quality gate", () => {
  it("blocks thin programmatic pages", () => {
    const r = evaluateProgrammaticPage({
      kind: "best_list", monthlySearchVolume: 20, gscImpressions28d: 0, qualifiedProducts: 3,
      hasEditorialIntro: false, hasEditorialPick: false, maxSiblingOverlap: 0.8, nextReviewAt: null,
    });
    expect(r.pass).toBe(false);
    expect(r.failures).toHaveLength(6);
  });
  it("passes a solid page", () => {
    expect(evaluateProgrammaticPage({
      kind: "best_list", monthlySearchVolume: 2400, gscImpressions28d: null, qualifiedProducts: 8,
      hasEditorialIntro: true, hasEditorialPick: true, maxSiblingOverlap: 0.4, nextReviewAt: "2026-12-01",
    }).pass).toBe(true);
  });
});

describe("category config", () => {
  it("methodology weights sum to 1 and reference known attributes", () => {
    const sum = celulares.methodology.criteria.reduce((a, c) => a + c.weight, 0);
    expect(sum).toBeCloseTo(1);
    const keys = new Set(celulares.attributes.map((a) => a.key));
    for (const c of celulares.methodology.criteria) for (const i of c.inputs) expect(keys.has(i.attr)).toBe(true);
    for (const a of celulares.compareAttrs) expect(keys.has(a)).toBe(true);
  });
  it("validates specs", () => {
    expect(validateSpecs(celulares, { battery_mah: 5000, nfc: true })).toEqual([]);
    expect(validateSpecs(celulares, { battery_mah: 50000, nfc: "sim", foo: 1 })).toHaveLength(3);
  });
});
