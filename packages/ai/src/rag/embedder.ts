import type { Embedder } from "./types.ts";

export function normalizeForSearch(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set(
  "de da do das dos e o a os as um uma uns umas em no na nos nas para por com sem que se ao aos ou mais menos muito como qual quais e eh sao ser ter tem the and of is".split(" "),
);

function hash(s: string, seed: number): number {
  let h = seed ^ 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Embedder determinístico por *feature hashing* (unigramas + bigramas), normalizado L2.
 * Uso: desenvolvimento, testes e fallback offline. Não captura sinônimos — em produção usar um modelo real.
 */
export class HashingEmbedder implements Embedder {
  readonly model = "hashing-v1";
  readonly dimension: number;
  constructor(dimension = 1024) {
    this.dimension = dimension;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const v = new Array<number>(this.dimension).fill(0);
      const toks = normalizeForSearch(t);
      const feats = [...toks, ...toks.slice(1).map((x, i) => `${toks[i]}_${x}`)];
      for (const f of feats) {
        const idx = hash(f, 17) % this.dimension;
        v[idx]! += hash(f, 31) % 2 === 0 ? 1 : -1;
      }
      const norm = Math.hypot(...v) || 1;
      return v.map((x) => x / norm);
    });
  }
}

/** Voyage AI (embeddings multilíngues). Modelo e dimensão configuráveis por ambiente. */
export class VoyageEmbedder implements Embedder {
  readonly model: string;
  readonly dimension: number;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  constructor(apiKey: string, model = "voyage-3.5", dimension = 1024, fetchImpl: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.model = model;
    this.dimension = dimension;
    this.fetchImpl = fetchImpl;
  }

  async embed(texts: string[], kind: "document" | "query"): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 128) {
      const res = await this.fetchImpl("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ input: texts.slice(i, i + 128), model: this.model, input_type: kind, output_dimension: this.dimension }),
      });
      if (!res.ok) throw new Error(`Voyage embeddings ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
      out.push(...json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
    }
    return out;
  }
}

export function createEmbedder(env: Record<string, string | undefined> = process.env): Embedder {
  if (env.EMBEDDINGS_PROVIDER === "voyage") {
    if (!env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY ausente");
    return new VoyageEmbedder(env.VOYAGE_API_KEY, env.VOYAGE_MODEL ?? "voyage-3.5", Number(env.EMBEDDINGS_DIMENSION ?? 1024));
  }
  return new HashingEmbedder(Number(env.EMBEDDINGS_DIMENSION ?? 1024));
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! ** 2;
    nb += b[i]! ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
