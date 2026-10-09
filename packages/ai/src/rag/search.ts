/**
 * Busca semântica para a página de busca: reaproveita a recuperação híbrida do RAG (vetor + palavra-chave)
 * e devolve um resultado por documento, com o trecho que responde à consulta.
 * Também calcula um sinal por produto: produtos citados nos trechos relevantes sobem no ranking.
 */
import { normalizeForSearch } from "./embedder.ts";
import { retrieve } from "./pipeline.ts";
import type { Embedder, KnowledgeDocType, KnowledgeStore, RetrievalFilter } from "./types.ts";

export interface KnowledgeHit {
  documentId: string;
  title: string;
  url: string;
  docType: KnowledgeDocType;
  heading: string;
  snippet: string;
  productIds: string[];
  score: number;
}

export interface SearchKnowledgeOptions {
  k?: number;
  filter?: RetrievalFilter;
  /** Abaixo disso, um trecho só conta se também casar por palavra-chave significativa. */
  minSimilarity?: number;
  /** Palavras que aparecem em quase tudo da categoria e não provam relevância ("celular", "melhor"…). */
  genericTerms?: string[];
}

const DEFAULT_GENERIC = ["celular", "celulares", "smartphone", "smartphones", "telefone", "aparelho", "melhor", "melhores", "bom", "boa", "comprar", "qual", "vale", "pena"];

/** Trecho de até `max` caracteres em torno da frase que mais casa com a consulta. */
export function bestSnippet(text: string, terms: string[], max = 240): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return "";
  let best = 0;
  let bestScore = -1;
  sentences.forEach((s, i) => {
    const toks = new Set(normalizeForSearch(s));
    const score = terms.filter((t) => toks.has(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  let out = sentences[best]!;
  for (let i = best + 1; i < sentences.length && out.length + sentences[i]!.length + 1 <= max; i++) out += ` ${sentences[i]}`;
  return out.length > max ? `${out.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : out;
}

export async function searchKnowledge(
  query: string,
  deps: { embedder: Embedder; store: KnowledgeStore },
  options: SearchKnowledgeOptions = {},
): Promise<KnowledgeHit[]> {
  const { k = 4, filter, minSimilarity = 0.35, genericTerms = DEFAULT_GENERIC } = options;
  const generic = new Set(genericTerms.flatMap((t) => normalizeForSearch(t)));
  const terms = [...new Set(normalizeForSearch(query))];
  const meaningful = terms.filter((t) => !generic.has(t));
  if (terms.length === 0) return [];
  const chunks = await retrieve(query, deps, { k: k * 3, candidates: 30, maxPerDocument: 1, filter });
  const hits: KnowledgeHit[] = [];
  for (const r of chunks) {
    const toks = new Set(normalizeForSearch(r.chunk.embeddingText));
    const lexical = meaningful.some((t) => toks.has(t));
    if (!lexical && (r.similarity ?? 0) < minSimilarity) continue;
    hits.push({
      documentId: r.chunk.documentId,
      title: r.chunk.title,
      url: r.chunk.url,
      docType: r.chunk.docType,
      heading: r.chunk.headingPath,
      snippet: bestSnippet(r.chunk.text, meaningful.length ? meaningful : terms),
      productIds: r.chunk.productIds,
      score: r.score,
    });
    if (hits.length >= k) break;
  }
  return hits;
}

/**
 * Sinal semântico por produto, em [0, 1]: soma das relevâncias dos documentos que citam o produto,
 * diluída pelo número de produtos de cada documento (um guia com 8 aparelhos diz menos sobre cada um).
 */
export function productSignals(hits: KnowledgeHit[]): Map<string, number> {
  const raw = new Map<string, number>();
  for (const h of hits) {
    if (h.productIds.length === 0) continue;
    const share = h.score / Math.sqrt(h.productIds.length);
    for (const id of h.productIds) raw.set(id, (raw.get(id) ?? 0) + share);
  }
  const max = Math.max(0, ...raw.values());
  return new Map([...raw].map(([id, v]) => [id, max > 0 ? v / max : 0]));
}
