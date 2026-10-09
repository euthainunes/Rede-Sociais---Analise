import "server-only";
import { getCatalogService } from "@veredito/db";

/** Serviço de catálogo (Postgres com DATABASE_URL; senão, dados de demonstração). */
export const catalog = () => getCatalogService();

/**
 * Dados de demonstração nunca são indexados. Com banco, o site só sai do modo demonstração quando
 * SITE_LIVE=1 — ligar o banco com dados fictícios não pode publicar nada no Google por engano.
 */
export const isDemo = () => catalog().source.mode === "demo" || process.env.SITE_LIVE !== "1";
