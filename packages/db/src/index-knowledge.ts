/** (Re)indexa o conteúdo publicado no RAG. Uso: DATABASE_URL=... pnpm --filter @veredito/db index-knowledge */
import { createEmbedder, indexDocument } from "@veredito/ai";
import { createSql } from "./client.ts";
import { PgKnowledgeStore } from "./knowledge-store.ts";
import { CatalogService } from "./services.ts";
import { createPgSource } from "./source.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definido");
const sql = createSql(url, { max: 2 });
const embedder = createEmbedder();
const store = new PgKnowledgeStore(sql, embedder.model);
const service = new CatalogService(createPgSource(sql));
let total = 0;
for (const doc of await service.knowledgeDocuments()) total += await indexDocument(doc, { embedder, store });
console.log(`Indexados ${total} trechos com ${embedder.model}.`);
await sql.end();
