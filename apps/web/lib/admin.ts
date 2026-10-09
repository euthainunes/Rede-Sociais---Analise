import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSql, type Sql } from "@veredito/db";
import { can, getSession, type Permission, type Staff } from "@veredito/db/admin";

export const ADMIN_COOKIE = "adm";

/** O painel exige Postgres (escritas). Sem DATABASE_URL, mostra instruções. */
export function adminSql(): Sql | null {
  return getSql();
}

export async function currentStaff(): Promise<Staff | null> {
  const sql = adminSql();
  if (!sql) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return getSession(sql, token);
}

/** Exige sessão (e permissão, se informada). Usado em toda página e toda server action do painel. */
export async function requireStaff(permission?: Permission): Promise<{ staff: Staff; sql: Sql }> {
  const sql = adminSql();
  if (!sql) redirect("/admin/login");
  const staff = await currentStaff();
  if (!staff) redirect("/admin/login");
  if (permission && !can(staff.role, permission)) redirect(`/admin?erro=${encodeURIComponent("Sem permissão para esta ação")}`);
  return { staff, sql };
}

export async function requestFingerprint() {
  const h = await headers();
  const hash = (s: string | null) => (s ? createHash("sha256").update(s).digest("hex").slice(0, 32) : null);
  return { ipHash: hash(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null), userAgentHash: hash(h.get("user-agent")) };
}

/** Mensagem de erro amigável para redirect (?erro=). */
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown }).issues)) {
    return (e as { issues: string[] }).issues.join(" · ");
  }
  return e instanceof Error ? e.message : "Erro inesperado";
}

/** "## Título\ntexto" → seções. */
export function parseSections(raw: string): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = [];
  let cur: { heading: string; text: string } | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { heading: m[1]!.trim(), text: "" };
    } else if (cur) cur.text += `${line}\n`;
  }
  if (cur) out.push(cur);
  return out.map((s) => ({ heading: s.heading, text: s.text.trim() }));
}

export function sectionsToText(sections: { heading: string; text: string }[] | undefined): string {
  return (sections ?? []).map((s) => `## ${s.heading}\n${s.text}`).join("\n\n");
}
