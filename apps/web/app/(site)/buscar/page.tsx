import type { Metadata } from "next";
import Link from "next/link";
import { intentToProfile, parseIntent } from "@veredito/ai";
import { criterionLabels, defaultWeights, getCategory, rankByFit } from "@veredito/core";
import { ProductCard } from "@/components/ProductCard";
import { catalog } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Busca", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string }> };

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").slice(0, 200);
  const intent = parseIntent(q, "celulares");
  const cfg = getCategory(intent.category ?? "celulares")!;
  const all = await catalog().listCategory(cfg.slug);
  const profile = intentToProfile(intent);
  const ranked = rankByFit(all.map((p) => ({ id: p.id, scores: p.scores, price: p.bestPrice, specs: p.specs })), profile, defaultWeights(cfg.methodology));
  const byId = new Map(all.map((p) => [p.id, p]));
  // Correspondência textual por nome/marca quando a busca cita um modelo.
  const words = norm(intent.freeText).split(" ").filter((w) => w.length > 2);
  const nameHits = all.filter((p) => words.some((w) => norm(`${p.name} ${p.brand}`).includes(w)));
  const results = nameHits.length && !intent.budgetMax && Object.keys(intent.priorities).length === 0
    ? nameHits
    : ranked.filter((r) => !r.eliminated).map((r) => byId.get(r.id)!);
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
      {results.length > 0 && q && (Object.keys(intent.priorities).length > 0 || intent.budgetMax) && (
        <section>
          <h2>Para essa busca, recomendamos</h2>
          <div className="grid">{results.slice(0, 3).map((p, i) => <ProductCard key={p.id} p={p} highlight={i === 0 ? "Mais indicado" : undefined} />)}</div>
          <h2>Outras opções</h2>
        </section>
      )}
      <div className="grid">{results.slice(q ? 3 : 0).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {results.length === 0 && <p>Nada encontrado com esses critérios. Tente aumentar o orçamento ou <Link href="/celulares">ver todos os celulares</Link>.</p>}
    </>
  );
}
