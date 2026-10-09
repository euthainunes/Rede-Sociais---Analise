/**
 * Alertas de preço, newsletter e conta do consumidor (docs/03 O6, Anexo A — LGPD).
 * Sem senha: e-mail + links assinados. Dupla confirmação na primeira vez. Toda escolha vira registro de consentimento.
 */
import { randomUUID } from "node:crypto";
import { computePriceStats, priceVerdict, type DailyPrice } from "@veredito/core";
import type { Sql } from "../client.ts";
import { enqueueEmail, renderEmail, siteUrl } from "./email.ts";
import { signToken, verifyToken } from "./tokens.ts";
import { emitWebhook, personPayload } from "./webhooks.ts";

export const POLICY_VERSION = "2026-10";
const MAX_ACTIVE_ALERTS = 20;
const NOTIFY_COOLDOWN_HOURS = 72;

export type AlertKind = "target_price" | "any_drop" | "good_price_label" | "back_in_stock";

export class PeopleError extends Error {
  readonly code: "invalid_email" | "rate_limited" | "not_found" | "too_many_alerts" | "invalid_input";
  constructor(code: PeopleError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeEmail(raw: string): string {
  const e = raw.trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@<>()[\]\\,;:"]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) throw new PeopleError("invalid_email", "E-mail inválido");
  return e;
}

/** Janela fixa de 1 hora por chave. Retorna false se o limite foi atingido. */
export async function rateLimit(sql: Sql, key: string, max: number): Promise<boolean> {
  const [r] = await sql<{ count: number }[]>`
    INSERT INTO ops.rate_limit (key, window_start, count) VALUES (${key}, date_trunc('hour', now()), 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = ops.rate_limit.count + 1
    RETURNING count`;
  return r!.count <= max;
}

async function upsertPerson(sql: Sql, email: string, source: Record<string, string> = {}): Promise<{ id: string; confirmed: boolean }> {
  const [p] = await sql<{ id: string; email_confirmed_at: Date | null }[]>`
    INSERT INTO people.person (id, email, first_source) VALUES (${randomUUID()}, ${email}, ${sql.json(source)})
    ON CONFLICT (email) DO UPDATE SET deleted_at = NULL
    RETURNING id, email_confirmed_at`;
  return { id: p!.id, confirmed: p!.email_confirmed_at != null };
}

async function recordConsent(sql: Sql, personId: string, purpose: "price_alerts" | "email_marketing", granted: boolean, method: string, ipHash?: string | null) {
  await sql`
    INSERT INTO people.consent (id, person_id, purpose, granted, policy_version, method, ip_hash)
    VALUES (${randomUUID()}, ${personId}, ${purpose}, ${granted}, ${POLICY_VERSION}, ${method}, ${ipHash ?? null})`;
}

/** Menor preço total exibível agora (ofertas ativas, em estoque, associadas e coletadas nas últimas 24 h). */
export async function currentBestPrice(sql: Sql, productId: string, variantId: string | null): Promise<{ price: number; variantId: string } | null> {
  const [r] = await sql<{ price: number; variant_id: string }[]>`
    SELECT (o.price_cash + coalesce(o.shipping_cost, 0))::float AS price, o.variant_id
    FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id
    WHERE v.product_id = ${productId} AND ${variantId ? sql`o.variant_id = ${variantId}` : sql`true`}
      AND o.status = 'active' AND o.availability = 'in_stock' AND o.match_status IN ('auto','confirmed')
      AND o.price_cash IS NOT NULL AND o.last_checked_at > now() - interval '24 hours'
    ORDER BY 1 LIMIT 1`;
  return r ? { price: r.price, variantId: r.variant_id } : null;
}

export function unsubscribeHeaders(personId: string) {
  const token = signToken("unsubscribe", personId);
  // Link do rodapé abre a página de confirmação; o cabeçalho aponta para o endpoint de um clique (RFC 8058, POST).
  const url = siteUrl(`/descadastrar?t=${token}`);
  const oneClick = siteUrl(`/api/descadastrar?t=${token}`);
  return { url, headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}

export interface AlertRequest {
  email: string;
  productSlug: string;
  variantSlug?: string | null;
  kind: AlertKind;
  targetPrice?: number | null;
  source?: Record<string, string>;
  ipHash?: string | null;
}

export async function requestPriceAlert(sql: Sql, req: AlertRequest): Promise<{ status: "pending" | "active" }> {
  const email = normalizeEmail(req.email);
  if (!(await rateLimit(sql, `alert:email:${email}`, 5)) || (req.ipHash && !(await rateLimit(sql, `alert:ip:${req.ipHash}`, 20)))) {
    throw new PeopleError("rate_limited", "Muitas solicitações. Tente novamente mais tarde.");
  }
  if (req.kind === "target_price" && !(req.targetPrice && req.targetPrice > 0 && req.targetPrice < 1_000_000)) {
    throw new PeopleError("invalid_input", "Informe o preço desejado");
  }
  const [prod] = await sql<{ id: string; name: string; category: string }[]>`
    SELECT p.id, p.name, c.slug AS category FROM catalog.product p JOIN catalog.category c ON c.id = p.category_id
    WHERE p.slug = ${req.productSlug} AND p.publish_status = 'published' AND p.deleted_at IS NULL`;
  if (!prod) throw new PeopleError("not_found", "Produto não encontrado");
  const [variant] = req.variantSlug
    ? await sql<{ id: string }[]>`SELECT id FROM catalog.product_variant WHERE product_id = ${prod.id} AND slug = ${req.variantSlug}`
    : [];

  const person = await upsertPerson(sql, email, req.source);
  const [cnt] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM people.price_alert WHERE person_id = ${person.id} AND status IN ('active','pending')`;
  if (cnt!.n >= MAX_ACTIVE_ALERTS) throw new PeopleError("too_many_alerts", `Limite de ${MAX_ACTIVE_ALERTS} alertas ativos`);

  const current = await currentBestPrice(sql, prod.id, variant?.id ?? null);
  const status = person.confirmed ? "active" : "pending";
  const alertId = randomUUID();
  // Link assinado antes de gravar: se faltar configuração, nada fica pela metade.
  const confirmUrl = person.confirmed ? null : siteUrl(`/alertas/confirmar?t=${signToken("confirm_alert", person.id, alertId)}`);
  await sql.begin(async (tx) => {
    const t = tx as unknown as Sql;
    await tx`
      INSERT INTO people.price_alert (id, person_id, product_id, variant_id, kind, target_price, status, baseline_price, confirmed_at)
      VALUES (${alertId}, ${person.id}, ${prod.id}, ${variant?.id ?? null}, ${req.kind}, ${req.targetPrice ?? null}, ${status},
              ${current?.price ?? null}, ${person.confirmed ? new Date() : null})`;
    await recordConsent(t, person.id, "price_alerts", true, "form", req.ipHash);
    if (status === "active") await emitAlertActivated(t, person.id, alertId);
    if (confirmUrl) {
      const { html, text } = renderEmail({
        title: "Confirme seu alerta de preço",
        paragraphs: [`Você pediu para ser avisado sobre o ${prod.name}.`, "Confirme o e-mail para ativar o alerta. Se não foi você, ignore esta mensagem."],
        cta: { label: "Confirmar alerta", url: confirmUrl },
        footerNote: "Você recebe este e-mail porque alguém usou este endereço para criar um alerta no site.",
      });
      await enqueueEmail(t, person.id, "confirm_alert", { to: email, subject: `Confirme seu alerta: ${prod.name}`, html, text });
    }
  });
  return { status };
}

/** CRM: alerta passou a valer (criado já ativo ou confirmado agora). */
async function emitAlertActivated(sql: Sql, personId: string, alertId: string) {
  const [a] = await sql<{ kind: string; target_price: string | null; name: string; path: string }[]>`
    SELECT a.kind, a.target_price, p.name, '/' || c.slug || '/' || p.slug AS path
    FROM people.price_alert a JOIN catalog.product p ON p.id = a.product_id JOIN catalog.category c ON c.id = p.category_id
    WHERE a.id = ${alertId}`;
  if (!a) return;
  await emitWebhook(sql, "price_alert.activated", personId, {
    person: await personPayload(sql, personId),
    alert: { id: alertId, kind: a.kind, target_price: a.target_price == null ? null : Number(a.target_price) },
    product: { name: a.name, url: siteUrl(a.path) },
  });
}

export async function confirmAlert(sql: Sql, token: string): Promise<{ productName: string; productPath: string } | null> {
  const t = verifyToken(token, "confirm_alert");
  if (!t?.r) return null;
  return sql.begin(async (tx) => {
    const s = tx as unknown as Sql;
    const [prev] = await tx<{ status: string }[]>`SELECT status FROM people.price_alert WHERE id = ${t.r!} AND person_id = ${t.p} FOR UPDATE`;
    const [a] = await tx<{ product_name: string; slug: string; category: string }[]>`
      UPDATE people.price_alert a SET status = 'active', confirmed_at = coalesce(a.confirmed_at, now())
      FROM catalog.product p, catalog.category c
      WHERE a.id = ${t.r!} AND a.person_id = ${t.p} AND a.status IN ('pending','active') AND p.id = a.product_id AND c.id = p.category_id
      RETURNING p.name AS product_name, p.slug, c.slug AS category`;
    if (!a) return null;
    await tx`UPDATE people.person SET email_confirmed_at = coalesce(email_confirmed_at, now()) WHERE id = ${t.p}`;
    if (prev?.status === "pending") await emitAlertActivated(s, t.p, t.r!);
    return { productName: a.product_name, productPath: `/${a.category}/${a.slug}` };
  });
}

export async function requestNewsletter(sql: Sql, rawEmail: string, opts: { source?: Record<string, string>; ipHash?: string | null } = {}): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!(await rateLimit(sql, `nl:email:${email}`, 3)) || (opts.ipHash && !(await rateLimit(sql, `nl:ip:${opts.ipHash}`, 20)))) {
    throw new PeopleError("rate_limited", "Muitas solicitações. Tente novamente mais tarde.");
  }
  const person = await upsertPerson(sql, email, opts.source);
  const [p] = await sql<{ newsletter_status: string }[]>`SELECT newsletter_status FROM people.person WHERE id = ${person.id}`;
  if (p!.newsletter_status === "subscribed") return;
  const confirmUrl = siteUrl(`/newsletter/confirmar?t=${signToken("confirm_newsletter", person.id)}`);
  await sql`UPDATE people.person SET newsletter_status = 'pending' WHERE id = ${person.id}`;
  const { html, text } = renderEmail({
    title: "Confirme sua inscrição",
    paragraphs: ["Uma vez por semana: ofertas com desconto real (contra o histórico de preços, não contra o “preço de”) e os guias novos.", "Se não foi você, ignore esta mensagem."],
    cta: { label: "Confirmar inscrição", url: confirmUrl },
  });
  await enqueueEmail(sql, person.id, "confirm_newsletter", { to: email, subject: "Confirme sua inscrição na newsletter", html, text });
}

export async function confirmNewsletter(sql: Sql, token: string): Promise<boolean> {
  const t = verifyToken(token, "confirm_newsletter");
  if (!t) return false;
  return sql.begin(async (tx) => {
    const s = tx as unknown as Sql;
    const [prev] = await tx<{ newsletter_status: string }[]>`SELECT newsletter_status FROM people.person WHERE id = ${t.p} FOR UPDATE`;
    const rows = await tx`
      UPDATE people.person SET newsletter_status = 'subscribed', email_confirmed_at = coalesce(email_confirmed_at, now())
      WHERE id = ${t.p} AND deleted_at IS NULL AND newsletter_status IN ('pending','subscribed') RETURNING id`;
    if (rows.length === 0) return false;
    if (prev?.newsletter_status === "pending") {
      await recordConsent(s, t.p, "email_marketing", true, "double_opt_in");
      await emitWebhook(s, "newsletter.subscribed", t.p, { person: await personPayload(s, t.p) });
    }
    return true;
  });
}

/** Sempre responde igual, exista ou não o e-mail (não revela quem é cadastrado). */
export async function requestManageLink(sql: Sql, rawEmail: string, ipHash?: string | null): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!(await rateLimit(sql, `manage:email:${email}`, 3)) || (ipHash && !(await rateLimit(sql, `manage:ip:${ipHash}`, 10)))) return;
  const [p] = await sql<{ id: string }[]>`SELECT id FROM people.person WHERE email = ${email} AND deleted_at IS NULL`;
  if (!p) return;
  const { html, text } = renderEmail({
    title: "Seu link de acesso",
    paragraphs: ["Use o botão abaixo para ver e gerenciar seus alertas, a newsletter e seus dados. O link vale por 2 horas."],
    cta: { label: "Gerenciar minha conta", url: siteUrl(`/conta/gerenciar?t=${signToken("manage", p.id)}`) },
  });
  await enqueueEmail(sql, p.id, "manage_link", { to: email, subject: "Seu link para gerenciar alertas", html, text });
}

export async function getAccount(sql: Sql, personId: string) {
  const [person] = await sql<{ id: string; email: string; newsletter_status: string; created_at: Date }[]>`
    SELECT id, email, newsletter_status, created_at FROM people.person WHERE id = ${personId} AND deleted_at IS NULL`;
  if (!person) return null;
  const alerts = await sql<{ id: string; kind: AlertKind; target_price: string | null; status: string; created_at: Date; last_triggered_at: Date | null; product: string; path: string; variant: string | null }[]>`
    SELECT a.id, a.kind, a.target_price, a.status, a.created_at, a.last_triggered_at, p.name AS product,
           '/' || c.slug || '/' || p.slug AS path, v.label AS variant
    FROM people.price_alert a JOIN catalog.product p ON p.id = a.product_id JOIN catalog.category c ON c.id = p.category_id
    LEFT JOIN catalog.product_variant v ON v.id = a.variant_id
    WHERE a.person_id = ${personId} AND a.status <> 'cancelled' ORDER BY a.created_at DESC`;
  return { person, alerts };
}

export async function cancelAlert(sql: Sql, personId: string, alertId: string): Promise<void> {
  await sql`UPDATE people.price_alert SET status = 'cancelled' WHERE id = ${alertId} AND person_id = ${personId}`;
}

export async function unsubscribeAll(sql: Sql, personId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const s = tx as unknown as Sql;
    const [prev] = await tx<{ newsletter_status: string }[]>`SELECT newsletter_status FROM people.person WHERE id = ${personId} AND deleted_at IS NULL FOR UPDATE`;
    if (!prev) return;
    await tx`UPDATE people.person SET newsletter_status = 'unsubscribed' WHERE id = ${personId}`;
    const alerts = await tx`UPDATE people.price_alert SET status = 'cancelled' WHERE person_id = ${personId} AND status IN ('active','pending','paused') RETURNING id`;
    await tx`UPDATE ops.email_outbox SET status = 'cancelled' WHERE person_id = ${personId} AND status = 'queued'`;
    await recordConsent(s, personId, "email_marketing", false, "unsubscribe");
    await recordConsent(s, personId, "price_alerts", false, "unsubscribe");
    // Clicar duas vezes no descadastro não avisa o CRM duas vezes.
    if (prev.newsletter_status !== "unsubscribed" || alerts.length > 0) {
      await emitWebhook(s, "person.unsubscribed", personId, { person: await personPayload(s, personId), cancelled_alerts: alerts.length });
    }
  });
}

export function unsubscribeFromToken(token: string) {
  return verifyToken(token, "unsubscribe");
}

/** LGPD — portabilidade/acesso: tudo o que guardamos sobre a pessoa. */
export async function exportPersonData(sql: Sql, personId: string) {
  const [person] = await sql`SELECT id, email, newsletter_status, email_confirmed_at, first_source, created_at FROM people.person WHERE id = ${personId}`;
  const alerts = await sql`SELECT kind, target_price, status, created_at, confirmed_at, last_triggered_at FROM people.price_alert WHERE person_id = ${personId}`;
  const consents = await sql`SELECT purpose, granted, policy_version, method, created_at FROM people.consent WHERE person_id = ${personId} ORDER BY created_at`;
  const emails = await sql`SELECT kind, subject, status, created_at, sent_at FROM ops.email_outbox WHERE person_id = ${personId} ORDER BY created_at`;
  return { generatedAt: new Date().toISOString(), person, alerts, consents, emails };
}

/**
 * LGPD — eliminação: apaga alertas e e-mails pendentes e anonimiza a pessoa. O registro de consentimento
 * é mantido sem dado identificável, como prova de que o tratamento teve base legal.
 */
export async function deletePerson(sql: Sql, personId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const s = tx as unknown as Sql;
    // CRM recebe o pedido de eliminação (com o e-mail, para achar o contato); o que ainda não saiu é descartado
    // e, depois de entregue, o e-mail some também da nossa fila.
    const person = await personPayload(s, personId);
    await tx`DELETE FROM ops.webhook_delivery WHERE person_id = ${personId} AND status IN ('queued','failed','cancelled')`;
    await tx`UPDATE ops.webhook_delivery SET payload = ${tx.json({ person: { id: personId } })} WHERE person_id = ${personId} AND status = 'delivered'`;
    await tx`UPDATE ops.webhook_delivery SET redact_after = true WHERE person_id = ${personId} AND status = 'sending'`;
    if ("email" in person && person.email) {
      await emitWebhook(s, "person.deleted", personId, { person: { id: personId, email: person.email } }, { redact: true });
    }
    await tx`DELETE FROM people.alert_delivery WHERE alert_id IN (SELECT id FROM people.price_alert WHERE person_id = ${personId})`;
    await tx`DELETE FROM people.price_alert WHERE person_id = ${personId}`;
    await tx`DELETE FROM ops.email_outbox WHERE person_id = ${personId}`;
    await tx`UPDATE people.person SET email = NULL, name = NULL, phone = NULL, first_source = NULL, preferences = '{}',
             newsletter_status = 'unsubscribed', deleted_at = now() WHERE id = ${personId}`;
  });
}

// ───────────────────────── Avaliação periódica (worker)

async function seriesFor(sql: Sql, productId: string, variantId: string | null): Promise<DailyPrice[]> {
  return sql<DailyPrice[]>`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, min(d.min_price)::float AS min
    FROM pricing.price_daily d JOIN catalog.product_variant v ON v.id = d.variant_id
    WHERE v.product_id = ${productId} AND ${variantId ? sql`d.variant_id = ${variantId}` : sql`true`} AND d.day > current_date - 120
    GROUP BY d.day ORDER BY d.day`;
}

export async function evaluatePriceAlerts(sql: Sql, now = new Date(), limit = 1000): Promise<{ checked: number; notified: number }> {
  const alerts = await sql<{ id: string; person_id: string; email: string; product_id: string; variant_id: string | null; kind: AlertKind; target_price: string | null; baseline_price: string | null; last_notified_price: string | null; last_triggered_at: Date | null; name: string; path: string }[]>`
    SELECT a.id, a.person_id, pe.email, a.product_id, a.variant_id, a.kind, a.target_price, a.baseline_price, a.last_notified_price,
           a.last_triggered_at, p.name, '/' || c.slug || '/' || p.slug AS path
    FROM people.price_alert a JOIN people.person pe ON pe.id = a.person_id
    JOIN catalog.product p ON p.id = a.product_id JOIN catalog.category c ON c.id = p.category_id
    WHERE a.status = 'active' AND pe.deleted_at IS NULL AND pe.email IS NOT NULL
      AND p.publish_status = 'published' AND p.deleted_at IS NULL  -- produto arquivado não gera e-mail com link quebrado
    ORDER BY a.last_triggered_at NULLS FIRST LIMIT ${limit}`;
  let notified = 0;
  for (const a of alerts) {
    const cur = await currentBestPrice(sql, a.product_id, a.variant_id);
    const cooling = a.last_triggered_at && now.getTime() - a.last_triggered_at.getTime() < NOTIFY_COOLDOWN_HOURS * 3_600_000;
    const ref = Number(a.last_notified_price ?? a.baseline_price ?? NaN);
    let reason: string | null = null;
    let fulfil = false;

    if (a.kind === "back_in_stock") {
      if (cur && a.baseline_price == null) {
        reason = "voltou a ter estoque";
        fulfil = true;
      }
    } else if (cur && !cooling) {
      if (a.kind === "target_price" && cur.price <= Number(a.target_price)) {
        reason = `chegou ao preço que você pediu (até ${fmt(Number(a.target_price))})`;
        fulfil = true;
      } else if (a.kind === "any_drop" && Number.isFinite(ref) && cur.price <= ref * 0.97) {
        reason = `caiu ${Math.round((1 - cur.price / ref) * 100)}% desde o último aviso`;
      } else if (a.kind === "good_price_label") {
        const verdict = priceVerdict(computePriceStats(await seriesFor(sql, a.product_id, a.variant_id), cur.price, now.toISOString().slice(0, 10)));
        const better = !Number.isFinite(ref) || cur.price < ref * 0.98;
        if ((verdict.label === "excellent" || verdict.label === "good") && better) reason = verdict.text.replace(/\.$/, "");
      }
    }
    if (!reason || !cur) continue;

    const url = siteUrl(`${a.path}?utm_source=alerta&utm_medium=email&utm_campaign=price_alert#ofertas`);
    const unsub = unsubscribeHeaders(a.person_id);
    const { html, text } = renderEmail({
      title: `${a.name}: ${fmt(cur.price)}`,
      paragraphs: [`O preço ${reason}.`, "Preços mudam rápido. Veja as ofertas de todas as lojas e o histórico antes de decidir."],
      cta: { label: "Ver ofertas e histórico", url },
      unsubscribeUrl: unsub.url,
      footerNote: "Você recebe este alerta porque o criou no site. Pode cancelá-lo a qualquer momento.",
    });
    await sql.begin(async (tx) => {
      await tx`
        UPDATE people.price_alert SET last_triggered_at = ${now}, last_notified_price = ${cur.price},
          status = ${fulfil ? "fulfilled" : "active"} WHERE id = ${a.id}`;
      await tx`INSERT INTO people.alert_delivery (id, alert_id, channel, payload, sent_at)
               VALUES (${randomUUID()}, ${a.id}, 'email', ${tx.json({ price: cur.price, reason } as never)}, ${now})`;
      await enqueueEmail(tx as unknown as Sql, a.person_id, "price_alert", { to: a.email, subject: `Baixou: ${a.name} por ${fmt(cur.price)}`, html, text, headers: unsub.headers });
    });
    notified++;
  }
  return { checked: alerts.length, notified };
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
