/**
 * Aplica migrações SQL em ordem, uma vez cada, dentro de transação (ops.schema_migration).
 * Uso: DATABASE_URL=... pnpm db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSql, type Sql } from "./client.ts";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export async function migrate(sql: Sql, dir = MIGRATIONS_DIR): Promise<string[]> {
  await sql`CREATE SCHEMA IF NOT EXISTS ops`;
  await sql`CREATE TABLE IF NOT EXISTS ops.schema_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done = new Set((await sql<{ name: string }[]>`SELECT name FROM ops.schema_migration`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const body = await readFile(join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO ops.schema_migration (name) VALUES (${f})`;
    });
    applied.push(f);
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
