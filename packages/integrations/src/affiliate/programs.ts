/**
 * Programas de afiliados — ordem de integração decidida em docs/decisoes.md (D4).
 * `termsVerified: false` = ainda falta confirmar termos e comissões vigentes no painel do programa.
 * Enquanto não verificado, o admin exibe aviso e o programa fica fora de produção.
 */
import type { AttributionFidelity, ProgramTerms } from "./types.ts";

export interface ProgramDefinition {
  key: string;
  name: string;
  merchantSlug: string;
  priority: number;
  adapter: "amazon" | "awin" | "template";
  fidelity: AttributionFidelity;
  cookieWindowHours: number | null;
  terms: ProgramTerms;
  termsVerified: boolean;
  why: string;
}

const conservativeTerms: ProgramTerms = {
  maxPriceAgeHours: 24,
  allowAffiliateLinksInEmail: false,
  priceHistoryStorage: "verify",
  subAffiliationAllowed: "verify",
  brandBiddingAllowed: "verify",
  disclosureRequired: true,
};

export const PROGRAMS: ProgramDefinition[] = [
  {
    key: "amazon_br",
    name: "Amazon Associados (Brasil)",
    merchantSlug: "amazon",
    priority: 1,
    adapter: "amazon",
    fidelity: "tag",
    cookieWindowHours: 24,
    terms: { ...conservativeTerms, subAffiliationAllowed: false, brandBiddingAllowed: false },
    termsVerified: false,
    why: "Maior alcance e confiança do consumidor em eletrônicos; link por tag funciona sem API. Atribuição só por tag.",
  },
  {
    key: "mercadolivre",
    name: "Mercado Livre Afiliados",
    merchantSlug: "mercado-livre",
    priority: 2,
    adapter: "template",
    fidelity: "tag",
    cookieWindowHours: null,
    terms: conservativeTerms,
    termsVerified: false,
    why: "Maior marketplace do Brasil e muitas lojas oficiais de celular; preço competitivo frequente.",
  },
  {
    key: "awin",
    name: "Awin (rede)",
    merchantSlug: "awin",
    priority: 3,
    adapter: "awin",
    fidelity: "click",
    cookieWindowHours: null,
    terms: conservativeTerms,
    termsVerified: false,
    why: "Rede com feed de produtos e clickref por clique (atribuição exata); um contrato cobre vários varejistas — confirmar quais anunciantes de eletrônicos aprovam o site.",
  },
  {
    key: "magalu",
    name: "Magalu / KaBuM (programa oficial ou via rede)",
    merchantSlug: "magalu",
    priority: 4,
    adapter: "template",
    fidelity: "tag",
    cookieWindowHours: null,
    terms: conservativeTerms,
    termsVerified: false,
    why: "Varejo nacional forte em eletrônicos e informática (KaBuM para notebooks/acessórios).",
  },
  {
    key: "shopee",
    name: "Shopee Afiliados",
    merchantSlug: "shopee",
    priority: 5,
    adapter: "template",
    fidelity: "tag",
    cookieWindowHours: null,
    terms: conservativeTerms,
    termsVerified: false,
    why: "Forte em acessórios e ticket baixo (halo); menor prioridade para smartphones pela variação de vendedores.",
  },
];

/** O e-mail de alerta só pode linkar direto para a loja se TODOS os termos permitirem — padrão: nunca. */
export function emailMayLinkDirectly(program: ProgramDefinition): boolean {
  return program.termsVerified && program.terms.allowAffiliateLinksInEmail;
}
