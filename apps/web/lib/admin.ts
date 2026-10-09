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

/** Erros do Postgres que podem chegar ao painel, em português (códigos SQLSTATE). */
const PG_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com esse valor (endereço, GTIN ou nome repetido).",
  "23503": "Este item está ligado a outro que não existe mais ou ainda está em uso.",
  "23502": "Um campo obrigatório ficou em branco.",
  "23514": "Um dos valores está fora do permitido.",
  "22P02": "Um dos valores está em formato inválido.",
  "22001": "Um dos textos é longo demais.",
  "22003": "Um dos números é grande demais.",
  "22007": "Uma das datas está em formato inválido.",
  "22008": "Uma das datas está fora do intervalo válido.",
  "40001": "Outra pessoa salvou ao mesmo tempo. Tente de novo.",
  "40P01": "Outra pessoa salvou ao mesmo tempo. Tente de novo.",
  "42501": "Esta operação não é permitida.",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Mensagem de erro amigável, sempre em português. Erros técnicos vão para o log do servidor. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown }).issues)) {
    return (e as { issues: string[] }).issues.map(capitalize).join(" · ");
  }
  if (e instanceof Error && e.name === "PostgresError") {
    console.error("[admin] erro do banco:", e);
    const code = (e as Error & { code?: string }).code ?? "";
    return PG_MESSAGES[code] ?? "Não foi possível salvar por um erro no banco de dados. Tente de novo; se continuar, avise a equipe técnica.";
  }
  if (e instanceof Error && e.message.startsWith("Sem permissão")) return "Sem permissão para esta ação.";
  if (e instanceof Error && /^(write|connect|read) E[A-Z]+|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/.test(e.message)) {
    console.error("[admin] erro de conexão:", e);
    return "Sem conexão com o banco de dados no momento. Tente de novo em instantes.";
  }
  if (e instanceof Error) return capitalize(e.message);
  return "Erro inesperado. Tente de novo.";
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
