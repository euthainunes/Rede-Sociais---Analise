// Um "robô" joga a fase 1 só com entradas normais (direita + pulo), com cada personagem.
// Garante que a rota principal é completável pelos dois sem atalhos nem truques.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLevel } from '../src/core/level.js';
import { createPlayer, updatePlayer } from '../src/core/player.js';
import { updatePromessa } from '../src/core/platforms.js';
import { overlaps } from '../src/core/physics.js';
import { FASE1 } from '../src/data/levels/fase1.js';
import { CHARACTERS } from '../src/data/characters.js';
import { STEP, TILE } from '../src/config/constants.js';

function play(characterId) {
  const lvl = loadLevel(FASE1);
  const { map, entities: E } = lvl;
  const p = createPlayer(CHARACTERS[characterId], E.spawn.x, E.spawn.y);
  let jumpHold = 0;
  for (let i = 0; i < 60 * 120; i++) {
    const front = p.x + p.w + 2;
    const footRow = Math.floor((p.y + p.h + 1) / TILE);
    const aheadCol = Math.floor((front + 10) / TILE);
    const wallAhead = map.isSolid(Math.floor((front + 6) / TILE), Math.floor((p.y + p.h - 4) / TILE));
    const groundAhead = map.isSolid(aheadCol, footRow) || map.isOneWay(aheadCol, footRow) ||
      E.promessas.some((pr) => pr.solid && front + 10 >= pr.x && front + 10 <= pr.x + pr.w && Math.abs(pr.y - (p.y + p.h)) < 2);
    let jumpPressed = false;
    if (p.onGround && (wallAhead || !groundAhead)) { jumpPressed = true; jumpHold = 0.4; }
    jumpHold -= STEP;
    for (const pr of E.promessas) updatePromessa(pr, STEP, p.standingOn === pr, map.pixelH);
    updatePlayer(p, { left: false, right: true, down: false, jumpPressed, jumpHeld: jumpHold > 0 }, STEP, map, E.promessas);
    if (p.y > map.pixelH + 8) return { done: false, x: Math.floor(p.x / TILE), reason: 'caiu' };
    if (overlaps(p, E.finish)) return { done: true, time: i * STEP };
  }
  return { done: false, x: Math.floor(p.x / TILE), reason: 'tempo esgotado' };
}

for (const id of Object.keys(CHARACTERS)) {
  test(`fase 1 é completável pelo ${id} só correndo e pulando`, () => {
    const r = play(id);
    assert.ok(r.done, `${id} parou na coluna ${r.x} (${r.reason})`);
  });
}
