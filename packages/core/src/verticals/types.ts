/**
 * Configuração de vertical/categoria como dados (docs/04 §4.3).
 * Um novo vertical = um novo arquivo deste formato + conteúdo; o engine não muda.
 */
import type { Methodology } from "../scoring.ts";
import type { Priority, UserProfile } from "../fit.ts";

export type AttributeType = "int" | "decimal" | "bool" | "text" | "enum" | "enum_multi" | "date";

export interface AttributeDef {
  key: string;
  label: string;
  group: string;
  type: AttributeType;
  unit?: string;
  enumValues?: { key: string; label: string }[];
  higherIsBetter?: boolean;
  filterable?: boolean;
  comparable?: boolean;
  /** Faixa plausível para validação de dados. */
  plausible?: { min: number; max: number };
}

export interface UsageProfile {
  key: string;
  label: string;
  description: string;
  priorities: Partial<Record<string, Priority>>;
  mustHave?: string[];
}

export interface AdvisorQuestion {
  key: string;
  question: string;
  options: { key: string; label: string; apply: Partial<UserProfile> }[];
  multi?: boolean;
}

export interface CategoryConfig {
  vertical: string;
  slug: string;
  name: string;
  nameSingular: string;
  synonyms: string[];
  variantAxes: string[];
  priceBands: number[];
  groups: { key: string; label: string }[];
  attributes: AttributeDef[];
  methodology: Methodology;
  profiles: UsageProfile[];
  advisorQuestions: AdvisorQuestion[];
  /** Atributos mostrados no comparador, em ordem. */
  compareAttrs: string[];
  /** Atributos de destaque no card de produto. */
  highlightAttrs: string[];
}

export function defaultWeights(m: Methodology): Record<string, number> {
  return Object.fromEntries(m.criteria.map((c) => [c.key, c.weight]));
}

export function criterionLabels(m: Methodology): Record<string, string> {
  return Object.fromEntries(m.criteria.map((c) => [c.key, c.label]));
}

/** Valida specs contra a definição da categoria (tipo e faixa plausível). */
export function validateSpecs(config: CategoryConfig, specs: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const defs = new Map(config.attributes.map((a) => [a.key, a]));
  for (const [key, value] of Object.entries(specs)) {
    const def = defs.get(key);
    if (!def) {
      errors.push(`${key}: atributo desconhecido`);
      continue;
    }
    if (value == null) continue;
    const isNum = typeof value === "number" && Number.isFinite(value);
    if ((def.type === "int" || def.type === "decimal") && !isNum) errors.push(`${key}: esperado número`);
    if (def.type === "int" && isNum && !Number.isInteger(value)) errors.push(`${key}: esperado inteiro`);
    if (def.type === "bool" && typeof value !== "boolean") errors.push(`${key}: esperado booleano`);
    if (def.type === "enum" && !def.enumValues?.some((e) => e.key === value)) errors.push(`${key}: valor fora do enum`);
    if (def.plausible && isNum && (value < def.plausible.min || value > def.plausible.max)) {
      errors.push(`${key}: ${value} fora da faixa plausível ${def.plausible.min}–${def.plausible.max}`);
    }
  }
  return errors;
}
