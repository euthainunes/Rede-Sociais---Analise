import Link from "next/link";
import { getCategory, type PriceVerdict } from "@veredito/core";
import type { ProductSummary } from "@veredito/db";
import { formatSpec, money } from "@/lib/format";
import { Icon } from "./Icon";
import { PriceBadge } from "./PriceBadge";
import { ScoreRing, brandTint } from "./Score";

/** Oferta específica de uma versão (ex.: card de oferta): substitui o menor preço geral para não mostrar dois preços. */
type Offer = { price: number; merchant: string; label: string; verdict: PriceVerdict | null; href: string };

const SPEC_SKIP = new Set(["chipset", "storage_gb"]); // nome de chip não ajuda a decidir; armazenamento varia por versão

function keySpecs(p: ProductSummary): string[] {
  const cfg = getCategory(p.category);
  if (!cfg) return [];
  const attrs = new Map(cfg.attributes.map((a) => [a.key, a]));
  return cfg.highlightAttrs
    .filter((k) => !SPEC_SKIP.has(k) && p.specs[k] != null)
    .slice(0, 4)
    .map((k) => formatSpec(p.specs[k], attrs.get(k)?.unit, attrs.get(k)?.enumValues));
}

export function ProductCard({ p, note, highlight, pick, offer, rank }: {
  p: ProductSummary; note?: string; highlight?: string; pick?: boolean; offer?: Offer; rank?: number;
}) {
  const specs = keySpecs(p);
  const href = offer?.href ?? p.url;
  return (
    <article className="card pcard" style={{ "--tint": brandTint(p.brand) } as React.CSSProperties}>
      {rank != null && <span className="rank" aria-label={`${rank}º lugar`}>{rank}</span>}
      <div className="pcard-top">
        <div className="pcard-media" aria-hidden="true"><Icon name="phone" /></div>
        <div className="pcard-id">
          <div className="pcard-brand">{p.brand}</div>
          <h3><Link href={href}>{p.name}</Link></h3>
          {offer && <div className="small muted">{offer.label}</div>}
        </div>
        <ScoreRing value={p.scores.overall} size="sm" />
      </div>
      {highlight && <span className={`badge pcard-flag ${pick ? "pick" : "brand"}`}>{highlight}</span>}
      <p className="pcard-summary">{note ?? p.summary}</p>
      {specs.length > 0 && <ul className="specs-mini" aria-label="Destaques">{specs.map((s) => <li key={s}>{s}</li>)}</ul>}
      <div className="pcard-price">
        <div className="row">
          <span className="price">{money(offer?.price ?? p.bestPrice)}</span>
          <PriceBadge verdict={offer ? offer.verdict : p.verdict} />
        </div>
        {(offer?.merchant ?? p.bestMerchant) && <span className="small muted">menor preço na {offer?.merchant ?? p.bestMerchant}</span>}
      </div>
      <div className="pcard-actions">
        <Link className="btn btn-ghost btn-sm" href={`/comparar?p=${p.slug}`} rel="nofollow"><Icon name="scale" /> Comparar</Link>
        <Link className="btn btn-dark btn-sm" href={href} tabIndex={-1} aria-hidden="true">Ver análise</Link>
      </div>
    </article>
  );
}
