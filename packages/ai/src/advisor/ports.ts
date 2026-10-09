/**
 * Portas que o consultor usa para ler dados. Implementadas pela camada de dados (banco ou demonstração).
 * Nenhuma porta expõe comissão: o consultor é estruturalmente cego a valor comercial (firewall).
 */
import type { PriceVerdict, ProductScores, Specs } from "@veredito/core";
import type { Fact } from "../rag/types.ts";

export interface AdvisorProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  url: string;
  specs: Specs;
  scores: ProductScores;
  bestPrice: number | null;
  bestMerchant: string | null;
  priceVerdict: PriceVerdict | null;
}

export interface CatalogPort {
  listCandidates(category: string, opts?: { brands?: string[] }): Promise<AdvisorProduct[]>;
  getFacts(productId: string): Promise<Fact[]>;
}
