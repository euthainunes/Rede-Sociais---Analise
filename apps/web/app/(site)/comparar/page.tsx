import type { Metadata } from "next";
import Link from "next/link";
import { criterionLabels } from "@veredito/core";
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
      <h1>Comparar {c.config.name.toLowerCase()}</h1>
      {c.products.length < 2 && <p>Escolha pelo menos dois modelos para comparar.</p>}
      <div className="row" aria-label="Adicionar">
        {c.products.length < 4 && addable.map((p) => (
          <Link key={p.id} className="chip" href={href([...slugs, p.slug])} rel="nofollow">+ {p.name}</Link>
        ))}
      </div>

      {c.products.length >= 2 && (
        <>
          {c.conclusions.length > 0 && (
            <section className="soft" style={{ marginTop: 16 }}>
              <h2 style={{ marginTop: 0 }}>Conclusão</h2>
              <ul>{c.conclusions.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="small muted">Conclusões geradas por regra a partir das notas: só aparecem quando a diferença é relevante (≥ 0,2 ponto ou ≥ 5% de preço).</p>
            </section>
          )}
          <p className="row" style={{ marginTop: 16 }}>
            <Link className="chip" aria-current={!onlyDiff} href={href(slugs, false)} rel="nofollow">Mostrar tudo</Link>
            <Link className="chip" aria-current={onlyDiff} href={href(slugs, true)} rel="nofollow">Só diferenças</Link>
          </p>
          <div className="table-scroll">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  {c.products.map((p) => (
                    <th scope="col" key={p.id}>
                      <Link href={p.url}>{p.name}</Link><br />
                      <Link className="small" href={href(slugs.filter((s) => s !== p.slug))} rel="nofollow">remover</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Preço agora</th>
                  {c.products.map((p) => {
                    const win = c.winners.find((w) => w.criterion === "price")?.productId === p.id;
                    return <td key={p.id} className={win ? "win" : undefined}>{money(p.bestPrice)}{p.bestMerchantSlug && <><br /><a className="small" href={`/go/${p.slug}/${p.bestMerchantSlug}?cta=compare_column`} rel="sponsored nofollow">Ver oferta</a></>}</td>;
                  })}
                </tr>
                <tr>
                  <th scope="row">Nota geral</th>
                  {c.products.map((p) => <td key={p.id}><strong>{score(p.scores.overall)}</strong></td>)}
                </tr>
                {c.config.methodology.criteria.map((cr) => {
                  const w = c.winners.find((x) => x.criterion === cr.key);
                  return (
                    <tr key={cr.key}>
                      <th scope="row">{labels[cr.key]}</th>
                      {c.products.map((p) => <td key={p.id} className={w?.productId === p.id ? "win" : undefined}>{score(p.scores.criteria[cr.key]?.final)}</td>)}
                    </tr>
                  );
                })}
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
          <p className="small muted">Em destaque: vencedor do critério (diferença ≥ 0,1). Empates técnicos não são destacados.</p>
        </>
      )}
    </>
  );
}
