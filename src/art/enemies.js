// Inimigos e NPCs: arquétipos de discurso (nunca grupos sociais).
// Todos partem do mesmo corpo-base 16x24 + paleta + remendos (acessórios).
// Estado "convertido" = sorriso + corações (partícula desenhada à parte).

import { rows, sprite, patch } from './pixel.js';

const BASE = rows(`
................
.....HHHHHH.....
....HHHHHHHH....
...HHHHHHHHHH...
...HSSSSSSSSH...
...SSKSSSSKSS...
...SSSSSSSSSS...
...SSSSOOSSSS...
...SSSKKKKSSS...
....SSSSSSSS....
.....SSSSSS.....
....CCCAACCC....
...CCCCCCCCCC...
..CCCCCCCCCCCC..
..SCCCCCCCCCCS..
..SCCCCCCCCCCS..
...CCCCCCCCCC...
...PPPPPPPPPP...
...PPPP..PPPP...
...PPPP..PPPP...
...PPPP..PPPP...
...LLLL..LLLL...
...LLLL..LLLL...
..BBBBB..BBBBB..`);

const WALK_LEGS = [0, 18, [
  '...PPPP..PPPP...',
  '...PPPP..PPPP...',
  '...PPPP..PPPP...',
  '...LLLL..LLLL...',
  '...LLLL.BBBBB...',
  '..BBBBB..______.',
]];
const SMILE = [3, 8, ['SSKSSSSKSS', '.SSKKKKSS.']];
const COMMON = { K: '#1a1a1a', W: '#ffffff', S: '#e3a982', O: '#c48862' };

function make(id, pal, patches, { bodyRows = BASE } = {}) {
  const palette = { ...COMMON, ...pal };
  const base = patch(bodyRows, patches);
  return {
    id,
    idle: sprite(`${id}.idle`, base, palette),
    walk: sprite(`${id}.walk`, patch(base, [WALK_LEGS]), palette),
    converted: sprite(`${id}.converted`, patch(base, [SMILE]), palette),
  };
}

// Tio do Zap — careca, bigode, camisa amarela, bermuda, chinelo, celular na mão.
export const TIO_DO_ZAP = make('tioDoZap',
  { H: '#a8a8a8', M: '#8a8a8a', C: '#f5d000', A: '#1f9e3a', P: '#2a5db0', L: '#e3a982', B: '#3a7bd5', G: '#7cf27c', S: '#d99a70', O: '#b97c55' },
  [
    [5, 1, ['SSSSSS']], [4, 2, ['SSSSSSSS']], [3, 3, ['HSSSSSSSSH']],
    [5, 8, ['MMMMMM']],
    [13, 12, ['KK', 'KG', 'KK']],
  ]);

// Militante de Rede — cabelo volumoso, camiseta vermelha com "#", celular erguido.
export const MILITANTE = make('militante',
  { H: '#2b1a10', C: '#c8202f', A: '#8e1520', P: '#3b5a8a', L: '#3b5a8a', B: '#eeeeee', G: '#9ad8ff', S: '#c98a62', O: '#a66e4a' },
  [
    [4, 0, ['HHHHHHHH']], [3, 1, ['HHHHHHHHHH']], [2, 2, ['HHHHHHHHHHHH']], [2, 3, ['HHHHHHHHHHHH']], [2, 4, ['HH']], [12, 4, ['HH']], [2, 5, ['H']], [13, 5, ['H']],
    [6, 13, ['W.W', 'WWW', 'W.W']],
    [13, 10, ['KK', 'GK', 'KK', '.S']],
  ]);

// Sindicalista de Palanque — boné vermelho, bigode, megafone.
export const SINDICALISTA = make('sindicalista',
  { H: '#3a2a20', R: '#b01c28', r: '#7d121c', C: '#e8e2d0', A: '#b01c28', P: '#4a4a4a', L: '#4a4a4a', B: '#2a2a2a', M: '#3a2a20', g: '#b0b0b0', w: '#e8e8e8' },
  [
    [5, 1, ['RRRRRR']], [4, 2, ['RRRRRRRR']], [3, 3, ['RRRRRRRRRRrr.']],
    [5, 8, ['MMMMMM']],
    [6, 13, ['AAAA', 'A..A', 'AAAA']],
    [12, 11, ['..gw', '.ggw', 'Sggw', '..gw']],
  ]);

// Patriota do Caminhão — boné, óculos escuros, camisa amarela, bandeira nas costas.
export const PATRIOTA = make('patriota',
  { H: '#5a3a22', V: '#1f9e3a', Y: '#f5d000', C: '#f5d000', A: '#1f9e3a', P: '#2c2c2c', L: '#2c2c2c', B: '#1a1a1a', F: '#1f9e3a', f: '#f5d000', S: '#e8b48c', O: '#c9946a' },
  [
    [5, 1, ['VVVVVV']], [4, 2, ['VVVYYVVV']], [3, 3, ['VVVVVVVVVVVV.']],
    [3, 5, ['KKKKSSKKKK']],
    [1, 11, ['FF']], [0, 12, ['FFf']], [0, 13, ['Ff']], [0, 14, ['FF']], [1, 15, ['F']],
    [13, 11, ['FF']], [13, 12, ['fFF']], [14, 13, ['fF']], [14, 14, ['FF']], [14, 15, ['F']],
    [2, 16, ['.CCCCCCCCCC.']],
  ]);

// Coach do Empreendedorismo — cabelo com gel, headset, blazer bege, sorrisão.
export const COACH = make('coach',
  { H: '#3b2414', h: '#6e4a2c', C: '#d9c7a3', A: '#ffffff', P: '#d9c7a3', L: '#d9c7a3', B: '#5a3a1e', m: '#333333' },
  [
    [6, 1, ['hh']],
    [3, 8, ['SSKWWWWKSS']],
    [3, 5, ['m']], [3, 6, ['m']], [3, 7, ['mmmm']],
    [7, 11, ['WW']], [7, 12, ['AA']], [7, 13, ['KK']],
  ]);

// Influencer Lacrador — cabelo rosa comprido, pau de selfie.
export const INFLUENCER = make('influencer',
  { H: '#ff5fa2', h: '#d63c80', C: '#7a3cff', A: '#5426c4', P: '#222222', L: '#222222', B: '#f2f2f2', G: '#9ad8ff', g: '#888888' },
  [
    [3, 4, ['H']], [12, 4, ['H']], [2, 5, ['HH']], [12, 5, ['HH']], [2, 6, ['Hh']], [12, 6, ['hH']], [2, 7, ['Hh']], [12, 7, ['hH']],
    [2, 8, ['H']], [13, 8, ['H']], [3, 9, ['H']], [12, 9, ['H']],
    [14, 2, ['KK', 'GK', 'KK']], [14, 5, ['g']], [14, 6, ['g']], [14, 7, ['g']], [14, 8, ['g']], [14, 9, ['g']], [14, 10, ['g']], [13, 11, ['S']],
  ]);

// Atendente da Repartição — óculos, sono, crachá, caneca de café.
export const ATENDENTE = make('atendente',
  { H: '#6b5a4a', C: '#f0f0f0', A: '#3a5ba0', P: '#5a5a5a', L: '#5a5a5a', B: '#2a2a2a', g: '#888888', c: '#7a4a2a', u: '#e0e0e0', b: '#3a7bd5' },
  [
    [5, 1, ['SHSHHS']],
    [4, 5, ['KKK', 'K.K']], [9, 5, ['KKK', 'K.K']], [7, 5, ['KK']],
    [5, 5, ['K']], [10, 5, ['K']],
    [7, 11, ['AA']], [7, 12, ['AA']], [7, 13, ['AA']], [7, 14, ['A']],
    [4, 13, ['bb', 'uu']],
    [13, 13, ['uuu', 'ucu', 'uu.']],
  ]);

// Repórter de Plantão — microfone, blazer azul.
export const REPORTER = make('reporter',
  { H: '#20140c', C: '#2b6cb0', A: '#ffffff', P: '#333333', L: '#333333', B: '#111111', g: '#9a9a9a', m: '#555555', r: '#e23b4a' },
  [
    [12, 10, ['.ggg', '.gmg', '.ggg', '..r.', 'S.r.']],
  ]);

// Centrão — 24x24, terno cinza, gravata dourada, pasta "EMENDAS". Neutro: aceita qualquer item.
const CENTRAO_ROWS = rows(`
........HHHHHHHH........
.......HHHHHHHHHH.......
......HHHHHHHHHHHH......
......HSSSSSSSSSSH......
......SSKKSSSSKKSS......
......SSWKSSSSWKSS......
......SSSSSOOSSSSS......
.....OSSSSSSSSSSSSO.....
......SSKWWWWWWKSS......
.......SSKKKKKKSS.......
........SSSSSSSS........
.....NNNNNWYYWNNNNN.....
...NNNNNNNWYYWNNNNNNN...
..NNNNNNNNNYYNNNNNNNNN..
..NNNNNNNNNYYNNNNNNNNN..
.SNNNNNNNNNYYNNNNNNNNNS.
.SNNNNNNNNNNNNNNNNNNNNSS
..NNNNNNNNNNNNNNNNNNNbbb
...NNNNNNNNNNNNNNNNNNbyb
....NNNNNNNNNNNNNNNN.bbb
.....NNNNNN..NNNNNN.....
.....NNNNNN..NNNNNN.....
.....DDDDDD..DDDDDD.....
....BBBBBBB..BBBBBBB....`);
export const CENTRAO = {
  id: 'centrao',
  idle: sprite('centrao.idle', CENTRAO_ROWS, { ...COMMON, H: '#3a3a3a', N: '#8a8f99', D: '#6a6f78', Y: '#e0b100', B: '#1a1a1a', b: '#5a3a1e', y: '#e0b100' }),
};
// Centrão aliado (após receber 3 itens): sorri e veste verde-e-amarelo... ou vermelho. Depende de quem pagou.
export const CENTRAO_ALIADO = {
  capitao: sprite('centrao.aliado.capitao', patch(CENTRAO_ROWS, [[9, 9, ['K....K']]]), { ...CENTRAO.idle.palette, N: '#1f9e3a', D: '#177a2c', Y: '#f5d000' }),
  llivre: sprite('centrao.aliado.llivre', patch(CENTRAO_ROWS, [[9, 9, ['K....K']]]), { ...CENTRAO.idle.palette, N: '#c8202f', D: '#9a1824', Y: '#ffffff' }),
};

// Chefe final = o rival (usa os sprites de characters.js com 1,5x de escala e aura).

export const ENEMIES = [TIO_DO_ZAP, MILITANTE, SINDICALISTA, PATRIOTA, COACH, INFLUENCER, ATENDENTE, REPORTER];

// Afinidades (§3.10 da especificação): item que converte com 1 acerto.
export const AFFINITY = {
  tioDoZap: 'picanha', patriota: 'picanha', coach: 'picanha',
  militante: 'carteira', sindicalista: 'carteira', influencer: 'carteira',
  atendente: 'any', reporter: 'any', centrao: 'bribable',
};
