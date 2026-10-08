import type { AffiliateAdapter, ClickContext } from "./types.ts";

/**
 * Amazon Associados (Brasil). Atribuição por tracking ID (tag): sem sub-ID por clique,
 * então usamos uma tag por canal/tipo de página e alocamos as vendas da tag (docs/12 §12.6).
 */
export interface AmazonConfig {
  defaultTag: string;
  /** Tags adicionais por canal, ex.: { youtube: "veredito-yt-20" }. */
  tagsByChannel?: Record<string, string>;
  allowedHosts?: string[];
}

const DEFAULT_HOSTS = ["www.amazon.com.br", "amazon.com.br"];
const STRIP_PARAMS = ["tag", "ascsubtag", "linkCode", "linkId", "ref_", "creative", "creativeASIN", "camp"];

export function extractAsin(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1]!.toUpperCase() : null;
}

export function createAmazonAdapter(config: AmazonConfig): AffiliateAdapter {
  const hosts = config.allowedHosts ?? DEFAULT_HOSTS;
  return {
    key: "amazon_br",
    fidelity: "tag",
    buildAffiliateUrl(originalUrl: string, ctx: ClickContext): string {
      const url = new URL(originalUrl);
      if (!hosts.includes(url.hostname)) throw new Error(`Host não permitido para Amazon: ${url.hostname}`);
      const asin = extractAsin(originalUrl);
      // URL canônica curta /dp/ASIN evita parâmetros de rastreio de terceiros.
      const out = asin ? new URL(`https://${url.hostname}/dp/${asin}`) : url;
      for (const p of STRIP_PARAMS) out.searchParams.delete(p);
      out.searchParams.set("tag", config.tagsByChannel?.[ctx.channel] ?? config.defaultTag);
      return out.toString();
    },
  };
}
