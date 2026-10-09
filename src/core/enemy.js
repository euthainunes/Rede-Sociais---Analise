// Inimigos de patrulha (§3.10): andam, viram na parede ou na borda, podem ser convertidos ou atordoados.

import { TILE, PHYSICS } from '../config/constants.js';
import { moveAndCollide } from './physics.js';

/** kind: id do arquétipo; convertible: false para quem não muda de ideia (o Checador). */
export function createEnemy(kind, x, y, { speed = 30, convertible = true, dir = -1, range = 56 } = {}) {
  return { kind, homeX: x + 3, range, x: x + 3, y: y + TILE - 22, w: 10, h: 22, vx: 0, vy: 0, dir, speed, convertible, state: 'walk', timer: 0, onGround: false, animTime: 0 };
}

export function updateEnemy(e, dt, map) {
  e.timer += dt;
  e.animTime += dt;
  if (e.state === 'gone') return;
  if (e.state === 'converted') {
    // sai dançando e some depois de 1,6 s
    e.vx = e.dir * 18;
    e.vy = Math.min(e.vy + PHYSICS.gravityDown * dt, PHYSICS.maxFall);
    moveAndCollide(e, map, dt);
    if (e.timer > 1.6) e.state = 'gone';
    return;
  }
  if (e.state === 'stunned') {
    e.vx = 0;
    if (e.timer > 2) { e.state = 'walk'; e.timer = 0; }
  } else {
    e.vx = e.dir * e.speed;
  }
  e.vy = Math.min(e.vy + PHYSICS.gravityDown * dt, PHYSICS.maxFall);
  const res = moveAndCollide(e, map, dt);
  e.onGround = res.onGround;
  if (e.state !== 'walk') return;
  // vira na parede ou antes de cair de uma borda
  const frontX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
  const footY = Math.floor((e.y + e.h + 2) / TILE);
  const ahead = Math.floor(frontX / TILE);
  const floorAhead = map.isSolid(ahead, footY) || map.isOneWay(ahead, footY);
  // patrulha limitada à própria área (o level design controla onde cada um atua)
  const outOfRange = (e.dir > 0 && e.x > e.homeX + e.range) || (e.dir < 0 && e.x < e.homeX - e.range);
  if (res.hitWall || (e.onGround && !floorAhead) || outOfRange) e.dir *= -1;
}

export function convertEnemy(e) {
  if (!e.convertible || e.state === 'converted' || e.state === 'gone') return false;
  e.state = 'converted';
  e.timer = 0;
  e.vy = -180;
  return true;
}

export function stunEnemy(e) {
  if (e.state === 'converted' || e.state === 'gone') return;
  e.state = 'stunned';
  e.timer = 0;
}

export const isActive = (e) => e.state === 'walk' || e.state === 'stunned';
