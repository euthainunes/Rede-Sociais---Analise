import Link from "next/link";
import type { ProductSummary } from "@veredito/db";
import { money, score } from "@/lib/format";
import { PriceBadge } from "./PriceBadge";

export function ProductCard({ p, note, highlight }: { p: ProductSummary; note?: string; highlight?: string }) {
  return (
    <article className="card pcard">
      <div className="thumb" aria-hidden="true">{p.name}</div>
      {highlight && <span className="badge">{highlight}</span>}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <h3><Link href={p.url}>{p.name}</Link></h3>
        <span className="score" title="Nota Veredito">{score(p.scores.overall)}</span>
      </div>
      <p className="muted small">{note ?? p.summary}</p>
      <div className="row">
        <span className="price">{money(p.bestPrice)}</span>
        <PriceBadge verdict={p.verdict} />
      </div>
      {p.bestMerchant && <span className="muted small">menor preço na {p.bestMerchant}</span>}
      <div className="row">
        <Link className="btn btn-primary btn-sm" href={p.url}>Ver análise</Link>
        <Link className="btn btn-ghost btn-sm" href={`/comparar?p=${p.slug}`} rel="nofollow">Comparar</Link>
      </div>
    </article>
  );
}
