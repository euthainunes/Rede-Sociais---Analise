import "server-only";
import {
  createAmazonAdapter,
  createAwinAdapter,
  createTemplateAdapter,
  type AffiliateAdapter,
} from "@veredito/integrations";

/**
 * Adaptadores ativos conforme credenciais no ambiente. Programa sem credencial → link original
 * (o clique continua rastreado, mas sem comissão) — nunca quebra a experiência.
 */
function build(): Record<string, AffiliateAdapter> {
  const env = process.env;
  const out: Record<string, AffiliateAdapter> = {
    // Lojas fictícias da demonstração: marca o click_ref para ver o fluxo ponta a ponta.
    demo: createTemplateAdapter({
      key: "demo",
      fidelity: "click",
      linkTemplate: "{url}?ref={click_ref}&canal={channel}",
      allowedHosts: ["loja-alfa.example", "mega-beta.example", "gama-store.example"],
    }),
  };
  if (env.AMAZON_ASSOCIATES_TAG) out.amazon_br = createAmazonAdapter({ defaultTag: env.AMAZON_ASSOCIATES_TAG });
  if (env.AWIN_PUBLISHER_ID && env.AWIN_ADVERTISER_ID) {
    out.awin = createAwinAdapter({ publisherId: env.AWIN_PUBLISHER_ID, advertiserId: env.AWIN_ADVERTISER_ID });
  }
  if (env.MERCADOLIVRE_LINK_TEMPLATE) {
    out.mercadolivre = createTemplateAdapter({
      key: "mercadolivre",
      fidelity: "tag",
      linkTemplate: env.MERCADOLIVRE_LINK_TEMPLATE,
      allowedHosts: ["mercadolivre.com.br"],
    });
  }
  return out;
}

let adapters: Record<string, AffiliateAdapter> | null = null;

export function affiliateUrl(programKey: string, originalUrl: string, ctx: { clickRef: string; channel: string; pageType: string }) {
  adapters ??= build();
  const a = adapters[programKey];
  if (!a) return { url: originalUrl, affiliated: false };
  try {
    return { url: a.buildAffiliateUrl(originalUrl, ctx), affiliated: true };
  } catch {
    return { url: originalUrl, affiliated: false };
  }
}
