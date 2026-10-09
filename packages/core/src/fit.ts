/**
 * Fit Score — nota pessoal (docs/03 §3.2 e docs/15 §15.3).
 * Fit = Σ (peso do usuário × nota do critério) com eliminação por restrições obrigatórias.
 */
import type { ProductScores, Specs } from "./scoring.ts";

export type Priority = "high" | "medium" | "low" | "ignore";

export interface UserProfile {
  priorities: Partial<Record<string, Priority>>;
  budgetMax?: number | null;
  /** Atributos booleanos obrigatórios, ex.: ["nfc", "five_g"]. */
  mustHave?: string[];
  /** Restrições numéricas: { screen_inches: { max: 6.3 } } */
  ranges?: Record<string, { min?: number; max?: number }>;
  /** Valores proibidos de enum, ex.: { os: ["ios"] } */
  exclude?: Record<string, string[]>;
}

export interface FitCandidate {
  id: string;
  scores: ProductScores;
  price: number | null;
  specs: Specs;
}

export interface FitResult {
  id: string;
  fit: number | null;
  eliminated: boolean;
  reasons: string[];
}

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1, ignore: 0 };
const BUDGET_TOLERANCE = 1.1;

export function fitScore(candidate: FitCandidate, profile: UserProfile, defaultWeights: Record<string, number>): FitResult {
  const reasons: string[] = [];
  let eliminated = false;

  for (const attr of profile.mustHave ?? []) {
    if (candidate.specs[attr] !== true) {
      eliminated = true;
      reasons.push(`sem ${attr}`);
    }
  }
  for (const [attr, range] of Object.entries(profile.ranges ?? {})) {
    const v = candidate.specs[attr];
    if (typeof v !== "number") continue;
    if ((range.min != null && v < range.min) || (range.max != null && v > range.max)) {
      eliminated = true;
      reasons.push(`${attr} fora da faixa`);
    }
  }
  for (const [attr, values] of Object.entries(profile.exclude ?? {})) {
    const v = candidate.specs[attr];
    if (typeof v === "string" && values.includes(v)) {
      eliminated = true;
      reasons.push(`${attr}=${v} excluído`);
    }
  }

  let penalty = 0;
  if (profile.budgetMax != null) {
    if (candidate.price == null) {
      eliminated = true;
      reasons.push("sem preço");
    } else if (candidate.price > profile.budgetMax * BUDGET_TOLERANCE) {
      eliminated = true;
      reasons.push("acima do orçamento");
    } else if (candidate.price > profile.budgetMax) {
      penalty = 0.5;
      reasons.push("levemente acima do orçamento");
    }
  }

  const hasUserWeights = Object.values(profile.priorities).some((p) => p && p !== "ignore");
  let sum = 0;
  let wsum = 0;
  for (const [key, cs] of Object.entries(candidate.scores.criteria)) {
    if (cs.final == null) continue;
    const w = hasUserWeights ? PRIORITY_WEIGHT[profile.priorities[key] ?? "low"] : (defaultWeights[key] ?? 0);
    sum += cs.final * w;
    wsum += w;
  }
  const fit = wsum > 0 ? Math.max(0, Math.round((sum / wsum - penalty) * 10) / 10) : null;
  return { id: candidate.id, fit: eliminated ? null : fit, eliminated, reasons };
}

export function rankByFit(candidates: FitCandidate[], profile: UserProfile, defaultWeights: Record<string, number>): FitResult[] {
  return candidates
    .map((c) => fitScore(c, profile, defaultWeights))
    .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || (b.fit ?? -1) - (a.fit ?? -1));
}

/** Explica em linguagem simples por que o Fit difere da nota geral. */
export function explainFit(candidate: FitCandidate, profile: UserProfile, labels: Record<string, string>): string[] {
  return Object.entries(profile.priorities)
    .filter(([, p]) => p === "high")
    .map(([key]) => {
      const s = candidate.scores.criteria[key]?.final;
      return s == null ? null : `${labels[key] ?? key}: ${s.toFixed(1).replace(".", ",")}`;
    })
    .filter((x): x is string => x != null);
}
