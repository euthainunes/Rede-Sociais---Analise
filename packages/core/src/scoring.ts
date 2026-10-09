/**
 * Metodologia de notas — ver docs/15-arquitetura-conteudo.md §15.3.
 * Nota_critério = nota_objetiva (percentil na categoria) + ajuste editorial limitado e justificado.
 * Este módulo não conhece comissão nem patrocínio (firewall comercial).
 */

export type Specs = Record<string, number | string | boolean | null | undefined>;

export interface CriterionInput {
  attr: string;
  weight: number;
  direction: "higher" | "lower";
  /** Aplica log antes de comparar (ex.: armazenamento). */
  log?: boolean;
}

export interface Criterion {
  key: string;
  label: string;
  weight: number;
  inputs: CriterionInput[];
  /** Critério calculado à parte (custo-benefício). */
  computed?: "value_for_money";
}

export interface Methodology {
  category: string;
  version: string;
  criteria: Criterion[];
  editorialAdjustMax: number;
}

export interface EditorialAdjustment {
  delta: number;
  reason: string;
}

export interface CriterionScore {
  key: string;
  objective: number | null;
  adjust: number;
  final: number | null;
  /** Insumos efetivamente usados (evidência pública). */
  evidence: { attr: string; value: unknown; percentileScore: number }[];
}

export interface ProductScores {
  methodologyVersion: string;
  overall: number | null;
  criteria: Record<string, CriterionScore>;
}

function numeric(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return null;
}

/** Percentil por posto médio (empates dividem a posição), em escala 0–10. */
export function percentileScore(value: number, population: readonly number[], direction: "higher" | "lower"): number {
  if (population.length <= 1) return 5;
  let below = 0;
  let equal = 0;
  for (const p of population) {
    if (p < value) below++;
    else if (p === value) equal++;
  }
  // Inclui o próprio valor se não estiver na população.
  if (equal === 0) equal = 1;
  const n = population.length;
  const rank = (below + (equal - 1) / 2) / Math.max(n - 1, 1);
  const r = Math.min(Math.max(rank, 0), 1);
  return round1((direction === "higher" ? r : 1 - r) * 10);
}

export function computeObjectiveScores(
  specs: Specs,
  population: readonly Specs[],
  methodology: Methodology,
): Record<string, CriterionScore> {
  const out: Record<string, CriterionScore> = {};
  for (const c of methodology.criteria) {
    if (c.computed) {
      out[c.key] = { key: c.key, objective: null, adjust: 0, final: null, evidence: [] };
      continue;
    }
    let sum = 0;
    let wsum = 0;
    const evidence: CriterionScore["evidence"] = [];
    for (const input of c.inputs) {
      const raw = numeric(specs[input.attr]);
      if (raw == null) continue;
      const tf = (x: number) => (input.log ? Math.log(Math.max(x, 1e-9)) : x);
      const pop = population.map((s) => numeric(s[input.attr])).filter((x): x is number => x != null).map(tf);
      const ps = percentileScore(tf(raw), pop, input.direction);
      sum += ps * input.weight;
      wsum += input.weight;
      evidence.push({ attr: input.attr, value: specs[input.attr], percentileScore: ps });
    }
    const objective = wsum > 0 ? round1(sum / wsum) : null;
    out[c.key] = { key: c.key, objective, adjust: 0, final: objective, evidence };
  }
  return out;
}

export class AdjustmentError extends Error {}

export function applyAdjustments(
  scores: Record<string, CriterionScore>,
  adjustments: Record<string, EditorialAdjustment>,
  methodology: Methodology,
): Record<string, CriterionScore> {
  const out = structuredClone(scores);
  for (const [key, adj] of Object.entries(adjustments)) {
    const s = out[key];
    if (!s) throw new AdjustmentError(`Critério desconhecido: ${key}`);
    if (Math.abs(adj.delta) > methodology.editorialAdjustMax + 1e-9) {
      throw new AdjustmentError(`Ajuste de ${key} excede ±${methodology.editorialAdjustMax}`);
    }
    if (adj.delta !== 0 && adj.reason.trim().length < 10) {
      throw new AdjustmentError(`Ajuste de ${key} precisa de justificativa`);
    }
    s.adjust = adj.delta;
    s.final = s.objective == null ? null : clamp10(round1(s.objective + adj.delta));
  }
  return out;
}

/** Média ponderada; pesos de critérios sem dados são redistribuídos. */
export function overallScore(scores: Record<string, CriterionScore>, methodology: Methodology): number | null {
  let sum = 0;
  let wsum = 0;
  for (const c of methodology.criteria) {
    const f = scores[c.key]?.final;
    if (f == null) continue;
    sum += f * c.weight;
    wsum += c.weight;
  }
  return wsum > 0 ? round1(sum / wsum) : null;
}

/**
 * Custo-benefício: resíduo da nota (sem custo-benefício) contra a curva nota × ln(preço) da categoria.
 * Acima da curva → acima de 5. Cada 1 ponto de resíduo ≈ 2,5 pontos de custo-benefício.
 */
export function valueForMoney(
  score: number,
  price: number,
  population: readonly { score: number; price: number }[],
): number | null {
  const pts = population.filter((p) => p.price > 0);
  if (pts.length < 3 || price <= 0) return null;
  const xs = pts.map((p) => Math.log(p.price));
  const ys = pts.map((p) => p.score);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const expected = my + slope * (Math.log(price) - mx);
  return clamp10(round1(5 + (score - expected) * 2.5));
}

export function scoreProduct(input: {
  specs: Specs;
  price: number | null;
  population: readonly { specs: Specs; price: number | null }[];
  methodology: Methodology;
  adjustments?: Record<string, EditorialAdjustment>;
}): ProductScores {
  const { methodology } = input;
  const popSpecs = input.population.map((p) => p.specs);
  let criteria = computeObjectiveScores(input.specs, popSpecs, methodology);
  criteria = applyAdjustments(criteria, input.adjustments ?? {}, methodology);

  const vfm = methodology.criteria.find((c) => c.computed === "value_for_money");
  if (vfm) {
    const withoutVfm: Methodology = { ...methodology, criteria: methodology.criteria.filter((c) => c !== vfm) };
    const base = overallScore(criteria, withoutVfm);
    const popScores = input.population
      .filter((p) => p.price != null)
      .map((p) => {
        const s = computeObjectiveScores(p.specs, popSpecs, methodology);
        return { score: overallScore(s, withoutVfm) ?? 0, price: p.price! };
      });
    const v = base != null && input.price != null ? valueForMoney(base, input.price, popScores) : null;
    criteria[vfm.key] = { key: vfm.key, objective: v, adjust: 0, final: v, evidence: [] };
  }
  return { methodologyVersion: methodology.version, overall: overallScore(criteria, methodology), criteria };
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function clamp10(x: number): number {
  return Math.min(10, Math.max(0, x));
}
