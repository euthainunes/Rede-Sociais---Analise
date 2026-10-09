/**
 * Tipos do RAG (docs/20-rag.md). Duas camadas de conhecimento:
 *  1. Fatos estruturados (specs, notas, preços) — vêm do banco por ferramentas determinísticas, nunca de vetores.
 *  2. Conhecimento editorial (reviews, guias, metodologia, explicadores publicados) — recuperado por busca híbrida.
 */

export type KnowledgeDocType = "review" | "comparison" | "best_list" | "guide" | "methodology" | "faq" | "policy";

export interface KnowledgeDocument {
  id: string;
  type: KnowledgeDocType;
  title: string;
  url: string;
  category: string | null;
  productIds: string[];
  /** Só conteúdo publicado e revisado entra no índice. */
  publishedAt: string;
  updatedAt: string;
  evidenceLevel: "hands_on" | "data_based" | null;
  sections: { heading: string; text: string }[];
}

export interface Chunk {
  id: string;
  documentId: string;
  docType: KnowledgeDocType;
  title: string;
  url: string;
  headingPath: string;
  category: string | null;
  productIds: string[];
  text: string;
  /** Texto efetivamente embedado: cabeçalho contextual + trecho. */
  embeddingText: string;
  tokenEstimate: number;
  updatedAt: string;
  contentHash: string;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

export interface RetrievalFilter {
  category?: string | null;
  productIds?: string[];
  docTypes?: KnowledgeDocType[];
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
  /** Posição em cada lista antes da fusão (diagnóstico). */
  ranks: { vector?: number; keyword?: number };
  /** Similaridade de cosseno com a consulta, quando o trecho veio da busca vetorial. */
  similarity?: number;
}

/** Fato verificável com proveniência (camada 1). */
export interface Fact {
  id: string;
  productId: string | null;
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string | null;
  source: string;
  lastVerifiedAt: string;
  confidence: number;
}

export interface Embedder {
  readonly model: string;
  readonly dimension: number;
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
}

export interface KnowledgeStore {
  upsert(chunks: EmbeddedChunk[]): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  vectorSearch(embedding: number[], k: number, filter?: RetrievalFilter): Promise<{ chunk: Chunk; score: number }[]>;
  keywordSearch(query: string, k: number, filter?: RetrievalFilter): Promise<{ chunk: Chunk; score: number }[]>;
}
