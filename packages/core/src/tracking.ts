/** Utilitários de tracking de cliques (docs/09 §9.4, docs/13 §13.5). */

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** ID curto e não sequencial enviado como sub-ID ao programa. 10 chars base62 ≈ 59 bits. */
export function generateClickRef(length = 10): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|phantom|puppeteer|playwright|python-requests|curl\/|wget|httpclient|go-http-client|axios|node-fetch|lighthouse|pingdom|uptime/i;

export function isLikelyBot(userAgent: string | null | undefined, headers?: { secPurpose?: string | null }): boolean {
  if (!userAgent || userAgent.length < 20) return true;
  if (BOT_UA.test(userAgent)) return true;
  // Prefetch/prerender não são cliques reais.
  if (headers?.secPurpose && /prefetch|prerender/i.test(headers.secPurpose)) return true;
  return false;
}

export type Channel = "organic" | "direct" | "social" | "paid" | "email" | "ai_referral" | "referral";

const AI_HOSTS = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai|you\.com)$/i;
const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|yandex\.[a-z]+)$/i;
const SOCIAL_HOSTS = /(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|pinterest\.[a-z.]+|t\.co|x\.com|twitter\.com|linkedin\.com|reddit\.com|whatsapp\.com)$/i;

export function classifyChannel(input: {
  referrerHost?: string | null; utmMedium?: string | null; utmSource?: string | null; gclid?: string | null; siteHost: string;
}): Channel {
  const m = input.utmMedium?.toLowerCase();
  const src = input.utmSource?.toLowerCase();
  if (input.gclid || m === "cpc" || m === "paid" || m === "ppc") return "paid";
  if (m === "email" || m === "newsletter" || m === "alert" || src === "newsletter") return "email";
  if (m === "social" || (src && SOCIAL_HOSTS.test(`${src}.com`))) return "social";
  const h = input.referrerHost?.toLowerCase();
  // Campanha marcada sem referrer (app, QR code, link copiado) não é tráfego direto.
  if (!h || h === input.siteHost) return src ? "referral" : "direct";
  if (AI_HOSTS.test(h)) return "ai_referral";
  if (SEARCH_HOSTS.test(h)) return "organic";
  if (SOCIAL_HOSTS.test(h)) return "social";
  return "referral";
}

/** CTAs padronizados (docs/13 §13.5). */
export const CTA_IDS = [
  "hero_best_offer",
  "sticky_bar",
  "offers_table",
  "compare_column",
  "guide_pick_best",
  "guide_pick_budget",
  "deal_card",
  "advisor_result",
  "alert_email_landing",
] as const;
export type CtaId = (typeof CTA_IDS)[number];

export function isCtaId(x: string | null | undefined): x is CtaId {
  return x != null && (CTA_IDS as readonly string[]).includes(x);
}

export function deviceFromUserAgent(ua: string | null | undefined): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}
