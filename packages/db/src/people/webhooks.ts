/**
 * Webhooks para CRM (backlog 6.5). Eventos de pessoas entram numa fila no mesmo commit da mudança
 * e o worker entrega com assinatura HMAC, retentativas e a mesma proteção contra SSRF dos feeds.
 *
 * Assinatura: `X-Veredito-Signature: sha256=<hex>` de HMAC-SHA256(secret, `${timestamp}.${corpo}`),
 * com `X-Veredito-Timestamp` em segundos. O receptor deve recusar timestamps com mais de 5 minutos.
 */
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Sql } from "../client.ts";
import { audit } from "../admin/audit.ts";
import type { Staff } from "../admin/auth.ts";
import { requirePermission, ValidationError } from "../admin/catalog.ts";
import { assertPublicUrl, USER_AGENT, type NetOptions } from "../jobs/net.ts";

export const WEBHOOK_EVENTS = ["newsletter.subscribed", "price_alert.activated", "person.unsubscribed", "person.deleted"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | "ping";

export const WEBHOOK_EVENT_LABELS: Record<(typeof WEBHOOK_EVENTS)[number], string> = {
  "newsletter.subscribed": "Inscrição confirmada na newsletter",
  "price_alert.activated": "Alerta de preço ativado",
  "person.unsubscribed": "Descadastro (newsletter e alertas)",
  "person.deleted": "Dados excluídos a pedido da pessoa (LGPD)",
};

/** Espera antes de cada nova tentativa; depois da última, a entrega fica como falha. */
export const RETRY_DELAYS_MIN = [1, 5, 30, 120, 720];
const MAX_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;
const SENDING_LEASE_MIN = 10;

export function signWebhook(secret: string, timestamp: number, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

/**
 * Enfileira o evento para cada endpoint ativo inscrito nele. Chame dentro da mesma transação da mudança.
 * `redact`: depois de entregue (ou desistida), o payload fica só com o id da pessoa.
 */
export async function emitWebhook(sql: Sql, event: WebhookEvent, personId: string | null, data: Record<string, unknown>, opts: { redact?: boolean; endpointId?: string } = {}) {
  await sql`
    INSERT INTO ops.webhook_delivery (id, endpoint_id, event, person_id, payload, redact_after)
    SELECT gen_random_uuid(), e.id, ${event}, ${personId}, ${sql.json(data as never)}, ${opts.redact ?? false}
    FROM ops.webhook_endpoint e
    WHERE e.active AND ${opts.endpointId ? sql`e.id = ${opts.endpointId}` : sql`${event} = ANY(e.events)`}`;
}

/** Dados da pessoa enviados ao CRM: só identificador e e-mail. */
export async function personPayload(sql: Sql, personId: string) {
  const [p] = await sql<{ id: string; email: string | null; newsletter_status: string }[]>`
    SELECT id, email, newsletter_status FROM people.person WHERE id = ${personId}`;
  return p ? { id: p.id, email: p.email, newsletter_status: p.newsletter_status } : { id: personId };
}

// ───────────────────────── Entrega (worker)

export async function deliverWebhooks(sql: Sql, opts: NetOptions & { limit?: number; timeoutMs?: number; now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());
  // Reserva com lease: se o worker cair no meio, a entrega volta para a fila sozinha.
  const due = await sql<{ id: string; event: string; payload: Record<string, unknown>; attempts: number; created_at: Date; redact_after: boolean; person_id: string | null; url: string; secret: string; active: boolean }[]>`
    UPDATE ops.webhook_delivery d SET status = 'sending', next_attempt_at = ${now()}::timestamptz + make_interval(mins => ${SENDING_LEASE_MIN})
    FROM ops.webhook_endpoint e
    WHERE e.id = d.endpoint_id AND d.id IN (
      SELECT id FROM ops.webhook_delivery WHERE status IN ('queued','sending') AND next_attempt_at <= ${now()}
      ORDER BY next_attempt_at LIMIT ${opts.limit ?? 50} FOR UPDATE SKIP LOCKED)
    RETURNING d.id, d.event, d.payload, d.attempts, d.created_at, d.redact_after, d.person_id, e.url, e.secret, e.active`;
  // UPDATE … RETURNING não garante ordem: o CRM precisa receber na ordem em que os fatos aconteceram.
  due.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  let delivered = 0, retried = 0, failed = 0, cancelled = 0;
  for (const d of due) {
    if (!d.active) {
      await sql`UPDATE ops.webhook_delivery SET status = 'cancelled', last_error = 'endpoint desativado' WHERE id = ${d.id}`;
      cancelled++;
      continue;
    }
    const body = JSON.stringify({ id: d.id, event: d.event, created_at: d.created_at.toISOString(), data: d.payload });
    const ts = Math.floor(now().getTime() / 1000);
    let status: number | null = null;
    let error: string | null = null;
    try {
      const url = await assertPublicUrl(d.url, opts);
      const res = await fetch(url, {
        method: "POST", redirect: "manual", body, signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        headers: {
          "content-type": "application/json", "user-agent": USER_AGENT,
          "x-veredito-event": d.event, "x-veredito-delivery": d.id,
          "x-veredito-timestamp": String(ts), "x-veredito-signature": signWebhook(d.secret, ts, body),
        },
      });
      status = res.status;
      await res.body?.cancel().catch(() => {});
      if (!res.ok) error = res.status >= 300 && res.status < 400 ? `redirecionamento (${res.status}) não é seguido` : `HTTP ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 300) : String(e);
    }
    const attempts = d.attempts + 1;
    const final = !error || attempts >= MAX_ATTEMPTS;
    const redacted = final && d.redact_after ? sql`, payload = ${sql.json({ person: { id: d.person_id } })}` : sql``;
    if (!error) {
      await sql`UPDATE ops.webhook_delivery SET status = 'delivered', attempts = ${attempts}, last_status = ${status}, last_error = NULL, delivered_at = ${now()} ${redacted} WHERE id = ${d.id}`;
      delivered++;
    } else if (final) {
      await sql`UPDATE ops.webhook_delivery SET status = 'failed', attempts = ${attempts}, last_status = ${status}, last_error = ${error} ${redacted} WHERE id = ${d.id}`;
      failed++;
    } else {
      await sql`
        UPDATE ops.webhook_delivery SET status = 'queued', attempts = ${attempts}, last_status = ${status}, last_error = ${error},
          next_attempt_at = ${now()}::timestamptz + make_interval(mins => ${RETRY_DELAYS_MIN[attempts - 1]!})
        WHERE id = ${d.id}`;
      retried++;
    }
  }
  return { delivered, retried, failed, cancelled };
}

// ───────────────────────── Painel (só administrador)

export interface WebhookEndpointInput {
  name: string;
  url: string;
  events: string[];
}

export async function createWebhookEndpoint(sql: Sql, staff: Staff, input: WebhookEndpointInput, opts: NetOptions = {}): Promise<{ id: string; secret: string }> {
  requirePermission(staff, "staff:manage");
  const errors: string[] = [];
  if (input.name.trim().length < 2) errors.push("dê um nome ao endpoint");
  const events = input.events.filter((e): e is (typeof WEBHOOK_EVENTS)[number] => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (events.length === 0) errors.push("escolha pelo menos um evento");
  try {
    await assertPublicUrl(input.url.trim(), opts);
  } catch (e) {
    errors.push(`URL inválida: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (errors.length) throw new ValidationError(errors);
  const id = randomUUID();
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  await sql`
    INSERT INTO ops.webhook_endpoint (id, name, url, secret, events, created_by)
    VALUES (${id}, ${input.name.trim()}, ${input.url.trim()}, ${secret}, ${events}, ${staff.id})`;
  await audit(sql, staff, "webhook.create", { type: "webhook_endpoint", id }, { after: { name: input.name.trim(), url: input.url.trim(), events } });
  return { id, secret };
}

export async function setWebhookEndpointActive(sql: Sql, staff: Staff, id: string, active: boolean) {
  requirePermission(staff, "staff:manage");
  await sql`UPDATE ops.webhook_endpoint SET active = ${active}, updated_at = now() WHERE id = ${id}`;
  await audit(sql, staff, active ? "webhook.enable" : "webhook.disable", { type: "webhook_endpoint", id });
}

export async function sendWebhookTest(sql: Sql, staff: Staff, id: string) {
  requirePermission(staff, "staff:manage");
  await emitWebhook(sql, "ping", null, { message: "Teste enviado pelo painel", by: staff.name }, { endpointId: id });
  await audit(sql, staff, "webhook.ping", { type: "webhook_endpoint", id });
}

/** Devolve uma entrega que falhou para a fila (o payload original é reenviado). */
export async function retryWebhookDelivery(sql: Sql, staff: Staff, deliveryId: string) {
  requirePermission(staff, "staff:manage");
  const rows = await sql`
    UPDATE ops.webhook_delivery SET status = 'queued', attempts = 0, next_attempt_at = now(), last_error = NULL
    WHERE id = ${deliveryId} AND status IN ('failed','cancelled') RETURNING id`;
  if (rows.length === 0) throw new ValidationError(["só entregas com falha ou canceladas podem ser reenviadas"]);
  await audit(sql, staff, "webhook.retry", { type: "webhook_delivery", id: deliveryId });
}

export async function listWebhookEndpoints(sql: Sql, staff: Staff) {
  requirePermission(staff, "staff:manage");
  return sql<{ id: string; name: string; url: string; secret: string; events: string[]; active: boolean; created_at: Date; delivered: number; pending: number; failed: number; last_delivered_at: Date | null }[]>`
    SELECT e.id, e.name, e.url, e.secret, e.events, e.active, e.created_at,
      count(d.id) FILTER (WHERE d.status = 'delivered')::int AS delivered,
      count(d.id) FILTER (WHERE d.status IN ('queued','sending'))::int AS pending,
      count(d.id) FILTER (WHERE d.status = 'failed')::int AS failed,
      max(d.delivered_at) AS last_delivered_at
    FROM ops.webhook_endpoint e LEFT JOIN ops.webhook_delivery d ON d.endpoint_id = e.id
    GROUP BY e.id ORDER BY e.created_at`;
}

export async function listWebhookDeliveries(sql: Sql, staff: Staff, limit = 50) {
  requirePermission(staff, "staff:manage");
  return sql<{ id: string; endpoint: string; event: string; status: string; attempts: number; last_status: number | null; last_error: string | null; created_at: Date; delivered_at: Date | null; next_attempt_at: Date }[]>`
    SELECT d.id, e.name AS endpoint, d.event, d.status, d.attempts, d.last_status, d.last_error, d.created_at, d.delivered_at, d.next_attempt_at
    FROM ops.webhook_delivery d JOIN ops.webhook_endpoint e ON e.id = d.endpoint_id
    ORDER BY d.created_at DESC LIMIT ${limit}`;
}
