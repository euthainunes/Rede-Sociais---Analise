import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TileMap } from '../src/core/physics.js';
import { createPlayer, updatePlayer } from '../src/core/player.js';
import { CHARACTERS } from '../src/data/characters.js';
import { STEP, TILE, PHYSICS } from '../src/config/constants.js';

// Sala de teste: chão na fileira 10 (y = 160), parede à direita na coluna 28.
const ROOM = [
  ...Array(5).fill('..............................'),
  '..............................',
  '..............................',
  '..........====................',
  '..............................',
  '............................#.',
  '##############....##########..',
  '##############....############',
];
const map = new TileMap(ROOM);
const GROUND = 10 * TILE;
const NONE = { left: false, right: false, down: false, jumpPressed: false, jumpHeld: false };

function spawn(id = 'capitao', x = 40) {
  const p = createPlayer(CHARACTERS[id], x, GROUND - 22);
  updatePlayer(p, NONE, STEP, map); // assenta no chão
  return p;
}
function run(p, input, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) updatePlayer(p, typeof input === 'function' ? input(i) : input, STEP, map);
}
function jumpPeak(id) {
  const p = spawn(id);
  updatePlayer(p, { ...NONE, jumpPressed: true, jumpHeld: true }, STEP, map);
  let minY = p.y;
  for (let i = 0; i < 120; i++) { updatePlayer(p, { ...NONE, jumpHeld: true }, STEP, map); minY = Math.min(minY, p.y); }
  return GROUND - 22 - minY;
}

test('jogador assenta no chão', () => {
  const p = spawn();
  assert.equal(p.onGround, true);
  assert.equal(p.y + p.h, GROUND);
});

test('altura do pulo segura bate com a configuração (±3 px)', () => {
  for (const id of ['capitao', 'llivre']) {
    const expected = CHARACTERS[id].jumpTiles * TILE;
    const h = jumpPeak(id);
    assert.ok(Math.abs(h - expected) <= 3, `${id}: pulo de ${h.toFixed(1)} px, esperado ${expected}`);
  }
});

test('L-Livre pula mais alto que o Capitão', () => {
  assert.ok(jumpPeak('llivre') > jumpPeak('capitao') + 8);
});

test('soltar o botão cedo gera pulo mais baixo (altura variável)', () => {
  const p = spawn();
  updatePlayer(p, { ...NONE, jumpPressed: true, jumpHeld: true }, STEP, map);
  let minY = p.y;
  for (let i = 0; i < 90; i++) { updatePlayer(p, NONE, STEP, map); minY = Math.min(minY, p.y); }
  const h = GROUND - 22 - minY;
  assert.ok(h < CHARACTERS.capitao.jumpTiles * TILE * 0.5, `pulo curto subiu ${h.toFixed(1)} px`);
});

test('corrida só começa após segurar a direção por 0,6 s', () => {
  const p = spawn('capitao', 20);
  run(p, { ...NONE, right: true }, 0.5);
  assert.ok(Math.abs(p.vx - CHARACTERS.capitao.walkSpeed) < 1, `vx ${p.vx}`);
  assert.equal(p.running, false);
  run(p, { ...NONE, right: true }, 0.4);
  assert.equal(p.running, true);
  assert.ok(p.vx > CHARACTERS.capitao.walkSpeed);
});

test('soltar a direção desacelera até parar', () => {
  const p = spawn('capitao', 20);
  run(p, { ...NONE, right: true }, 0.4);
  run(p, NONE, 0.3);
  assert.equal(p.vx, 0);
});

test('parede bloqueia o movimento horizontal', () => {
  const p = spawn('capitao', 380);
  run(p, { ...NONE, right: true }, 1);
  assert.ok(p.x + p.w <= 28 * TILE, `x final ${p.x + p.w}`);
  assert.equal(p.vx, 0);
});

test('coyote time: ainda pula logo depois de sair da borda', () => {
  // borda do chão em x = 14*16 = 224; anda até cair e pula 3 quadros depois
  const p = spawn('capitao', 200);
  let leftAt = -1;
  let jumped = false;
  for (let i = 0; i < 60 && !jumped; i++) {
    const wasGround = p.onGround;
    const ev = updatePlayer(p, { ...NONE, right: true, jumpPressed: leftAt >= 0 && i === leftAt + 3, jumpHeld: true }, STEP, map);
    if (wasGround && !p.onGround && leftAt < 0) leftAt = i;
    if (ev.includes('jump')) jumped = true;
  }
  assert.ok(leftAt >= 0, 'deveria ter saído da borda');
  assert.ok(jumped, 'pulo dentro do coyote time deveria funcionar');
});

test('sem coyote time depois de 0,1 s no ar', () => {
  const p = spawn('capitao', 200);
  let leftAt = -1;
  let jumped = false;
  for (let i = 0; i < 60; i++) {
    const wasGround = p.onGround;
    const ev = updatePlayer(p, { ...NONE, right: true, jumpPressed: leftAt >= 0 && i === leftAt + 10, jumpHeld: true }, STEP, map);
    if (wasGround && !p.onGround && leftAt < 0) leftAt = i;
    if (ev.includes('jump')) jumped = true;
  }
  assert.equal(jumped, false);
});

test('buffer de pulo: apertar pouco antes de aterrissar gera pulo', () => {
  const p = spawn();
  updatePlayer(p, { ...NONE, jumpPressed: true, jumpHeld: true }, STEP, map);
  // espera até estar caindo e a ~4 quadros do chão
  let i = 0;
  while (!(p.vy > 0 && GROUND - (p.y + p.h) < p.vy * STEP * 4) && i++ < 200) updatePlayer(p, { ...NONE, jumpHeld: true }, STEP, map);
  updatePlayer(p, { ...NONE, jumpPressed: true, jumpHeld: true }, STEP, map);
  let jumped = false;
  for (let k = 0; k < 10; k++) if (updatePlayer(p, { ...NONE, jumpHeld: true }, STEP, map).includes('jump')) jumped = true;
  assert.ok(jumped, `buffer deveria disparar o pulo (gravidade ${PHYSICS.gravityDown})`);
});

test('plataforma one-way: atravessa subindo, apoia descendo, ↓+pulo desce', () => {
  // toldo na fileira 7 (y=112), colunas 10–13
  const p = createPlayer(CHARACTERS.llivre, 10 * TILE + 2, GROUND - 22);
  updatePlayer(p, NONE, STEP, map);
  run(p, { ...NONE, jumpPressed: true, jumpHeld: true }, STEP);
  run(p, { ...NONE, jumpHeld: true }, 1.2);
  assert.equal(p.onGround, true);
  assert.equal(p.y + p.h, 7 * TILE, 'deveria estar sobre o toldo');
  updatePlayer(p, { ...NONE, down: true, jumpPressed: true, jumpHeld: true }, STEP, map);
  run(p, NONE, 0.6);
  assert.equal(p.y + p.h, GROUND, 'deveria ter descido ao chão');
});

test('cair no buraco leva o jogador para fora do mapa', () => {
  const p = spawn('capitao', 15 * TILE);
  run(p, NONE, 1.5);
  assert.ok(p.y > map.pixelH);
});
