/** Portão de qualidade para páginas programáticas (docs/10 §10.8). */

export interface ProgrammaticPageInput {
  kind: "best_list" | "comparison";
  monthlySearchVolume: number | null;
  gscImpressions28d: number | null;
  qualifiedProducts: number;
  hasEditorialIntro: boolean;
  hasEditorialPick: boolean;
  /** Sobreposição de produtos com a página irmã mais parecida (0–1). */
  maxSiblingOverlap: number;
  nextReviewAt: string | null;
}

export interface GateResult {
  pass: boolean;
  indexable: boolean;
  failures: string[];
}

export const GATE_RULES = {
  minSearchVolume: 100,
  minImpressions28d: 50,
  minProductsBestList: 5,
  minProductsComparison: 2,
  maxSiblingOverlap: 0.7,
} as const;

export function evaluateProgrammaticPage(p: ProgrammaticPageInput): GateResult {
  const failures: string[] = [];
  const demand =
    (p.monthlySearchVolume ?? 0) >= GATE_RULES.minSearchVolume || (p.gscImpressions28d ?? 0) >= GATE_RULES.minImpressions28d;
  if (!demand) failures.push("demanda insuficiente");
  const minProducts = p.kind === "best_list" ? GATE_RULES.minProductsBestList : GATE_RULES.minProductsComparison;
  if (p.qualifiedProducts < minProducts) failures.push(`menos de ${minProducts} produtos qualificados`);
  if (!p.hasEditorialIntro) failures.push("sem introdução editorial");
  if (p.kind === "best_list" && !p.hasEditorialPick) failures.push("sem escolha editorial");
  if (p.maxSiblingOverlap >= GATE_RULES.maxSiblingOverlap) failures.push("sobreposição alta com página irmã — consolidar");
  if (!p.nextReviewAt) failures.push("sem revisão agendada");
  return { pass: failures.length === 0, indexable: failures.length === 0, failures };
}
