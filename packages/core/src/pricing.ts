/**
 * Metodologia de preço v1.0 — ver docs/15-arquitetura-conteudo.md §15.4.
 * Entrada: série diária do menor preço à vista (lojas confiáveis, sem anomalias) por variante.
 */

export interface DailyPrice {
  /** YYYY-MM-DD */
  day: string;
  min: number;
}

export type PriceLabel = "excellent" | "good" | "normal" | "high" | "insufficient_data";

export interface PriceStats {
  current: number | null;
  minAllTime: number | null;
  maxAllTime: number | null;
  median30d: number | null;
  median90d: number | null;
  min90d: number | null;
  change: Record<"7d" | "30d" | "90d" | "180d" | "365d", number | null>;
  /** Dias distintos com observação em toda a série. */
  daysOfData: number;
  /** Observações dentro da janela de 90 dias. */
  points90d: number;
}

export interface PriceVerdict {
  label: PriceLabel;
  deltaVsMedian90d: number | null;
  deltaVsMinAllTime: number | null;
  text: string;
}

export const PRICE_METHODOLOGY_VERSION = "v1.0";
export const MIN_DAYS_OF_DATA = 30;
export const MIN_POINTS_90D = 20;
const ANOMALY_THRESHOLD = 0.6;

const DAY_MS = 86_400_000;

function toTime(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function windowValues(series: readonly DailyPrice[], todayTime: number, days: number): number[] {
  const from = todayTime - days * DAY_MS;
  return series.filter((p) => {
    const t = toTime(p.day);
    return t > from && t <= todayTime;
  }).map((p) => p.min);
}

/** Preço no dia mais recente ≤ (hoje − N dias). */
function priceDaysAgo(series: readonly DailyPrice[], todayTime: number, days: number): number | null {
  const target = todayTime - days * DAY_MS;
  let best: DailyPrice | null = null;
  for (const p of series) {
    const t = toTime(p.day);
    if (t <= target && (!best || t > toTime(best.day))) best = p;
  }
  // Exige que o ponto esteja a no máximo 7 dias do alvo para não comparar com dado muito antigo.
  if (!best || target - toTime(best.day) > 7 * DAY_MS) return null;
  return best.min;
}

export function computePriceStats(
  series: readonly DailyPrice[],
  current: number | null,
  today: string,
): PriceStats {
  const todayTime = toTime(today);
  const all = series.map((p) => p.min);
  const w90 = windowValues(series, todayTime, 90);
  const w30 = windowValues(series, todayTime, 30);
  const change = (days: number): number | null => {
    if (current == null) return null;
    const past = priceDaysAgo(series, todayTime, days);
    return past == null ? null : round4(current / past - 1);
  };
  return {
    current,
    minAllTime: all.length ? Math.min(...all) : null,
    maxAllTime: all.length ? Math.max(...all) : null,
    median30d: median(w30),
    median90d: median(w90),
    min90d: w90.length ? Math.min(...w90) : null,
    change: { "7d": change(7), "30d": change(30), "90d": change(90), "180d": change(180), "365d": change(365) },
    daysOfData: new Set(series.map((p) => p.day)).size,
    points90d: w90.length,
  };
}

export function priceVerdict(stats: PriceStats): PriceVerdict {
  const { current, median90d, min90d, minAllTime } = stats;
  const enough = stats.daysOfData >= MIN_DAYS_OF_DATA && stats.points90d >= MIN_POINTS_90D;
  if (current == null || median90d == null || min90d == null || !enough) {
    return {
      label: "insufficient_data",
      deltaVsMedian90d: null,
      deltaVsMinAllTime: null,
      text:
        current == null
          ? "Sem preço disponível no momento."
          : "Ainda não temos histórico suficiente para avaliar este preço.",
    };
  }
  const delta = round4(current / median90d - 1);
  const deltaMin = minAllTime ? round4(current / minAllTime - 1) : null;
  let label: PriceLabel;
  if (current <= min90d * 1.02) label = "excellent";
  else if (current <= median90d * 0.95) label = "good";
  else if (current <= median90d * 1.05) label = "normal";
  else label = "high";

  return { label, deltaVsMedian90d: delta, deltaVsMinAllTime: deltaMin, text: verdictText(delta, deltaMin) };
}

function pct(x: number): string {
  return `${Math.round(Math.abs(x) * 100)}%`;
}

function verdictText(delta: number, deltaMin: number | null): string {
  const vsMedian =
    Math.abs(delta) < 0.005
      ? "O preço atual está igual à mediana dos últimos 90 dias"
      : `O preço atual está ${pct(delta)} ${delta < 0 ? "abaixo" : "acima"} da mediana dos últimos 90 dias`;
  if (deltaMin == null) return `${vsMedian}.`;
  if (deltaMin <= 0.005) return `${vsMedian} e é o menor preço que já registramos.`;
  return `${vsMedian} e ${pct(deltaMin)} acima do menor preço já registrado.`;
}

export const PRICE_LABELS: Record<PriceLabel, { emoji: string; text: string }> = {
  excellent: { emoji: "🔥", text: "Excelente preço" },
  good: { emoji: "🟢", text: "Bom preço" },
  normal: { emoji: "🟡", text: "Preço normal" },
  high: { emoji: "🔴", text: "Preço alto" },
  insufficient_data: { emoji: "⚪", text: "Histórico insuficiente" },
};

/** Desconto real contra a mediana de 90 dias (positivo = mais barato). */
export function realDiscount(current: number, median90d: number | null): number | null {
  if (median90d == null || median90d <= 0) return null;
  return round4(1 - current / median90d);
}

/** Desconto que a loja anuncia ("de R$ X por R$ Y"). */
export function advertisedDiscount(current: number, listPrice: number | null): number | null {
  if (listPrice == null || listPrice <= current) return null;
  return round4(1 - current / listPrice);
}

/** Desconto anunciado é enganoso quando supera o real em mais de 10 p.p. */
export function isMisleadingDiscount(real: number | null, advertised: number | null): boolean {
  if (advertised == null) return false;
  return advertised - (real ?? 0) > 0.1;
}

export function isPriceAnomaly(price: number, median90d: number | null): boolean {
  if (median90d == null || median90d <= 0) return false;
  return Math.abs(price / median90d - 1) > ANOMALY_THRESHOLD;
}

/**
 * Ranking "Melhor oportunidade" da página de ofertas. Não recebe comissão por construção.
 * @param editorialScore nota geral 0–10
 * @param merchantTrust confiabilidade da loja 0–1
 */
export function dealOpportunity(input: {
  realDiscount: number | null;
  editorialScore: number | null;
  merchantTrust: number;
  inStock: boolean;
}): number {
  if (!input.inStock || input.realDiscount == null || input.realDiscount <= 0) return 0;
  const quality = (input.editorialScore ?? 5) / 10;
  return round4(input.realDiscount * quality * input.merchantTrust);
}

function round4(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}
