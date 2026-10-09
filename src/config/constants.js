// Constantes globais de tela e física (§3 da especificação). Unidades: px e segundos.

export const VIEW_W = 384;
export const VIEW_H = 216;
export const TILE = 16;
export const STEP = 1 / 60; // passo fixo da simulação

export const PHYSICS = {
  accelGround: 1800, // px/s² ao segurar uma direção no chão
  airControl: 0.6, // fração da aceleração no ar
  decelGround: 2200, // atrito ao soltar a direção no chão
  decelAir: 500,
  turnMultiplier: 2, // "virada rápida" ao inverter a direção
  runDelay: 0.6, // s segurando a mesma direção no chão até correr
  gravityUp: 1400,
  gravityDown: 2100,
  maxFall: 520,
  jumpCut: 0.45, // multiplica vy ao soltar o pulo durante a subida
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
};

/**
 * Velocidade inicial de pulo a partir da altura desejada em tiles (o designer edita tiles, não física).
 * Fórmula discreta: com passo fixo, a subida perde ~v·dt/2 em relação à fórmula contínua v²/2g.
 */
export function jumpVelocity(heightTiles, dt = STEP) {
  const g = PHYSICS.gravityUp;
  const h = heightTiles * TILE;
  const half = (g * dt) / 2;
  return half + Math.sqrt(half * half + 2 * g * h);
}
