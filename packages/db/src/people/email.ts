/** E-mails: modelos (HTML + texto), fila (outbox) e provedores de envio. */
import { randomUUID } from "node:crypto";
import { brand } from "@veredito/brand";
import type { Sql } from "../client.ts";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function siteUrl(path: string): string {
  return new URL(path, brand.url).toString();
}

/** Layout único: texto curto, um botão, rodapé com descadastro e aviso de privacidade. */
export interface EmailItem {
  title: string;
  subtitle: string;
  url: string;
}

export function renderEmail(opts: { title: string; paragraphs: string[]; items?: EmailItem[]; cta?: { label: string; url: string }; unsubscribeUrl?: string; footerNote?: string }): { html: string; text: string } {
  const list = (opts.items ?? [])
    .map((i) => `<tr><td style="padding:12px 0;border-top:1px solid #e2e5ea"><a href="${esc(i.url)}" style="color:#14161a;font-weight:700;text-decoration:none">${esc(i.title)}</a><br><span style="color:#545b66;font-size:14px">${esc(i.subtitle)}</span></td></tr>`)
    .join("");
  const p = opts.paragraphs.map((x) => `<p style="margin:0 0 14px">${esc(x)}</p>`).join("") + (list ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 4px">${list}</table>` : "");
  const cta = opts.cta
    ? `<p style="margin:22px 0"><a href="${esc(opts.cta.url)}" style="background:${brand.colors.brand};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(opts.cta.label)}</a></p>`
    : "";
  const foot = [
    opts.footerNote ? esc(opts.footerNote) : "",
    opts.unsubscribeUrl ? `<a href="${esc(opts.unsubscribeUrl)}" style="color:#667">Cancelar e-mails</a>` : "",
    `${esc(brand.name)} · <a href="${esc(siteUrl("/privacidade"))}" style="color:#667">Privacidade</a>`,
  ].filter(Boolean).join("<br>");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f6f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#14161a">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:12px;padding:24px">
<p style="font-weight:800;margin:0 0 16px">${esc(brand.name)}</p><h1 style="font-size:20px;margin:0 0 16px">${esc(opts.title)}</h1>${p}${cta}</div>
<p style="font-size:12px;color:#667;margin:16px 4px">${foot}</p></div></body></html>`;
  const text = [opts.title, "", ...opts.paragraphs, ...(opts.items ?? []).flatMap((i) => ["", `• ${i.title}`, `  ${i.subtitle}`, `  ${i.url}`]), ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []), "",
    ...(opts.footerNote ? [opts.footerNote] : []), ...(opts.unsubscribeUrl ? [`Cancelar e-mails: ${opts.unsubscribeUrl}`] : [])].join("\n");
  return { html, text };
}

export async function enqueueEmail(sql: Sql, personId: string | null, kind: string, msg: EmailMessage, editionId: string | null = null): Promise<string> {
  const id = randomUUID();
  await sql`
    INSERT INTO ops.email_outbox (id, person_id, to_email, kind, subject, html, text_body, headers, edition_id)
    VALUES (${id}, ${personId}, ${msg.to}, ${kind}, ${msg.subject}, ${msg.html}, ${msg.text}, ${sql.json((msg.headers ?? {}) as never)}, ${editionId})`;
  return id;
}

export interface Mailer {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ id: string }>;
}

/** Desenvolvimento: não envia; o e-mail fica visível no painel (Admin › E-mails). */
export class ConsoleMailer implements Mailer {
  readonly name = "console";
  async send(msg: EmailMessage) {
    console.log(JSON.stringify({ msg: "email (console)", to: msg.to.replace(/(.).*(@.*)/, "$1***$2"), subject: msg.subject }));
    return { id: `console-${randomUUID()}` };
  }
}

/** Resend (API HTTP). */
export class ResendMailer implements Mailer {
  readonly name = "resend";
  private readonly apiKey: string;
  private readonly from: string;
  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }
  async send(msg: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, headers: msg.headers }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { id: ((await res.json()) as { id: string }).id };
  }
}

export function createMailer(env: Record<string, string | undefined> = process.env): Mailer {
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("RESEND_API_KEY e EMAIL_FROM são obrigatórios");
    return new ResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new ConsoleMailer();
}

/** Envia o que está na fila. Falha → nova tentativa com espera exponencial (até 5). */
export async function deliverOutbox(sql: Sql, mailer: Mailer, limit = 50): Promise<{ sent: number; failed: number; retried: number }> {
  const batch = await sql<{ id: string; to_email: string; subject: string; html: string; text_body: string; headers: Record<string, string>; attempts: number }[]>`
    UPDATE ops.email_outbox SET status = 'sending', attempts = attempts + 1
    WHERE id IN (SELECT id FROM ops.email_outbox WHERE status = 'queued' AND next_attempt_at <= now()
                 ORDER BY created_at LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING id, to_email, subject, html, text_body, headers, attempts`;
  let sent = 0, failed = 0, retried = 0;
  for (const m of batch) {
    try {
      const r = await mailer.send({ to: m.to_email, subject: m.subject, html: m.html, text: m.text_body, headers: m.headers });
      await sql`UPDATE ops.email_outbox SET status = 'sent', sent_at = now(), provider_id = ${r.id}, last_error = NULL WHERE id = ${m.id}`;
      sent++;
    } catch (e) {
      const err = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      const final = m.attempts >= 5;
      await sql`
        UPDATE ops.email_outbox SET status = ${final ? "failed" : "queued"}, last_error = ${err},
          next_attempt_at = now() + make_interval(mins => ${2 ** m.attempts})
        WHERE id = ${m.id}`;
      if (final) failed++;
      else retried++;
    }
  }
  return { sent, failed, retried };
}
