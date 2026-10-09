import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

let shared: Sql | null = null;

/** Conexão compartilhada por processo. `DATABASE_URL` ausente = modo demonstração (sem banco). */
export function getSql(url = process.env.DATABASE_URL): Sql | null {
  if (!url) return null;
  shared ??= postgres(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 5), idle_timeout: 20, prepare: true });
  return shared;
}

export function createSql(url: string, options: postgres.Options<Record<string, postgres.PostgresType>> = {}): Sql {
  return postgres(url, { max: 5, ...options });
}
