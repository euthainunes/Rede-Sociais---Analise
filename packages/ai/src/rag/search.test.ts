import { describe, expect, it } from "vitest";
import { bestSnippet, HashingEmbedder, InMemoryKnowledgeStore, indexDocument, productSignals, searchKnowledge, type KnowledgeDocument } from "./index.ts";

const doc = (id: string, productIds: string[], title: string, sections: [string, string][], type: KnowledgeDocument["type"] = "review"): KnowledgeDocument => ({
  id, type, title, url: `/x/${id}`, category: "celulares", productIds,
  publishedAt: "2026-09-01", updatedAt: "2026-09-01", evidenceLevel: "data_based",
  sections: sections.map(([heading, text]) => ({ heading, text })),
});

async function setup() {
  const embedder = new HashingEmbedder(256);
  const store = new InMemoryKnowledgeStore();
  const docs = [
    doc("aurora", ["p1"], "Review Aurora X1", [
      ["Câmera", "O celular tem tela grande. A câmera principal tem estabilização óptica e foi a melhor do nosso teste noturno. O zoom é razoável."],
      ["Bateria", "A bateria durou 19 horas no teste de streaming."],
    ]),
    doc("orbita", ["p2"], "Review Órbita S", [["Desempenho", "Roda jogos pesados com estabilidade térmica e taxa de quadros alta."]]),
    doc("guia", ["p1", "p2", "p3", "p4"], "Melhores celulares até R$ 3.000", [["Resumo", "Quatro celulares com bom equilíbrio entre preço e bateria."]], "best_list"),
  ];
  for (const d of docs) await indexDocument(d, { embedder, store });
  return { embedder, store };
}

describe("searchKnowledge", () => {
  it("returns one hit per document with the sentence that answers", async () => {
    const hits = await searchKnowledge("câmera noturna boa", await setup());
    expect(hits[0]!.title).toBe("Review Aurora X1");
    expect(hits[0]!.snippet).toMatch(/^A câmera principal/);
    expect(new Set(hits.map((h) => h.documentId)).size).toBe(hits.length);
  });
  it("drops results that only match generic words", async () => {
    const deps = await setup();
    expect(await searchKnowledge("celular", deps, { minSimilarity: 0.99 })).toEqual([]);
    expect((await searchKnowledge("jogos pesados", deps)).map((h) => h.title)).toEqual(["Review Órbita S"]);
    expect(await searchKnowledge("  ", deps)).toEqual([]);
  });
});

describe("productSignals", () => {
  it("normalizes and dilutes multi-product documents", () => {
    const s = productSignals([
      { documentId: "a", title: "", url: "", docType: "review", heading: "", snippet: "", productIds: ["p1"], score: 0.03 },
      { documentId: "g", title: "", url: "", docType: "best_list", heading: "", snippet: "", productIds: ["p1", "p2", "p3", "p4"], score: 0.03 },
    ]);
    expect(s.get("p1")).toBe(1);
    expect(s.get("p2")).toBeCloseTo(0.015 / 0.045, 5);
  });
});

describe("bestSnippet", () => {
  it("trims long text on a word boundary", () => {
    const s = bestSnippet("Primeira frase sem nada. " + "palavra ".repeat(80), ["palavra"], 60);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("…")).toBe(true);
  });
});
