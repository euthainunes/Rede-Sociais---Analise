/**
 * Autenticação da equipe: e-mail + senha + TOTP obrigatório, bloqueio progressivo e sessões curtas.
 * O token da sessão só existe no cookie; o banco guarda o hash.
 */
import { randomUUID } from "node:crypto";
import type { Sql } from "../client.ts";
import { audit } from "./audit.ts";
import { generateTotpSecret, hashPassword, newSessionToken, sha256, verifyPassword, verifyTotp } from "./crypto.ts";
import type { Role } from "./rbac.ts";

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const SESSION_HOURS = 8;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function createStaff(sql: Sql, input: { email: string; name: string; role: Role; password: string }) {
  const id = randomUUID();
  const totpSecret = generateTotpSecret();
  await sql`
    INSERT INTO ops.staff_user (id, email, name, role, password_hash, totp_secret)
    VALUES (${id}, ${input.email}, ${input.name}, ${input.role}, ${hashPassword(input.password)}, ${totpSecret})`;
  await audit(sql, null, "staff.create", { type: "staff_user", id }, { after: { email: input.email, role: input.role } });
  return { id, totpSecret };
}

export type LoginResult = { ok: true; token: string; staff: Staff } | { ok: false; reason: "invalid" | "locked" };

export async function login(
  sql: Sql,
  input: { email: string; password: string; code: string; ipHash?: string | null; userAgentHash?: string | null },
  now = new Date(),
): Promise<LoginResult> {
  const [u] = await sql<{ id: string; email: string; name: string; role: Role; password_hash: string; totp_secret: string; failed_attempts: number; locked_until: Date | null; active: boolean }[]>`
    SELECT * FROM ops.staff_user WHERE email = ${input.email.trim()}`;
  // Mesmo custo de tempo com e sem usuário, para não revelar quais e-mails existem.
  const passwordOk = verifyPassword(input.password, u?.password_hash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!u || !u.active) return { ok: false, reason: "invalid" };
  if (u.locked_until && u.locked_until > now) return { ok: false, reason: "locked" };
  if (!passwordOk || !verifyTotp(u.totp_secret, input.code.trim(), now.getTime())) {
    const failed = u.failed_attempts + 1;
    const lock = failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null;
    await sql`UPDATE ops.staff_user SET failed_attempts = ${lock ? 0 : failed}, locked_until = ${lock} WHERE id = ${u.id}`;
    await audit(sql, null, lock ? "staff.locked" : "staff.login_failed", { type: "staff_user", id: u.id });
    return { ok: false, reason: lock ? "locked" : "invalid" };
  }
  const token = newSessionToken();
  await sql`UPDATE ops.staff_user SET failed_attempts = 0, locked_until = NULL, last_login_at = ${now} WHERE id = ${u.id}`;
  await sql`
    INSERT INTO ops.staff_session (token_hash, user_id, expires_at, ip_hash, user_agent_hash)
    VALUES (${sha256(token)}, ${u.id}, ${new Date(now.getTime() + SESSION_HOURS * 3_600_000)}, ${input.ipHash ?? null}, ${input.userAgentHash ?? null})`;
  const staff: Staff = { id: u.id, email: u.email, name: u.name, role: u.role };
  await audit(sql, staff, "staff.login", { type: "staff_user", id: u.id });
  return { ok: true, token, staff };
}

export async function getSession(sql: Sql, token: string | null | undefined, now = new Date()): Promise<Staff | null> {
  if (!token || token.length < 20) return null;
  const [row] = await sql<Staff[]>`
    UPDATE ops.staff_session s SET last_seen_at = ${now}
    FROM ops.staff_user u
    WHERE s.token_hash = ${sha256(token)} AND s.expires_at > ${now} AND u.id = s.user_id AND u.active
    RETURNING u.id, u.email, u.name, u.role`;
  return row ?? null;
}

export async function logout(sql: Sql, token: string | null | undefined): Promise<void> {
  if (token) await sql`DELETE FROM ops.staff_session WHERE token_hash = ${sha256(token)}`;
}
