import { describe, expect, it } from "vitest";
import { ATTRIBUTION_MODELS, classifyChannel, needsNewSession, SESSION_IDLE_MS, touchWeights } from "./index.ts";

describe("touchWeights", () => {
  it("always sums to 1", () => {
    for (const m of ATTRIBUTION_MODELS) {
      for (const n of [1, 2, 3, 5, 20]) {
        const w = touchWeights(n, m);
        expect(w).toHaveLength(n);
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      }
    }
  });
  it("applies each model", () => {
    expect(touchWeights(3, "last")).toEqual([0, 0, 1]);
    expect(touchWeights(3, "first")).toEqual([1, 0, 0]);
    expect(touchWeights(4, "linear")).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(touchWeights(4, "position")).toEqual([0.4, 0.1, 0.1, 0.4]);
    expect(touchWeights(2, "position")).toEqual([0.5, 0.5]);
    expect(touchWeights(0, "linear")).toEqual([]);
  });
});

describe("needsNewSession", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const cur = { lastSeenAt: new Date(now.getTime() - 60_000), utmSource: "newsletter", utmCampaign: "2026-W41" };
  it("keeps an active session", () => {
    expect(needsNewSession(cur, now, { source: null, campaign: null })).toBe(false);
    expect(needsNewSession(cur, now, { source: "newsletter", campaign: "2026-W41" })).toBe(false);
  });
  it("starts a new one after idle time, on another campaign or with none", () => {
    expect(needsNewSession(null, now, { source: null, campaign: null })).toBe(true);
    expect(needsNewSession({ ...cur, lastSeenAt: new Date(now.getTime() - SESSION_IDLE_MS - 1) }, now, { source: null, campaign: null })).toBe(true);
    expect(needsNewSession(cur, now, { source: "newsletter", campaign: "2026-W42" })).toBe(true);
    expect(needsNewSession(cur, now, { source: "instagram", campaign: null })).toBe(true);
  });
});

describe("classifyChannel with utm_source", () => {
  it("treats tagged links without referrer as campaigns, not direct", () => {
    expect(classifyChannel({ utmSource: "newsletter", siteHost: "x" })).toBe("email");
    expect(classifyChannel({ utmSource: "instagram", siteHost: "x" })).toBe("social");
    expect(classifyChannel({ utmSource: "parceiro", siteHost: "x" })).toBe("referral");
    expect(classifyChannel({ referrerHost: "x", siteHost: "x" })).toBe("direct");
  });
});
