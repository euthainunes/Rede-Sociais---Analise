/**
 * Jobs do worker (docs/07 §7.6, docs/13 §13.7, docs/16 §16.4). Cada job é idempotente e pode rodar
 * em paralelo em várias instâncias: o executor (runJob) garante exclusão mútua com advisory lock.
 */
import { randomUUID } from "node:crypto";
import type { Sql } from "../client.ts";
import { audit } from "../admin/audit.ts";
import { refreshInternalAlerts } from "../admin/dashboard.ts";
import { importOffers, type FeedFormat } from "../admin/offers.ts";
import { evaluatePriceAlerts } from "../people/alerts.ts";
import { createMailer, deliverOutbox } from "../people/email.ts";
import { checkLink, fetchText, type NetOptions } from "./net.ts";

export interface JobContext {
  sql: Sql;
  now: Date;
  net: NetOptions;
  log: (msg: string, extra?: Record<string, unknown>) => void;
}

export type JobResult = Record<string, unknown>;

/** Baixa e importa os feeds cujo intervalo venceu. */
export async function fetchFeeds(ctx: JobContext, limit = 10): Promise<JobResult> {
  const due = await ctx.sql<{ id: string; url: string; format: FeedFormat; merchant: string; program_key: string | null }[]>`
    SELECT f.id, f.url, f.format, m.name AS merchant, m.program_key
    FROM ops.feed_source f JOIN commerce.merchant m ON m.id = f.merchant_id
    WHERE f.active AND (f.last_run_at IS NULL OR f.last_run_at + make_interval(mins => f.interval_minutes) <= ${ctx.now})
    ORDER BY f.last_run_at NULLS FIRST LIMIT ${limit}`;
  let ok = 0, failed = 0, offers = 0;
  for (const f of due) {
    try {
      const content = await fetchText(f.url, ctx.net);
      const stats = await importOffers(ctx.sql, null, { merchantName: f.merchant, programKey: f.program_key, format: f.format, content });
      offers += stats.auto;
      await ctx.sql`UPDATE ops.feed_source SET last_run_at = ${ctx.now}, last_status = 'ok', last_error = NULL WHERE id = ${f.id}`;
      await ctx.sql`UPDATE ops.internal_alert SET status = 'resolved', resolved_at = now() WHERE kind = 'feed_error' AND entity_id = ${f.id} AND status = 'open'`;
      ok++;
      ctx.log("feed importado", { merchant: f.merchant, ...stats });
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.sql`UPDATE ops.feed_source SET last_run_at = ${ctx.now}, last_status = 'error', last_error = ${msg.slice(0, 500)} WHERE id = ${f.id}`;
      await ctx.sql`
        INSERT INTO ops.internal_alert (id, kind, severity, entity_type, entity_id, details)
        VALUES (${randomUUID()}, 'feed_error', 'high', 'feed_source', ${f.id}, ${ctx.sql.json({ title: `${f.merchant}: ${msg.slice(0, 200)}` } as never)})
        ON CONFLICT (kind, entity_type, entity_id) WHERE status = 'open' DO UPDATE SET details = EXCLUDED.details`;
      ctx.log("feed falhou", { merchant: f.merchant, error: msg });
    }
  }
  return { due: due.length, ok, failed, autoMatched: offers };
}

/**
 * Fecha o histórico diário a partir das observações: para cada oferta, a última observação do dia
 * (sem anomalias, em estoque); por variante, menor / mediana / maior preço total e nº de lojas.
 */
export async function rollupDay(sql: Sql, day: string): Promise<number> {
  const rows = await sql`
    WITH last_obs AS (
      SELECT DISTINCT ON (po.offer_id) po.offer_id, po.variant_id, o.merchant_id,
             po.price_cash + coalesce(po.shipping_cost, 0) AS total, po.availability
      FROM pricing.price_observation po JOIN commerce.offer o ON o.id = po.offer_id
      WHERE po.observed_at >= ${day}::date AND po.observed_at < ${day}::date + 1
        AND NOT po.is_anomaly AND po.price_cash IS NOT NULL AND o.match_status IN ('auto','confirmed')
      ORDER BY po.offer_id, po.observed_at DESC
    )
    INSERT INTO pricing.price_daily (variant_id, day, min_price, median_price, max_price, min_merchant_id, merchants_count, in_stock_count)
    SELECT variant_id, ${day}::date, min(total), percentile_cont(0.5) WITHIN GROUP (ORDER BY total), max(total),
           (array_agg(merchant_id ORDER BY total))[1], count(DISTINCT merchant_id), count(*)
    FROM last_obs WHERE availability = 'in_stock'
    GROUP BY variant_id
    ON CONFLICT (variant_id, day) DO UPDATE SET min_price = EXCLUDED.min_price, median_price = EXCLUDED.median_price,
      max_price = EXCLUDED.max_price, min_merchant_id = EXCLUDED.min_merchant_id,
      merchants_count = EXCLUDED.merchants_count, in_stock_count = EXCLUDED.in_stock_count
    RETURNING variant_id`;
  return rows.length;
}

export async function rollupDaily(ctx: JobContext): Promise<JobResult> {
  const today = ctx.now.toISOString().slice(0, 10);
  const yesterday = new Date(ctx.now.getTime() - 86_400_000).toISOString().slice(0, 10);
  // Ontem também, para fechar o dia anterior com as últimas observações da madrugada.
  return { yesterday: await rollupDay(ctx.sql, yesterday), today: await rollupDay(ctx.sql, today) };
}

/** Verifica os links das ofertas que estão há mais tempo sem checagem. */
export async function checkLinks(ctx: JobContext, limit = 40): Promise<JobResult> {
  const offers = await ctx.sql<{ id: string; url_original: string; title_raw: string }[]>`
    SELECT id, url_original, title_raw FROM commerce.offer
    WHERE status = 'active' ORDER BY last_link_check_at NULLS FIRST LIMIT ${limit}`;
  const tally: Record<string, number> = {};
  for (const o of offers) {
    const r = await checkLink(o.url_original, ctx.net);
    tally[r.outcome] = (tally[r.outcome] ?? 0) + 1;
    await ctx.sql`
      INSERT INTO ops.link_check (offer_id, checked_at, http_status, final_url, redirect_chain, outcome)
      VALUES (${o.id}, ${ctx.now}, ${r.status}, ${r.finalUrl}, ${ctx.sql.json(r.chain)}, ${r.outcome})`;
    if (r.outcome === "broken" || r.outcome === "redirected_home") {
      await ctx.sql`UPDATE commerce.offer SET status = 'broken', last_link_check_at = ${ctx.now} WHERE id = ${o.id}`;
    } else if (r.outcome === "unavailable") {
      await ctx.sql`UPDATE commerce.offer SET availability = 'out_of_stock', last_link_check_at = ${ctx.now} WHERE id = ${o.id}`;
    } else {
      // "error" (timeout, 5xx, bloqueio) não muda a oferta: só registra e tenta de novo depois.
      await ctx.sql`UPDATE commerce.offer SET last_link_check_at = ${ctx.now} WHERE id = ${o.id}`;
    }
  }
  return { checked: offers.length, ...tally };
}

/** Ofertas que nenhuma fonte confirma há 7 dias deixam de existir no site (o histórico fica). */
export async function expireStaleOffers(ctx: JobContext, days = 7): Promise<JobResult> {
  const rows = await ctx.sql`
    UPDATE commerce.offer SET status = 'expired'
    WHERE status = 'active' AND last_checked_at < ${new Date(ctx.now.getTime() - days * 86_400_000)} RETURNING id`;
  return { expired: rows.length };
}

/** Conteúdo publicado com revisão vencida vai para "Atualização necessária" (continua no ar). */
export async function flagContentForReview(ctx: JobContext): Promise<JobResult> {
  const rows = await ctx.sql<{ id: string }[]>`
    UPDATE editorial.content SET status = 'needs_update', updated_at = now()
    WHERE status = 'published' AND next_review_at < ${ctx.now.toISOString().slice(0, 10)}::date RETURNING id`;
  for (const r of rows) await audit(ctx.sql, null, "content.auto_needs_update", { type: "content", id: r.id });
  return { flagged: rows.length };
}

export async function refreshAlerts(ctx: JobContext): Promise<JobResult> {
  return refreshInternalAlerts(ctx.sql);
}

export async function maintainPartitions(ctx: JobContext): Promise<JobResult> {
  await ctx.sql`SELECT ops.ensure_partitions(2)`;
  return { ok: true };
}

export async function evaluateAlerts(ctx: JobContext): Promise<JobResult> {
  return evaluatePriceAlerts(ctx.sql, ctx.now);
}

export async function sendEmails(ctx: JobContext): Promise<JobResult> {
  return deliverOutbox(ctx.sql, createMailer());
}

export interface JobDefinition {
  name: string;
  everyMinutes: number;
  run: (ctx: JobContext) => Promise<JobResult>;
  /** Mudanças visíveis no site: pede revalidação das páginas após rodar. */
  affectsSite: boolean;
}

export const JOBS: JobDefinition[] = [
  { name: "fetch-feeds", everyMinutes: 5, run: fetchFeeds, affectsSite: true },
  { name: "rollup-daily", everyMinutes: 30, run: rollupDaily, affectsSite: true },
  { name: "check-links", everyMinutes: 15, run: checkLinks, affectsSite: true },
  { name: "expire-stale-offers", everyMinutes: 60, run: expireStaleOffers, affectsSite: true },
  { name: "flag-content-review", everyMinutes: 60, run: flagContentForReview, affectsSite: false },
  { name: "refresh-alerts", everyMinutes: 30, run: refreshAlerts, affectsSite: false },
  { name: "evaluate-price-alerts", everyMinutes: 30, run: evaluateAlerts, affectsSite: false },
  { name: "send-emails", everyMinutes: 1, run: sendEmails, affectsSite: false },
  { name: "maintain-partitions", everyMinutes: 24 * 60, run: maintainPartitions, affectsSite: false },
];

const LEASE_MINUTES = 30;

/** Adquire o lease do job (linha em ops.job_lock). Não prende conexão: seguro com pool pequeno. */
async function acquire(sql: Sql, job: string, holder: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO ops.job_lock (job, locked_until, holder) VALUES (${job}, now() + make_interval(mins => ${LEASE_MINUTES}), ${holder})
    ON CONFLICT (job) DO UPDATE SET locked_until = EXCLUDED.locked_until, holder = EXCLUDED.holder
      WHERE ops.job_lock.locked_until < now()
    RETURNING job`;
  return rows.length === 1;
}

async function release(sql: Sql, job: string, holder: string): Promise<void> {
  await sql`UPDATE ops.job_lock SET locked_until = now() WHERE job = ${job} AND holder = ${holder}`;
}

/**
 * Executa um job com exclusão mútua entre instâncias (lease no Postgres, expira em 30 min se o processo cair)
 * e registra a execução em ops.job_run. Se outra instância já está rodando, retorna "skipped".
 */
export async function runJob(sql: Sql, job: JobDefinition, ctx: Omit<JobContext, "sql">): Promise<{ status: "ok" | "error" | "skipped"; result?: JobResult; error?: string }> {
  const holder = randomUUID();
  if (!(await acquire(sql, job.name, holder))) return { status: "skipped" };
  const [run] = await sql<{ id: number }[]>`INSERT INTO ops.job_run (job) VALUES (${job.name}) RETURNING id`;
  try {
    const result = await job.run({ ...ctx, sql });
    await sql`UPDATE ops.job_run SET finished_at = now(), status = 'ok', result = ${sql.json(result as never)} WHERE id = ${run!.id}`;
    return { status: "ok", result };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await sql`UPDATE ops.job_run SET finished_at = now(), status = 'error', error = ${error.slice(0, 1000)} WHERE id = ${run!.id}`;
    return { status: "error", error };
  } finally {
    await release(sql, job.name, holder);
  }
}

export async function lastRuns(sql: Sql) {
  return sql<{ job: string; started_at: Date; finished_at: Date | null; status: string; result: JobResult | null; error: string | null }[]>`
    SELECT DISTINCT ON (job) job, started_at, finished_at, status, result, error
    FROM ops.job_run ORDER BY job, started_at DESC`;
}
