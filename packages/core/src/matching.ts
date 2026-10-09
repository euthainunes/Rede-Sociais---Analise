/**
 * Matching de anúncios de loja com variantes canônicas (docs/08 §8.5).
 * GTIN → MPN → regras de título. Score < AUTO_MATCH_THRESHOLD vai para a fila humana.
 */

export const AUTO_MATCH_THRESHOLD = 0.9;

export interface RawListing {
  title: string;
  gtin?: string | null;
  mpn?: string | null;
  brand?: string | null;
}

export interface VariantCandidate {
  variantId: string;
  brand: string;
  /** Nome do modelo sem a marca, ex.: "Aurora X1 Pro". */
  model: string;
  gtin?: string | null;
  mpn?: string | null;
  axes: Record<string, string>;
}

export interface MatchResult {
  variantId: string;
  score: number;
  method: "gtin" | "mpn" | "title";
}

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d+)\s*(gb|tb)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return normalizeText(s).split(" ").filter(Boolean);
}

/** Extrai armazenamento normalizado ("256gb", "1tb") de um título. Ignora RAM quando há "x gb ram". */
export function extractStorage(title: string): string | null {
  const t = normalizeText(title).replace(/\b\d+gb ram\b/g, " ");
  const all = [...t.matchAll(/\b(\d+)(gb|tb)\b/g)].map((m) => ({ n: Number(m[1]), u: m[2]! }));
  if (all.length === 0) return null;
  // O maior valor costuma ser o armazenamento ("8GB 256GB").
  const best = all.reduce((a, b) => (toGb(b) > toGb(a) ? b : a));
  return `${best.n}${best.u}`;
}

function toGb(x: { n: number; u: string }): number {
  return x.u === "tb" ? x.n * 1024 : x.n;
}

function cleanCode(s: string | null | undefined): string | null {
  if (!s) return null;
  const c = s.replace(/[^0-9a-z]/gi, "").toLowerCase();
  return c.length >= 6 ? c : null;
}

export function scoreCandidate(listing: RawListing, c: VariantCandidate): MatchResult | null {
  const lg = cleanCode(listing.gtin);
  if (lg && lg === cleanCode(c.gtin)) return { variantId: c.variantId, score: 1, method: "gtin" };
  const lm = cleanCode(listing.mpn);
  if (lm && lm === cleanCode(c.mpn)) return { variantId: c.variantId, score: 0.95, method: "mpn" };

  const titleTokens = new Set(tokens(listing.title));
  const brandOk = tokens(c.brand).every((t) => titleTokens.has(t)) ||
    (listing.brand != null && normalizeText(listing.brand) === normalizeText(c.brand));
  if (!brandOk) return null;

  const modelTokens = tokens(c.model);
  const covered = modelTokens.filter((t) => titleTokens.has(t)).length / Math.max(modelTokens.length, 1);
  if (covered < 1) return { variantId: c.variantId, score: Math.round(covered * 0.6 * 100) / 100, method: "title" };

  // Tokens "de modelo" extras no título (ex.: "pro", "max", "ultra") indicam outro modelo.
  const modelQualifiers = ["pro", "max", "ultra", "plus", "lite", "mini", "fe", "neo"];
  const extraQualifier = modelQualifiers.some((q) => titleTokens.has(q) && !modelTokens.includes(q));

  const storage = extractStorage(listing.title);
  const wanted = c.axes.storage ?? null;
  if (wanted && storage && storage !== wanted) return null;

  let score = 0.85;
  if (wanted && storage === wanted) score += 0.1;
  const color = c.axes.color;
  if (color && tokens(color).every((t) => titleTokens.has(t))) score += 0.03;
  if (extraQualifier) score -= 0.4;
  return { variantId: c.variantId, score: Math.round(Math.min(score, 0.98) * 100) / 100, method: "title" };
}

/** Melhor candidato e se pode ser aceito automaticamente. */
export function matchListing(listing: RawListing, candidates: readonly VariantCandidate[]): {
  best: MatchResult | null;
  auto: boolean;
  alternatives: MatchResult[];
} {
  const results = candidates
    .map((c) => scoreCandidate(listing, c))
    .filter((r): r is MatchResult => r != null)
    .sort((a, b) => b.score - a.score);
  const best = results[0] ?? null;
  const second = results[1];
  // Ambiguidade (dois candidatos muito próximos) nunca é automática.
  const ambiguous = second != null && best != null && best.score - second.score < 0.05 && best.method === "title";
  return { best, auto: best != null && best.score >= AUTO_MATCH_THRESHOLD && !ambiguous, alternatives: results.slice(1, 4) };
}
