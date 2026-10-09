/**
 * Worker do Veredito. Dois modos:
 *   pnpm --filter @veredito/worker start           → processo contínuo com agendador interno
 *   pnpm --filter @veredito/worker once <job|all>  → roda uma vez e sai (para cron externo: GitHub Actions, cron do host)
 *
 * Várias instâncias podem rodar ao mesmo tempo: cada job usa advisory lock no Postgres.
 */
import { createSql } from "@veredito/db";
import { JOBS, runJob, type JobDefinition } from "@veredito/db/jobs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definido");
  process.exit(1);
}
const sql = createSql(url, { max: 4, onnotice: () => {} });

function log(msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), msg, ...extra }));
}

/** Pede ao site que descarte caches após mudanças de dados (opcional). */
async function revalidateSite() {
  const web = process.env.WEB_URL;
  const token = process.env.INTERNAL_TOKEN;
  if (!web || !token) return;
  try {
    const res = await fetch(new URL("/api/internal/revalidate", web), { method: "POST", headers: { "x-internal-token": token }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) log("revalidate falhou", { status: res.status });
  } catch (e) {
    log("revalidate falhou", { error: e instanceof Error ? e.message : String(e) });
  }
}

async function execute(job: JobDefinition) {
  const started = Date.now();
  const r = await runJob(sql, job, { now: new Date(), net: {}, log });
  log(`job ${job.name}`, { status: r.status, ms: Date.now() - started, ...(r.result ?? {}), ...(r.error ? { error: r.error } : {}) });
  if (r.status === "ok" && job.affectsSite) await revalidateSite();
  return r.status;
}

const args = process.argv.slice(2);
if (args[0] === "--once") {
  const name = args[1] ?? "all";
  const selected = name === "all" ? JOBS : JOBS.filter((j) => j.name === name);
  if (selected.length === 0) {
    console.error(`Job desconhecido. Disponíveis: ${JOBS.map((j) => j.name).join(", ")}`);
    process.exit(1);
  }
  let failed = false;
  for (const j of selected) failed = (await execute(j)) === "error" || failed;
  await sql.end();
  process.exit(failed ? 1 : 0);
}

// Modo contínuo: verifica a cada minuto quais jobs estão vencidos.
const lastRun = new Map<string, number>();
let stopping = false;
let running = 0;

async function tick() {
  for (const job of JOBS) {
    if (stopping) return;
    const due = (lastRun.get(job.name) ?? 0) + job.everyMinutes * 60_000 <= Date.now();
    if (!due) continue;
    lastRun.set(job.name, Date.now());
    running++;
    try {
      await execute(job);
    } catch (e) {
      log(`job ${job.name} quebrou`, { error: e instanceof Error ? e.message : String(e) });
    } finally {
      running--;
    }
  }
}

log("worker iniciado", { jobs: JOBS.map((j) => `${j.name}/${j.everyMinutes}min`) });
await tick();
const timer = setInterval(() => void tick(), 60_000);

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  log("encerrando", { signal });
  while (running > 0) await new Promise((r) => setTimeout(r, 200));
  await sql.end();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
