import { cosine, normalizeForSearch } from "./embedder.ts";
import type { Chunk, EmbeddedChunk, KnowledgeStore, RetrievalFilter } from "./types.ts";

export function matchesFilter(c: Chunk, f?: RetrievalFilter): boolean {
  if (!f) return true;
  if (f.category && c.category && c.category !== f.category) return false;
  if (f.docTypes?.length && !f.docTypes.includes(c.docType)) return false;
  if (f.productIds?.length && c.productIds.length && !c.productIds.some((p) => f.productIds!.includes(p))) return false;
  return true;
}

/** Armazenamento em memória (dev/testes). Produção: PgKnowledgeStore (pgvector + FTS) em @veredito/db. */
export class InMemoryKnowledgeStore implements KnowledgeStore {
  private chunks = new Map<string, EmbeddedChunk>();

  async upsert(chunks: EmbeddedChunk[]): Promise<void> {
    for (const c of chunks) this.chunks.set(c.id, c);
  }

  async deleteDocument(documentId: string): Promise<void> {
    for (const [id, c] of this.chunks) if (c.documentId === documentId) this.chunks.delete(id);
  }

  async vectorSearch(embedding: number[], k: number, filter?: RetrievalFilter) {
    return [...this.chunks.values()]
      .filter((c) => matchesFilter(c, filter))
      .map((c) => ({ chunk: c as Chunk, score: cosine(embedding, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /** BM25 simplificado sobre o texto embedado. */
  async keywordSearch(query: string, k: number, filter?: RetrievalFilter) {
    const q = [...new Set(normalizeForSearch(query))];
    const docs = [...this.chunks.values()].filter((c) => matchesFilter(c, filter));
    const toks = docs.map((d) => normalizeForSearch(d.embeddingText));
    const avg = toks.reduce((a, t) => a + t.length, 0) / Math.max(toks.length, 1);
    const df = new Map(q.map((t) => [t, toks.filter((d) => d.includes(t)).length]));
    const N = docs.length;
    return docs
      .map((c, i) => {
        const d = toks[i]!;
        let score = 0;
        for (const t of q) {
          const tf = d.filter((x) => x === t).length;
          if (!tf) continue;
          const n = df.get(t)!;
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
          score += (idf * tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (d.length / avg)));
        }
        return { chunk: c as Chunk, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
