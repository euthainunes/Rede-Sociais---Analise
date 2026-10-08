/**
 * Aplica migrações SQL em ordem, uma vez cada, dentro de transação (ops.schema_migration).
 * Uso: DATABASE_URL=... pnpm db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSql, type Sql } from "./client.ts";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const LOCK_KEY = 727_274_001;

/** Seguro para execução concorrente (vários pods/testes): cada migração roda sob advisory lock. */
export async function migrate(sql: Sql, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const f of files) {
    const body = await readFile(join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      await tx`CREATE SCHEMA IF NOT EXISTS ops`;
      await tx`CREATE TABLE IF NOT EXISTS ops.schema_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
      const [done] = await tx`SELECT 1 FROM ops.schema_migration WHERE name = ${f}`;
      if (done) return;
      await tx.unsafe(body);
      await tx`INSERT INTO ops.schema_migration (name) VALUES (${f})`;
      applied.push(f);
    });
  }
  return applied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definido");
  const sql = createSql(url, { max: 1, onnotice: () => {} });
  const applied = await migrate(sql);
  await sql`SELECT ops.ensure_partitions(2)`;
  console.log(applied.length ? `Aplicadas: ${applied.join(", ")}` : "Nada a aplicar.");
  await sql.end();
}
