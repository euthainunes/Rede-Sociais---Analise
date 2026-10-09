import { score } from "@/lib/format";

/** Faixa da nota para cor do medidor e das barras: ≥ 7 forte, ≥ 4,5 média, abaixo disso fraca. */
export function scoreTier(v: number | null | undefined): "t-high" | "t-mid" | "t-low" {
  if (v == null) return "t-low";
  return v >= 7 ? "t-high" : v >= 4.5 ? "t-mid" : "t-low";
}

/** Nota como medidor: o anel preenche na proporção da nota (0–10). */
export function ScoreRing({ value, size, label = "Nota Veredito" }: { value: number | null | undefined; size?: "sm" | "lg"; label?: string }) {
  return (
    <span className={`score ${scoreTier(value)}${size ? ` ${size}` : ""}`} style={{ "--v": value ?? 0 } as React.CSSProperties}
      role="img" aria-label={`${label}: ${value == null ? "sem nota" : `${score(value)} de 10`}`} title={label}>
      <span aria-hidden="true">{score(value)}</span>
    </span>
  );
}

/** Tom da marca para o espaço da imagem do produto (enquanto não há fotos): estável por marca. */
export function brandTint(brand: string): string {
  let h = 0;
  for (const c of brand) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 50%)`;
}
