import type { DailyPrice } from "@veredito/core";
import { median } from "@veredito/core";
import { dateBR, money } from "@/lib/format";

/** Gráfico SVG renderizado no servidor — zero JavaScript no cliente. */
export function PriceChart({ series, days, label }: { series: DailyPrice[]; days: number; label: string }) {
  const data = series.slice(-days);
  if (data.length < 2) return <p className="muted">Ainda não há histórico suficiente para o gráfico.</p>;
  const W = 640, H = 220, P = { l: 56, r: 12, t: 12, b: 28 };
  const ys = data.map((d) => d.min);
  const min = Math.min(...ys), max = Math.max(...ys);
  const pad = (max - min) * 0.1 || max * 0.05;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.min).toFixed(1)}`).join(" ");
  const med = median(ys)!;
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${label}: de ${money(data[0]!.min)} em ${dateBR(data[0]!.day)} a ${money(data.at(-1)!.min)} hoje; mínimo ${money(min)}, máximo ${money(max)}.`}>
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity=".18" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} />
          <text className="axis" x={P.l - 6} y={y(t) + 4} textAnchor="end">{money(t)}</text>
        </g>
      ))}
      <line className="median" x1={P.l} x2={W - P.r} y1={y(med)} y2={y(med)} />
      <polygon className="area" points={`${x(0).toFixed(1)},${H - P.b} ${pts} ${x(data.length - 1).toFixed(1)},${H - P.b}`} />
      <polyline className="line" points={pts} />
      <circle cx={x(data.length - 1)} cy={y(data.at(-1)!.min)} r="5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
      <text className="axis" x={P.l} y={H - 8}>{dateBR(data[0]!.day)}</text>
      <text className="axis" x={W - P.r} y={H - 8} textAnchor="end">hoje</text>
    </svg>
  );
}
