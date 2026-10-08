/**
 * Conteúdo editorial: edição, revisões e workflow (docs/15 §15.5):
 * Rascunho → Revisão → Aprovado → Publicado → Atualização necessária ↺ (e Arquivado).
 */
import { randomUUID } from "node:crypto";
import { getCategory, slugify } from "@veredito/core";
import type { Sql } from "../client.ts";
import { audit } from "./audit.ts";
import type { Staff } from "./auth.ts";
import { requirePermission, ValidationError } from "./catalog.ts";

export type ContentStatus = "draft" | "in_review" | "approved" | "published" | "needs_update" | "archived";
export type ContentKind = "review" | "best_list" | "guide";

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  needs_update: "Atualização necessária",
  archived: "Arquivado",
};

const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "draft", "archived"],
  approved: ["published", "in_review", "archived"],
  published: ["needs_update", "archived"],
  needs_update: ["in_review", "archived"],
  archived: ["draft"],
};

export function allowedTransitions(from: ContentStatus): ContentStatus[] {
  return TRANSITIONS[from];
}

export interface ContentInput {
  id?: string | null;
  kind: ContentKind;
  title: string;
  category: string;
  productSlugs: string[];
  evidenceLevel: "hands_on" | "data_based" | null;
  intro: string | null;
  sections: { heading: string; text: string }[];
  picks?: { role: "best" | "budget" | "premium" | "value"; productSlug: string; note: string }[];
  changeNote?: string | null;
}

function pathFor(input: ContentInput): string {
  if (input.kind === "review") return `/${input.category}/${input.productSlugs[0]}`;
  if (input.kind === "best_list") return `/melhores/${slugify(input.title)}`;
  return `/guias/${slugify(input.title)}`;
}

export async function listContentAdmin(sql: Sql) {
  return sql<{ id: string; title: string; kind: string; status: ContentStatus; url_path: string; updated_at: Date; author: string | null }[]>`
    SELECT c.id, c.title, coalesce(c.body->>'kind', c.type) AS kind, c.status, c.url_path, c.updated_at, a.name AS author
    FROM editorial.content c LEFT JOIN editorial.author a ON a.id = c.author_id
    ORDER BY c.updated_at DESC LIMIT 200`;
}

export async function getContentAdmin(sql: Sql, id: string) {
  const [c] = await sql`
    SELECT c.*, cat.slug AS category,
      coalesce((SELECT array_agg(p.slug ORDER BY cp.position) FROM editorial.content_product cp JOIN catalog.product p ON p.id = cp.product_id
                WHERE cp.content_id = c.id), '{}') AS product_slugs
    FROM editorial.content c LEFT JOIN catalog.category cat ON cat.id = c.category_id WHERE c.id = ${id}`;
  if (!c) return null;
  const revisions = await sql`
    SELECT r.created_at, r.change_note, s.email FROM editorial.content_revision r LEFT JOIN ops.staff_user s ON s.id = r.changed_by
    WHERE r.content_id = ${id} ORDER BY r.created_at DESC LIMIT 20`;
  return { content: c, revisions };
}

async function authorFor(sql: Sql, staff: Staff): Promise<string> {
  const slug = slugify(staff.name || staff.email);
  const [a] = await sql<{ id: string }[]>`SELECT id FROM editorial.author WHERE slug = ${slug}`;
  if (a) return a.id;
  const id = randomUUID();
  await sql`INSERT INTO editorial.author (id, slug, name) VALUES (${id}, ${slug}, ${staff.name})`;
  return id;
}

/** Salva o conteúdo (sempre gera revisão). Editar conteúdo publicado o devolve para revisão. */
export async function saveContent(sql: Sql, staff: Staff, input: ContentInput): Promise<string> {
  requirePermission(staff, "content:write");
  const issues: string[] = [];
  if (!getCategory(input.category)) issues.push("categoria inválida");
  if (input.title.trim().length < 5) issues.push("título muito curto");
  if (input.kind === "review" && input.productSlugs.length !== 1) issues.push("review precisa de exatamente um produto");
  if (input.kind === "best_list" && input.productSlugs.length < 3) issues.push("guia de melhores precisa de pelo menos 3 produtos");
  if (input.sections.some((s) => !s.heading.trim() || !s.text.trim())) issues.push("seções precisam de título e texto");
  if (issues.length) throw new ValidationError(issues);

  const products = await sql<{ id: string; slug: string }[]>`SELECT id, slug FROM catalog.product WHERE slug = ANY(${input.productSlugs})`;
  const missing = input.productSlugs.filter((s) => !products.some((p) => p.slug === s));
  if (missing.length) throw new ValidationError([`produtos não encontrados: ${missing.join(", ")}`]);

  const path = pathFor(input);
  const [taken] = await sql`SELECT id FROM editorial.content WHERE url_path = ${path} AND id IS DISTINCT FROM ${input.id ?? null}`;
  if (taken) throw new ValidationError([`já existe conteúdo publicado ou em edição em ${path}`]);

  const body = { kind: input.kind, intro: input.intro, sections: input.sections, picks: input.picks ?? [] };
  return sql.begin(async (tx) => {
    const t = tx as unknown as Sql;
    const id = input.id ?? randomUUID();
    const [cur] = input.id ? await tx<{ status: ContentStatus }[]>`SELECT status FROM editorial.content WHERE id = ${id}` : [];
    if (input.id && !cur) throw new ValidationError(["conteúdo não encontrado"]);
    const status: ContentStatus = !cur ? "draft" : cur.status === "published" || cur.status === "approved" ? "in_review" : cur.status;
    const [cat] = await tx<{ id: string }[]>`SELECT id FROM catalog.category WHERE slug = ${input.category}`;
    await tx`
      INSERT INTO editorial.content (id, type, slug, url_path, title, body, status, evidence_level, author_id, category_id, ai_assisted)
      VALUES (${id}, ${input.kind}, ${slugify(input.title)}, ${path}, ${input.title.trim()}, ${tx.json(body as never)}, ${status},
        ${input.evidenceLevel}, ${await authorFor(t, staff)}, ${cat?.id ?? null}, false)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, status = ${status},
        evidence_level = EXCLUDED.evidence_level, category_id = EXCLUDED.category_id, updated_at = now()`;
    await tx`DELETE FROM editorial.content_product WHERE content_id = ${id}`;
    for (const [i, slug] of input.productSlugs.entries()) {
      const pid = products.find((p) => p.slug === slug)!.id;
      await tx`INSERT INTO editorial.content_product (content_id, product_id, role, position) VALUES (${id}, ${pid}, 'subject', ${i})`;
    }
    await tx`INSERT INTO editorial.content_revision (id, content_id, body, changed_by, change_note)
             VALUES (${randomUUID()}, ${id}, ${tx.json(body as never)}, ${staff.id}, ${input.changeNote ?? null})`;
    await audit(t, staff, input.id ? "content.update" : "content.create", { type: "content", id }, { after: { title: input.title, status } });
    return id;
  });
}

/**
 * Muda o status. Publicar e arquivar exigem content:publish.
 * `onPublished` recebe o id para reindexar o RAG / revalidar páginas.
 */
export async function transitionContent(
  sql: Sql,
  staff: Staff,
  id: string,
  to: ContentStatus,
  hooks: { onPublished?: (id: string) => Promise<void>; onUnpublished?: (id: string) => Promise<void> } = {},
): Promise<void> {
  requirePermission(staff, to === "published" || to === "archived" ? "content:publish" : "content:write");
  const [c] = await sql<{ status: ContentStatus }[]>`SELECT status FROM editorial.content WHERE id = ${id}`;
  if (!c) throw new ValidationError(["conteúdo não encontrado"]);
  if (!TRANSITIONS[c.status].includes(to)) throw new ValidationError([`não é possível ir de "${STATUS_LABELS[c.status]}" para "${STATUS_LABELS[to]}"`]);
  await sql`
    UPDATE editorial.content SET status = ${to}, updated_at = now(),
      published_at = CASE WHEN ${to} = 'published' THEN coalesce(published_at, now()) ELSE published_at END,
      next_review_at = CASE WHEN ${to} = 'published' THEN current_date + 90 ELSE next_review_at END,
      reviewer_id = CASE WHEN ${to} IN ('approved','published') THEN ${staff.id}::uuid ELSE reviewer_id END
    WHERE id = ${id}`;
  await audit(sql, staff, "content.transition", { type: "content", id }, { before: { status: c.status }, after: { status: to } });
  if (to === "published") await hooks.onPublished?.(id);
  if (c.status === "published" && to !== "published") await hooks.onUnpublished?.(id);
}
