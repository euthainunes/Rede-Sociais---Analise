import type { Metadata } from "next";
import Link from "next/link";
import { criterionLabels } from "@veredito/core";
import { Icon } from "@/components/Icon";
import { ScoreRing } from "@/components/Score";
import { catalog } from "@/lib/data";
import { formatSpec, money, score } from "@/lib/format";

export const metadata: Metadata = { title: "Comparar", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ p?: string; diferencas?: string; categoria?: string }> };

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = sp.categoria ?? "celulares";
  const slugs = (sp.p ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const all = await catalog().listCategory(category);
  const c = await catalog().compare(category, slugs);
  const onlyDiff = sp.diferencas === "1";
  const labels = criterionLabels(c.config.methodology);
  const attr = new Map(c.config.attributes.map((a) => [a.key, a]));
  const addable = all.filter((p) => !slugs.includes(p.slug)).slice(0, 8);
  const href = (list: string[], diff = onlyDiff) => `/comparar?${new URLSearchParams({ p: list.join(","), ...(diff ? { diferencas: "1" } : {}) })}`;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow"><Icon name="scale" /> Comparador</span>
        <h1>Comparar {c.config.name.toLowerCase()}</h1>
        <p className="lead">{c.products.length < 2 ? "Escolha pelo menos dois modelos para comparar." : "Vencedor de cada critério em destaque. Adicione até 4 modelos."}</p>
      </header>
      {c.products.length < 4 && addable.length > 0 && (
        <div className="add-rail">
          <span className="uses-label" id="add-label">Adicionar à comparação</span>
          <div className="chip-rail" aria-labelledby="add-label">
            {addable.map((p) => (
              <Link key={p.id} className="chip" href={href([...slugs, p.slug])} rel="nofollow">+ {p.name}</Link>
            ))}
          </div>
        </div>
      )}

      {c.products.length >= 2 && (
        <>
          {c.conclusions.length > 0 && (
            <section aria-labelledby="h-conclusao">
              <h2 id="h-conclusao">Conclusão</h2>
              <ul className="conclusions">{c.conclusions.map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul>
              <p className="small muted mt4">Conclusões geradas por regra a partir das notas: só aparecem quando a diferença é relevante (≥ 0,2 ponto ou ≥ 5% de preço).</p>
            </section>
          )}
          <div className="section-head">
            <h2>Lado a lado</h2>
            <nav className="segmented" aria-label="Linhas exibidas">
              <Link aria-current={!onlyDiff} href={href(slugs, false)} rel="nofollow">Mostrar tudo</Link>
              <Link aria-current={onlyDiff} href={href(slugs, true)} rel="nofollow">Só diferenças</Link>
            </nav>
          </div>
          <div className="table-scroll compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  {c.products.map((p) => (
                    <th scope="col" key={p.id}>
                      <div className="compare-head">
                        <ScoreRing value={p.scores.overall} size="sm" />
                        <Link className="name tap" href={p.url}>{p.name}</Link>
                        <Link className="remove tap" href={href(slugs.filter((s) => s !== p.slug))} rel="nofollow" aria-label={`Remover ${p.name} da comparação`}>✕ remover</Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Preço agora</th>
                  {c.products.map((p) => {
                    const win = c.winners.find((w) => w.criterion === "price")?.productId === p.id;
                    return <td key={p.id} className={win ? "win price" : undefined}>{money(p.bestPrice)}{win && " ✓"}{p.bestMerchantSlug && <><br /><a className="btn btn-primary btn-sm mt4" href={`/go/${p.slug}/${p.bestMerchantSlug}?cta=compare_column`} rel="sponsored nofollow">Ver oferta</a></>}</td>;
                  })}
                </tr>
                <tr>
                  <th scope="row">Nota geral</th>
                  {c.products.map((p) => <td key={p.id}><strong>{score(p.scores.overall)}</strong></td>)}
                </tr>
                <tr className="group"><th scope="rowgroup" colSpan={c.products.length + 1}>Notas por critério</th></tr>
                {c.config.methodology.criteria.map((cr) => {
                  const w = c.winners.find((x) => x.criterion === cr.key);
                  return (
                    <tr key={cr.key}>
                      <th scope="row">{labels[cr.key]}</th>
                      {c.products.map((p) => <td key={p.id} className={w?.productId === p.id ? "win" : undefined}>{score(p.scores.criteria[cr.key]?.final)}</td>)}
                    </tr>
                  );
                })}
                <tr className="group"><th scope="rowgroup" colSpan={c.products.length + 1}>Ficha técnica{onlyDiff ? " · só diferenças" : ""}</th></tr>
                {c.rows.filter((r) => !onlyDiff || r.differs).map((r) => {
                  const a = attr.get(r.attr)!;
                  return (
                    <tr key={r.attr}>
                      <th scope="row">{a.label}</th>
                      {r.values.map((v, i) => <td key={i}>{formatSpec(v, a.unit, a.enumValues)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted mt4">Em destaque (✓): vencedor do critério (diferença ≥ 0,1). Empates técnicos não são destacados.</p>
        </>
      )}
    </>
  );
}
