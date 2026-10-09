"use server";
/** Ações públicas (sem login): alerta de preço, newsletter, link de acesso e gestão da conta via token assinado. */
import { redirect } from "next/navigation";
import { getSql } from "@veredito/db";
import {
  cancelAlert, deletePerson, PeopleError, requestManageLink, requestNewsletter, requestPriceAlert, unsubscribeAll,
  verifyToken, type AlertKind,
} from "@veredito/db/people";
import { requestFingerprint } from "@/lib/admin";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const KINDS: AlertKind[] = ["target_price", "any_drop", "good_price_label", "back_in_stock"];

function safeReturn(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function withParam(path: string, k: string, v: string) {
  const [base, hash] = path.split("#");
  return `${base}${base!.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(v)}${hash ? `#${hash}` : "#alerta"}`;
}

export async function createAlertAction(form: FormData) {
  const back = safeReturn(str(form, "returnTo"));
  const sql = getSql();
  if (!sql) redirect(withParam(back, "alerta", "indisponivel"));
  if (form.get("consent") !== "on") redirect(withParam(back, "alerta", "consentimento"));
  if (str(form, "website")) redirect(withParam(back, "alerta", "pendente")); // honeypot anti-robô
  const kind = KINDS.includes(str(form, "kind") as AlertKind) ? (str(form, "kind") as AlertKind) : "any_drop";
  const target = Number(str(form, "target").replace(/\./g, "").replace(",", ".")) || null;
  let status: string;
  try {
    const { ipHash } = await requestFingerprint();
    const r = await requestPriceAlert(sql, {
      email: str(form, "email"), productSlug: str(form, "product"), variantSlug: str(form, "variant") || null,
      kind, targetPrice: kind === "target_price" ? target : null, ipHash, source: { form: "product_page" },
    });
    status = r.status === "active" ? "ativo" : "pendente";
  } catch (e) {
    if (!(e instanceof PeopleError)) console.error("alert_request_failed", e instanceof Error ? e.message : e);
    status = e instanceof PeopleError ? e.code : "erro";
  }
  redirect(withParam(back, "alerta", status));
}

export async function newsletterAction(form: FormData) {
  const sql = getSql();
  if (!sql) redirect("/newsletter?status=indisponivel");
  if (str(form, "website")) redirect("/newsletter?status=pendente");
  if (form.get("consent") !== "on") redirect("/newsletter?status=consentimento");
  let status = "pendente";
  try {
    const { ipHash } = await requestFingerprint();
    await requestNewsletter(sql, str(form, "email"), { ipHash, source: { form: str(form, "origin") || "newsletter" } });
  } catch (e) {
    if (!(e instanceof PeopleError)) console.error("newsletter_request_failed", e instanceof Error ? e.message : e);
    status = e instanceof PeopleError ? e.code : "erro";
  }
  redirect(`/newsletter?status=${status}`);
}

export async function manageLinkAction(form: FormData) {
  const sql = getSql();
  if (sql) {
    try {
      const { ipHash } = await requestFingerprint();
      await requestManageLink(sql, str(form, "email"), ipHash);
    } catch {
      // Mesmo retorno para qualquer caso: não revela se o e-mail existe.
    }
  }
  redirect("/conta?enviado=1");
}

function manageToken(form: FormData) {
  const t = verifyToken(str(form, "t"), "manage");
  if (!t) redirect("/conta?expirado=1");
  return t;
}

export async function cancelAlertAction(form: FormData) {
  const t = manageToken(form);
  await cancelAlert(getSql()!, t.p, str(form, "alertId"));
  redirect(`/conta/gerenciar?t=${encodeURIComponent(str(form, "t"))}&ok=alerta`);
}

export async function unsubscribeAllAction(form: FormData) {
  const t = manageToken(form);
  await unsubscribeAll(getSql()!, t.p);
  redirect(`/conta/gerenciar?t=${encodeURIComponent(str(form, "t"))}&ok=descadastro`);
}

export async function deleteAccountAction(form: FormData) {
  const t = manageToken(form);
  if (form.get("confirm") !== "on") redirect(`/conta/gerenciar?t=${encodeURIComponent(str(form, "t"))}&erro=confirmar`);
  await deletePerson(getSql()!, t.p);
  redirect("/conta?excluido=1");
}

export async function unsubscribeTokenAction(form: FormData) {
  const t = verifyToken(str(form, "t"), "unsubscribe");
  if (t && getSql()) await unsubscribeAll(getSql()!, t.p);
  redirect(`/descadastrar?feito=${t ? "1" : "0"}`);
}
