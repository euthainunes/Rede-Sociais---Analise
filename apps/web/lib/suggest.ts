import "server-only";
import { categories, suggest, slugify, type Suggestion, type SuggestionEntry } from "@veredito/core";
import { catalog } from "./data";
import { money } from "./format";

const TTL_MS = 5 * 60_000;
const CONTENT_LABEL: Record<string, string> = { best_list: "Guia", comparison: "Comparação", guide: "Guia", review: "Análise" };
let cached: { at: number; index: Promise<SuggestionEntry[]> } | null = null;

/** Índice do autocomplete: categorias, marcas, produtos publicados e conteúdo editorial. Recalculado a cada 5 min. */
async function buildIndex(): Promise<SuggestionEntry[]> {
  const [products, content] = await Promise.all([catalog().allSummaries(), catalog().source.listContent()]);
  const entries: SuggestionEntry[] = Object.values(categories).map((c) => ({ kind: "category", label: c.name, url: `/${c.slug}`, keywords: c.slug === "celulares" ? ["smartphone", "telefone"] : [] }));
  const brands = new Map<string, SuggestionEntry>();
  for (const p of products) {
    entries.push({ kind: "product", label: p.name, url: p.url, hint: p.bestPrice != null ? money(p.bestPrice) : undefined, keywords: [p.brand], weight: p.scores.overall ?? 0 });
    const key = `${p.category}/${slugify(p.brand)}`;
    if (!brands.has(key)) brands.set(key, { kind: "brand", label: p.brand, url: `/${p.category}?marca=${slugify(p.brand)}`, hint: "Marca" });
  }
  entries.push(...brands.values());
  // Reviews já aparecem pelo produto; aqui entram guias e comparações.
  for (const c of content) {
    if (c.type === "review" || c.type === "methodology") continue;
    entries.push({ kind: "guide", label: c.title, url: c.path, hint: CONTENT_LABEL[c.type] ?? "Conteúdo" });
  }
  return entries;
}

export async function suggestions(q: string): Promise<Suggestion[]> {
  if (!cached || Date.now() - cached.at > TTL_MS) {
    cached = { at: Date.now(), index: buildIndex() };
    cached.index.catch(() => (cached = null));
  }
  return suggest(q.slice(0, 80), await cached.index, 6);
}
