import Link from "next/link";
import { brand } from "@veredito/brand";
import { celulares } from "@veredito/core";
import { Icon, type IconName } from "@/components/Icon";
import { PriceBadge } from "@/components/PriceBadge";
import { ProductCard } from "@/components/ProductCard";
import { catalog } from "@/lib/data";
import { money, pct } from "@/lib/format";

export const revalidate = 900;

const USE_ICON: Record<string, IconName> = { fotografia: "camera", jogos: "game", trabalho: "briefcase", basico: "chat", bateria: "battery" };
const USE_KEYS = new Set(celulares.advisorQuestions.find((q) => q.key === "use")?.options.map((o) => o.key));

/**
 * Atalho de perfil: vai para a opção equivalente do consultor. Perfis sem opção (ex.: "Bateria que dura") viram texto livre
 * com orçamento "sem limite" já marcado, para também chegarem direto a uma recomendação ajustável.
 */
function useHref(key: string, label: string) {
  return USE_KEYS.has(key) ? `/consultor?uso=${key}` : `/consultor?${new URLSearchParams({ q: label, budget: "any" })}`;
}

export default async function Home() {
  const [top, deals, guides] = await Promise.all([
    catalog().listCategory("celulares"),
    catalog().deals("celulares"),
    catalog().listContent("best_list"),
  ]);
  const proof = deals[0];
  return (
    <>
      <section className="home-hero">
        <div>
          <span className="eyebrow"><Icon name="shield" /> Especialista independente em tecnologia</span>
          <h1>O que você quer <mark>comprar?</mark></h1>
          <p className="lead">{brand.tagline} Notas com metodologia aberta, histórico real de preços e uma recomendação para o seu perfil.</p>
          <form action="/buscar" className="search search-lg" role="search">
            <label htmlFor="q-home" className="sr-only">Buscar</label>
            <Icon name="search" className="search-icon" />
            <input id="q-home" name="q" type="search" placeholder="Ex.: melhor celular para jogos até R$ 3.000" />
            <button type="submit">Buscar</button>
          </form>
          <div className="uses">
            <span className="uses-label" id="uses-label">Ou comece pelo seu uso:</span>
            <ul className="chip-rail" aria-labelledby="uses-label">
              {celulares.profiles.map((p) => (
                <li key={p.key}>
                  <Link className="chip" href={useHref(p.key, p.label)}><Icon name={USE_ICON[p.key] ?? "sparkle"} /> {p.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {proof?.variant.best && (
          <aside className="proof" aria-labelledby="proof-title">
            <span className="eyebrow"><Icon name="chart" /> Desconto real de hoje</span>
            <h2 id="proof-title"><Link href={`${proof.product.url}?v=${proof.variant.slug}#historico`}>{proof.product.name}</Link></h2>
            <p className="proof-meta">{proof.variant.label} · {proof.variant.best.merchantName}</p>
            <dl className="proof-figures">
              <div><dt>Preço agora</dt><dd>{money(proof.variant.best.total)}</dd></div>
              <div><dt>Abaixo da mediana de 90 dias</dt><dd className="big">{pct(proof.variant.realDiscount)}</dd></div>
            </dl>
            <div className="row">
              <PriceBadge verdict={proof.variant.verdict} />
              <Link className="btn btn-ghost btn-sm" href={`${proof.product.url}?v=${proof.variant.slug}#historico`}>Ver histórico <Icon name="arrow" /></Link>
            </div>
            <p className="small">Comparamos com o que o preço realmente foi nos últimos 90 dias, não com o “preço de” da loja.</p>
          </aside>
        )}
      </section>

      <ul className="trust" aria-label="Por que confiar">
        <li><span className="icon-tile"><Icon name="book" /></span><span><strong>Metodologia aberta</strong>Notas calculadas por <Link href="/metodologia/celulares">metodologia pública e versionada</Link>.</span></li>
        <li><span className="icon-tile"><Icon name="chart" /></span><span><strong>Histórico real de preços</strong>Coletado por nós em várias lojas, com horário de cada coleta.</span></li>
        <li><span className="icon-tile"><Icon name="shield" /></span><span><strong>Comissão fora da nota</strong>Não entra em nenhum cálculo — <Link href="/como-ganhamos-dinheiro">veja como ganhamos dinheiro</Link>.</span></li>
      </ul>

      <section aria-labelledby="h-deals">
        <div className="section-head">
          <div>
            <h2 id="h-deals">Preços realmente baixos hoje</h2>
            <p className="muted small">Desconto calculado contra a mediana dos últimos 90 dias — não contra o “preço de” da loja.</p>
          </div>
          <Link className="more" href="/ofertas">Ver todas as ofertas <Icon name="arrow" /></Link>
        </div>
        {deals.length === 0 && <div className="empty"><strong>Nenhum preço abaixo da mediana agora.</strong>Quando um celular ficar realmente mais barato que o normal, ele aparece aqui.</div>}
        <div className="grid rail-mobile">
          {deals.slice(0, 4).map((d) => (
            <ProductCard key={d.variant.id} p={d.product}
              highlight={`${pct(d.variant.realDiscount)} abaixo da mediana`}
              offer={{ price: d.variant.best!.total, merchant: d.variant.best!.merchantName, label: d.variant.label, verdict: d.variant.verdict, href: `${d.product.url}?v=${d.variant.slug}` }} />
          ))}
        </div>
      </section>

      <section className="advisor-cta" aria-labelledby="h-advisor">
        <div>
          <span className="eyebrow"><Icon name="sparkle" /> Consultor</span>
          <h2 id="h-advisor">Não sabe qual escolher?</h2>
          <p>Responda 4 perguntas e veja o celular que nós compraríamos no seu lugar — com o porquê.</p>
          <Link className="btn btn-mark" href="/consultor">Começar <Icon name="arrow" /></Link>
        </div>
        <ol className="steps">
          <li>Conte como você usa o celular</li>
          <li>Diga quanto quer gastar</li>
          <li>Receba a escolha com o porquê, sem influência de comissão</li>
        </ol>
      </section>

      <section aria-labelledby="h-top">
        <div className="section-head">
          <h2 id="h-top">Celulares mais bem avaliados</h2>
          <Link className="more" href="/celulares">Ver todos <Icon name="arrow" /></Link>
        </div>
        <div className="grid rail-mobile">{top.slice(0, 6).map((p, i) => <ProductCard key={p.id} p={p} rank={i + 1} />)}</div>
      </section>

      <section aria-labelledby="h-guides">
        <div className="section-head"><h2 id="h-guides">Guias de compra</h2></div>
        <div className="guide-grid">
          {guides.map((g) => (
            <Link key={g.id} className="guide" href={g.path}><Icon name="book" /><span><small>Guia</small>{g.title}</span><Icon name="arrow" /></Link>
          ))}
          <Link className="guide" href="/comparar?p=nebula-aurora-x1,orbita-s9"><Icon name="scale" /><span><small>Comparação</small>Aurora X1 vs Órbita S9</span><Icon name="arrow" /></Link>
        </div>
      </section>
    </>
  );
}
