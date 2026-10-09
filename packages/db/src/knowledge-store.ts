/** Armazenamento do RAG em Postgres: pgvector (HNSW, cosseno) + busca textual em português. */
import type { Chunk, EmbeddedChunk, KnowledgeStore, RetrievalFilter } from "@veredito/ai";
import type { Sql } from "./client.ts";

function toVector(v: number[]): string {
  return `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : "0")).join(",")}]`;
}

function rowToChunk(r: Record<string, any>): Chunk {
  return {
    id: r.id, documentId: r.document_id, docType: r.doc_type, title: r.title, url: r.url, headingPath: r.heading_path,
    category: r.category, productIds: r.product_ids, text: r.text, embeddingText: r.embedding_text,
    tokenEstimate: r.token_estimate, updatedAt: new Date(r.updated_at).toISOString(), contentHash: r.content_hash,
  };
}

export class PgKnowledgeStore implements KnowledgeStore {
  private readonly sql: Sql;
  private readonly embeddingModel: string;
  constructor(sql: Sql, embeddingModel: string) {
    this.sql = sql;
    this.embeddingModel = embeddingModel;
  }

  private where(f?: RetrievalFilter) {
    const sql = this.sql;
    return sql`
      ${f?.category ? sql`AND (category = ${f.category} OR category IS NULL)` : sql``}
      ${f?.docTypes?.length ? sql`AND doc_type = ANY(${f.docTypes})` : sql``}
      ${f?.productIds?.length ? sql`AND (cardinality(product_ids) = 0 OR product_ids && ${f.productIds}::text[])` : sql``}`;
  }

  async upsert(chunks: EmbeddedChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    const first = chunks[0]!;
    await this.sql.begin(async (tx) => {
      await tx`
        INSERT INTO ai.knowledge_document (id, type, title, url, category, product_ids, published_at, updated_at, embedding_model)
        VALUES (${first.documentId}, ${first.docType}, ${first.title}, ${first.url}, ${first.category}, ${first.productIds}::text[],
                ${first.updatedAt}, ${first.updatedAt}, ${this.embeddingModel})
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, url = EXCLUDED.url, category = EXCLUDED.category,
          product_ids = EXCLUDED.product_ids, updated_at = EXCLUDED.updated_at, indexed_at = now(), embedding_model = EXCLUDED.embedding_model`;
      for (const c of chunks) {
        await tx`
          INSERT INTO ai.knowledge_chunk (id, document_id, doc_type, title, url, heading_path, category, product_ids, text,
            embedding_text, token_estimate, content_hash, updated_at, embedding)
          VALUES (${c.id}, ${c.documentId}, ${c.docType}, ${c.title}, ${c.url}, ${c.headingPath}, ${c.category}, ${c.productIds}::text[],
            ${c.text}, ${c.embeddingText}, ${c.tokenEstimate}, ${c.contentHash}, ${c.updatedAt}, ${toVector(c.embedding)}::vector)
          ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, embedding_text = EXCLUDED.embedding_text, heading_path = EXCLUDED.heading_path,
            product_ids = EXCLUDED.product_ids, token_estimate = EXCLUDED.token_estimate, content_hash = EXCLUDED.content_hash,
            updated_at = EXCLUDED.updated_at, embedding = EXCLUDED.embedding`;
      }
    });
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.sql`DELETE FROM ai.knowledge_document WHERE id = ${documentId}`;
  }

  async vectorSearch(embedding: number[], k: number, filter?: RetrievalFilter) {
    const rows = await this.sql`
      SELECT *, 1 - (embedding <=> ${toVector(embedding)}::vector) AS score
      FROM ai.knowledge_chunk WHERE true ${this.where(filter)}
      ORDER BY embedding <=> ${toVector(embedding)}::vector LIMIT ${k}`;
    return rows.map((r) => ({ chunk: rowToChunk(r), score: Number(r.score) }));
  }

  async keywordSearch(query: string, k: number, filter?: RetrievalFilter) {
    const rows = await this.sql`
      SELECT *, ts_rank_cd(tsv, q) AS score
      FROM ai.knowledge_chunk, websearch_to_tsquery('portuguese', ${query}) q
      WHERE tsv @@ q ${this.where(filter)}
      ORDER BY score DESC LIMIT ${k}`;
    if (rows.length > 0) return rows.map((r) => ({ chunk: rowToChunk(r), score: Number(r.score) }));
    // Consultas em linguagem natural raramente casam com AND de todos os termos: tenta OR.
    const terms = query.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    if (terms.length === 0) return [];
    const orRows = await this.sql`
      SELECT *, ts_rank_cd(tsv, q) AS score
      FROM ai.knowledge_chunk, to_tsquery('portuguese', ${terms.join(" | ")}) q
      WHERE tsv @@ q ${this.where(filter)}
      ORDER BY score DESC LIMIT ${k}`;
    return orRows.map((r) => ({ chunk: rowToChunk(r), score: Number(r.score) }));
  }
}
