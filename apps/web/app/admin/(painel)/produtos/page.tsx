import Link from "next/link";
import { can, listProductsAdmin, productCounts, type ProductListFilter } from "@veredito/db/admin";
import { archiveDemoAction } from "../../actions";
import { ActionForm } from "../../ActionForm";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";
import { dateBR } from "@/lib/format";

type Props = { searchParams: Promise<{ q?: string; filtro?: string; ok?: string; erro?: string }> };

const TABS: { key: ProductListFilter; label: string }[] = [
  { key: "ativos", label: "Ativos" }, { key: "publicados", label: "Publicados" }, { key: "rascunhos", label: "Rascunhos" },
  { key: "arquivados", label: "Arquivados" }, { key: "demo", label: "Demonstração" }, { key: "reais", label: "Reais" },
];
const STATUS: Record<string, string> = { published: "Publicado", draft: "Rascunho", archived: "Arquivado" };

export default async function ProductsAdmin({ searchParams }: Props) {
  const sp = await searchParams;
  const { staff, sql } = await requireStaff("dashboard:read");
  const filter = TABS.find((t) => t.key === sp.filtro)?.key ?? "ativos";
  const [rows, counts] = await Promise.all([listProductsAdmin(sql, { q: sp.q, filter }), productCounts(sql)]);
  const canWrite = can(staff.role, "catalog:write");
  const href = (f: ProductListFilter) => `/admin/produtos?filtro=${f}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;
  const demoActive = counts.demo_no_ar;
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Produtos</h1>
        {canWrite && <Link className="btn btn-primary btn-sm" href="/admin/produtos/novo">Novo produto</Link>}
      </div>
      <Flash sp={sp} />
      <nav className="row" aria-label="Filtrar produtos" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.key} href={href(t.key)} className={`btn btn-sm ${t.key === filter ? "btn-primary" : "btn-ghost"}`} aria-current={t.key === filter ? "page" : undefined}>
            {t.label} <span className="small">({counts[t.key]})</span>
          </Link>
        ))}
      </nav>
      <form className="inline" method="get">
        <input type="hidden" name="filtro" value={filter} />
        <input className="plain" type="search" name="q" defaultValue={sp.q} placeholder="Buscar por nome ou marca" />
        <button className="btn btn-ghost btn-sm">Buscar</button>
      </form>
      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>{sp.q ? "Nenhum produto encontrado com essa busca." : "Nenhum produto nesta aba."}</p>
      ) : (
        <div className="table-scroll">
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Produto</th><th>Status</th><th>Versões</th><th>Ofertas</th><th>Review</th><th>Atualizado</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/produtos/${r.id}`}>{r.name}</Link> {r.is_demo && <span className="badge">demo</span>}<br /><span className="small muted">{r.brand} · /{r.category}/{r.slug}</span></td>
                  <td><span className="status">{STATUS[r.publish_status] ?? r.publish_status}</span></td>
                  <td>{r.variants}</td>
                  <td>{r.offers || <span className="badge high">0</span>}</td>
                  <td>{r.reviews ? "sim" : <span className="badge normal">não</span>}</td>
                  <td className="small">{dateBR(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canWrite && filter === "demo" && demoActive > 0 && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Tirar os dados de demonstração do site</h2>
          <p className="small muted">
            Arquiva de uma vez os {demoActive} produtos de demonstração que ainda não estão arquivados: saem do site e da busca, mas nada é apagado.
            Para trazer um de volta, abra-o na aba Arquivados e restaure. Conteúdos que citam esses produtos continuam no ar; arquive-os em Conteúdo, se for o caso.
            Um produto de demonstração que virou real pode ser marcado como real na página dele antes.
          </p>
          <ActionForm action={archiveDemoAction} className="inline">
            <label>Digite ARQUIVAR para confirmar<input type="text" name="confirm" required autoComplete="off" /></label>
            <button className="btn btn-sm" type="submit">Arquivar demonstração</button>
          </ActionForm>
        </section>
      )}
    </>
  );
}
