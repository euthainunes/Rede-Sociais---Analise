"use server";
/**
 * Server actions do painel. Toda ação: (1) exige sessão e permissão, (2) valida no serviço,
 * (3) audita (dentro do serviço), (4) invalida caches públicos. Next verifica a origem (proteção CSRF).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coerceSpecs, getCategory, lines } from "@veredito/core";
import { createEmbedder, indexDocument } from "@veredito/ai";
import { getCatalogService, PgKnowledgeStore } from "@veredito/db";
import {
  addVariant, decideMatch, importFeed, login, logout, refreshInternalAlerts, saveContent, saveProduct, transitionContent,
  SESSION_HOURS, type ContentKind, type ContentStatus, type FeedFormat, type SpecSourceKind,
} from "@veredito/db/admin";
import { addFeedSource, setFeedSourceActive } from "@veredito/db/jobs";
import { resolveAlert } from "@veredito/db/admin";
import { importConversions, type ConversionFormat } from "@veredito/db/commerce";
import { ADMIN_COOKIE, adminSql, errorMessage, parseSections, requestFingerprint, requireStaff } from "@/lib/admin";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (path: string, kind: "ok" | "erro", msg: string) => `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`;

function publicChanged() {
  getCatalogService().invalidate();
  revalidatePath("/", "layout");
}

export async function loginAction(form: FormData) {
  const sql = adminSql();
  if (!sql) redirect("/admin/login?erro=" + encodeURIComponent("Banco de dados não configurado"));
  const res = await login(sql, { email: str(form, "email"), password: String(form.get("password") ?? ""), code: str(form, "code"), ...(await requestFingerprint()) });
  if (!res.ok) {
    redirect(back("/admin/login", "erro", res.reason === "locked" ? "Conta bloqueada por 15 minutos após várias tentativas." : "E-mail, senha ou código inválidos."));
  }
  (await cookies()).set(ADMIN_COOKIE, res.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const sql = adminSql();
  const jar = await cookies();
  if (sql) await logout(sql, jar.get(ADMIN_COOKIE)?.value);
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function refreshAlertsAction() {
  const { sql } = await requireStaff("dashboard:read");
  const r = await refreshInternalAlerts(sql);
  redirect(back("/admin", "ok", `Alertas recalculados: ${r.opened} novos, ${r.resolved} resolvidos.`));
}

export async function saveProductAction(form: FormData) {
  const { staff, sql } = await requireStaff("catalog:write");
  const id = str(form, "id") || null;
  const category = str(form, "category") || "celulares";
  const config = getCategory(category);
  const raw: Record<string, string | undefined> = {};
  for (const a of config?.attributes ?? []) {
    const v = form.get(`spec.${a.key}`);
    if (a.type === "bool") raw[a.key] = v === null ? (form.get(`spec_present.${a.key}`) ? "false" : undefined) : String(v);
    else raw[a.key] = v === null ? undefined : String(v);
  }
  const back404 = id ? `/admin/produtos/${id}` : "/admin/produtos/novo";
  let saved: { id: string };
  try {
    saved = await saveProduct(sql, staff, {
      id, category, brand: str(form, "brand"), name: str(form, "name"), model: str(form, "model") || null, slug: str(form, "slug") || null,
      releaseDate: str(form, "releaseDate") || null, summary: str(form, "summary"),
      editorial: { forWho: lines(str(form, "forWho")), notForWho: lines(str(form, "notForWho")), pros: lines(str(form, "pros")), cons: lines(str(form, "cons")) },
      specs: config ? coerceSpecs(config, raw) : {},
      publishStatus: form.get("publish") === "on" ? "published" : "draft",
      specSource: { kind: (str(form, "sourceKind") || "manual") as SpecSourceKind, url: str(form, "sourceUrl") || null },
    });
  } catch (e) {
    redirect(back(back404, "erro", errorMessage(e)));
  }
  publicChanged();
  redirect(back(`/admin/produtos/${saved.id}`, "ok", "Produto salvo."));
}

export async function addVariantAction(form: FormData) {
  const { staff, sql } = await requireStaff("catalog:write");
  const productId = str(form, "productId");
  try {
    await addVariant(sql, staff, productId, { storage: str(form, "storage"), color: str(form, "color"), gtin: str(form, "gtin") || null });
  } catch (e) {
    redirect(back(`/admin/produtos/${productId}`, "erro", errorMessage(e)));
  }
  publicChanged();
  redirect(back(`/admin/produtos/${productId}`, "ok", "Versão adicionada."));
}

export async function importFeedAction(form: FormData) {
  const { staff, sql } = await requireStaff("offers:write");
  const file = form.get("file");
  const content = file instanceof File && file.size > 0 ? await file.text() : String(form.get("content") ?? "");
  let msg: string;
  try {
    const s = await importFeed(sql, staff, {
      merchantName: str(form, "merchant"), programKey: str(form, "programKey") || null,
      format: (str(form, "format") || "planilha") as FeedFormat, content,
    });
    msg = `${s.total} linhas: ${s.auto} associadas automaticamente, ${s.queued} na fila de matching, ${s.invalid} inválidas.`;
  } catch (e) {
    redirect(back("/admin/ofertas", "erro", errorMessage(e)));
  }
  publicChanged();
  redirect(back("/admin/ofertas", "ok", msg));
}

export async function decideMatchAction(form: FormData) {
  const { staff, sql } = await requireStaff("offers:write");
  const id = str(form, "candidateId");
  const variantId = str(form, "variantId");
  try {
    await decideMatch(sql, staff, id, form.get("reject") ? "reject" : { variantId });
  } catch (e) {
    redirect(back("/admin/ofertas", "erro", errorMessage(e)));
  }
  publicChanged();
  redirect(back("/admin/ofertas", "ok", form.get("reject") ? "Anúncio rejeitado." : "Oferta associada."));
}

export async function saveContentAction(form: FormData) {
  const { staff, sql } = await requireStaff("content:write");
  const id = str(form, "id") || null;
  const kind = (str(form, "kind") || "review") as ContentKind;
  const picks = lines(str(form, "picks")).map((l) => {
    const [role, slug, ...note] = l.split("|").map((x) => x.trim());
    return { role: role as "best" | "budget" | "premium" | "value", productSlug: slug ?? "", note: note.join(" | ") };
  });
  let saved: string;
  try {
    saved = await saveContent(sql, staff, {
      id, kind, title: str(form, "title"), category: str(form, "category") || "celulares",
      productSlugs: str(form, "products").split(",").map((s) => s.trim()).filter(Boolean),
      evidenceLevel: (str(form, "evidence") || null) as "hands_on" | "data_based" | null,
      intro: str(form, "intro") || null, sections: parseSections(String(form.get("sections") ?? "")),
      picks: kind === "best_list" ? picks : [], changeNote: str(form, "changeNote") || null,
    });
  } catch (e) {
    redirect(back(id ? `/admin/conteudo/${id}` : "/admin/conteudo/novo", "erro", errorMessage(e)));
  }
  redirect(back(`/admin/conteudo/${saved}`, "ok", "Conteúdo salvo (nova revisão registrada)."));
}

export async function transitionContentAction(form: FormData) {
  const { staff, sql } = await requireStaff("content:write");
  const id = str(form, "id");
  const to = str(form, "to") as ContentStatus;
  const store = new PgKnowledgeStore(sql, createEmbedder().model);
  try {
    await transitionContent(sql, staff, id, to, {
      // Publicado → entra no RAG; despublicado → sai do RAG.
      onPublished: async (cid) => {
        getCatalogService().invalidate();
        const doc = (await getCatalogService().knowledgeDocuments()).find((d) => d.id === cid);
        if (doc) await indexDocument(doc, { embedder: createEmbedder(), store });
      },
      onUnpublished: async (cid) => store.deleteDocument(cid),
    });
  } catch (e) {
    redirect(back(`/admin/conteudo/${id}`, "erro", errorMessage(e)));
  }
  publicChanged();
  redirect(back(`/admin/conteudo/${id}`, "ok", "Status atualizado."));
}

export async function addFeedSourceAction(form: FormData) {
  const { staff, sql } = await requireStaff("offers:write");
  try {
    await addFeedSource(sql, staff, {
      merchantName: str(form, "merchant"), programKey: str(form, "programKey") || null, url: str(form, "url"),
      format: (str(form, "format") || "planilha") as FeedFormat, intervalMinutes: Number(str(form, "interval")) || 180,
    });
  } catch (e) {
    redirect(back("/admin/ofertas", "erro", errorMessage(e)));
  }
  redirect(back("/admin/ofertas", "ok", "Feed agendado. O worker coleta no próximo ciclo."));
}

export async function toggleFeedSourceAction(form: FormData) {
  const { staff, sql } = await requireStaff("offers:write");
  await setFeedSourceActive(sql, staff, str(form, "id"), form.get("active") === "1");
  redirect(back("/admin/ofertas", "ok", "Feed atualizado."));
}

export async function resolveAlertAction(form: FormData) {
  const { sql } = await requireStaff("offers:write");
  await resolveAlert(sql, str(form, "id"));
  redirect(back("/admin", "ok", "Alerta marcado como resolvido."));
}

export async function importConversionsAction(form: FormData) {
  const { staff, sql } = await requireStaff("commission:read");
  const file = form.get("file");
  const content = file instanceof File && file.size > 0 ? await file.text() : String(form.get("content") ?? "");
  let msg: string;
  try {
    const s = await importConversions(sql, staff, { programKey: str(form, "programKey"), format: (str(form, "format") || "planilha") as ConversionFormat, content });
    msg = `${s.total} linhas: ${s.created} novas, ${s.updated} atualizadas, ${s.unchanged} sem mudança, ${s.invalid} inválidas.`;
  } catch (e) {
    redirect(back("/admin/receita", "erro", errorMessage(e)));
  }
  redirect(back("/admin/receita", "ok", msg));
}
