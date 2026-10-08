import Link from "next/link";
import { can, listContentAdmin, STATUS_LABELS } from "@veredito/db/admin";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";

const KIND: Record<string, string> = { review: "Review", best_list: "Melhores", guide: "Guia", methodology: "Metodologia" };

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { staff, sql } = await requireStaff("dashboard:read");
  const rows = await listContentAdmin(sql);
  const columns: (keyof typeof STATUS_LABELS)[] = ["draft", "in_review", "approved", "published", "needs_update"];
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Conteúdo</h1>
        {can(staff.role, "content:write") && <Link className="btn btn-primary btn-sm" href="/admin/conteudo/novo">Novo conteúdo</Link>}
      </div>
      <Flash sp={await searchParams} />
      <div className="grid">
        {columns.map((s) => (
          <section key={s} className="soft">
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>{STATUS_LABELS[s]} ({rows.filter((r) => r.status === s).length})</h2>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {rows.filter((r) => r.status === s).map((r) => (
                <li key={r.id}><Link href={`/admin/conteudo/${r.id}`}>{r.title}</Link> <span className="small muted">{KIND[r.kind] ?? r.kind}</span></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
