import { describe, expect, it } from "vitest";
import { suggest, type SuggestionEntry } from "./index.ts";

const index: SuggestionEntry[] = [
  { kind: "product", label: "Nébula Aurora X1", url: "/celulares/nebula-aurora-x1", hint: "R$ 2.870", keywords: ["Nébula"], weight: 5.8 },
  { kind: "product", label: "Nébula Aurora X1 Pro", url: "/celulares/nebula-aurora-x1-pro", keywords: ["Nébula"], weight: 7.7 },
  { kind: "product", label: "Órbita S9", url: "/celulares/orbita-s9", keywords: ["Órbita"], weight: 5.5 },
  { kind: "category", label: "Celulares", url: "/celulares", keywords: ["smartphone"] },
  { kind: "brand", label: "Órbita", url: "/celulares?marca=orbita" },
  { kind: "guide", label: "Melhores celulares até R$ 3.000", url: "/melhores/celulares-ate-3000", hint: "Guia" },
];

describe("suggest", () => {
  it("matches word prefixes, ignoring accents and case", () => {
    expect(suggest("aur x1", index).map((s) => s.label)).toEqual(["Nébula Aurora X1 Pro", "Nébula Aurora X1"]);
    expect(suggest("ORBI", index).map((s) => s.label)).toEqual(["Órbita", "Órbita S9"]);
  });
  it("ranks label-prefix first, then by kind and weight", () => {
    expect(suggest("cel", index).map((s) => s.kind)).toEqual(["category", "guide"]);
    expect(suggest("nebula", index)[0]!.label).toBe("Nébula Aurora X1 Pro");
  });
  it("uses keywords as a weaker match", () => {
    expect(suggest("smartph", index).map((s) => s.label)).toEqual(["Celulares"]);
  });
  it("ignores too-short or unmatched queries and respects the limit", () => {
    expect(suggest("a", index)).toEqual([]);
    expect(suggest("  ", index)).toEqual([]);
    expect(suggest("xyz", index)).toEqual([]);
    expect(suggest("n", index)).toEqual([]);
    expect(suggest("aurora", index, 1)).toHaveLength(1);
  });
  it("does not leak internal fields", () => {
    expect(suggest("orbita s9", index)[0]).toEqual({ kind: "product", label: "Órbita S9", url: "/celulares/orbita-s9" });
  });
});
