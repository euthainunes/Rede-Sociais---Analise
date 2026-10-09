// Plataforma "PROMESSA" (§3.9): treme 0,5 s depois de pisada, cai e reaparece em 3 s.

export const PROMESSA = { shakeTime: 0.5, respawnTime: 3, gravity: 900, maxFall: 400 };

export function createPromessa(x, y, w) {
  return { kind: 'promessa', x, y, w, h: 8, homeY: y, state: 'idle', timer: 0, vy: 0, dx: 0, dy: 0, solid: true };
}

/** Atualiza a plataforma. playerOnTop: o jogador está apoiado nela neste quadro. Retorna eventos. */
export function updatePromessa(p, dt, playerOnTop, levelBottom) {
  const events = [];
  const prevY = p.y;
  p.timer += dt;
  switch (p.state) {
    case 'idle':
      if (playerOnTop) { p.state = 'shaking'; p.timer = 0; events.push('promessa:shake'); }
      break;
    case 'shaking':
      if (p.timer >= PROMESSA.shakeTime) { p.state = 'falling'; p.timer = 0; p.vy = 0; }
      break;
    case 'falling':
      p.vy = Math.min(p.vy + PROMESSA.gravity * dt, PROMESSA.maxFall);
      p.y += p.vy * dt;
      if (p.y > levelBottom + 32) { p.state = 'gone'; p.timer = 0; p.solid = false; }
      break;
    case 'gone':
      if (p.timer >= PROMESSA.respawnTime) { p.state = 'idle'; p.timer = 0; p.y = p.homeY; p.vy = 0; p.solid = true; events.push('promessa:respawn'); }
      break;
  }
  p.dy = p.y - prevY;
  return events;
}
