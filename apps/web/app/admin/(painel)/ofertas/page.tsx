import { listMatchQueue, listVariantsForPicker } from "@veredito/db/admin";
import { PROGRAMS } from "@veredito/integrations";
import { listFeedSources } from "@veredito/db/jobs";
import { addFeedSourceAction, decideMatchAction, importFeedAction, toggleFeedSourceAction } from "../../actions";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";

const EXAMPLE = `id,titulo,url,preco_a_vista,preco_de,frete,disponibilidade,gtin,condicao
SKU-1,Smartphone Órbita S9 256GB Preto,https://loja.example/p/1,"2.749,00","3.299,00",0,sim,2000000000070,novo`;

export default async function OffersAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { sql } = await requireStaff("offers:write");
  const [queue, variants, feeds] = await Promise.all([listMatchQueue(sql), listVariantsForPicker(sql), listFeedSources(sql)]);
  return (
    <>
      <h1>Ofertas e matching</h1>
      <Flash sp={await searchParams} />
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Importar feed</h2>
        <p className="small muted">
          Cada linha é casada com uma versão do catálogo por GTIN, MPN ou título. Casos com confiança abaixo de 90% vão para a fila abaixo.
          Linhas sem preço ou com URL que não seja https são descartadas.
        </p>
        <form action={importFeedAction} className="stack">
          <div className="form-grid">
            <label>Loja<input type="text" name="merchant" required placeholder="Ex.: Loja Alfa" /></label>
            <label>Programa de afiliados
              <select name="programKey" defaultValue="">
                <option value="">Nenhum / link direto</option>
                {PROGRAMS.map((p) => <option key={p.key} value={p.key}>{p.name}{p.termsVerified ? "" : " (termos a verificar)"}</option>)}
              </select>
            </label>
            <label>Formato
              <select name="format" defaultValue="planilha">
                <option value="planilha">Planilha CSV (colunas em português)</option>
                <option value="awin">Feed Awin (CSV)</option>
              </select>
            </label>
            <label>Arquivo CSV<input type="file" name="file" accept=".csv,text/csv" /></label>
          </div>
          <label>…ou cole o conteúdo<textarea name="content" rows={5} placeholder={EXAMPLE} /></label>
          <button className="btn btn-primary" type="submit">Importar</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Feeds agendados</h2>
        <p className="small muted">O worker baixa cada feed no intervalo definido (só endereços https públicos), importa e associa as ofertas. Falhas viram alerta na visão geral.</p>
        {feeds.length > 0 && (
          <div className="table-scroll"><table>
            <thead><tr><th>Loja</th><th>Formato</th><th>Intervalo</th><th>Última coleta</th><th></th></tr></thead>
            <tbody>{feeds.map((f) => (
              <tr key={f.id}>
                <td>{f.merchant}<br /><span className="small muted">{f.url}</span></td>
                <td>{f.format}</td><td>{f.interval_minutes} min</td>
                <td className="small">{f.last_run_at ? f.last_run_at.toLocaleString("pt-BR") : "nunca"}{" "}
                  {f.last_status && <span className={`badge ${f.last_status === "ok" ? "good" : "high"}`}>{f.last_status}</span>}
                  {f.last_error && <><br /><span className="muted">{f.last_error}</span></>}
                </td>
                <td>
                  <form action={toggleFeedSourceAction}>
                    <input type="hidden" name="id" value={f.id} /><input type="hidden" name="active" value={f.active ? "0" : "1"} />
                    <button className="btn btn-ghost btn-sm" type="submit">{f.active ? "Pausar" : "Ativar"}</button>
                  </form>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <form action={addFeedSourceAction} className="inline" style={{ marginTop: 12 }}>
          <label>Loja<input type="text" name="merchant" required /></label>
          <label>URL do feed (https)<input type="url" name="url" required pattern="https://.*" placeholder="https://..." /></label>
          <label>Formato<select name="format" defaultValue="planilha"><option value="planilha">Planilha CSV</option><option value="awin">Awin</option></select></label>
          <label>A cada (min)<input type="number" name="interval" defaultValue={180} min={30} step={30} /></label>
          <label>Programa
            <select name="programKey" defaultValue="">
              <option value="">Nenhum</option>
              {PROGRAMS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </label>
          <button className="btn btn-primary btn-sm" type="submit">Agendar</button>
        </form>
      </section>

      <h2>Fila de matching ({queue.length})</h2>
      {queue.length === 0 && <p className="muted">Nada pendente.</p>}
      {queue.map((q) => (
        <form key={q.id} action={decideMatchAction} className="card" style={{ marginBottom: 12 }}>
          <input type="hidden" name="candidateId" value={q.id} />
          <p><strong>{q.title_raw}</strong><br /><span className="small muted">{q.merchant} · {q.payload.priceCash?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · <a href={q.url} target="_blank" rel="noopener noreferrer nofollow">anúncio</a></span></p>
          <label>É a versão:
            <select name="variantId" defaultValue={q.suggestions[0]?.variantId ?? ""}>
              <option value="" disabled>Escolha…</option>
              {q.suggestions.length > 0 && (
                <optgroup label="Sugestões">
                  {q.suggestions.map((s) => <option key={`s${s.variantId}`} value={s.variantId}>{s.label} ({Math.round(s.score * 100)}% · {s.method})</option>)}
                </optgroup>
              )}
              <optgroup label="Todas">
                {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </optgroup>
            </select>
          </label>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" type="submit">Associar</button>
            <button className="btn btn-ghost btn-sm" type="submit" name="reject" value="1" formNoValidate>Não é do catálogo</button>
          </div>
        </form>
      ))}
    </>
  );
}
