import "server-only";
import {
  InMemoryKnowledgeStore,
  createEmbedder,
  createLlmClient,
  indexDocument,
  runAdvisor,
  type AdvisorInput,
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
