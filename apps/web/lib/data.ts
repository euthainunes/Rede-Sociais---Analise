import "server-only";
import { getCatalogService } from "@veredito/db";

/** Serviço de catálogo (Postgres com DATABASE_URL; senão, dados de demonstração). */
export const catalog = () => getCatalogService();

/** Dados de demonstração nunca são indexados. */
export const isDemo = () => catalog().source.mode === "demo";
