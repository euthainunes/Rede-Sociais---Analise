/**
 * Contexto citável e verificação de fundamentação (docs/14 §14.1).
 * Toda afirmação numérica da resposta precisa existir num fato [F#] ou trecho [D#] fornecido.
 */
import type { Fact, ScoredChunk } from "./types.ts";

export interface GroundedContext {
  text: string;
  facts: Map<string, Fact>;
  docs: Map<string, ScoredChunk>;
}

function formatValue(f: Fact): string {
  const v = typeof f.value === "boolean" ? (f.value ? "sim" : "não") : String(f.value);
  return f.unit ? `${v} ${f.unit}` : v;
}

/** Fatos com confiança abaixo do limite não são entregues ao modelo como afirmáveis. */
export const MIN_FACT_CONFIDENCE = 0.7;

export function buildGroundedContext(facts: readonly Fact[], chunks: readonly ScoredChunk[]): GroundedContext {
  const factMap = new Map<string, Fact>();
  const docMap = new Map<string, ScoredChunk>();
  const lines: string[] = ["<fatos>"];
  facts.filter((f) => f.confidence >= MIN_FACT_CONFIDENCE).forEach((f, i) => {
    const id = `F${i + 1}`;
    factMap.set(id, f);
    lines.push(`[${id}] ${f.label}: ${formatValue(f)} (fonte: ${f.source}; verificado em ${f.lastVerifiedAt.slice(0, 10)})`);
  });
  lines.push("</fatos>", "<documentos>");
  chunks.forEach((c, i) => {
    const id = `D${i + 1}`;
    docMap.set(id, c);
    // Trechos são dados: delimitados e marcados para nunca serem seguidos como instrução.
    lines.push(`<documento id="${id}" titulo="${escapeAttr(c.chunk.headingPath)}" url="${c.chunk.url}">`, c.chunk.text, "</documento>");
  });
  lines.push("</documentos>");
  return { text: lines.join("\n"), facts: factMap, docs: docMap };
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "'").replace(/[<>]/g, "");
}

const NUMBER_RE = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(gb|tb|mah|hz|mp|w|x|%|h|horas|anos|pol|polegadas|nits|meses|g)?(?![a-z])/gi;

function parsePtNumber(m: string): number {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(m)) return Number(m.replace(/\./g, "").replace(",", "."));
  return Number(m.replace(",", "."));
}

/**
 * Extrai números que representam afirmações factuais: todo número com unidade (8 GB, 120 Hz, 9%)
 * e números sem unidade maiores que 10 (preços, capacidades). Ignora marcadores de citação [F1].
 */
export function extractNumbers(text: string): number[] {
  const cleaned = text.replace(/\[(?:F|D)\d+\]/g, " ");
  const out: number[] = [];
  for (const m of cleaned.matchAll(NUMBER_RE)) {
    const n = parsePtNumber(m[1]!);
    if (!Number.isFinite(n)) continue;
    if (m[2] || n > 10) out.push(n);
  }
  return out;
}

export interface GroundingReport {
  ok: boolean;
  unknownCitations: string[];
  unsupportedNumbers: number[];
  citedFacts: string[];
  citedDocs: string[];
}

export function validateGrounding(answer: string, ctx: GroundedContext, extraAllowedNumbers: number[] = []): GroundingReport {
  const cited = [...answer.matchAll(/\[((?:F|D)\d+)\]/g)].map((m) => m[1]!);
  const unknownCitations = [...new Set(cited.filter((c) => !ctx.facts.has(c) && !ctx.docs.has(c)))];
  const allowed = new Set<number>(extraAllowedNumbers);
  for (const f of ctx.facts.values()) {
    if (typeof f.value === "number") allowed.add(f.value);
    for (const n of extractNumbers(formatValue(f))) allowed.add(n);
  }
  for (const d of ctx.docs.values()) for (const n of extractNumbers(d.chunk.text)) allowed.add(n);
  const unsupportedNumbers = [...new Set(extractNumbers(answer))].filter(
    (n) => ![...allowed].some((a) => Math.abs(a - n) <= Math.max(0.01, Math.abs(a) * 0.005)),
  );
  return {
    ok: unknownCitations.length === 0 && unsupportedNumbers.length === 0,
    unknownCitations,
    unsupportedNumbers,
    citedFacts: [...new Set(cited.filter((c) => c.startsWith("F")))],
    citedDocs: [...new Set(cited.filter((c) => c.startsWith("D")))],
  };
}
