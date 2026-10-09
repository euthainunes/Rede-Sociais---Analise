/**
 * Autocomplete da busca (backlog 2.6). Puro e determinístico: recebe o índice pronto e a consulta.
 * Cada termo digitado precisa casar com o início de alguma palavra da entrada ("aur x1" → "Nébula Aurora X1"),
 * sem acento e sem diferença de maiúsculas. O último termo pode estar incompleto.
 */

export type SuggestionKind = "product" | "category" | "brand" | "guide";

export interface SuggestionEntry {
  kind: SuggestionKind;
  label: string;
  url: string;
  /** Texto auxiliar exibido à direita (preço, tipo de conteúdo…). */
  hint?: string;
  /** Palavras extras que também casam (marca, modelo, sinônimos). */
  keywords?: string[];
  /** Desempate: maior primeiro (ex.: nota do produto). */
  weight?: number;
}

export interface Suggestion extends Omit<SuggestionEntry, "keywords" | "weight"> {}

const KIND_ORDER: Record<SuggestionKind, number> = { category: 0, brand: 1, product: 2, guide: 3 };

export function foldText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function words(s: string): string[] {
  return foldText(s).split(/[^a-z0-9]+/).filter(Boolean);
}

/** 3 = rótulo começa com a consulta; 2 = todos os termos casam no rótulo; 1 = casam usando as palavras-chave. 0 = não casa. */
function matchScore(entry: SuggestionEntry, terms: string[], query: string): number {
  const labelWords = words(entry.label);
  const allWords = [...labelWords, ...(entry.keywords ?? []).flatMap(words)];
  const hit = (pool: string[]) => terms.every((t) => pool.some((w) => w.startsWith(t)));
  if (!hit(allWords)) return 0;
  if (foldText(entry.label).startsWith(query)) return 3;
  return hit(labelWords) ? 2 : 1;
}

export function suggest(query: string, index: readonly SuggestionEntry[], limit = 6): Suggestion[] {
  const q = foldText(query).trim().replace(/\s+/g, " ");
  const terms = words(q);
  if (terms.length === 0 || q.length < 2) return [];
  return index
    .map((e) => ({ e, s: matchScore(e, terms, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || (b.e.weight ?? 0) - (a.e.weight ?? 0) || a.e.label.localeCompare(b.e.label, "pt-BR"))
    .slice(0, limit)
    .map(({ e }) => ({ kind: e.kind, label: e.label, url: e.url, ...(e.hint ? { hint: e.hint } : {}) }));
}
