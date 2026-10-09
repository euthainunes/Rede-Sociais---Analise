import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MessageSystem } from '../src/core/messages.js';
import { StateMachine } from '../src/core/stateMachine.js';
import { createPromessa, updatePromessa, PROMESSA } from '../src/core/platforms.js';
import { loadLevel } from '../src/core/level.js';
import { FASE1 } from '../src/data/levels/fase1.js';
import { MESSAGES } from '../src/data/messages.js';
import { CHARACTERS } from '../src/data/characters.js';
import { TILE, jumpVelocity, PHYSICS } from '../src/config/constants.js';

test('mensagens: sem repetição até esgotar o saco, nem na virada', () => {
  const msgs = ['a', 'b', 'c', 'd'].map((t) => ({ event: 'x', character: 'any', text: t }));
  const ms = new MessageSystem(msgs, { cooldown: 0 });
  let last = null;
  for (let round = 0; round < 50; round++) {
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
      const t = ms.pick('x', 'capitao');
      assert.notEqual(t, last);
      seen.add(t);
      last = t;
    }
    assert.equal(seen.size, 4);
  }
});

test('mensagens: filtra por personagem e respeita o intervalo mínimo', () => {
  const ms = new MessageSystem(MESSAGES, { cooldown: 4 });
  const t = ms.say('checkpoint', 'capitao');
  assert.ok(t);
  const pool = MESSAGES.filter((m) => m.event === 'checkpoint' && m.character !== 'llivre').map((m) => m.text);
  assert.ok(pool.includes(t));
  assert.equal(ms.say('death', 'capitao'), null, 'deve respeitar o cooldown');
  assert.ok(ms.say('death', 'capitao', 'high'), 'prioridade alta fura a fila');
  ms.update(4.1);
  assert.ok(ms.say('death', 'capitao'));
});

test('máquina de estados ignora transições inválidas', () => {
  const fsm = new StateMachine('PLAYING');
  assert.equal(fsm.send('retry'), false);
  assert.equal(fsm.state, 'PLAYING');
  assert.equal(fsm.send('pause'), true);
  assert.equal(fsm.state, 'PAUSED');
  assert.equal(fsm.send('resume'), true);
  fsm.send('die');
  fsm.send('gameover');
  assert.equal(fsm.state, 'GAMEOVER');
});

test('PROMESSA treme, cai e reaparece', () => {
  const pr = createPromessa(0, 100, 48);
  updatePromessa(pr, 0.016, true, 224);
  assert.equal(pr.state, 'shaking');
  let t = 0;
  while (pr.state !== 'gone' && t < 5) { updatePromessa(pr, 0.016, false, 224); t += 0.016; }
  assert.equal(pr.state, 'gone');
  assert.equal(pr.solid, false);
  for (let k = 0; k < (PROMESSA.respawnTime + 0.1) / 0.016; k++) updatePromessa(pr, 0.016, false, 224);
  assert.equal(pr.state, 'idle');
  assert.equal(pr.y, 100);
});

test('fase 1 carrega com início, chegada, checkpoints e votos', () => {
  const lvl = loadLevel(FASE1);
  assert.ok(lvl.entities.spawn);
  assert.ok(lvl.entities.finish);
  assert.equal(lvl.entities.checkpoints.length, 2);
  assert.ok(lvl.entities.votes.length >= 30);
  assert.equal(lvl.entities.promessas.length, 2);
  assert.equal(lvl.map.isSolid(0, 11), true);
});

test('fase 1: nenhum buraco é mais largo que o pulo andando do personagem mais fraco (exceto os com PROMESSA ou toldo)', () => {
  const lvl = loadLevel(FASE1);
  const row = lvl.map.rows[11];
  const helped = (a, b) => lvl.entities.promessas.some((p) => p.x / TILE >= a - 1 && p.x / TILE <= b) || [...lvl.map.rows[9].slice(a, b + 1)].includes('=');
  // alcance horizontal andando: tempo de voo do pulo completo x velocidade de andar
  const reach = (c) => {
    const v = jumpVelocity(c.jumpTiles);
    const up = v / PHYSICS.gravityUp;
    const down = Math.sqrt((2 * c.jumpTiles * TILE) / PHYSICS.gravityDown);
    return ((up + down) * c.walkSpeed) / TILE;
  };
  const weakest = Math.min(...Object.values(CHARACTERS).map(reach));
  let start = -1;
  for (let x = 0; x <= row.length; x++) {
    const gap = row[x] === '.';
    if (gap && start < 0) start = x;
    if (!gap && start >= 0) {
      const width = x - start;
      if (!helped(start, x - 1)) assert.ok(width <= weakest - 0.5, `buraco em ${start} com ${width} tiles > alcance ${weakest.toFixed(1)}`);
      start = -1;
    }
  }
});
