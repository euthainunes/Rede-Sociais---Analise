import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MIN_DAYS_OF_DATA, MIN_POINTS_90D, PRICE_METHODOLOGY_VERSION, getCategory } from "@veredito/core";
import { catalog } from "@/lib/data";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "precos") return { title: "Como analisamos preços", alternates: { canonical: "/metodologia/precos" } };
  const cfg = getCategory(slug);
  return cfg ? { title: `Como avaliamos ${cfg.name.toLowerCase()}`, alternates: { canonical: `/metodologia/${slug}` } } : {};
}

export default async function MethodologyPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "precos") return <PriceMethodology />;
  const cfg = getCategory(slug);
  if (!cfg) notFound();
  const content = (await catalog().listContent("methodology")).find((c) => c.path === `/metodologia/${slug}`);
  const attrLabel = new Map(cfg.attributes.map((a) => [a.key, a.label]));
  return (
    <article>
      <h1>Como avaliamos {cfg.name.toLowerCase()}</h1>
      <p className="muted">Metodologia {cfg.methodology.version}. Mudanças são versionadas e todas as notas são recalculadas.</p>
      {content?.sections.map((s) => <section key={s.heading}><h2>{s.heading}</h2><p>{s.text}</p></section>)}
      <h2>Critérios, pesos e insumos</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Critério</th><th>Peso</th><th>O que medimos</th></tr></thead>
          <tbody>
            {cfg.methodology.criteria.map((c) => (
              <tr key={c.key}>
                <td>{c.label}</td>
                <td>{Math.round(c.weight * 100)}%</td>
                <td className="small">
                  {c.computed === "value_for_money"
                    ? "Nota sem custo-benefício comparada à curva nota × preço da categoria"
                    : c.inputs.map((i) => `${attrLabel.get(i.attr) ?? i.attr} (${Math.round(i.weight * 100)}%${i.direction === "lower" ? ", menor é melhor" : ""})`).join("; ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Ajuste editorial máximo por critério: ±{cfg.methodology.editorialAdjustMax.toString().replace(".", ",")} ponto, sempre com justificativa publicada na review.</p>
    </article>
  );
}

function PriceMethodology() {
  return (
    <article>
      <h1>Como analisamos preços</h1>
      <p className="muted">Metodologia de preço {PRICE_METHODOLOGY_VERSION}.</p>
      <p>Coletamos o preço à vista de cada oferta várias vezes ao dia e guardamos o menor preço diário entre lojas confiáveis de cada versão (armazenamento e cor). Preços com variação anormal são marcados como erro e ficam fora das estatísticas.</p>
      <h2>Classificação</h2>
      <ul>
        <li><strong>🔥 Excelente preço:</strong> até 2% acima do menor preço dos últimos 90 dias.</li>
        <li><strong>🟢 Bom preço:</strong> pelo menos 5% abaixo da mediana dos últimos 90 dias.</li>
        <li><strong>🟡 Preço normal:</strong> entre 5% abaixo e 5% acima da mediana.</li>
        <li><strong>🔴 Preço alto:</strong> mais de 5% acima da mediana.</li>
      </ul>
      <p>Só classificamos com pelo menos {MIN_DAYS_OF_DATA} dias de histórico e {MIN_POINTS_90D} observações nos últimos 90 dias. Usamos a mediana, e não a média, para que picos isolados não distorçam a referência.</p>
      <h2>Desconto real</h2>
      <p>Desconto real = quanto o preço de hoje está abaixo da mediana de 90 dias. Quando a loja anuncia um desconto mais de 10 pontos percentuais maior que o real, avisamos na página.</p>
    </article>
  );
}
