import { describe, expect, it } from "vitest";
import { extractStorage, matchListing, normalizeText, type VariantCandidate } from "./matching.ts";

const cands: VariantCandidate[] = [
  { variantId: "x1-256", brand: "Nébula", model: "Aurora X1", axes: { storage: "256gb", color: "preto" }, gtin: "7890000000011" },
  { variantId: "x1-512", brand: "Nébula", model: "Aurora X1", axes: { storage: "512gb", color: "preto" } },
  { variantId: "x1pro-256", brand: "Nébula", model: "Aurora X1 Pro", axes: { storage: "256gb", color: "preto" } },
];

describe("normalization", () => {
  it("strips accents and joins units", () => {
    expect(normalizeText("Nébula Aurora X1 256 GB")).toBe("nebula aurora x1 256gb");
  });
  it("extracts storage ignoring RAM", () => {
    expect(extractStorage("Smartphone 8GB RAM 256GB")).toBe("256gb");
    expect(extractStorage("Celular 12GB 1TB")).toBe("1tb");
    expect(extractStorage("Celular sem info")).toBeNull();
  });
});

describe("matchListing", () => {
  it("matches by GTIN with full confidence", () => {
    const r = matchListing({ title: "qualquer coisa", gtin: "7890000000011" }, cands);
    expect(r.best).toMatchObject({ variantId: "x1-256", method: "gtin", score: 1 });
    expect(r.auto).toBe(true);
  });

  it("matches by title and storage", () => {
    const r = matchListing({ title: "Smartphone Nebula Aurora X1 512GB Preto 5G" }, cands);
    expect(r.best!.variantId).toBe("x1-512");
    expect(r.auto).toBe(true);
  });

  it("does not confuse base model with Pro", () => {
    const r = matchListing({ title: "Nebula Aurora X1 Pro 256GB" }, cands);
    expect(r.best!.variantId).toBe("x1pro-256");
  });

  it("sends listings without storage to human review", () => {
    const r = matchListing({ title: "Nebula Aurora X1 Preto" }, cands);
    expect(r.auto).toBe(false);
  });

  it("rejects other brands", () => {
    expect(matchListing({ title: "Outra Marca Aurora X1 256GB" }, cands).best).toBeNull();
  });
});
