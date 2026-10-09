import { chunkDocument, type ChunkOptions } from "./chunker.ts";
import type { Embedder, KnowledgeDocument, KnowledgeStore, RetrievalFilter, ScoredChunk } from "./types.ts";

/** Indexa (ou reindexa) um documento publicado: remove trechos antigos, chunk, embed, upsert. */
export async function indexDocument(
  doc: KnowledgeDocument,
  deps: { embedder: Embedder; store: KnowledgeStore },
  options?: ChunkOptions,
): Promise<number> {
  const chunks = chunkDocument(doc, options);
  await deps.store.deleteDocument(doc.id);
  if (chunks.length === 0) return 0;
  const vectors = await deps.embedder.embed(chunks.map((c) => c.embeddingText), "document");
  await deps.store.upsert(chunks.map((c, i) => ({ ...c, embedding: vectors[i]! })));
  return chunks.length;
}

export interface RetrieveOptions {
  k?: number;
  /** Candidatos por lista antes da fusão. */
  candidates?: number;
  /** Máximo de trechos do mesmo documento no resultado. */
  maxPerDocument?: number;
  filter?: RetrievalFilter;
  /** Constante da Reciprocal Rank Fusion. */
  rrfK?: number;
}

/**
 * Busca híbrida: vetor (semântica) + palavra-chave (nomes de modelos, números, siglas),
 * fundidas por Reciprocal Rank Fusion, com limite de trechos por documento para diversidade.
 */
export async function retrieve(
  query: string,
  deps: { embedder: Embedder; store: KnowledgeStore },
  options: RetrieveOptions = {},
): Promise<ScoredChunk[]> {
  const { k = 6, candidates = 20, maxPerDocument = 2, filter, rrfK = 60 } = options;
  const [qv] = await deps.embedder.embed([query], "query");
  const [vec, kw] = await Promise.all([
    deps.store.vectorSearch(qv!, candidates, filter),
    deps.store.keywordSearch(query, candidates, filter),
  ]);
  const fused = new Map<string, ScoredChunk>();
  vec.forEach((r, i) => {
    const cur = fused.get(r.chunk.id) ?? { chunk: r.chunk, score: 0, ranks: {} };
    cur.score += 1 / (rrfK + i + 1);
    cur.ranks.vector = i + 1;
    cur.similarity = r.score;
    fused.set(r.chunk.id, cur);
  });
  kw.forEach((r, i) => {
    const cur = fused.get(r.chunk.id) ?? { chunk: r.chunk, score: 0, ranks: {} };
    cur.score += 1 / (rrfK + i + 1);
    cur.ranks.keyword = i + 1;
    fused.set(r.chunk.id, cur);
  });
  const perDoc = new Map<string, number>();
  const out: ScoredChunk[] = [];
  for (const r of [...fused.values()].sort((a, b) => b.score - a.score)) {
    const n = perDoc.get(r.chunk.documentId) ?? 0;
    if (n >= maxPerDocument) continue;
    perDoc.set(r.chunk.documentId, n + 1);
    out.push(r);
    if (out.length >= k) break;
  }
  return out;
}
