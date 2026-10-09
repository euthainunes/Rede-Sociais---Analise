// Personagens jogáveis: Capitão e L-Livre (16x24, estilo "cabeção").
// Cada quadro = cabeça + tronco + pernas. Quadros de jogo usam a cabeça 3/4 virada
// para a direita; para a esquerda o sprite é espelhado (opts.flip).

import { rows, sprite, stack } from './pixel.js';

export const PAL_CAPITAO = {
  K: '#1a1a1a', S: '#eab48c', O: '#c98e66', H: '#4a2f1f', h: '#6b4630',
  N: '#232b3a', n: '#2f3a4f', D: '#171d28', W: '#ffffff', T: '#8fb8ec', P: '#f5d000', B: '#111111',
  G: '#1f9e3a', Y: '#f5d000', L: '#f4ecd8', l: '#b8860b',
};
export const PAL_LLIVRE = {
  K: '#1a1a1a', S: '#e0a77a', O: '#c4855a', H: '#d6d6d6', h: '#b5b5b5', R: '#f2f2f2', r: '#d0d0d0',
  N: '#24346b', n: '#30448a', D: '#1a2650', W: '#ffffff', T: '#e0609a', G: '#1f9e3a', Y: '#f5d000', B: '#111111',
  E: '#e23b4a', e: '#ff8a96',
};

// ---------- Capitão ----------
const C_HEAD_FRONT = rows(`
....HHHHHHHH....
...HHHhHHHHHH...
..HHHHHHHHHHHH..
..HHHHHSSHHHHH..
..HSKKSSSSKKSH..
..SSKWSSSSKWSS..
..SSSSSSSSSSSS..
..SSSSSOOSSSSS..
..SSSSSSSSSSSS..
...SSKKKKKKSS...
....SSSSSSSS....
.....SSSSSS.....`);
const C_HEAD_34 = rows(`
....HHHHHHHH....
...HHHHHHhHHH...
..HHHHHHHHHHHH..
..HHHHHHHSSHHH..
..HHSSSKKSSKKS..
..HHSSSKWSSKWS..
..HSSSSSSSSSSS..
..SSSSSSSSSSOOS.
..SSSSSSSSSSSS..
...SSSSSKKKKS...
....SSSSSSSS....
.....SSSSSS.....`);
const C_TORSO = rows(`
...NNNWTTWNNN...
..NNnNWTTWNPNN..
.NNNnNNTTNNNNNN.
.NNNNNNTTNNNNNN.
.SNNNNNTTNNNNNS.
.SNNNNNNNNNNNNS.
..NNNNNNNNNNNN..
..NNNNNNNNNNNN..`);
const C_TORSO_THROW = rows(`
...NNNWTTWNNN.SS
..NNnNWTTWNPNNNS
.NNNnNNTTNNNNNN.
.NNNNNNTTNNNNN..
.SNNNNNTTNNNNN..
.SNNNNNNNNNNNN..
..NNNNNNNNNNNN..
..NNNNNNNNNNNN..`);
const C_TORSO_UP = rows(`
SS.NNNWTTWNNN.SS
SNNNnNWTTWNPNNNS
.NNNnNNTTNNNNNN.
..NNNNNTTNNNNN..
..NNNNNTTNNNNN..
..NNNNNNNNNNNN..
..NNNNNNNNNNNN..
..NNNNNNNNNNNN..`);
// Bíblia erguida (especial "Deus acima de todos"): braço direito segura o livro no alto.
const C_TORSO_SPECIAL = rows(`
...NNNWTTWNNN.SS
..NNnNWTTWNPNNNS
.NNNnNNTTNNNNNN.
.NNNNNNTTNNNNN..
.SNNNNNTTNNNNN..
.SNNNNNNNNNNNN..
..NNNNNNNNNNNN..
..NNNNNNNNNNNN..`);

// ---------- L-Livre ----------
const L_HEAD_FRONT = rows(`
.....HHHHHH.....
...HHHHHHhHHH...
..HHHHHHHHHHHH..
..HHSSSSSSSSHH..
..HSSSSSSSSSSH..
..SSKKSSSSKKSS..
..SSSSSSSSSSSS..
..SSSSSOOSSSSS..
..RSSRRRRRRSSR..
..RRRRSKKSRRRR..
...RRRRRrRRRR...
....RRRRRRRR....`);
const L_HEAD_34 = rows(`
.....HHHHHH.....
...HHHHHHHhHH...
..HHHHHHHHHHHH..
..HHHHSSSSSSSH..
..HHSSSSSSSSSS..
..HHSSSKKSSSKK..
..HSSSSSSSSSSS..
..HSSSSSSSSSOOS.
..RRSSSRRRRRRSR.
..RRRRRRSKKSRRR.
...RRRRRrRRRRR..
....RRRRRRRRR...`);
const L_TORSO = rows(`
...NNNWTTWNNN...
..NGYNWTTWNNNN..
.NNNGYNTTNNNNNN.
.NNNNGYTTNNNNNN.
.SNNNNGYNNNNNNS.
.SNNNNNGYNNNNNS.
..NNNNNNGYNNNN..
..NNNNNNNGGNNN..`);
const L_TORSO_THROW = rows(`
...NNNWTTWNNN.SS
..NGYNWTTWNNNNNS
.NNNGYNTTNNNNNN.
.NNNNGYTTNNNNN..
.SNNNNGYNNNNNN..
.SNNNNNGYNNNNN..
..NNNNNNGYNNNN..
..NNNNNNNGGNNN..`);
const L_TORSO_UP = rows(`
SS.NNNWTTWNNN.SS
SNGYNNWTTWNNNNNS
.NNNGYNTTNNNNNN.
..NNNGYTTNNNNN..
..NNNNGYNNNNNN..
..NNNNNGYNNNNN..
..NNNNNNGYNNNN..
..NNNNNNNGGNNN..`);

// ---------- Pernas (compartilhadas) ----------
const LEGS = {
  idle: rows(`
...NNNN..NNNN...
...NNNN..NNNN...
...DDDD..DDDD...
..BBBBB..BBBBB..`),
  walk1: rows(`
..NNNN....NNNN..
..NNNN.....NNNN.
.DDDD......DDDD.
BBBBB.......BBBB`),
  walk2: rows(`
....NNNNNNNN....
....NNNN.NNN....
....DDDD.DDD....
....BBBBBBBBB...`),
  jump: rows(`
..NNNNN..NNNNN..
..DDDD....DDDD..
.BBBB......BBBB.
................`),
};

function build(name, head, torso, legs, pal) {
  return sprite(name, stack(head, torso, legs), pal);
}

function frames(id, pal, H_FRONT, H_34, T, T_THROW, T_UP, T_SPECIAL) {
  return {
    front: build(`${id}.front`, H_FRONT, T, LEGS.idle, pal),
    idle: build(`${id}.idle`, H_34, T, LEGS.idle, pal),
    walk1: build(`${id}.walk1`, H_34, T, LEGS.walk1, pal),
    walk2: build(`${id}.walk2`, H_34, T, LEGS.walk2, pal),
    jump: build(`${id}.jump`, H_34, T_UP, LEGS.jump, pal),
    throw: build(`${id}.throw`, H_34, T_THROW, LEGS.idle, pal),
    victory: build(`${id}.victory`, H_FRONT, T_UP, LEGS.idle, pal),
    special: build(`${id}.special`, H_FRONT, T_SPECIAL, LEGS.idle, pal),
  };
}

export const CAPITAO = frames('capitao', PAL_CAPITAO, C_HEAD_FRONT, C_HEAD_34, C_TORSO, C_TORSO_THROW, C_TORSO_UP, C_TORSO_SPECIAL);
export const LLIVRE = frames('llivre', PAL_LLIVRE, L_HEAD_FRONT, L_HEAD_34, L_TORSO, L_TORSO_THROW, L_TORSO_UP, L_TORSO_UP);

// Bíblia erguida do especial do Capitão (desenhada sobre a mão, 6x7) e aura.
export const BIBLIA_ERGUIDA = sprite('biblia_erguida', rows(`
KKKKKK
KDDDDK
KDPPDK
KPPPPK
KDPPDK
KDPPDK
KKKKKK`), { K: '#1a1a1a', D: '#5a2e1a', P: '#f5d000' });

// Retratos 32x32 para a tela de seleção (ampliação da cabeça frontal, 2x, com ombros).
export function portrait(ch) {
  return ch.front;
}

// Ordem das animações (duração em quadros a 60 FPS) — referência para o motor.
export const ANIMATIONS = {
  idle: { frames: ['idle'], fps: 1 },
  walk: { frames: ['walk1', 'idle', 'walk2', 'idle'], fps: 8 },
  run: { frames: ['walk1', 'walk2'], fps: 12 },
  jump: { frames: ['jump'], fps: 1 },
  throw: { frames: ['throw'], fps: 1, hold: 0.2 },
  victory: { frames: ['victory', 'front'], fps: 3 },
  special: { frames: ['special'], fps: 1 },
};
