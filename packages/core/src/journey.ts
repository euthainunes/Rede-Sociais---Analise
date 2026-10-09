/**
 * Jornada por sessão e modelos de atribuição multi-toque (docs/12 §12.6, docs/13 §13.6).
 * A sessão só existe com consentimento de medição; sem ela, a venda fica com o canal do próprio clique.
 */

/** Inatividade que encerra a sessão (mesma regra do GA4). */
export const SESSION_IDLE_MS = 30 * 60_000;
/** Até quantos dias antes do clique uma sessão conta na jornada. */
export const JOURNEY_LOOKBACK_DAYS = 30;
/** Teto de pontos de contato por jornada (os mais recentes). */
export const JOURNEY_MAX_TOUCHES = 20;

export const ATTRIBUTION_MODELS = ["last", "first", "linear", "position"] as const;
export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number];

export const ATTRIBUTION_MODEL_LABELS: Record<AttributionModel, string> = {
  last: "Último toque",
  first: "Primeiro toque",
  linear: "Linear",
  position: "Por posição (40/20/40)",
};

/** Peso de cada ponto de contato (ordem cronológica). Soma sempre 1. */
export function touchWeights(n: number, model: AttributionModel): number[] {
  if (!Number.isInteger(n) || n < 1) return [];
  if (n === 1) return [1];
  switch (model) {
    case "last":
      return Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0));
    case "first":
      return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0));
    case "linear":
      return Array.from({ length: n }, () => 1 / n);
    case "position":
      if (n === 2) return [0.5, 0.5];
      return Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 0.4 : 0.2 / (n - 2)));
  }
}

export interface SessionState {
  lastSeenAt: Date;
  utmSource: string | null;
  utmCampaign: string | null;
}

/** Nova sessão quando não há sessão, quando passou o tempo de inatividade ou quando chega outra campanha. */
export function needsNewSession(current: SessionState | null, now: Date, utm: { source: string | null; campaign: string | null }): boolean {
  if (!current) return true;
  if (now.getTime() - current.lastSeenAt.getTime() > SESSION_IDLE_MS) return true;
  if (utm.source && (utm.source !== current.utmSource || (utm.campaign ?? null) !== current.utmCampaign)) return true;
  return false;
}
