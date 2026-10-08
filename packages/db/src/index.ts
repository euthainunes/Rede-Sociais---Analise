export * from "./client.ts";
export * from "./source.ts";
export * from "./services.ts";
export { PgKnowledgeStore } from "./knowledge-store.ts";
export * as demoData from "./demo-data.ts";

import { getSql } from "./client.ts";
import { CatalogService } from "./services.ts";
import { createDemoSource, createPgSource } from "./source.ts";

let service: CatalogService | null = null;

/** Serviço compartilhado: Postgres se DATABASE_URL existir; senão, dados de demonstração. */
export function getCatalogService(): CatalogService {
  if (service) return service;
  const sql = getSql();
  service = new CatalogService(sql ? createPgSource(sql) : createDemoSource());
  return service;
}
