import { listAudit } from "@veredito/db/admin";
import { requireStaff } from "@/lib/admin";

export default async function AuditPage() {
  const { sql } = await requireStaff("audit:read");
  const rows = await listAudit(sql, 200);
  return (
    <>
      <h1>Auditoria</h1>
      <p className="small muted">Registro somente de inclusão: toda escrita feita pelo painel aparece aqui.</p>
      <div className="table-scroll"><table>
        <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Item</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}><td className="small">{r.ts.toLocaleString("pt-BR")}</td><td className="small">{r.email ?? r.actor_role}</td><td>{r.action}</td><td className="small">{r.entity_type} {r.entity_id?.slice(0, 8)}</td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
