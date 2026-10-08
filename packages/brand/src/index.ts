/**
 * Fonte única da marca. "Veredito" é um nome fictício provisório: trocar a marca
 * definitiva (nome, domínio, cores, redes) é uma mudança só neste arquivo.
 */
export const brand = {
  name: "Veredito",
  legalName: "Veredito (nome provisório)",
  tagline: "A compra certa, na hora certa.",
  description:
    "Especialista independente de compras: reviews, comparações, histórico real de preços e recomendação personalizada de tecnologia.",
  domain: "veredito.example",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://veredito.example",
  locale: "pt-BR",
  currency: "BRL",
  contactEmail: "contato@veredito.example",
  dpoEmail: "privacidade@veredito.example",
  social: {
    youtube: null as string | null,
    instagram: null as string | null,
    tiktok: null as string | null,
    pinterest: null as string | null,
  },
  colors: {
    brand: "#1f5eff",
    brandInk: "#ffffff",
  },
} as const;

export type Brand = typeof brand;
