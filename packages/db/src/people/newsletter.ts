/**
 * Edições da newsletter: o sistema monta o rascunho com dados (ofertas com desconto real + conteúdo novo),
 * uma pessoa revisa e quem tem `content:publish` dispara. Links sempre para as nossas páginas (UTM), nunca afiliado.
 */
import { randomUUID } from "node:crypto";
import type { Sql } from "../client.ts";
import { audit } from "../admin/audit.ts";
import type { Staff } from "../admin/auth.ts";
import { requirePermission, ValidationError } from "../admin/catalog.ts";
import { CatalogService } from "../services.ts";
import { createPgSource } from "../source.ts";
import { unsubscribeHeaders } from "./alerts.ts";
import { enqueueEmail, renderEmail, siteUrl, type EmailItem } from "./email.ts";

export interface EditionItem extends EmailItem {
  kind: "deal" | "content";
  include: boolean;
}

export interface Edition {
  id: string;
  slug: string;
  subject: string;
  intro: string;
  items: EditionItem[];
  status: "draft" | "sending" | "sent" | "cancelled";
  prices_as_of: Date;
  recipients: number | null;
  sent_at: Date | null;
  created_at: Date;
}

/** Semana ISO: "2026-W41". */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function utm(path: string, slug: string): string {
  const [base, hash] = path.split("#");
  const sep = base!.includes("?") ? "&" : "?";
  return siteUrl(`${base}${sep}utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(slug)}${hash ? `#${hash}` : ""}`);
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Monta (ou devolve, se já existir) o rascunho da semana. Idempotente por semana. */
export async function buildEditionDraft(sql: Sql, staff: Staff | null, now = new Date()): Promise<{ id: string; created: boolean }> {
  if (staff) requirePermission(staff, "content:write");
  const slug = isoWeek(now);
  const [existing] = await sql<{ id: string }[]>`SELECT id FROM editorial.newsletter_edition WHERE slug = ${slug}`;
  if (existing) return { id: existing.id, created: false };

  const service = new CatalogService(createPgSource(sql));
  const deals = (await service.deals("celulares", "opportunity")).slice(0, 5);
  const items: EditionItem[] = deals.map((d) => ({
    kind: "deal",
    include: true,
    title: `${d.product.name} (${d.variant.label}) — ${brl(d.variant.best!.total)}`,
    subtitle: `${Math.round((d.variant.realDiscount ?? 0) * 100)}% abaixo da mediana de 90 dias · nota ${d.product.scores.overall?.toFixed(1).replace(".", ",") ?? "—"} · ${d.variant.best!.merchantName}`,
    url: utm(`${d.product.url}?v=${d.variant.slug}#ofertas`, slug),
  }));
  const fresh = await sql<{ title: string; url_path: string; type: string; updated_at: Date; published_at: Date }[]>`
    SELECT live->>'title' AS title, url_path, coalesce(live->'body'->>'kind', type) AS type, live_at AS updated_at, published_at
    FROM editorial.content
    WHERE live IS NOT NULL AND greatest(published_at, live_at) > ${new Date(now.getTime() - 14 * 86_400_000)}
    ORDER BY greatest(published_at, live_at) DESC LIMIT 3`;
  for (const c of fresh) {
    const isNew = c.published_at && now.getTime() - c.published_at.getTime() < 14 * 86_400_000;
    items.push({ kind: "content", include: true, title: c.title, subtitle: isNew ? "Novo no site" : "Atualizado com preços e notas recentes", url: utm(c.url_path, slug) });
  }
  if (items.length === 0) throw new ValidationError(["não há ofertas com desconto real nem conteúdo novo para montar a edição"]);

  const top = deals[0];
  const id = randomUUID();
  await sql`
    INSERT INTO editorial.newsletter_edition (id, slug, subject, intro, items, prices_as_of, created_by)
    VALUES (${id}, ${slug}, ${top ? `Desconto real da semana: ${top.product.name} por ${brl(top.variant.best!.total)}` : "O que mudou nos preços esta semana"},
      ${"As ofertas abaixo estão abaixo da mediana de preço dos últimos 90 dias — o desconto é contra o nosso histórico, não contra o “preço de” da loja."},
      ${sql.json(items as never)}, ${now}, ${staff?.id ?? null})`;
  await audit(sql, staff, "newsletter.draft", { type: "newsletter_edition", id }, { after: { slug, items: items.length } });
  return { id, created: true };
}

export async function listEditions(sql: Sql, limit = 20) {
  return sql<Edition[]>`SELECT id, slug, subject, intro, items, status, prices_as_of, recipients, sent_at, created_at FROM editorial.newsletter_edition ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function getEdition(sql: Sql, id: string): Promise<Edition | null> {
  const [e] = await sql<Edition[]>`SELECT id, slug, subject, intro, items, status, prices_as_of, recipients, sent_at, created_at FROM editorial.newsletter_edition WHERE id = ${id}`;
  return e ?? null;
}

export async function updateEdition(sql: Sql, staff: Staff, id: string, input: { subject: string; intro: string; include: boolean[] }) {
  requirePermission(staff, "content:write");
  const e = await getEdition(sql, id);
  if (!e) throw new ValidationError(["edição não encontrada"]);
  if (e.status !== "draft") throw new ValidationError(["só rascunhos podem ser editados"]);
  if (input.subject.trim().length < 10 || input.subject.length > 120) throw new ValidationError(["assunto entre 10 e 120 caracteres"]);
  const items = e.items.map((it, i) => ({ ...it, include: input.include[i] ?? false }));
  if (!items.some((i) => i.include)) throw new ValidationError(["mantenha pelo menos um item"]);
  await sql`UPDATE editorial.newsletter_edition SET subject = ${input.subject.trim()}, intro = ${input.intro.trim()}, items = ${sql.json(items as never)}, updated_at = now() WHERE id = ${id}`;
  await audit(sql, staff, "newsletter.update", { type: "newsletter_edition", id });
}

export function renderEdition(e: Pick<Edition, "subject" | "intro" | "items" | "prices_as_of">, unsubscribeUrl: string) {
  const asOf = e.prices_as_of.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const deals = e.items.filter((i) => i.include && i.kind === "deal");
  const content = e.items.filter((i) => i.include && i.kind === "content");
  return renderEmail({
    title: e.subject,
    paragraphs: [e.intro, ...(deals.length ? [`Ofertas (preços de ${asOf}; confira o valor atual antes de comprar):`] : [])],
    items: [...deals, ...(content.length ? content : [])],
    unsubscribeUrl,
    footerNote: "Você recebe esta newsletter porque se inscreveu e confirmou o e-mail. Podemos receber comissão de lojas parceiras; isso não muda nossas notas.",
  });
}

/** Dispara a edição: um e-mail por inscrito confirmado, cada um com seu link de descadastro. Não envia duas vezes. */
export async function sendEdition(sql: Sql, staff: Staff, id: string): Promise<{ recipients: number }> {
  requirePermission(staff, "content:publish");
  const [locked] = await sql<Edition[]>`
    UPDATE editorial.newsletter_edition SET status = 'sending', sent_by = ${staff.id}, updated_at = now()
    WHERE id = ${id} AND status = 'draft' RETURNING id, slug, subject, intro, items, status, prices_as_of, recipients, sent_at, created_at`;
  if (!locked) throw new ValidationError(["esta edição já foi enviada ou não existe"]);
  const people = await sql<{ id: string; email: string }[]>`
    SELECT id, email FROM people.person WHERE newsletter_status = 'subscribed' AND email IS NOT NULL AND deleted_at IS NULL`;
  let n = 0;
  for (const p of people) {
    const unsub = unsubscribeHeaders(p.id);
    const { html, text } = renderEdition(locked, unsub.url);
    try {
      await enqueueEmail(sql, p.id, "newsletter", { to: p.email, subject: locked.subject, html, text, headers: unsub.headers }, id);
      n++;
    } catch (e) {
      // Índice único (edição, pessoa) impede duplicar se o envio for retomado.
      if (!(e instanceof Error && /outbox_edition_person/.test(e.message))) throw e;
    }
  }
  await sql`UPDATE editorial.newsletter_edition SET status = 'sent', recipients = ${n}, sent_at = now() WHERE id = ${id}`;
  await audit(sql, staff, "newsletter.send", { type: "newsletter_edition", id }, { after: { recipients: n } });
  return { recipients: n };
}

export async function previewEdition(sql: Sql, id: string): Promise<{ html: string } | null> {
  const e = await getEdition(sql, id);
  if (!e) return null;
  return { html: renderEdition(e, siteUrl("/descadastrar?t=EXEMPLO")).html };
}
