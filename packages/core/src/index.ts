export * from "./pricing.ts";
export * from "./scoring.ts";
export * from "./fit.ts";
export * from "./offers.ts";
export * from "./matching.ts";
export * from "./compare.ts";
export * from "./quality-gate.ts";
export * from "./tracking.ts";
export * from "./events.ts";
export * from "./verticals/types.ts";
export { celulares } from "./verticals/celulares.ts";

import { celulares } from "./verticals/celulares.ts";
import type { CategoryConfig } from "./verticals/types.ts";

/** Registro de categorias ativas. Novo vertical = nova entrada aqui. */
export const categories: Record<string, CategoryConfig> = { celulares };

export function getCategory(slug: string): CategoryConfig | null {
  return categories[slug] ?? null;
}
