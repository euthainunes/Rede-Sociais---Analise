import type { Metadata } from "next";
import Link from "next/link";
import { intentToProfile, parseIntent, productSignals } from "@veredito/ai";
import { criterionLabels, defaultWeights, getCategory, rankByFit } from "@veredito/core";
import { ProductCard } from "@/components/ProductCard";
import { searchContent } from "@/lib/advisor";
import { catalog } from "@/lib/data";
import { money } from "@/lib/format";

const DOC_TYPE_LABELS: Record<string, string> = {
  review: "Análise", comparison: "Comparação", best_list: "Guia de compra", guide: "Guia", methodology: "Metodologia", faq: "Perguntas", policy: "Política",
};

export const metadata: Metadata = { title: "Busca", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string }> };

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").slice(0, 200);
  const intent = parseIntent(q, "celulares");
  const cfg = getCategory(intent.category ?? "celulares")!;
  const [all, hits] = await Promise.all([catalog().listCategory(cfg.slug), searchContent(q, cfg.slug)]);
  const profile = intentToProfile(intent);
  const ranked = rankByFit(all.map((p) => ({ id: p.id, scores: p.scores, price: p.bestPrice, specs: p.specs })), profile, defaultWeights(cfg.methodology));
  const byId = new Map(all.map((p) => [p.id, p]));
  // Correspondência textual por nome/marca quando a busca cita um modelo.
  const words = norm(intent.freeText).split(" ").filter((w) => w.length > 2);
  const nameHits = all.filter((p) => words.some((w) => norm(`${p.name} ${p.brand}`).includes(w)));
  const structured = Boolean(intent.budgetMax) || Object.keys(intent.priorities).length > 0;
  const fit = ranked.filter((r) => !r.eliminated).map((r) => byId.get(r.id)!);
  // Sem critérios explícitos, quem é citado nos guias e análises que respondem à busca vem primeiro.
  const signals = productSignals(hits);
  const semantic = !structured && signals.size > 0
    ? [...fit].sort((a, b) => (signals.get(b.id) ?? 0) - (signals.get(a.id) ?? 0))
    : fit;
  const results = nameHits.length && !structured ? nameHits : semantic;
  // Os 3 primeiros vão para o bloco "recomendamos" só quando a busca tem critérios; senão, ficam na grade.
  const featured = Boolean(q) && structured && results.length > 0;
  // Nada casou (nem critério, nem nome, nem conteúdo): dizemos isso em vez de fingir que a lista é resultado.
  const noMatch = Boolean(q) && !structured && nameHits.length === 0 && hits.length === 0;
  const labels = criterionLabels(cfg.methodology);
  const understood = [
    cfg.name,
    intent.budgetMax ? `até ${money(intent.budgetMax)}` : null,
    ...Object.keys(intent.priorities).map((k) => `prioridade: ${labels[k]?.toLowerCase() ?? k}`),
    intent.exclude.os ? (intent.exclude.os.includes("ios") ? "Android" : "iOS") : null,
    ...intent.mustHave.map((m) => (m === "five_g" ? "5G" : m.toUpperCase())),
  ].filter(Boolean);

  return (
    <>
      <h1>{q ? `Resultados para “${q}”` : "Busca"}</h1>
      {q && <p className="soft small">Entendemos: {understood.join(" · ")}. <Link href={`/consultor?q=${encodeURIComponent(q)}`}>Refinar com o consultor →</Link></p>}
      {noMatch && <p className="notice">Não encontramos nada específico para essa busca. Abaixo, os celulares mais bem avaliados no geral.</p>}
      {hits.length > 0 && (
        <section aria-labelledby="conteudo-relacionado">
          <h2 id="conteudo-relacionado">Guias e análises sobre isso</h2>
          <ul className="search-hits">
            {hits.map((h) => (
              <li key={h.documentId}>
                <span className="badge">{DOC_TYPE_LABELS[h.docType] ?? h.docType}</span>{" "}
                <Link href={h.url}><strong>{h.title}</strong></Link>
                {h.heading && h.heading !== h.title && <span className="muted small"> · {h.heading.split(" › ").pop()}</span>}
                <p className="small">{h.snippet}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {featured && (
        <section>
          <h2>Para essa busca, recomendamos</h2>
          <div className="grid">{results.slice(0, 3).map((p, i) => <ProductCard key={p.id} p={p} highlight={i === 0 ? "Mais indicado" : undefined} />)}</div>
          <h2>Outras opções</h2>
        </section>
      )}
      <div className="grid">{results.slice(featured ? 3 : 0).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {results.length === 0 && <p>Nada encontrado com esses critérios. Tente aumentar o orçamento ou <Link href="/celulares">ver todos os celulares</Link>.</p>}
    </>
  );
}
