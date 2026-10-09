import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICE_LABELS } from "@veredito/core";
import { AlertForm } from "@/components/AlertForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PriceBadge } from "@/components/PriceBadge";
import { PriceChart } from "@/components/PriceChart";
import { ProductCard } from "@/components/ProductCard";
import { ScoreBars } from "@/components/ScoreBars";
import { catalog } from "@/lib/data";
import { dateBR, dateTimeBR, formatSpec, money, pct, score } from "@/lib/format";
import { productJsonLd } from "@/lib/seo";

// Variante e período chegam por query string → renderização no servidor por requisição, cacheável na CDN.

type Props = {
  params: Promise<{ categoria: string; produto: string }>;
  searchParams: Promise<{ v?: string; periodo?: string; alerta?: string }>;
};

const RANGES = [
  { key: "7d", days: 7, label: "7 dias" },
  { key: "30d", days: 30, label: "30 dias" },
  { key: "90d", days: 90, label: "90 dias" },
  { key: "6m", days: 180, label: "6 meses" },
  { key: "12m", days: 365, label: "12 meses" },
] as const;

const ALT_LABEL = { cheaper: "Mais barato", premium: "Premium", value: "Melhor custo-benefício", successor: "Versão mais nova" };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categoria, produto } = await params;
  const page = await catalog().getProductPage(categoria, produto);
  if (!page) return {};
  const { summary: s } = page;
  const hasVariant = Boolean((await searchParams).v);
  return {
    title: `${s.name}: review, preço e vale a pena?`,
    description: `Nota ${score(s.scores.overall)}/10. ${s.summary} Menor preço hoje: ${money(s.bestPrice)}${s.bestMerchant ? ` na ${s.bestMerchant}` : ""}.`,
    alternates: { canonical: s.url },
    openGraph: { title: `${s.name} — nota ${score(s.scores.overall)}`, url: s.url, type: "article" },
    ...(hasVariant ? { robots: { index: false, follow: true } } : {}),
  };
}

function goHref(slug: string, merchant: string, variant: string, cta: string, pos?: string) {
  const q = new URLSearchParams({ v: variant, cta, ...(pos ? { pos } : {}) });
  return `/go/${slug}/${merchant}?${q}`;
}

export default async function ProductPageView({ params, searchParams }: Props) {
  const { categoria, produto } = await params;
  const sp = await searchParams;
  const page = await catalog().getProductPage(categoria, produto, sp.v);
  if (!page) notFound();
  const { summary: s, product: p, selected: sel, config } = page;
  const range = RANGES.find((r) => r.key === sp.periodo) ?? RANGES[2];
  const best = sel.best;
  const stats = sel.stats;
  const groups = config.groups.map((g) => ({ ...g, attrs: config.attributes.filter((a) => a.group === g.key && a.comparable !== false && p.specs[a.key] != null) }));
  const alt = (role: keyof typeof ALT_LABEL) => page.alternatives.find((a) => a.role === role)?.product;

  return (
    <article>
      <Breadcrumbs items={[{ name: "Tecnologia", path: "/" }, { name: config.name, path: `/${categoria}` }, { name: p.brand, path: `/${categoria}` }, { name: p.name, path: s.url }]} />

      <div className="hero">
        <div>
          <div className="thumb hero-media" aria-hidden="true">{p.name}</div>
        </div>
        <div className="stack">
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <h1 style={{ margin: 0 }}>{p.name}</h1>
            <span className="score" title={`Nota Veredito (metodologia ${s.scores.methodologyVersion})`}>{score(s.scores.overall)}</span>
          </div>
          <p className="verdict"><strong>Veredito:</strong> {p.summary}</p>

          {page.variants.length > 1 && (
            <nav aria-label="Versões" className="row">
              {page.variants.map((v) => (
                <Link key={v.id} className="chip" aria-current={v.id === sel.id} href={`${s.url}?v=${v.slug}`} rel="nofollow">{v.label}</Link>
              ))}
            </nav>
          )}

          <section className="pricebox" aria-labelledby="preco-agora">
            <h2 id="preco-agora" className="small muted" style={{ margin: 0 }}>Preço agora · {sel.label}</h2>
            {best ? (
              <>
                <div className="big">{money(best.total)} <span className="small muted">à vista</span></div>
                <p className="small muted">
                  na {best.merchantName}{best.shippingCost ? ` (inclui frete de ${money(best.shippingCost, true)})` : ", frete grátis"} · coletado em {dateTimeBR(best.lastCheckedAt)}
                </p>
                <p className="row"><PriceBadge verdict={sel.verdict} /> <span className="small">{sel.verdict.text}</span></p>
                {sel.misleadingDiscount && (
                  <p className="notice">A loja anuncia {pct(sel.advertisedDiscount)} de desconto; contra o nosso histórico, o desconto real é {pct(Math.max(sel.realDiscount ?? 0, 0))}.</p>
                )}
                <div className="row">
                  <a className="btn btn-primary" href={goHref(p.slug, best.merchantSlug, sel.slug, "hero_best_offer")} rel="sponsored nofollow">Ver melhor oferta</a>
                  <Link className="btn btn-ghost" href={`/comparar?p=${p.slug}`} rel="nofollow">+ Comparar</Link>
                </div>
              </>
            ) : (
              <p>Sem oferta disponível no momento.</p>
            )}
            <p className="small muted" style={{ marginTop: 8 }}>Podemos receber comissão por compras feitas pelos links. Isso não muda nossa nota.</p>
          </section>
          <AlertForm productSlug={p.slug} variantSlug={sel.slug} returnTo={`${s.url}?v=${sel.slug}`} status={sp.alerta} suggested={best?.total ?? null} />
        </div>
      </div>

      <nav className="toc small" aria-label="Nesta página" style={{ marginTop: 24 }}>
        <a href="#resumo">Resumo</a><a href="#ofertas">Ofertas</a><a href="#notas">Notas</a><a href="#review">Review</a>
        <a href="#historico">Histórico de preço</a><a href="#ficha">Ficha técnica</a><a href="#alternativas">Alternativas</a>
      </nav>

      <section id="resumo" aria-labelledby="h-resumo">
        <h2 id="h-resumo">Resumo para decisão</h2>
        <dl className="answer">
          <dt>O que é?</dt><dd>{config.nameSingular} da {p.brand}{p.releaseDate ? `, lançado em ${dateBR(p.releaseDate)}` : ""}.</dd>
          <dt>Para quem é?</dt><dd>{p.forWho.join("; ")}.</dd>
          <dt>Para quem não é?</dt><dd>{p.notForWho.join("; ")}.</dd>
          <dt>Principal vantagem</dt><dd>{p.pros[0]}.</dd>
          <dt>Principal desvantagem</dt><dd>{p.cons[0]}.</dd>
          <dt>Qual é o preço hoje?</dt>
          <dd>{best ? `${money(best.total)} na ${best.merchantName} (coletado em ${dateTimeBR(best.lastCheckedAt)}). ${sel.verdict.text}` : "Sem oferta no momento."}</dd>
          {alt("cheaper") && <><dt>Alternativa mais barata</dt><dd><Link href={alt("cheaper")!.url}>{alt("cheaper")!.name}</Link> por {money(alt("cheaper")!.bestPrice)}.</dd></>}
          <dt>Vale a pena?</dt>
          <dd>
            {sel.verdict.label === "excellent" || sel.verdict.label === "good"
              ? `Sim, se o perfil acima é o seu — e o preço atual está ${PRICE_LABELS[sel.verdict.label].text.toLowerCase()}.`
              : sel.verdict.label === "high"
                ? "O produto é bom para o perfil acima, mas o preço está alto agora: vale esperar uma queda."
                : "Sim, se o perfil acima é o seu; o preço está dentro do normal."}
            {p.successorSlug ? " Atenção: existe uma versão mais nova." : ""}
          </dd>
        </dl>
      </section>

      <section className="pc">
        <div className="card"><h2 style={{ marginTop: 0 }}>Para quem é</h2><ul>{p.forWho.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Para quem não é</h2><ul>{p.notForWho.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </section>

      <section id="ofertas" aria-labelledby="h-ofertas">
        <h2 id="h-ofertas">Ofertas · {sel.label}</h2>
        {sel.offers.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Loja</th><th>À vista</th><th>Parcelado</th><th>Frete</th><th>Coleta</th><th><span className="sr-only">Ação</span></th></tr></thead>
              <tbody>
                {sel.offers.map((o, i) => (
                  <tr key={o.id}>
                    <td>{o.merchantName}{i === 0 && <> <span className="badge good">melhor oferta</span></>}</td>
                    <td><strong>{money(o.priceCash, true)}</strong></td>
                    <td className="small">{o.priceInstallment ? `${o.installments}x de ${money(o.priceInstallment / (o.installments ?? 1), true)}` : "—"}</td>
                    <td className="small">{o.shippingCost ? money(o.shippingCost, true) : "Grátis"}</td>
                    <td className="small muted">{dateTimeBR(o.lastCheckedAt)}</td>
                    <td><a className="btn btn-ghost btn-sm" href={goHref(p.slug, o.merchantSlug, sel.slug, "offers_table", String(i + 1))} rel="sponsored nofollow">Ver na {o.merchantName}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Nenhuma loja com preço atualizado para esta versão.</p>}
        <p className="small muted">Ordem: preço total (à vista + frete) e confiabilidade da loja. Comissão não influencia a ordem.</p>
      </section>

      <section id="notas" aria-labelledby="h-notas">
        <h2 id="h-notas">Nossa avaliação: {score(s.scores.overall)}/10</h2>
        <ScoreBars scores={s.scores} methodology={config.methodology} />
        <p className="small muted" style={{ marginTop: 8 }}>
          Notas relativas aos {config.name.toLowerCase()} atuais, pela <Link href={`/metodologia/${categoria}`}>metodologia {s.scores.methodologyVersion}</Link>.
          Quer a nota para o seu uso? <Link href={`/consultor?q=${encodeURIComponent(p.name)}`}>Calcule o seu Fit Score</Link>.
        </p>
      </section>

      <section className="pc">
        <div className="card"><h2 style={{ marginTop: 0 }}>Pontos positivos</h2><ul>{p.pros.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Pontos negativos</h2><ul>{p.cons.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </section>

      <section id="review" aria-labelledby="h-review">
        <h2 id="h-review">Review</h2>
        {page.review ? (
          <>
            <p className="small muted">
              {page.review.evidenceLevel === "hands_on" ? "Testado por nós" : "Análise baseada em dados"} · {page.review.author} · atualizado em {dateBR(page.review.updatedAt)}
            </p>
            {page.review.sections.map((sec) => (
              <div key={sec.heading}><h3>{sec.heading}</h3><p>{sec.text}</p></div>
            ))}
          </>
        ) : <p className="muted">Review completa em produção. As notas acima já seguem a metodologia.</p>}
      </section>

      <section id="historico" aria-labelledby="h-hist">
        <h2 id="h-hist">Histórico de preço · {sel.label}</h2>
        <nav className="row" aria-label="Período">
          {RANGES.map((r) => (
            <Link key={r.key} className="chip" aria-current={r.key === range.key} href={`${s.url}?${new URLSearchParams({ ...(sp.v ? { v: sp.v } : {}), periodo: r.key })}#historico`} rel="nofollow" scroll={false}>{r.label}</Link>
          ))}
        </nav>
        <PriceChart series={sel.series} days={range.days} label={`Menor preço do ${p.name} ${sel.label} nos últimos ${range.label}`} />
        <div className="table-scroll">
          <table>
            <tbody>
              <tr><th>Preço atual</th><td>{money(stats.current)}</td><th>Mediana 90 dias</th><td>{money(stats.median90d)}</td></tr>
              <tr><th>Menor já registrado</th><td>{money(stats.minAllTime)}</td><th>Maior já registrado</th><td>{money(stats.maxAllTime)}</td></tr>
              <tr><th>Variação 7 dias</th><td>{pct(stats.change["7d"], true)}</td><th>30 dias</th><td>{pct(stats.change["30d"], true)}</td></tr>
              <tr><th>90 dias</th><td>{pct(stats.change["90d"], true)}</td><th>6 meses / 12 meses</th><td>{pct(stats.change["180d"], true)} / {pct(stats.change["365d"], true)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">{stats.daysOfData} dias de histórico. <Link href="/metodologia/precos">Como classificamos o preço</Link>.</p>
      </section>

      <section id="ficha" aria-labelledby="h-ficha">
        <h2 id="h-ficha">Ficha técnica</h2>
        {groups.filter((g) => g.attrs.length).map((g) => (
          <details key={g.key} open={g.key === "display" || g.key === "performance"}>
            <summary>{g.label}</summary>
            <table><tbody>
              {g.attrs.map((a) => <tr key={a.key}><th scope="row">{a.label}</th><td>{formatSpec(p.specs[a.key], a.unit, a.enumValues)}</td></tr>)}
            </tbody></table>
          </details>
        ))}
        <p className="small muted">Fonte: {p.isDemo ? "dados de demonstração" : "fabricante e testes próprios"}; cada dado tem origem e data registradas.</p>
      </section>

      <section id="alternativas" aria-labelledby="h-alt">
        <h2 id="h-alt">Alternativas</h2>
        <div className="grid">
          {page.alternatives.map((a) => <ProductCard key={a.product.id} p={a.product} highlight={ALT_LABEL[a.role]} />)}
        </div>
        {page.alternatives[0] && (
          <p><Link href={`/comparar?p=${p.slug},${page.alternatives[0].product.slug}`} rel="nofollow">Comparar {p.name} com {page.alternatives[0].product.name} →</Link></p>
        )}
        {page.guides.length > 0 && (
          <p>Aparece em: {page.guides.map((g, i) => <span key={g.id}>{i > 0 && ", "}<Link href={g.path}>{g.title}</Link></span>)}</p>
        )}
      </section>

      {best && (
        <div className="sticky-cta">
          <span><strong>{money(best.total)}</strong> <span className="small muted">na {best.merchantName}</span></span>
          <a className="btn btn-primary btn-sm" href={goHref(p.slug, best.merchantSlug, sel.slug, "sticky_bar")} rel="sponsored nofollow">Ver oferta</a>
        </div>
      )}
      <JsonLd data={productJsonLd(page)} />
    </article>
  );
}
