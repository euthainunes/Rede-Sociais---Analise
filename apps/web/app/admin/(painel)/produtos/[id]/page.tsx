import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getProductAdmin } from "@veredito/db/admin";
import {
  addVariantAction, archiveProductAction, deleteProductAction, markDemoAction, toggleVariantAction, updateVariantAction,
} from "../../../actions";
import { ActionForm } from "../../../ActionForm";
import { Flash } from "../../../Flash";
import { ProductForm } from "../ProductForm";
import { requireStaff } from "@/lib/admin";
import { dateBR, dateTimeBR } from "@/lib/format";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const { staff, sql } = await requireStaff("dashboard:read");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProductAdmin(sql, id);
  if (!data) notFound();
  const { product: p, variants, provenance, offers, contents, lastSource } = data;
  const canWrite = can(staff.role, "catalog:write");
  const archived = p.publish_status === "archived";
  const liveContents = contents.filter((c) => c.live);
  const ed = (p.editorial ?? {}) as { forWho?: string[]; notForWho?: string[]; pros?: string[]; cons?: string[] };
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{p.name} {p.is_demo && <span className="badge">demo</span>}</h1>
        {p.publish_status === "published" && <Link className="btn btn-ghost btn-sm" href={`/${p.category}/${p.slug}`} target="_blank">Ver no site ↗</Link>}
      </div>
      <Flash sp={await searchParams} />
      {archived && <p className="flash erro" role="status">Arquivado: fora do site e da busca. Restaure para voltar a editar como rascunho.</p>}
      {p.is_demo && <p className="small muted">Produto de demonstração: no site, a ficha aparece como “dados de demonstração”. Se as informações já são reais, marque como produto real.</p>}

      {canWrite && (
        <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <form action={archiveProductAction}>
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="archived" value={archived ? "0" : "1"} />
            <button className="btn btn-ghost btn-sm" type="submit">{archived ? "Restaurar como rascunho" : "Arquivar"}</button>
          </form>
          <form action={markDemoAction}>
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="demo" value={p.is_demo ? "0" : "1"} />
            <button className="btn btn-ghost btn-sm" type="submit">{p.is_demo ? "Marcar como produto real" : "Marcar como demonstração"}</button>
          </form>
        </div>
      )}

      <ProductForm canWrite={canWrite} v={{
        id: p.id, category: p.category, brand: p.brand, name: p.name, model: p.model ?? "", slug: p.slug,
        releaseDate: p.release_date ? new Date(p.release_date).toISOString().slice(0, 10) : "", summary: p.summary ?? "",
        forWho: ed.forWho ?? [], notForWho: ed.notForWho ?? [], pros: ed.pros ?? [], cons: ed.cons ?? [], specs: p.specs ?? {},
        published: p.publish_status === "published", archived, sourceKind: lastSource ?? "manual",
      }} />

      <h2>Versões</h2>
      <p className="small muted">Versão desativada sai do site; as ofertas dela ficam guardadas. Mudar armazenamento ou cor muda o endereço (?v=) da versão.</p>
      <div className="table-scroll"><table>
        <thead><tr><th>Versão</th><th>GTIN</th><th>Endereço</th><th>Situação</th>{canWrite && <th>Ações</th>}</tr></thead>
        <tbody>{variants.map((v) => {
          const active = v.status === "active";
          return (
            <tr key={v.id}>
              <td>{v.label}{v.is_default && <span className="small muted"> · padrão</span>}</td>
              <td>{v.gtin ?? "—"}</td>
              <td className="small">?v={v.slug}</td>
              <td>{active ? "Ativa" : <span className="badge normal">desativada</span>}</td>
              {canWrite && (
                <td>
                  <details>
                    <summary className="small">Editar</summary>
                    <ActionForm action={updateVariantAction} className="stack" style={{ marginTop: 8, minWidth: 220 }}>
                      <input type="hidden" name="variantId" value={v.id} />
                      <label>Armazenamento<input type="text" name="storage" defaultValue={v.axes?.storage ?? ""} required /></label>
                      <label>Cor<input type="text" name="color" defaultValue={v.label.split(" · ")[1] ?? v.axes?.color ?? ""} required /></label>
                      <label>GTIN/EAN<input type="text" name="gtin" inputMode="numeric" defaultValue={v.gtin ?? ""} /></label>
                      <button className="btn btn-sm" type="submit">Salvar versão</button>
                    </ActionForm>
                  </details>
                  <form action={toggleVariantAction} style={{ marginTop: 4 }}>
                    <input type="hidden" name="variantId" value={v.id} /><input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="active" value={active ? "0" : "1"} />
                    <button className="btn btn-ghost btn-sm" type="submit">{active ? "Desativar" : "Reativar"}</button>
                  </form>
                </td>
              )}
            </tr>
          );
        })}</tbody>
      </table></div>
      {canWrite && (
        <ActionForm action={addVariantAction} className="inline" style={{ marginTop: 8 }}>
          <input type="hidden" name="productId" value={p.id} />
          <label>Armazenamento<input type="text" name="storage" placeholder="256gb" required /></label>
          <label>Cor<input type="text" name="color" placeholder="Preto" required /></label>
          <label>GTIN/EAN<input type="text" name="gtin" inputMode="numeric" /></label>
          <button className="btn btn-ghost btn-sm" type="submit">Adicionar versão</button>
        </ActionForm>
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
              <td className="small">{dateTimeBR(o.last_checked_at)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="muted">Nenhuma oferta. Importe um feed em <Link href="/admin/ofertas">Ofertas</Link>.</p>}

      {contents.length > 0 && (
        <>
          <h2>Conteúdo que cita este produto</h2>
          <ul>{contents.map((c) => <li key={c.id}><Link href={`/admin/conteudo/${c.id}`}>{c.title}</Link>{c.live && <span className="small muted"> · no ar</span>}</li>)}</ul>
        </>
      )}

      <h2>Proveniência da ficha técnica</h2>
      {provenance.length ? (
        <table><thead><tr><th>Atributo</th><th>Fonte</th><th>Confiança</th><th>Verificado</th></tr></thead>
          <tbody>{provenance.map((x) => (
            <tr key={x.key}><td>{x.key}</td><td>{x.source}{x.source_url && <> · <a href={x.source_url} target="_blank" rel="noopener noreferrer nofollow">link</a></>}</td>
              <td>{Number(x.confidence).toFixed(2)}</td><td className="small">{dateBR(x.last_verified_at)}</td></tr>
          ))}</tbody>
        </table>
      ) : <p className="muted">Sem registro de proveniência (produto de demonstração ou ainda não editado).</p>}

      {canWrite && archived && (
        <section className="card" style={{ marginTop: 32 }}>
          <h2 style={{ marginTop: 0 }}>Excluir produto</h2>
          {liveContents.length ? (
            <p className="small">Não dá para excluir enquanto ele aparece em conteúdo no ar: {liveContents.map((c) => c.title).join(", ")}.</p>
          ) : (
            <>
              <p className="small muted">Some do painel e libera o endereço para outro produto. Histórico de preços, cliques e auditoria ficam guardados; as ofertas param de ser coletadas. Não dá para desfazer pelo painel.</p>
              <ActionForm action={deleteProductAction} className="inline">
                <input type="hidden" name="id" value={p.id} />
                <label>Digite o endereço <code>{p.slug}</code> para confirmar<input type="text" name="confirm" required autoComplete="off" /></label>
                <button className="btn btn-sm" type="submit">Excluir definitivamente</button>
              </ActionForm>
            </>
          )}
        </section>
      )}
    </>
  );
}
