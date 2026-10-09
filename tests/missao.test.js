import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TileMap } from '../src/core/physics.js';
import { createEnemy, updateEnemy, convertEnemy, stunEnemy } from '../src/core/enemy.js';
import { createZap, updateZap, ZAP } from '../src/core/zap.js';
import { MissaoGame, STATES, createRun } from '../src/game/missao.js';
import { QUARTEL } from '../src/data/missao/quartel.js';
import { CHECAGEM, MISSAO_CARD } from '../src/data/missao/checagem.js';
import { MESSAGES_MISSAO } from '../src/data/missao/messages.js';
import { MessageSystem } from '../src/core/messages.js';
import { StateMachine } from '../src/core/stateMachine.js';
import { STEP, TILE } from '../src/config/constants.js';

const ROOM = new TileMap([
  ...Array(9).fill('....................'),
  '#...................',
  '#.......######......',
  '####################',
]);

test('inimigo patrulha e vira na borda da plataforma', () => {
  const e = createEnemy('militante', 10 * TILE, 9 * TILE, { dir: 1, speed: 40 });
  let turned = false;
  for (let i = 0; i < 600; i++) { const d = e.dir; updateEnemy(e, STEP, ROOM); if (d !== e.dir) turned = true; }
  assert.ok(turned, 'deveria virar');
  assert.ok(e.x >= 8 * TILE - 2 && e.x + e.w <= 14 * TILE + 2, `saiu da plataforma: x=${e.x}`);
});

test('Checador não se converte, mas pode ser atordoado', () => {
  const k = createEnemy('checador', 0, 0, { convertible: false });
  assert.equal(convertEnemy(k), false);
  stunEnemy(k);
  assert.equal(k.state, 'stunned');
  const m = createEnemy('militante', 0, 0);
  assert.equal(convertEnemy(m), true);
  assert.equal(m.state, 'converted');
});

test('corrente de Zap se multiplica ao converter e é checada pelo Checador', () => {
  const player = { x: 0, y: 140, w: 10, h: 22 };
  const alvo = createEnemy('militante', 5 * TILE, 9 * TILE);
  const z = createZap(20, alvo.y + 6, 1);
  let evs = [];
  for (let i = 0; i < 60 && z.alive; i++) evs.push(...updateZap(z, STEP, ROOM, player, [alvo]));
  assert.ok(evs.some((e) => e.type === 'convert'));
  const spawn = evs.find((e) => e.type === 'spawn');
  assert.equal(spawn.zaps.length, 2);
  assert.ok(spawn.zaps.every((c) => c.gen === 1));

  const k = createEnemy('checador', 5 * TILE, 9 * TILE, { convertible: false });
  const z2 = createZap(20, k.y + 6, 1);
  evs = [];
  for (let i = 0; i < 60 && z2.alive; i++) evs.push(...updateZap(z2, STEP, ROOM, player, [k]));
  assert.ok(evs.some((e) => e.type === 'checked'));
});

test('corrente que não acerta ninguém volta e acerta quem compartilhou', () => {
  const player = { x: 40, y: 140, w: 10, h: 22 };
  const z = createZap(52, 146, 1);
  const evs = [];
  for (let i = 0; i < 400 && z.alive; i++) evs.push(...updateZap(z, STEP, ROOM, player, []));
  assert.ok(evs.some((e) => e.type === 'self'), 'a corrente deveria voltar no Patrício');
  assert.ok(ZAP.returnAfter < ZAP.maxAge);
});

test('fase 1 tem marmitas suficientes para os acampados e 3 provas', () => {
  const run = createRun(QUARTEL);
  assert.equal(run.acampados.length, QUARTEL.marmitasMeta);
  assert.ok(run.marmitas.length >= QUARTEL.marmitasMeta);
  assert.equal(run.pendrives.length, 3);
  assert.ok(run.enemies.some((e) => e.kind === 'checador' && !e.convertible));
  // cada acampado precisa ter uma marmita disponível antes dele no caminho
  const ms = run.marmitas.map((m) => m.drawX).sort((a, b) => a - b);
  run.acampados.map((a) => a.x).sort((a, b) => a - b).forEach((ax, i) => assert.ok(ms[i] < ax, `acampado ${i} sem marmita antes`));
});

test('Checagem da fase 1 desmente a fake news e todo fato tem fonte listada', () => {
  const c = CHECAGEM.quartel;
  assert.ok(c.itens.some((i) => i.tag === 'FAKE'));
  assert.ok(c.itens.some((i) => i.tag === 'PIADA'));
  assert.ok(c.fontes.length >= c.itens.filter((i) => i.tag === 'FATO').length);
  assert.ok(c.fontes.every((f) => f.url.startsWith('https://')));
  assert.ok(MISSAO_CARD.quartel.texto.includes('5 marmitas'));
});

// ---------- robô que joga a fase com as regras reais ----------
function headlessGame() {
  const g = Object.create(MissaoGame.prototype);
  g.levelData = QUARTEL;
  g.messages = new MessageSystem(MESSAGES_MISSAO);
  g.fsm = new StateMachine('PLAYING', STATES);
  g.save = {};
  g.levelCanvas = {}; // pula a pré-renderização (sem tela no Node)
  g.time = 0;
  g.startLevel();
  return g;
}

test('robô conclui a fase 1: entrega 5 marmitas, sobrevive e chega à Checagem', () => {
  const g = headlessGame();
  const map = g.level.map;
  let jumpHold = 0;
  for (let i = 0; i < 60 * 180 && g.fsm.is('PLAYING'); i++) {
    const p = g.player;
    const front = p.x + p.w + 2;
    const footRow = Math.floor((p.y + p.h + 1) / TILE);
    const aheadCol = Math.floor((front + 10) / TILE);
    const wallAhead = map.isSolid(Math.floor((front + 6) / TILE), Math.floor((p.y + p.h - 4) / TILE));
    const groundAhead = map.isSolid(aheadCol, footRow) || map.isOneWay(aheadCol, footRow) ||
      g.level.entities.promessas.some((pr) => pr.solid && front + 10 >= pr.x && front + 10 <= pr.x + pr.w && Math.abs(pr.y - (p.y + p.h)) < 2);
    const enemyAhead = g.enemies.some((e) => e.state === 'walk' && e.x > p.x && e.x - (p.x + p.w) < 26 && Math.abs(e.y - p.y) < 8);
    let jumpPressed = false;
    if (p.onGround && (wallAhead || !groundAhead || enemyAhead)) { jumpPressed = true; jumpHold = 0.4; }
    jumpHold -= STEP;
    g.input = { frame: () => ({}) };
    g.updatePlaying({ left: false, right: true, down: false, jumpPressed, jumpHeld: jumpHold > 0, throwPressed: false }, STEP);
    g.fsm.time += STEP;
    if (g.fsm.is('DYING')) { g.fsm.send('respawn'); g.spawnPlayer(); }
  }
  assert.equal(g.fsm.state, 'CHECAGEM', `parou em ${g.fsm.state}, x=${Math.floor(g.player.x / TILE)}, marmitas ${g.session.delivered}, fé ${g.session.fe}, vidas ${g.session.lives}`);
  assert.equal(g.session.delivered, 5);
  assert.ok(g.session.lives >= 1);
});

test('o relógio das 72 horas zera e recomeça (nunca acaba)', () => {
  const g = headlessGame();
  const idle = { left: false, right: false, down: false, jumpPressed: false, jumpHeld: false, throwPressed: false };
  let resets = 0;
  let prev = g.session.hours72;
  for (let i = 0; i < 60 * 150; i++) {
    g.updatePlaying(idle, STEP);
    if (g.session.hours72 > prev) resets++;
    prev = g.session.hours72;
  }
  assert.ok(resets >= 2, `zerou ${resets} vezes`);
  assert.ok(g.session.hours72 > 0);
});

test('portão não abre sem as marmitas', () => {
  const g = headlessGame();
  const F = g.level.entities.finish;
  Object.assign(g.player, { x: F.x + 10, y: F.y + 26, vx: 0, vy: 0 });
  g.updatePlaying({ left: false, right: false, down: false, jumpPressed: false, jumpHeld: false, throwPressed: false }, STEP);
  assert.equal(g.fsm.state, 'PLAYING');
  g.session.delivered = 5;
  g.updatePlaying({ left: false, right: false, down: false, jumpPressed: false, jumpHeld: false, throwPressed: false }, STEP);
  assert.equal(g.fsm.state, 'CHECAGEM');
});

test('inimigo patrulha só dentro do raio da sua área', () => {
  const flat = new TileMap(['..............................', '##############################']);
  const e = createEnemy('militante', 15 * TILE, -16 + 0, { dir: -1, speed: 40, range: 40 });
  let minX = Infinity; let maxX = -Infinity;
  for (let i = 0; i < 1200; i++) { updateEnemy(e, STEP, flat); minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x); }
  assert.ok(minX >= e.homeX - 44 && maxX <= e.homeX + 44, `foi de ${minX} a ${maxX} (casa ${e.homeX})`);
});
