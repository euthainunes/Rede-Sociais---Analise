/**
 * Acesso de rede do worker com proteção contra SSRF: só https, só hosts que resolvem para IP público,
 * limite de tamanho e de tempo. Feeds e verificações de link nunca alcançam a rede interna.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const USER_AGENT = "VereditoBot/1.0 (+https://veredito.example/bot; verificacao de ofertas)";

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
}

const PRIVATE_V4: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = ipv4ToInt(ip);
    return PRIVATE_V4.some(([base, bits]) => (n >>> (32 - bits)) === (ipv4ToInt(base) >>> (32 - bits)));
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

export class UnsafeUrlError extends Error {}

export interface NetOptions {
  /** Testes: permite http e hosts locais. Nunca ligar em produção. */
  allowPrivate?: boolean;
}

export async function assertPublicUrl(raw: string, opts: NetOptions = {}): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && !(opts.allowPrivate && url.protocol === "http:")) throw new UnsafeUrlError("apenas https");
  if (url.username || url.password) throw new UnsafeUrlError("URL com credenciais");
  if (opts.allowPrivate) return url;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new UnsafeUrlError(`host não público: ${host}`);
  return url;
}

/** Baixa texto com limite de bytes e tempo; segue até 5 redirects, revalidando cada destino. */
export async function fetchText(raw: string, opts: NetOptions & { maxBytes?: number; timeoutMs?: number } = {}): Promise<string> {
  const maxBytes = opts.maxBytes ?? 5_000_000;
  let url = await assertPublicUrl(raw, opts);
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString(), opts);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(`arquivo maior que ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error("redirects demais");
}

export type LinkOutcome = "ok" | "broken" | "redirected_home" | "unavailable" | "error";

/** Verifica um link de oferta: status, cadeia de redirects e sinais de "produto indisponível". */
export async function checkLink(raw: string, opts: NetOptions & { timeoutMs?: number } = {}): Promise<{ outcome: LinkOutcome; status: number | null; finalUrl: string | null; chain: string[] }> {
  const chain: string[] = [];
  try {
    let url = await assertPublicUrl(raw, opts);
    for (let hop = 0; hop < 6; hop++) {
      const res = await fetch(url, { redirect: "manual", headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000) });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        chain.push(url.toString());
        url = await assertPublicUrl(new URL(loc, url).toString(), opts);
        continue;
      }
      const finalUrl = url.toString();
      if (res.status === 404 || res.status === 410) return { outcome: "broken", status: res.status, finalUrl, chain };
      if (!res.ok) return { outcome: "error", status: res.status, finalUrl, chain };
      // Produto removido costuma redirecionar para a home ou para a busca.
      if (chain.length && (url.pathname === "/" || /\/(busca|search|s)\/?$/i.test(url.pathname))) {
        return { outcome: "redirected_home", status: res.status, finalUrl, chain };
      }
      const body = (await res.text()).slice(0, 200_000).toLowerCase();
      if (/produto indispon[ií]vel|esgotado|fora de estoque|currently unavailable/.test(body)) {
        return { outcome: "unavailable", status: res.status, finalUrl, chain };
      }
      return { outcome: "ok", status: res.status, finalUrl, chain };
    }
    return { outcome: "error", status: null, finalUrl: null, chain };
  } catch {
    return { outcome: "error", status: null, finalUrl: null, chain };
  }
}
