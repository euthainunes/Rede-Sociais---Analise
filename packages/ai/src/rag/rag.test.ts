import { describe, expect, it } from "vitest";
import {
  HashingEmbedder,
  InMemoryKnowledgeStore,
  buildGroundedContext,
  chunkDocument,
  extractNumbers,
  indexDocument,
  retrieve,
  validateGrounding,
  type Fact,
  type KnowledgeDocument,
} from "./index.ts";

const doc = (id: string, productId: string, title: string, sections: [string, string][]): KnowledgeDocument => ({
  id, type: "review", title, url: `/celulares/${id}`, category: "celulares", productIds: [productId],
  publishedAt: "2026-09-01", updatedAt: "2026-09-01", evidenceLevel: "hands_on",
  sections: sections.map(([heading, text]) => ({ heading, text })),
});

const docs = [
  doc("aurora-x1", "p1", "Review Aurora X1", [
    ["Câmera", "A câmera principal do Aurora X1 tem estabilização óptica e foi a melhor do nosso teste noturno."],
    ["Bateria", "No teste de streaming a bateria durou 19 horas, acima da média da categoria."],
  ]),
  doc("orbita-s", "p2", "Review Órbita S", [
    ["Desempenho", "O Órbita S roda jogos pesados com estabilidade térmica e taxa de quadros alta."],
    ["Câmera", "A câmera é apenas razoável à noite."],
  ]),
];

async function setup() {
  const embedder = new HashingEmbedder(256);
  const store = new InMemoryKnowledgeStore();
  for (const d of docs) await indexDocument(d, { embedder, store });
  return { embedder, store };
}

describe("chunker", () => {
  it("chunks by section with contextual header and stable ids", () => {
    const c = chunkDocument(docs[0]!);
    expect(c).toHaveLength(2);
    expect(c[0]!.embeddingText.startsWith("Review Aurora X1 › Câmera\n")).toBe(true);
    expect(c[0]!.id).toBe("aurora-x1#0");
    expect(c[0]!.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("splits long sections with overlap", () => {
    const long = Array.from({ length: 40 }, (_, i) => `Parágrafo ${i} com bastante texto sobre o produto e seus detalhes.`).join("\n\n");
    const c = chunkDocument(doc("x", "p", "T", [["S", long]]), { maxChars: 400, overlapChars: 80 });
    expect(c.length).toBeGreaterThan(5);
    expect(c.every((x) => x.text.length <= 520)).toBe(true);
  });
});

describe("hybrid retrieval", () => {
  it("finds the right section for a query", async () => {
    const deps = await setup();
    const r = await retrieve("qual tem a melhor bateria no teste de streaming", deps, { k: 2 });
    expect(r[0]!.chunk.headingPath).toBe("Review Aurora X1 › Bateria");
    expect(r[0]!.ranks.keyword).toBe(1);
  });

  it("respects product filters and per-document caps", async () => {
    const deps = await setup();
    const r = await retrieve("câmera", deps, { k: 4, filter: { productIds: ["p2"] } });
    expect(r.every((x) => x.chunk.productIds.includes("p2"))).toBe(true);
    const capped = await retrieve("câmera bateria desempenho", deps, { k: 10, maxPerDocument: 1 });
    expect(new Set(capped.map((x) => x.chunk.documentId)).size).toBe(capped.length);
  });

  it("reindexing replaces old chunks", async () => {
    const deps = await setup();
    await indexDocument(doc("aurora-x1", "p1", "Review Aurora X1", [["Bateria", "Texto novo sem a palavra antiga."]]), deps);
    const r = await retrieve("streaming", deps, { k: 5 });
    expect(r.some((x) => x.chunk.text.includes("19 horas"))).toBe(false);
  });
});

describe("grounding", () => {
  const facts: Fact[] = [
    { id: "1", productId: "p1", key: "battery_mah", label: "Bateria do Aurora X1", value: 5000, unit: "mAh", source: "fabricante", lastVerifiedAt: "2026-09-01", confidence: 0.95 },
    { id: "2", productId: "p1", key: "price.best", label: "Menor preço do Aurora X1", value: 2499, unit: "R$", source: "Loja A", lastVerifiedAt: "2026-10-08", confidence: 0.9 },
    { id: "3", productId: "p1", key: "ram_gb", label: "RAM", value: 8, unit: "GB", source: "loja", lastVerifiedAt: "2026-09-01", confidence: 0.4 },
  ];

  it("extracts pt-BR numbers with units", () => {
    expect(extractNumbers("Custa R$ 2.499 e tem 8 GB, tela de 6,7 pol e 120Hz [F1]")).toEqual([2499, 8, 6.7, 120]);
  });

  it("accepts grounded answers and rejects invented numbers and citations", async () => {
    const deps = await setup();
    const chunks = await retrieve("bateria streaming", deps, { k: 1 });
    const ctx = buildGroundedContext(facts, chunks);
    expect(ctx.facts.size).toBe(2); // fato de baixa confiança fica de fora
    expect(ctx.text).toContain('<documento id="D1"');
    expect(validateGrounding("Tem bateria de 5.000 mAh [F1], durou 19 horas [D1] e custa R$ 2.499 [F2].", ctx).ok).toBe(true);
    const bad = validateGrounding("Tem 12 GB de RAM [F3] e custa R$ 1.999 [F9].", ctx);
    expect(bad.ok).toBe(false);
    expect(bad.unsupportedNumbers).toEqual([12, 1999]);
    expect(bad.unknownCitations).toEqual(["F3", "F9"]);
  });
});
