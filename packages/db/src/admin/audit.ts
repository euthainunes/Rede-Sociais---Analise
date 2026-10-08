import type { Sql } from "../client.ts";
import type { Staff } from "./auth.ts";

/** Trilha de auditoria append-only (ops.audit_log). Toda escrita do admin passa por aqui. */
export async function audit(
  sql: Sql,
  actor: Staff | null,
  action: string,
  entity: { type: string; id: string | null },
  change: { before?: unknown; after?: unknown } = {},
): Promise<void> {
  await sql`
    INSERT INTO ops.audit_log (actor_id, actor_role, action, entity_type, entity_id, before, after)
    VALUES (${actor?.id ?? null}, ${actor?.role ?? "system"}, ${action}, ${entity.type}, ${entity.id},
            ${change.before === undefined ? null : sql.json(change.before as never)},
            ${change.after === undefined ? null : sql.json(change.after as never)})`;
}

export async function listAudit(sql: Sql, limit = 100) {
  return sql<{ ts: Date; actor_role: string; email: string | null; action: string; entity_type: string; entity_id: string | null }[]>`
    SELECT a.ts, a.actor_role, s.email, a.action, a.entity_type, a.entity_id
    FROM ops.audit_log a LEFT JOIN ops.staff_user s ON s.id = a.actor_id
    ORDER BY a.id DESC LIMIT ${limit}`;
}
