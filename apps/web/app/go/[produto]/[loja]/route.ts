/**
 * Redirect de afiliado (docs/09 §9.4). Só redireciona para ofertas armazenadas — nunca para URL vinda do usuário.
 * Responde imediatamente; o registro do clique acontece depois da resposta.
 */
import { after, NextResponse, type NextRequest } from "next/server";
import { brand } from "@veredito/brand";
import { generateClickRef, isCtaId, isLikelyBot } from "@veredito/core";
import { affiliateUrl } from "@/lib/affiliate";
import { catalog } from "@/lib/data";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(req: NextRequest, ctx: { params: Promise<{ produto: string; loja: string }> }) {
  const { produto, loja } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const variant = sp.get("v");
  const resolved = await catalog().resolveRedirect(produto, loja, variant);
  if (!resolved) return new NextResponse("Produto não encontrado", { status: 404, headers: NO_STORE });

  const productPath = resolved.summary.url;
  // Oferta acabou ou loja sem preço válido: volta para a página do produto, nunca um erro seco.
  if (!resolved.hit) {
    return NextResponse.redirect(new URL(`${productPath}?indisponivel=${encodeURIComponent(loja)}#ofertas`, req.url), { status: 302, headers: NO_STORE });
  }

  const ua = req.headers.get("user-agent");
  const bot = isLikelyBot(ua, { secPurpose: req.headers.get("sec-purpose") ?? req.headers.get("purpose") });
  if (bot) return NextResponse.redirect(new URL(productPath, req.url), { status: 302, headers: NO_STORE });

  const referer = req.headers.get("referer");
  const refUrl = referer ? safeUrl(referer) : null;
  const siteHost = new URL(brand.url).hostname;
  const sourcePath = refUrl && (refUrl.hostname === req.nextUrl.hostname || refUrl.hostname === siteHost) ? refUrl.pathname : null;
  const utm = Object.fromEntries([...(refUrl?.searchParams ?? new URLSearchParams())].filter(([k]) => k.startsWith("utm_")));
  // Canal = origem da campanha (utm_source) quando houver; vira tag/sub-ID no programa.
  const channel = utm.utm_source ?? (sourcePath ? "site" : "external");
  const ctaRaw = sp.get("cta");
  const clickRef = generateClickRef();
  const { o, v } = resolved.hit;
  const { url } = affiliateUrl(o.programKey, o.url, { clickRef, channel, pageType: pageTypeOf(sourcePath) });

  after(async () => {
    try {
      await catalog().source.recordClick({
        clickRef, ts: new Date(), offerId: o.id, productId: resolved.product.id, variantId: v.id,
        merchantId: o.merchantId, programKey: o.programKey, sourcePath, pageType: pageTypeOf(sourcePath),
        ctaId: isCtaId(ctaRaw) ? ctaRaw : null, position: sp.get("pos"), utm, device: deviceOf(ua),
        anonId: req.cookies.get("aid")?.value ?? null, sessionId: null, priceShown: o.total, isBot: false,
      });
    } catch (e) {
      console.error("click_record_failed", e instanceof Error ? e.message : e);
    }
  });

  return NextResponse.redirect(url, { status: 302, headers: { ...NO_STORE, "Referrer-Policy": "no-referrer-when-downgrade" } });
}

function safeUrl(s: string): URL | null {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

function pageTypeOf(path: string | null): string {
  if (!path) return "external";
  if (path === "/") return "home";
  if (path.startsWith("/comparar")) return "compare";
  if (path.startsWith("/ofertas")) return "deals";
  if (path.startsWith("/melhores")) return "best_list";
  if (path.startsWith("/consultor")) return "advisor";
  if (path.startsWith("/buscar")) return "search";
  return path.split("/").filter(Boolean).length === 2 ? "product" : "category";
}

function deviceOf(ua: string | null): string {
  if (!ua) return "unknown";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}
