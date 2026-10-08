import type { Metadata } from "next";
import Link from "next/link";
import { PriceBadge } from "@/components/PriceBadge";
import { catalog } from "@/lib/data";
import { money, pct, score } from "@/lib/format";

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
      <h1>Ofertas</h1>
      <p className="muted">
        O desconto real compara o preço de hoje com a mediana dos últimos 90 dias. “Melhor oportunidade” combina desconto real, nota e
        confiabilidade da loja — nunca comissão.
      </p>
      <nav className="row" aria-label="Ordenar">
        {SORTS.map((s) => (
          <Link key={s.key} className="chip" aria-current={s.key === sort} href={s.key === "opportunity" ? "/ofertas" : `/ofertas?ordem=${s.key}`} rel="nofollow">{s.label}</Link>
        ))}
      </nav>
      <div className="table-scroll" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Produto</th><th>Preço</th><th>Desconto real</th><th>Anunciado</th><th>7 dias</th><th>Nota</th><th><span className="sr-only">Ação</span></th></tr></thead>
          <tbody>
            {deals.map(({ product: p, variant: v }) => (
              <tr key={v.id}>
                <td><Link href={`${p.url}?v=${v.slug}`}>{p.name}</Link><br /><span className="small muted">{v.label} · {v.best!.merchantName}</span></td>
                <td><strong>{money(v.best!.total)}</strong><br /><PriceBadge verdict={v.verdict} /></td>
                <td>{v.realDiscount != null && v.realDiscount > 0 ? pct(v.realDiscount) : "—"}</td>
                <td className="small">{v.advertisedDiscount ? <>{pct(v.advertisedDiscount)}{v.misleadingDiscount && <><br /><span className="badge high">exagerado</span></>}</> : "—"}</td>
                <td className="small">{pct(v.stats.change["7d"], true)}</td>
                <td>{score(p.scores.overall)}</td>
                <td><a className="btn btn-ghost btn-sm" href={`/go/${p.slug}/${v.best!.merchantSlug}?v=${v.slug}&cta=deal_card`} rel="sponsored nofollow">Ver oferta</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deals.length === 0 && <p>Nenhuma oferta abaixo da mediana agora. <Link href="/ofertas?ordem=price">Ver por menor preço</Link>.</p>}
    </>
  );
}
