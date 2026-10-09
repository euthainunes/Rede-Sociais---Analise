/** Métricas do painel e alertas internos (docs/16 §16.2 e §16.4). */
import { randomUUID } from "node:crypto";
import type { Sql } from "../client.ts";

export async function dashboardMetrics(sql: Sql, days = 7) {
  const [counts] = await sql<{ products: number; published: number; offers: number; stale: number; pending: number; drafts: number; needs_update: number; alerts_active: number; subscribers: number }[]>`
    SELECT
      (SELECT count(*)::int FROM catalog.product WHERE deleted_at IS NULL) AS products,
      (SELECT count(*)::int FROM catalog.product WHERE deleted_at IS NULL AND publish_status = 'published') AS published,
      (SELECT count(*)::int FROM commerce.offer WHERE status = 'active') AS offers,
      (SELECT count(*)::int FROM commerce.offer WHERE status = 'active' AND last_checked_at < now() - interval '24 hours') AS stale,
      (SELECT count(*)::int FROM ops.match_candidate WHERE status = 'pending') AS pending,
      (SELECT count(*)::int FROM editorial.content WHERE status IN ('draft','in_review','approved')) AS drafts,
      (SELECT count(*)::int FROM editorial.content WHERE status = 'needs_update') AS needs_update,
      (SELECT count(*)::int FROM people.price_alert WHERE status = 'active') AS alerts_active,
      (SELECT count(*)::int FROM people.person WHERE newsletter_status = 'subscribed' AND deleted_at IS NULL) AS subscribers`;
  const since = new Date(Date.now() - days * 86_400_000);
  const [clicks] = await sql<{ total: number; bots: number }[]>`
    SELECT count(*) FILTER (WHERE NOT is_bot)::int AS total, count(*) FILTER (WHERE is_bot)::int AS bots
    FROM analytics.click WHERE ts >= ${since}`;
  const topProducts = await sql<{ name: string; slug: string; clicks: number }[]>`
    SELECT p.name, p.slug, count(*)::int AS clicks FROM analytics.click c JOIN catalog.product p ON p.id = c.product_id
    WHERE c.ts >= ${since} AND NOT c.is_bot GROUP BY p.name, p.slug ORDER BY clicks DESC LIMIT 10`;
  const byPage = await sql<{ page_type: string | null; clicks: number }[]>`
    SELECT page_type, count(*)::int AS clicks FROM analytics.click WHERE ts >= ${since} AND NOT is_bot
    GROUP BY page_type ORDER BY clicks DESC`;
  const byCta = await sql<{ cta_id: string | null; clicks: number }[]>`
    SELECT cta_id, count(*)::int AS clicks FROM analytics.click WHERE ts >= ${since} AND NOT is_bot
    GROUP BY cta_id ORDER BY clicks DESC`;
  const byMerchant = await sql<{ merchant: string; clicks: number }[]>`
    SELECT m.name AS merchant, count(*)::int AS clicks FROM analytics.click c JOIN commerce.merchant m ON m.id = c.merchant_id
    WHERE c.ts >= ${since} AND NOT c.is_bot GROUP BY m.name ORDER BY clicks DESC`;
  const daily = await sql<{ day: string; clicks: number }[]>`
    SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day, count(*)::int AS clicks
    FROM analytics.click WHERE ts >= ${since} AND NOT is_bot GROUP BY 1 ORDER BY 1`;
  return { counts: counts!, clicks: clicks!, topProducts, byPage, byCta, byMerchant, daily, days };
}

export interface AlertRow {
  id: string;
  kind: string;
  severity: "high" | "medium" | "low";
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: Date;
}

export const ALERT_LABELS: Record<string, string> = {
  stale_price: "Preço desatualizado",
  no_offer: "Produto publicado sem oferta",
  broken_link: "Link quebrado",
  no_review: "Produto sem review",
  matching_backlog: "Fila de matching acumulada",
  content_outdated: "Conteúdo com revisão vencida",
  price_anomaly: "Preço anormal (oferta pausada)",
  feed_error: "Falha ao coletar feed",
};

/**
 * Recalcula alertas: abre os que surgiram, resolve os que deixaram de valer.
 * Idempotente (índice único por tipo+entidade enquanto aberto).
 */
/** Alertas recalculados a partir do estado atual. Os de evento (preço anormal, falha de feed) são resolvidos por ação humana ou pelo próprio job. */
const COMPUTED_KINDS = ["stale_price", "no_offer", "broken_link", "no_review", "content_outdated", "matching_backlog"];

export async function resolveAlert(sql: Sql, id: string): Promise<void> {
  await sql`UPDATE ops.internal_alert SET status = 'resolved', resolved_at = now() WHERE id = ${id} AND status = 'open'`;
}

export async function refreshInternalAlerts(sql: Sql): Promise<{ opened: number; resolved: number }> {
  type Found = { kind: string; severity: string; entity_type: string; entity_id: string; details: Record<string, unknown> };
  const found: Found[] = [
    ...(await sql<Found[]>`
      SELECT 'stale_price' AS kind, 'high' AS severity, 'product' AS entity_type, p.id AS entity_id,
        json_build_object('name', p.name, 'offers', count(*)) AS details
      FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id JOIN catalog.product p ON p.id = v.product_id
      WHERE o.status = 'active' AND o.last_checked_at < now() - interval '24 hours' AND p.publish_status = 'published'
      GROUP BY p.id, p.name`),
    ...(await sql<Found[]>`
      SELECT 'no_offer' AS kind, 'medium' AS severity, 'product' AS entity_type, p.id AS entity_id, json_build_object('name', p.name) AS details
      FROM catalog.product p WHERE p.publish_status = 'published' AND p.deleted_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id
        WHERE v.product_id = p.id AND o.status = 'active' AND o.availability = 'in_stock')`),
    ...(await sql<Found[]>`
      SELECT 'broken_link' AS kind, 'high' AS severity, 'offer' AS entity_type, o.id AS entity_id,
        json_build_object('title', o.title_raw, 'url', o.url_original) AS details
      FROM commerce.offer o WHERE o.status = 'broken'`),
    ...(await sql<Found[]>`
      SELECT 'no_review' AS kind, 'medium' AS severity, 'product' AS entity_type, p.id AS entity_id, json_build_object('name', p.name) AS details
      FROM catalog.product p WHERE p.publish_status = 'published' AND p.deleted_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM editorial.content_product cp JOIN editorial.content c ON c.id = cp.content_id
        WHERE cp.product_id = p.id AND c.type = 'review' AND c.status = 'published')`),
    ...(await sql<Found[]>`
      SELECT 'content_outdated' AS kind, 'medium' AS severity, 'content' AS entity_type, c.id AS entity_id,
        json_build_object('title', c.title, 'next_review_at', c.next_review_at) AS details
      FROM editorial.content c WHERE c.status = 'published' AND c.next_review_at < current_date`),
  ];
  const pending = (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM ops.match_candidate WHERE status = 'pending'`)[0]!.n;
  if (pending >= 20) {
    found.push({ kind: "matching_backlog", severity: "medium", entity_type: "queue", entity_id: "00000000-0000-0000-0000-000000000000", details: { pending } });
  }

  let opened = 0;
  for (const f of found) {
    const r = await sql`
      INSERT INTO ops.internal_alert (id, kind, severity, entity_type, entity_id, details)
      VALUES (${randomUUID()}, ${f.kind}, ${f.severity}, ${f.entity_type}, ${f.entity_id}, ${sql.json(f.details as never)})
      ON CONFLICT (kind, entity_type, entity_id) WHERE status = 'open' DO UPDATE SET details = EXCLUDED.details
      RETURNING (xmax = 0) AS inserted`;
    if (r[0]?.inserted) opened++;
  }
  const keys = found.map((f) => `${f.kind}|${f.entity_id}`);
  const resolved = await sql`
    UPDATE ops.internal_alert SET status = 'resolved', resolved_at = now()
    WHERE status = 'open' AND kind = ANY(${COMPUTED_KINDS}) AND NOT ((kind || '|' || entity_id::text) = ANY(${keys}))
    RETURNING id`;
  return { opened, resolved: resolved.length };
}

export async function listOpenAlerts(sql: Sql, limit = 50) {
  return sql<AlertRow[]>`
    SELECT id, kind, severity, entity_type, entity_id, details, created_at FROM ops.internal_alert
    WHERE status = 'open' ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC LIMIT ${limit}`;
}
