import type { Sql } from "../client.ts";
import type { Staff } from "./auth.ts";

/** Trilha de auditoria append-only (ops.audit_log). Toda escrita do admin passa por aqui. */
export async function audit(
  sql: Sql,
  actor: Staff | null,
  action: string,
  entity: { type: string; id: string | null },
  change: { before?: unknown; after?: unknown } = {},
  meta: { ipHash?: string | null } = {},
): Promise<void> {
  await sql`
    INSERT INTO ops.audit_log (actor_id, actor_role, action, entity_type, entity_id, before, after, ip_hash)
    VALUES (${actor?.id ?? null}, ${actor?.role ?? "system"}, ${action}, ${entity.type}, ${entity.id},
            ${change.before === undefined ? null : sql.json(change.before as never)},
            ${change.after === undefined ? null : sql.json(change.after as never)}, ${meta.ipHash ?? null})`;
}

export interface AuditFilter {
  action?: string | null;    // prefixo: "product" pega product.create, product.update…
  actor?: string | null;     // id da pessoa da equipe
  entity?: string | null;    // id do item (completo ou início)
  from?: string | null;      // AAAA-MM-DD, horário de Brasília
  to?: string | null;
  before?: number | null;    // paginação: registros com id menor que este
}

export interface AuditRow {
  id: number; ts: Date; actor_role: string; email: string | null; name: string | null; action: string;
  entity_type: string; entity_id: string | null; before: unknown; after: unknown; ip_hash: string | null;
}

export async function listAudit(sql: Sql, limit = 100, f: AuditFilter = {}): Promise<AuditRow[]> {
  const day = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const from = day(f.from);
  const to = day(f.to);
  const actor = f.actor && /^[0-9a-f-]{36}$/i.test(f.actor) ? f.actor : null;
  return sql<AuditRow[]>`
    SELECT a.id::int AS id, a.ts, a.actor_role, s.email, s.name, a.action, a.entity_type, a.entity_id, a.before, a.after, a.ip_hash
    FROM ops.audit_log a LEFT JOIN ops.staff_user s ON s.id = a.actor_id
    WHERE true
      ${f.action ? sql`AND a.action LIKE ${f.action.replace(/[%_]/g, "") + "%"}` : sql``}
      ${actor ? sql`AND a.actor_id = ${actor}` : sql``}
      ${f.entity ? sql`AND a.entity_id LIKE ${f.entity.trim().replace(/[%_]/g, "") + "%"}` : sql``}
      ${from ? sql`AND a.ts >= (${from}::date)::timestamp AT TIME ZONE 'America/Sao_Paulo'` : sql``}
      ${to ? sql`AND a.ts < ((${to}::date + 1))::timestamp AT TIME ZONE 'America/Sao_Paulo'` : sql``}
      ${f.before ? sql`AND a.id < ${f.before}` : sql``}
    ORDER BY a.id DESC LIMIT ${limit}`;
}

/** Valores para os filtros: ações já registradas e quem já agiu. */
export async function auditFacets(sql: Sql) {
  const actions = await sql<{ action: string }[]>`SELECT DISTINCT split_part(action, '.', 1) AS action FROM ops.audit_log ORDER BY 1`;
  const actors = await sql<{ id: string; email: string; name: string }[]>`
    SELECT id, email, name FROM ops.staff_user WHERE id IN (SELECT DISTINCT actor_id FROM ops.audit_log WHERE actor_id IS NOT NULL) ORDER BY name`;
  return { groups: actions.map((a) => a.action), actors };
}
