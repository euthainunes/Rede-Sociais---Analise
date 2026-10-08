import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getProductAdmin } from "@veredito/db/admin";
import { addVariantAction } from "../../../actions";
import { Flash } from "../../../Flash";
import { ProductForm } from "../ProductForm";
import { requireStaff } from "@/lib/admin";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const { staff, sql } = await requireStaff("dashboard:read");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProductAdmin(sql, id);
  if (!data) notFound();
  const { product: p, variants, provenance, offers } = data;
  const canWrite = can(staff.role, "catalog:write");
  const ed = (p.editorial ?? {}) as { forWho?: string[]; notForWho?: string[]; pros?: string[]; cons?: string[] };
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{p.name}</h1>
        <Link className="btn btn-ghost btn-sm" href={`/${p.category}/${p.slug}`} target="_blank">Ver no site ↗</Link>
      </div>
      <Flash sp={await searchParams} />
      <ProductForm canWrite={canWrite} v={{
        id: p.id, category: p.category, brand: p.brand, name: p.name, model: p.model ?? "", slug: p.slug,
        releaseDate: p.release_date ? new Date(p.release_date).toISOString().slice(0, 10) : "", summary: p.summary ?? "",
        forWho: ed.forWho ?? [], notForWho: ed.notForWho ?? [], pros: ed.pros ?? [], cons: ed.cons ?? [], specs: p.specs ?? {},
        published: p.publish_status === "published",
      }} />

      <h2>Versões</h2>
      <table><thead><tr><th>Versão</th><th>GTIN</th><th>Endereço</th></tr></thead>
        <tbody>{variants.map((v) => <tr key={v.id}><td>{v.label}</td><td>{v.gtin ?? "—"}</td><td className="small">?v={v.slug}</td></tr>)}</tbody>
      </table>
      {canWrite && (
        <form action={addVariantAction} className="inline" style={{ marginTop: 8 }}>
          <input type="hidden" name="productId" value={p.id} />
          <label>Armazenamento<input type="text" name="storage" placeholder="256gb" required /></label>
          <label>Cor<input type="text" name="color" placeholder="Preto" required /></label>
          <label>GTIN/EAN<input type="text" name="gtin" inputMode="numeric" /></label>
          <button className="btn btn-ghost btn-sm" type="submit">Adicionar versão</button>
        </form>
      )}

      <h2>Ofertas</h2>
      {offers.length ? (
        <div className="table-scroll"><table>
          <thead><tr><th>Loja</th><th>Preço</th><th>Estoque</th><th>Matching</th><th>Coleta</th></tr></thead>
          <tbody>{offers.map((o) => (
            <tr key={o.id}>
              <td><a href={o.url_original} target="_blank" rel="noopener noreferrer nofollow">{o.merchant}</a></td>
              <td>{o.price_cash ? Number(o.price_cash).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
              <td>{o.availability}</td><td>{o.match_status}</td>
              <td className="small">{new Date(o.last_checked_at).toLocaleString("pt-BR")}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="muted">Nenhuma oferta. Importe um feed em <Link href="/admin/ofertas">Ofertas</Link>.</p>}

      <h2>Proveniência da ficha técnica</h2>
      {provenance.length ? (
        <table><thead><tr><th>Atributo</th><th>Fonte</th><th>Confiança</th><th>Verificado</th></tr></thead>
          <tbody>{provenance.map((x) => (
            <tr key={x.key}><td>{x.key}</td><td>{x.source}{x.source_url && <> · <a href={x.source_url} target="_blank" rel="noopener noreferrer nofollow">link</a></>}</td>
              <td>{Number(x.confidence).toFixed(2)}</td><td className="small">{x.last_verified_at.toLocaleDateString("pt-BR")}</td></tr>
          ))}</tbody>
        </table>
      ) : <p className="muted">Sem registro de proveniência (produto de demonstração ou ainda não editado).</p>}
    </>
  );
}
