import "server-only";
import {
  InMemoryKnowledgeStore,
  createEmbedder,
  createLlmClient,
  indexDocument,
  runAdvisor,
  searchKnowledge,
  type AdvisorInput,
  type KnowledgeHit,
  type KnowledgeStore,
} from "@veredito/ai";
import { categories } from "@veredito/core";
import { PgKnowledgeStore, getSql } from "@veredito/db";
import { catalog } from "./data";

const embedder = createEmbedder();
let storePromise: Promise<KnowledgeStore> | null = null;

/** Com banco: índice pgvector (preenchido por `index-knowledge`). Sem banco: índice em memória criado sob demanda. */
function store(): Promise<KnowledgeStore> {
  storePromise ??= (async () => {
    const sql = getSql();
    if (sql) return new PgKnowledgeStore(sql, embedder.model);
    const mem = new InMemoryKnowledgeStore();
    for (const d of await catalog().knowledgeDocuments()) await indexDocument(d, { embedder, store: mem });
    return mem;
  })();
  storePromise.catch(() => (storePromise = null));
  return storePromise;
}

const llm = createLlmClient();

export async function advise(input: AdvisorInput) {
  return runAdvisor(input, { catalog: catalog().catalogPort(), embedder, store: await store(), llm, categories });
}

export const advisorMode = () => (llm ? "llm" : "template");

/** Guias e análises relevantes para a busca. Falha de índice não derruba a página: volta lista vazia. */
export async function searchContent(q: string, category: string | null): Promise<KnowledgeHit[]> {
  if (!q.trim()) return [];
  try {
    return await searchKnowledge(q, { embedder, store: await store() }, { k: 4, filter: category ? { category } : undefined });
  } catch (e) {
    console.error("search_content_failed", e instanceof Error ? e.message : e);
    return [];
  }
}
