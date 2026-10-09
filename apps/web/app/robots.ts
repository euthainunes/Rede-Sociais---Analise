import type { MetadataRoute } from "next";
import { brand } from "@veredito/brand";
import { isDemo } from "@/lib/data";

/**
 * Política de rastreamento (docs/11 §11.4 e decisão D5): buscadores e robôs de busca/citação de IA liberados;
 * robôs de treinamento bloqueados por padrão. Demonstração: tudo bloqueado.
 */
export default function robots(): MetadataRoute.Robots {
  if (isDemo()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const privatePaths = ["/go/", "/s/", "/buscar", "/comparar", "/api/", "/admin", "/conta", "/alertas/", "/newsletter/confirmar", "/descadastrar"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Claude-User"], allow: "/", disallow: privatePaths },
      { userAgent: ["GPTBot", "Google-Extended", "CCBot", "anthropic-ai", "ClaudeBot", "Bytespider"], disallow: "/" },
    ],
    sitemap: `${brand.url}/sitemap.xml`,
  };
}
