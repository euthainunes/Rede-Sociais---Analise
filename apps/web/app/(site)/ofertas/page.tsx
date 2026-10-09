import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PriceBadge } from "@/components/PriceBadge";
import { ScoreRing } from "@/components/Score";
import { catalog } from "@/lib/data";
import { money, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Ofertas de celulares com desconto real",
  description: "Ofertas ordenadas por desconto real contra o histórico de preços — não pelo “preço de” anunciado.",
  alternates: { canonical: "/ofertas" },
};

const SORTS = [
  { key: "opportunity", label: "Melhor oportunidade" },
  { key: "real_discount", label: "Maior desconto real" },
  { key: "recent_drop", label: "Maior queda em 7 dias" },
  { key: "price", label: "Menor preço" },
  { key: "value", label: "Melhor custo-benefício" },
] as const;

type Props = { searchParams: Promise<{ ordem?: string }> };

export default async function DealsPage({ searchParams }: Props) {
  const { ordem } = await searchParams;
  const sort = SORTS.find((s) => s.key === ordem)?.key ?? "opportunity";
  const deals = await catalog().deals("celulares", sort);
  return (
    <>
      <header className="page-head">
        <span className="eyebrow"><Icon name="tag" /> Ofertas de celulares</span>
        <h1>Ofertas com desconto <mark>real</mark></h1>
        <p className="lead">
          O desconto real compara o preço de hoje com a mediana dos últimos 90 dias. “Melhor oportunidade” combina desconto real, nota e
          confiabilidade da loja — nunca comissão.
        </p>
      </header>
      <nav className="segmented" aria-label="Ordenar">
        {SORTS.map((s) => (
          <Link key={s.key} aria-current={s.key === sort} href={s.key === "opportunity" ? "/ofertas" : `/ofertas?ordem=${s.key}`} rel="nofollow">{s.label}</Link>
        ))}
      </nav>
      {deals.length > 0 ? (
        <div className="data-table stacked mt4">
          <table>
            <thead><tr><th>Produto</th><th>Preço</th><th>Desconto real</th><th>Anunciado</th><th>7 dias</th><th>Nota</th><th><span className="sr-only">Ação</span></th></tr></thead>
            <tbody>
              {deals.map(({ product: p, variant: v }) => (
                <tr key={v.id}>
                  <td className="cell-title"><Link href={`${p.url}?v=${v.slug}`}>{p.name}</Link><small>{v.label} · {v.best!.merchantName}</small></td>
                  <td data-label="Preço"><strong className="num">{money(v.best!.total)}</strong><br /><PriceBadge verdict={v.verdict} /></td>
                  <td data-label="Desconto real">{v.realDiscount != null && v.realDiscount > 0 ? <strong className="num down">{pct(v.realDiscount)}</strong> : "—"}</td>
                  <td data-label="Anunciado" className="small">{v.advertisedDiscount ? <>{pct(v.advertisedDiscount)}{v.misleadingDiscount && <><br /><span className="badge high">exagerado</span></>}</> : "—"}</td>
                  <td data-label="7 dias" className="small num">{pct(v.stats.change["7d"], true)}</td>
                  <td data-label="Nota"><ScoreRing value={p.scores.overall} size="sm" /></td>
                  <td className="action"><a className="btn btn-primary btn-sm" href={`/go/${p.slug}/${v.best!.merchantSlug}?v=${v.slug}&cta=deal_card`} rel="sponsored nofollow">Ver oferta</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty mt4"><strong>Nenhuma oferta abaixo da mediana agora.</strong><Link href="/ofertas?ordem=price">Ver por menor preço</Link></div>
      )}
      <p className="disclosure mt4"><Icon name="info" /> Podemos receber comissão por compras feitas pelos links. Isso não muda a ordem nem as notas.</p>
    </>
  );
}
