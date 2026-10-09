import { PRICE_LABELS, type PriceVerdict } from "@veredito/core";

export function PriceBadge({ verdict }: { verdict: PriceVerdict | null }) {
  if (!verdict || verdict.label === "insufficient_data") return null;
  const l = PRICE_LABELS[verdict.label];
  return (
    <span className={`badge ${verdict.label}`}>
      <span aria-hidden="true">{l.emoji}</span> {l.text}
    </span>
  );
}
