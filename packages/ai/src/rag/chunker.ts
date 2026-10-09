import type { Chunk, KnowledgeDocument } from "./types.ts";

export interface ChunkOptions {
  /** Tamanho alvo por trecho (caracteres; ~4 chars/token em pt-BR). */
  maxChars?: number;
  overlapChars?: number;
}

const DEFAULTS = { maxChars: 1800, overlapChars: 200 };

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Hash FNV-1a 32 bits — detecta trechos que não mudaram e evita re-embedding. */
export function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** Divide um parágrafo longo em frases sem cortar palavras. */
function splitLong(p: string, max: number): string[] {
  if (p.length <= max) return [p];
  const sentences = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [p];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    if (s.length > max) {
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max).trim());
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Chunking por seção (respeita títulos), com sobreposição entre trechos da mesma seção e
 * cabeçalho contextual ("Título › Seção") no texto embedado — melhora a recuperação de trechos curtos.
 */
export function chunkDocument(doc: KnowledgeDocument, options: ChunkOptions = {}): Chunk[] {
  const { maxChars, overlapChars } = { ...DEFAULTS, ...options };
  const chunks: Chunk[] = [];
  for (const section of doc.sections) {
    const pieces = splitParagraphs(section.text).flatMap((p) => splitLong(p, maxChars));
    let buf = "";
    const flush = () => {
      const text = buf.trim();
      if (!text) return;
      const headingPath = `${doc.title} › ${section.heading}`;
      const embeddingText = `${headingPath}\n${text}`;
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        documentId: doc.id,
        docType: doc.type,
        title: doc.title,
        url: doc.url,
        headingPath,
        category: doc.category,
        productIds: doc.productIds,
        text,
        embeddingText,
        tokenEstimate: estimateTokens(embeddingText),
        updatedAt: doc.updatedAt,
        contentHash: contentHash(embeddingText),
      });
    };
    for (const piece of pieces) {
      if (buf && buf.length + piece.length + 2 > maxChars) {
        flush();
        buf = overlapChars > 0 ? `${buf.slice(-overlapChars).replace(/^\S*\s/, "")}\n\n` : "";
      }
      buf += `${piece}\n\n`;
    }
    flush();
  }
  return chunks;
}
