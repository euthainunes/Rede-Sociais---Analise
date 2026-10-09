import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

let shared: Sql | null = null;

/**
 * Poolers em modo transação (Supabase na porta 6543, PgBouncer) não aceitam prepared statements.
 * Hospedagem serverless (Netlify, Vercel) deve usar esse pooler; aí o prepare é desligado sozinho.
 */
export function usesTransactionPooler(url: string, env: Record<string, string | undefined> = process.env): boolean {
  if (env.DATABASE_PREPARE === "false") return true;
  if (env.DATABASE_PREPARE === "true") return false;
  try {
    const u = new URL(url);
    return u.port === "6543" || u.searchParams.get("pgbouncer") === "true";
  } catch {
    return false;
  }
}

/** Conexão compartilhada por processo. `DATABASE_URL` ausente = modo demonstração (sem banco). */
export function getSql(url = process.env.DATABASE_URL): Sql | null {
  if (!url) return null;
  shared ??= postgres(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 5), idle_timeout: 20, prepare: !usesTransactionPooler(url) });
  return shared;
}

export function createSql(url: string, options: postgres.Options<Record<string, postgres.PostgresType>> = {}): Sql {
  return postgres(url, { max: 5, ...options });
}
