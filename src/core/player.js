// Controle do jogador: aceleração, corrida, pulo variável, coyote time e buffer (§3.1, §3.2, §9.6).
// Lógica pura: recebe entrada e mapa, devolve eventos. A renderização fica em src/game/.

import { PHYSICS, jumpVelocity } from '../config/constants.js';
import { HITBOX } from '../data/characters.js';
import { moveAndCollide } from './physics.js';

function approach(value, target, delta) {
  if (value < target) return Math.min(value + delta, target);
  if (value > target) return Math.max(value - delta, target);
  return value;
}

export function createPlayer(character, x, y) {
  return {
    character,
    x, y,
    w: HITBOX.w, h: HITBOX.h,
    vx: 0, vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpCutDone: false,
    holdTime: 0, // tempo segurando a mesma direção no chão
    lastDir: 0,
    running: false,
    state: 'idle', // idle | walk | run | jump | fall
    animTime: 0,
    standingOn: null,
    dropTimer: 0,
  };
}

/**
 * input: { left, right, down, jumpPressed, jumpHeld }
 * Retorna lista de eventos: 'jump', 'land'.
 */
export function updatePlayer(p, input, dt, map, platforms = []) {
  const events = [];
  const ch = p.character;
  const P = PHYSICS;

  // ---- temporizadores ----
  p.coyote = p.onGround ? P.coyoteTime : Math.max(0, p.coyote - dt);
  p.jumpBuffer = input.jumpPressed ? P.jumpBuffer : Math.max(0, p.jumpBuffer - dt);
  p.dropTimer = Math.max(0, p.dropTimer - dt);

  // ---- horizontal ----
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0 && dir === p.lastDir && p.onGround) p.holdTime += dt;
  else if (dir !== p.lastDir || dir === 0) p.holdTime = 0;
  p.lastDir = dir;
  if (p.onGround) p.running = p.holdTime >= P.runDelay;
  else if (dir === 0) p.running = false;

  const maxSpeed = p.running ? ch.runSpeed : ch.walkSpeed;
  const target = dir * maxSpeed;
  let accel;
  if (dir === 0) accel = p.onGround ? P.decelGround : P.decelAir;
  else {
    accel = P.accelGround * (p.onGround ? 1 : P.airControl);
    if (p.vx !== 0 && Math.sign(p.vx) !== dir) accel *= P.turnMultiplier;
  }
  p.vx = approach(p.vx, target, accel * dt);
  if (dir !== 0) p.facing = dir;

  // ---- pulo / descer de plataforma ----
  let dropThrough = p.dropTimer > 0;
  if (p.jumpBuffer > 0 && input.down && p.onGround) {
    // ↓ + pulo atravessa plataformas one-way
    p.dropTimer = 0.2;
    dropThrough = true;
    p.jumpBuffer = 0;
    p.coyote = 0;
  } else if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -jumpVelocity(ch.jumpTiles);
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.jumpCutDone = false;
    p.onGround = false;
    events.push('jump');
  }
  if (!input.jumpHeld && p.vy < 0 && !p.jumpCutDone) {
    p.vy *= P.jumpCut;
    p.jumpCutDone = true;
  }

  // ---- gravidade ----
  const g = p.vy < 0 ? P.gravityUp : P.gravityDown;
  p.vy = Math.min(p.vy + g * dt, P.maxFall);

  // ---- plataforma móvel sob os pés ----
  if (p.standingOn && p.onGround) {
    p.x += p.standingOn.dx ?? 0;
    p.y += p.standingOn.dy ?? 0;
  }

  // ---- mover e colidir ----
  const wasOnGround = p.onGround;
  const res = moveAndCollide(p, map, dt, platforms, { dropThrough });
  p.onGround = res.onGround;
  p.standingOn = res.standingOn;
  if (res.ceilingTile) events.push({ type: 'ceiling', ...res.ceilingTile });
  if (res.onGround && !wasOnGround) events.push('land');

  // ---- estado de animação ----
  const prev = p.state;
  if (!p.onGround) p.state = p.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(p.vx) < 5) p.state = 'idle';
  else p.state = p.running ? 'run' : 'walk';
  p.animTime = prev === p.state ? p.animTime + dt : 0;

  return events;
}
