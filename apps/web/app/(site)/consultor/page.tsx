import type { Metadata } from "next";
import Link from "next/link";
import type { UserProfile } from "@veredito/core";
import { celulares } from "@veredito/core";
import { Icon } from "@/components/Icon";
import { PriceBadge } from "@/components/PriceBadge";
import { ScoreRing } from "@/components/Score";
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
      <header className="page-head">
        <span className="eyebrow"><Icon name="sparkle" /> Consultor</span>
        <h1>Qual celular faz sentido <mark>para você?</mark></h1>
        <p className="lead">As recomendações são escolhidas pelo nosso Fit Score — sem considerar comissão. O texto explica o porquê com dados da nossa base.</p>
      </header>

      {result?.status === "ok" && (
        <section aria-live="polite" aria-labelledby="h-resultado">
          <h2 id="h-resultado" className="mt0">Resultado</h2>
          <div className="picks">
            {result.picks.map((p) => (
              <article key={p.role} className={`card pick${p.role === "best" ? " best" : ""}`}>
                <span className={`badge ${p.role === "best" ? "pick" : "brand"}`}>{ROLE[p.role]}</span>
                <div className="score-block">
                  <ScoreRing value={p.fit} label="Fit para você" />
                  <div><h3><Link href={p.product.url}>{p.product.name}</Link></h3><small>Fit para você · nota geral {score(p.product.scores.overall)}</small></div>
                </div>
                <p className="row"><span className="price">{money(p.product.bestPrice)}</span><PriceBadge verdict={p.product.priceVerdict} /></p>
                <p className="small muted">{p.reasons[0]}</p>
                <a className={`btn btn-sm ${p.role === "best" ? "btn-mark" : "btn-primary"}`} href={`/go/${p.product.slug}/melhor?cta=advisor_result`} rel="sponsored nofollow">Ver oferta</a>
              </article>
            ))}
          </div>
          <h3 className="mt5">Por quê</h3>
          <div className="why">{result.explanation.text}</div>
          {result.avoid && <p className="notice mt4"><strong>O que eu evitaria:</strong> {result.avoid.product.name} — {result.avoid.reasons.join(", ")}.</p>}
          {result.sources.length > 0 && (
            <p className="small muted">Fontes: {result.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<Link href={s.url}>{s.title}</Link></span>)}</p>
          )}
          <p className="small muted">
            {result.explanation.mode === "llm" ? "Explicação redigida por IA e verificada contra os dados da base." : "Explicação gerada a partir das notas (modo sem IA)."}{" "}
            <Link href={`/comparar?p=${result.picks.slice(0, 3).map((p) => p.product.slug).join(",")}`} rel="nofollow">Comparar estas opções</Link>
          </p>
          <h2>Ajustar respostas</h2>
        </section>
      )}
      {result?.status === "needs_input" && (
        <p className="notice">Para recomendar bem, responda também: {result.questions.map((x) => x.question).join(" · ")}</p>
      )}
      {result?.status === "no_match" && (
        <p className="flash erro">Nenhum modelo atende a tudo isso ({result.reasons.slice(0, 3).join(", ")}). Tente aumentar o orçamento ou relaxar uma restrição.</p>
      )}

      <form method="get" className="advisor-form">
        <label className="q-step">Descreva o que procura (opcional)
          <input type="text" name="q" defaultValue={q} placeholder="Ex.: quero tirar boas fotos e não gastar mais de 3 mil" />
        </label>
        {celulares.advisorQuestions.map((qq, i) => {
          const name = qq.key === "use" ? "uso" : qq.key;
          return (
            <fieldset key={qq.key} className="q-step">
              <legend><span className="n" aria-hidden="true">{i + 1}</span>{qq.question}{qq.multi && <span className="small muted">(pode marcar mais de uma)</span>}</legend>
              <div className="options">
                {qq.options.map((o) => (
                  <label key={o.key} className="option">
                    <input type={qq.multi ? "checkbox" : "radio"} name={name} value={o.key} defaultChecked={selected(name, o.key)} /> {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <div className="advisor-submit"><button className="btn btn-primary" type="submit">Ver recomendação <Icon name="arrow" /></button></div>
      </form>
    </>
  );
}
