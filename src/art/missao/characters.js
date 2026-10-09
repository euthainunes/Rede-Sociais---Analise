// Missão Patriota: o herói Patrício e os personagens novos (01, Capitão na domiciliar, Tio Sam,
// Checador de Fatos, Fiscal, Careca do Mal e o Cachorro Infiltrado).

import { rows, sprite, stack, patch } from '../pixel.js';
import { make } from '../enemies.js';
import { CAPITAO } from '../characters.js';

export const PAL_PATRICIO = {
  K: '#1a1a1a', S: '#e8b48c', O: '#c9946a', H: '#4a2f1f', M: '#3a2416',
  V: '#1f9e3a', v: '#177a2c', Y: '#f5d000', C: '#f5d000', c: '#d9b800', A: '#1f9e3a', b: '#2a5db0',
  F: '#1f9e3a', f: '#f5d000', N: '#3b5a8a', D: '#2a4268', B: '#f2f2f2', W: '#ffffff', G: '#2a2a2a', L: '#9ad8ff',
};

// ---------- cabeça ----------
const HEAD_FRONT = rows(`
....VVVVVVVV....
...VVVVYYVVVV...
..VVVVVYYVVVVV..
.vVVVVVVVVVVVVv.
..SSSSSSSSSSSS..
..SKKKKSSKKKKS..
..SKGKKSSKGKKS..
..SSSSSOOSSSSS..
..SSMMMMMMMMSS..
..SSSSKKKKSSSS..
...SSSSSSSSSS...
....SSSSSSSS....`);
const HEAD_34 = rows(`
....VVVVVVVV....
...VVVVVVYYVV...
..VVVVVVVVYYVV..
..vVVVVVVVVVVVVV
..HSSSSSSSSSSS..
..HSSSKKKKSKKK..
..SSSSKGKKSKGK..
..SSSSSSSSSSOOS.
..SSSSSMMMMMMS..
..SSSSSSSKKKS...
...SSSSSSSSSS...
....SSSSSSSS....`);
const HEAD_PRAY = rows(`
................
....VVVVVVVV....
...VVVVYYVVVV...
..VVVVVYYVVVVV..
.vVVVVVVVVVVVVv.
..SSSSSSSSSSSS..
..SKKKKSSKKKKS..
..SSSSSOOSSSSS..
..SSMMMMMMMMSS..
..SSSSSKKSSSSS..
...SSSSSSSSSS...
....SSSSSSSS....`);

// ---------- tronco (camisa da seleção + bandeira como capa) ----------
const TORSO = rows(`
...CCCAAAACCC...
.FCCCCCAACCCCCF.
FfCCCCCCCCCCCCfF
FfCbCCCCCCCCCCfF
FSCCCCCCCCCCCCSF
FSCCCCCCCCCCCCSF
.FNNNNNNNNNNNNF.
..NNNNNNNNNNNN..`);
const TORSO_THROW = rows(`
...CCCAAAACCC.SL
.FCCCCCAACCCCCSL
FfCCCCCCCCCCCC.F
FfCbCCCCCCCCCC.F
FSCCCCCCCCCCCC.F
FSCCCCCCCCCCCC.F
.FNNNNNNNNNNNNF.
..NNNNNNNNNNNN..`);
const TORSO_UP = rows(`
SS.CCCAAAACCC.SS
SCCCCCCAACCCCCCS
FfCCCCCCCCCCCCfF
FfCbCCCCCCCCCCfF
FfCCCCCCCCCCCCfF
FfCCCCCCCCCCCCfF
.FNNNNNNNNNNNNF.
..NNNNNNNNNNNN..`);
const TORSO_PRAY = rows(`
...CCCAAAACCC...
.FCCCCCAACCCCCF.
FfCCCCCSSCCCCCfF
FfCbCCCSSCCCCCfF
FfCCCCCCCCCCCCfF
FfCCCCCCCCCCCCfF
.FNNNNNNNNNNNNF.
..NNNNNNNNNNNN..`);

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
  kneel: rows(`
..NNNNNNNNNN....
..NNNNNNNNNNNN..
..DDDDDDDDDDBBB.
................`),
};

const P = PAL_PATRICIO;
export const PATRICIO = {
  front: sprite('patricio.front', stack(HEAD_FRONT, TORSO, LEGS.idle), P),
  idle: sprite('patricio.idle', stack(HEAD_34, TORSO, LEGS.idle), P),
  walk1: sprite('patricio.walk1', stack(HEAD_34, TORSO, LEGS.walk1), P),
  walk2: sprite('patricio.walk2', stack(HEAD_34, TORSO, LEGS.walk2), P),
  jump: sprite('patricio.jump', stack(HEAD_34, TORSO_UP, LEGS.jump), P),
  throw: sprite('patricio.throw', stack(HEAD_34, TORSO_THROW, LEGS.idle), P),
  special: sprite('patricio.special', stack(HEAD_FRONT, TORSO_UP, LEGS.idle), P),
  pray: sprite('patricio.pray', stack(HEAD_PRAY, TORSO_PRAY, LEGS.kneel), P),
  // "acordou": Fé zerada (game over) — óculos caídos, olhos arregalados
  awake: sprite('patricio.awake', patch(stack(HEAD_FRONT, TORSO, LEGS.idle), [[2, 5, ['SWKWSSSSWKWS', 'SSSSSSSSSSSS']], [2, 9, ['SSSSKWWKSSSS']]]), P),
};

// Celular com a lanterna (especial "Luz pros ETs"), 4x7, desenhado sobre a mão erguida.
export const CELULAR = sprite('celular', rows(`
KKKK
KLLK
KLLK
KLLK
KKKK`), { K: '#1a1a1a', L: '#fff8b0' });

// ---------- O 01 (só aparece em telões, carros de som e lives) ----------
export const ZERO_UM = sprite('zeroUm', rows(`
....HHHHHHHH....
...HHHHHHHHHHH..
..HHHHHHHHHHHHH.
..HHSSSSSSSSHHH.
..HSSSSSSSSSSSH.
..SSKKSSSSKKSSS.
..SSWKSSSSWKSSS.
..SSSSSSOSSSSSS.
..SSSKWWWWWKSSS.
...SSSKKKKKSSS..
....SSSSSSSSS...
...NNNWTTWNNNN..
..NNNNWTTWNNNNN.
.NNNNNNTTNNYYNNN
.NNNNNNTTNNYYNNN
.NNNNNNTTNNNNNNN`), { K: '#1a1a1a', S: '#e6ae86', O: '#c48a62', H: '#2a1a10', N: '#1f2a3d', W: '#ffffff', T: '#1f9e3a', Y: '#f5d000' });

// ---------- Capitão "direto da domiciliar" (tornozeleira na canela) ----------
export const CAPITAO_DOMICILIAR = sprite('capitao.domiciliar',
  patch(CAPITAO.front.rows, [[3, 21, ['tttt']], [3, 20, ['..r.']]]),
  { ...CAPITAO.front.palette, t: '#2a2a2a', r: '#ff3030' });

// ---------- Tio Sam (16x28) ----------
export const TIO_SAM = sprite('tioSam', rows(`
.....KKKKKK.....
.....KWRWRWK....
.....KWRWRWK....
.....KWRWRWK....
...KKbbbbbbKKK..
...KbbbWbbbbbK..
...KKKKKKKKKKK..
....SSSSSSSS....
...SSKKSSKKSS...
...SSSSSOOSSS...
...SSSSSSSSSS...
...SSWWKKWWSS...
....WWWWWWWW....
.....WWWWWW.....
......WWWW......
...bbbbRWRbbbb..
..bbbbbRWRbbbbbS
.bbbbbbRWRbbbbSS
.bbbbbbbbbbbbb..
.Sbbbbbbbbbbbb..
.Sbbbbbbbbbbbb..
..bbbbbbbbbbbb..
..WRWRWRWRWRWR..
..WRWR...WRWR...
..WRWR...WRWR...
..WRWR...WRWR...
..KKKKK..KKKKK..
................`), { K: '#1a1a1a', W: '#ffffff', R: '#c8202f', b: '#1f3a8a', S: '#f0c8a0', O: '#d0a07a' });

// ---------- inimigos novos (corpo-base dos inimigos + acessórios) ----------
// Checador de Fatos: óculos, lupa, camiseta com ✓. Converter? Não: ele baixa a Fé.
export const CHECADOR = make('checador',
  { H: '#2b1a10', C: '#ffffff', A: '#2f80ed', P: '#2a2a2a', L: '#2a2a2a', B: '#2f80ed', g: '#9a9a9a', l: '#bfe6ff', c: '#1f9e3a' },
  [
    [4, 5, ['KKK', 'K.K']], [9, 5, ['KKK', 'K.K']], [7, 5, ['KK']],
    [6, 13, ['...c', 'c.c.', '.c..']],
    [12, 9, ['.KKK', 'Klll', 'KllK', '.KKg', '...g', '..Sg']],
  ]);

// Fiscal: colete, prancheta e caneta. Fiscaliza tudo, inclusive o seu pulo.
export const FISCAL = make('fiscal',
  { H: '#5a4a3a', C: '#ff8c1a', A: '#ffffff', P: '#4a4a4a', L: '#4a4a4a', B: '#2a2a2a', w: '#f2f2f2', p: '#8a5a2a', y: '#d9d9d9' },
  [
    [5, 12, ['A', 'A', 'A', 'A']], [10, 12, ['A', 'A', 'A', 'A']],
    [12, 12, ['pppp', 'pwwp', 'pwwp', 'pwwp', 'pppp']],
  ]);

// Careca do Mal: só uma silhueta que "aparece" na paranoia do Patrício (nuvens, placas, torradas).
export const CARECA_DO_MAL = sprite('carecaDoMal', rows(`
.....XXXXXX.....
...XXXXXXXXXX...
..XXXXXXXXXXXX..
.XXXXXXXXXXXXXX.
.XXEEEXXXXEEEXX.
.XXXRXXXXXXRXXX.
.XXXXXXXXXXXXXX.
XXXXXXXXXXXXXXXX
.XXXXXXXXXXXXXX.
.XXXXXXQQXXXXXX.
..XXXXXXXXXXXX..
...XXXXXXXXXX...`), { X: '#2a1a3a', E: '#4a3060', R: '#ff3030', Q: '#3a2850' });

// Cachorro do vizinho — "infiltrado" de bandana vermelha. Late e empurra.
export const CACHORRO = sprite('cachorro', rows(`
............KK..
...........KcK..
..........KccK..
.K........KccKK.
KcK.......KcccWK
.KcK....KKcccccK
..KcKKKKccccccK.
...KcccccRRRccK.
...KccccccRRcK..
...KcccccccccK..
...KcK.KcK.KcK..
...KK..KK..KK...`), { K: '#3a2410', c: '#c98a4a', W: '#1a1a1a', R: '#c8202f' });

// Militante adversário da v1 continua: o Militante de Rede, o Sindicalista e o Influencer (enemies.js).
