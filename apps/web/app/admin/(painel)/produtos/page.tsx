import Link from "next/link";
import { can, listProductsAdmin } from "@veredito/db/admin";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";

type Props = { searchParams: Promise<{ q?: string; ok?: string; erro?: string }> };

export default async function ProductsAdmin({ searchParams }: Props) {
  const sp = await searchParams;
  const { staff, sql } = await requireStaff("dashboard:read");
  const rows = await listProductsAdmin(sql, { q: sp.q });
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Produtos</h1>
        {can(staff.role, "catalog:write") && <Link className="btn btn-primary btn-sm" href="/admin/produtos/novo">Novo produto</Link>}
      </div>
      <Flash sp={sp} />
      <form className="inline" method="get"><input className="plain" type="search" name="q" defaultValue={sp.q} placeholder="Buscar por nome ou marca" /><button className="btn btn-ghost btn-sm">Buscar</button></form>
      <div className="table-scroll">
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Produto</th><th>Status</th><th>Versões</th><th>Ofertas</th><th>Review</th><th>Atualizado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/produtos/${r.id}`}>{r.name}</Link> {r.is_demo && <span className="badge">demo</span>}<br /><span className="small muted">{r.brand} · /{r.category}/{r.slug}</span></td>
                <td><span className="status">{r.publish_status === "published" ? "Publicado" : "Rascunho"}</span></td>
                <td>{r.variants}</td>
                <td>{r.offers || <span className="badge high">0</span>}</td>
                <td>{r.reviews ? "sim" : <span className="badge normal">não</span>}</td>
                <td className="small">{r.updated_at.toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
