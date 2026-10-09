// Corrente de Zap: voa reta, se MULTIPLICA ao converter alguém e, depois de um tempo,
// VOLTA na direção de quem compartilhou. Se acertar o Patrício, ele perde Fé.

import { TILE } from '../config/constants.js';
import { overlaps } from './physics.js';

export const ZAP = { speed: 210, returnSpeed: 150, returnAfter: 0.8, maxAge: 3.2, maxGen: 2, maxAlive: 8, cooldown: 0.3 };

export function createZap(x, y, dir, gen = 0, vy = 0) {
  return { x, y, w: 9, h: 8, vx: dir * ZAP.speed, vy, gen, age: 0, returning: false, alive: true, graceTime: 0.35 };
}

/** Faz a corrente voltar em linha reta para onde o alvo está agora (dá para desviar). */
function startReturn(z, target) {
  z.returning = true;
  const dx = target.x + target.w / 2 - (z.x + z.w / 2);
  const dy = target.y + target.h / 2 - (z.y + z.h / 2);
  const d = Math.hypot(dx, dy) || 1;
  z.vx = (dx / d) * ZAP.returnSpeed;
  z.vy = (dy / d) * ZAP.returnSpeed;
}

/**
 * Atualiza uma corrente. enemies: inimigos ativos; player: o Patrício.
 * Retorna eventos { type: 'convert'|'checked'|'self'|'spawn', ... }.
 */
export function updateZap(z, dt, map, player, enemies) {
  const events = [];
  if (!z.alive) return events;
  z.age += dt;
  z.graceTime = Math.max(0, z.graceTime - dt);
  z.x += z.vx * dt;
  z.y += z.vy * dt;

  if (!z.returning) {
    const tx = Math.floor((z.x + z.w / 2) / TILE);
    const ty = Math.floor((z.y + z.h / 2) / TILE);
    if (z.age >= ZAP.returnAfter || map.isSolid(tx, ty)) startReturn(z, player);
    for (const e of enemies) {
      if (!overlaps(z, e) || e.state !== 'walk') continue;
      if (!e.convertible) {
        // o Checador checa a corrente: ela vira "FAKE" e some
        z.alive = false;
        events.push({ type: 'checked', enemy: e, x: z.x, y: z.y });
        return events;
      }
      events.push({ type: 'convert', enemy: e, x: z.x, y: z.y, gen: z.gen });
      // compartilhada! nascem duas cópias (até a 2ª geração)
      if (z.gen < ZAP.maxGen) {
        const dir = Math.sign(z.vx) || 1;
        events.push({ type: 'spawn', zaps: [createZap(z.x, z.y - 4, dir, z.gen + 1, -70), createZap(z.x, z.y + 4, dir, z.gen + 1, 40)] });
      }
      z.alive = false;
      return events;
    }
  }

  if (z.returning && z.graceTime === 0 && overlaps(z, player)) {
    z.alive = false;
    events.push({ type: 'self', x: z.x, y: z.y });
  }
  if (z.age > ZAP.maxAge || z.y > map.pixelH + 16) z.alive = false;
  return events;
}
