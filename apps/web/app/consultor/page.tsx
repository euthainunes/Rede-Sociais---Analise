import type { Metadata } from "next";
import Link from "next/link";
import type { UserProfile } from "@veredito/core";
import { celulares } from "@veredito/core";
import { PriceBadge } from "@/components/PriceBadge";
import { advise } from "@/lib/advisor";
import { money, score } from "@/lib/format";

export const metadata: Metadata = {
  title: "Consultor de compras",
  description: "Responda poucas perguntas e veja qual celular faz mais sentido para você — com o porquê.",
  alternates: { canonical: "/consultor" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ROLE = { best: "Minha recomendação", budget: "Alternativa mais barata", premium: "Alternativa premium", value: "Melhor custo-benefício" };

/** Mescla as respostas do formulário (GET, sem JavaScript) nas regras de cada opção. */
function overridesFrom(sp: Record<string, string | string[] | undefined>): { overrides: Partial<UserProfile>; answered: boolean } {
  const out: Partial<UserProfile> = { priorities: {} };
  let answered = false;
  for (const q of celulares.advisorQuestions) {
    const raw = sp[q.key === "use" ? "uso" : q.key];
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const v of values) {
      const opt = q.options.find((o) => o.key === v);
      if (!opt) continue;
      answered = true;
      const a = opt.apply;
      if (a.priorities) out.priorities = { ...out.priorities, ...a.priorities };
      if ("budgetMax" in a) out.budgetMax = a.budgetMax ?? null;
      if (a.exclude) out.exclude = { ...out.exclude, ...a.exclude };
      if (a.ranges) out.ranges = { ...out.ranges, ...a.ranges };
    }
  }
  return { overrides: out, answered };
}

export default async function AdvisorPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 300) : "";
  const { overrides, answered } = overridesFrom(sp);
  const result = q || answered ? await advise({ query: q || "celular", category: "celulares", profileOverrides: overrides, force: answered }) : null;
  const selected = (key: string, value: string) => {
    const raw = sp[key];
    return Array.isArray(raw) ? raw.includes(value) : raw === value;
  };

  return (
    <>
      <h1>Qual celular faz sentido para você?</h1>
      <p className="muted">As recomendações são escolhidas pelo nosso Fit Score — sem considerar comissão. O texto explica o porquê com dados da nossa base.</p>

      <form method="get" className="stack" style={{ marginTop: 16 }}>
        <label>Descreva o que procura (opcional)
          <input type="text" name="q" defaultValue={q} placeholder="Ex.: quero tirar boas fotos e não gastar mais de 3 mil" />
        </label>
        {celulares.advisorQuestions.map((qq) => {
          const name = qq.key === "use" ? "uso" : qq.key;
          return (
            <fieldset key={qq.key}>
              <legend>{qq.question}</legend>
              <div className="row">
                {qq.options.map((o) => (
                  <label key={o.key} className="chip" style={{ display: "inline-flex", gap: 6 }}>
                    <input type={qq.multi ? "checkbox" : "radio"} name={name} value={o.key} defaultChecked={selected(name, o.key)} /> {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <button className="btn btn-primary" type="submit">Ver recomendação</button>
      </form>

      {result?.status === "needs_input" && (
        <p className="soft" style={{ marginTop: 16 }}>Para recomendar bem, responda também: {result.questions.map((x) => x.question).join(" · ")}</p>
      )}
      {result?.status === "no_match" && (
        <p className="soft" style={{ marginTop: 16 }}>Nenhum modelo atende a tudo isso ({result.reasons.slice(0, 3).join(", ")}). Tente aumentar o orçamento ou relaxar uma restrição.</p>
      )}
      {result?.status === "ok" && (
        <section style={{ marginTop: 24 }} aria-live="polite">
          <h2>Resultado</h2>
          <div className="grid">
            {result.picks.map((p) => (
              <article key={p.role} className="card pcard">
                <span className="badge">{ROLE[p.role]}</span>
                <h3><Link href={p.product.url}>{p.product.name}</Link></h3>
                <p className="small">Fit para você: <strong>{score(p.fit)}</strong> · nota geral {score(p.product.scores.overall)}</p>
                <p className="row"><span className="price">{money(p.product.bestPrice)}</span><PriceBadge verdict={p.product.priceVerdict} /></p>
                <p className="small muted">{p.reasons[0]}</p>
                <a className="btn btn-primary btn-sm" href={`/go/${p.product.slug}/melhor?cta=advisor_result`} rel="sponsored nofollow">Ver oferta</a>
              </article>
            ))}
          </div>
          <h3 style={{ marginTop: 24 }}>Por quê</h3>
          <div className="soft" style={{ whiteSpace: "pre-line" }}>{result.explanation.text}</div>
          {result.avoid && <p className="small"><strong>O que eu evitaria:</strong> {result.avoid.product.name} — {result.avoid.reasons.join(", ")}.</p>}
          {result.sources.length > 0 && (
            <p className="small muted">Fontes: {result.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<Link href={s.url}>{s.title}</Link></span>)}</p>
          )}
          <p className="small muted">
            {result.explanation.mode === "llm" ? "Explicação redigida por IA e verificada contra os dados da base." : "Explicação gerada a partir das notas (modo sem IA)."}{" "}
            <Link href={`/comparar?p=${result.picks.slice(0, 3).map((p) => p.product.slug).join(",")}`} rel="nofollow">Comparar estas opções</Link>
          </p>
        </section>
      )}
    </>
  );
}
