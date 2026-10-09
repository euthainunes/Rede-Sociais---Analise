/**
 * Banco descartável por arquivo de teste de integração: isola os testes entre si
 * (rodam em paralelo) e permite rodar várias vezes sem lixo de execuções anteriores.
 */
import { createSql, type Sql } from "./client.ts";
import { migrate } from "./migrate.ts";
import { seedDemo } from "./seed.ts";

export async function createTestDatabase(baseUrl: string, name: string): Promise<{ sql: Sql; url: string; drop: () => Promise<void> }> {
  const dbName = `vt_${name}_${process.pid}_${Date.now().toString(36)}`.replace(/[^a-z0-9_]/g, "_");
  const admin = createSql(baseUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE ${dbName}`);
  const url = new URL(baseUrl);
  url.pathname = `/${dbName}`;
  const sql = createSql(url.toString(), { max: 4, onnotice: () => {} });
  await migrate(sql);
  await seedDemo(sql);
  return {
    sql,
    url: url.toString(),
    drop: async () => {
      await sql.end();
      await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await admin.end();
    },
  };
}
