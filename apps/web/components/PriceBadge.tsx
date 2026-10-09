import { PRICE_LABELS, type PriceVerdict } from "@veredito/core";

/** Selo do preço contra o histórico. A cor sempre vem com o rótulo (nunca só cor). */
export function PriceBadge({ verdict }: { verdict: PriceVerdict | null }) {
  if (!verdict || verdict.label === "insufficient_data") return null;
  const l = PRICE_LABELS[verdict.label];
  return (
    <span className={`badge ${verdict.label}`}>
      <span className="dot" aria-hidden="true" /> {l.text}
    </span>
  );
}
