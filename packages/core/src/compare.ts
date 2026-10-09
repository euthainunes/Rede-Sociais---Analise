/**
 * Comparador: vencedor por critério e conclusões automáticas por regra (docs/06 §6.2).
 * Conclusões nunca são texto livre de IA — derivam das notas.
 */
import type { ProductScores } from "./scoring.ts";

export interface ComparedProduct {
  id: string;
  name: string;
  scores: ProductScores;
  price: number | null;
}

export interface Winner {
  criterion: string;
  productId: string | null;
  margin: number;
}

const TIE_MARGIN = 0.1;
const CONCLUSION_MARGIN = 0.2;

export function winnersByCriterion(products: readonly ComparedProduct[], criteria: readonly string[]): Winner[] {
  const out: Winner[] = criteria.map((criterion) => {
    const vals = products
      .map((p) => ({ id: p.id, v: p.scores.criteria[criterion]?.final ?? null }))
      .filter((x): x is { id: string; v: number } => x.v != null)
      .sort((a, b) => b.v - a.v);
    if (vals.length < 2) return { criterion, productId: vals[0]?.id ?? null, margin: 0 };
    const margin = Math.round((vals[0]!.v - vals[1]!.v) * 100) / 100;
    return { criterion, productId: margin >= TIE_MARGIN ? vals[0]!.id : null, margin };
  });
  const priced = products.filter((p) => p.price != null).sort((a, b) => a.price! - b.price!);
  if (priced.length >= 2) {
    const rel = (priced[1]!.price! - priced[0]!.price!) / priced[1]!.price!;
    out.push({ criterion: "price", productId: rel >= 0.01 ? priced[0]!.id : null, margin: Math.round(rel * 1000) / 1000 });
  }
  return out;
}

export function autoConclusions(
  products: readonly ComparedProduct[],
  criteria: readonly string[],
  labels: Record<string, string>,
): string[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: string[] = [];
  for (const w of winnersByCriterion(products, criteria)) {
    if (!w.productId) continue;
    const name = byId.get(w.productId)!.name;
    if (w.criterion === "price") {
      if (w.margin >= 0.05) lines.push(`Se você quer gastar menos → ${name}.`);
    } else if (w.margin >= CONCLUSION_MARGIN) {
      lines.push(`Se você prioriza ${(labels[w.criterion] ?? w.criterion).toLowerCase()} → ${name}.`);
    }
  }
  return lines;
}

export interface ComparisonRow {
  attr: string;
  values: (string | number | boolean | null)[];
  differs: boolean;
}

/** Linhas da tabela; `differs` alimenta o modo "mostrar só diferenças". */
export function comparisonRows(
  specsList: readonly Record<string, unknown>[],
  attrs: readonly string[],
): ComparisonRow[] {
  return attrs.map((attr) => {
    const values = specsList.map((s) => (s[attr] ?? null) as ComparisonRow["values"][number]);
    const present = values.filter((v) => v != null).map((v) => String(v));
    return { attr, values, differs: new Set(present).size > 1 || (present.length > 0 && present.length < values.length) };
  });
}
