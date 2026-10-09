// Itens, projéteis, coletáveis e efeitos (8x8 salvo indicação).

import { rows, sprite } from './pixel.js';

const K = '#1a1a1a';

// --- Projéteis do jogador ---
export const CARTEIRA = sprite('carteira', rows(`
KKKKKKKK
KGGGGGGK
KGYYYYGK
KGGGGGGK
KGGWWGGK
KGGGGGGK
KKKKKKKK`), { K, G: '#1f9e3a', Y: '#f5d000', W: '#ffffff' });

export const PICANHA = sprite('picanha', rows(`
...WWW..
..WRRRW.
.WRRrRRK
WRRrRRRK
WRRRRrRK
.KRRRRK.
..KKKK..`), { K: '#6a1a1a', W: '#fff4e0', R: '#c8323c', r: '#9a2028' });

export const CORACAO = sprite('coracao', rows(`
.RR.RR.
RrRRRRR
RRRRRRR
RRRRRRR
.RRRRR.
..RRR..
...R...`), { R: '#e23b4a', r: '#ff9aa4' });

// --- Coletáveis ---
export const VOTO = [
  sprite('voto.0', rows(`
..KKKK..
.KYYYYK.
KYYWYYyK
KYYYYWyK
KYWYWYyK
KYYWYYyK
.KyyyyK.
..KKKK..`), { K: '#7a5a00', Y: '#f5d000', y: '#c9a400', W: '#ffffff' }),
  sprite('voto.1', rows(`
...KK...
..KYyK..
..KYyK..
..KWyK..
..KYyK..
..KYyK..
..KYyK..
...KK...`), { K: '#7a5a00', Y: '#f5d000', y: '#c9a400', W: '#ffffff' }),
];

export const PASTEL = sprite('pastel', rows(`
........
..KKKK..
.KYYYYK.
KYYyYYYK
KYYYYyYK
KyYyYyYK
.KKKKKK.
........`), { K: '#8a5a10', Y: '#f2c14e', y: '#d99a20' });

export const SANTINHO = sprite('santinho', rows(`
KKKKKK
KYYYYK
KYSSYK
KYSSYK
KYYYYK
KYWWYK
KYYYYK
KKKKKK`), { K: '#7a5a00', Y: '#ffd84a', S: '#c4855a', W: '#ffffff' });

export const CAIXA_MUNICAO = sprite('caixaMunicao', rows(`
KKKKKKKK
KbbbbbbK
KbWWWWbK
KbWbbWbK
KbWbbWbK
KbWWWWbK
KbbbbbbK
KKKKKKKK`), { K: '#3a2410', b: '#a0703c', W: '#f5d000' });

export const HASHTAG = sprite('hashtag', rows(`
.KKKKKK.
KBWBBWBK
KWWWWWWK
KBWBBWBK
KWWWWWWK
KBWBBWBK
.KKKKKK.
........`), { K: '#0f3d7a', B: '#2f80ed', W: '#ffffff' });

export const CANDIDATURA_EXTRA = sprite('candidaturaExtra', rows(`
.KKKKKK.
KggggggK
KgKKKKgK
KgKGGKgK
KggggggK
KgYgRgK.
KggggggK
.KKKKKK.`), { K: '#1a1a1a', g: '#d8d8d8', G: '#7cf27c', Y: '#f5d000', R: '#e23b4a' });

// --- Projéteis inimigos ---
export const TEXTAO = sprite('textao', rows(`
KKKKKKKKKK
KWWWWWWWWK
KWkkkkkkWK
KWkkkkWWWK
KWkkkkkkWK
KWkkkWWWWK
KWWWWWWWWK
KKKKKKKKKK`), { K: '#555555', W: '#ffffff', k: '#9a9a9a' });

export const CURSO_GRATIS = sprite('cursoGratis', rows(`
KKKKKKKK
KYYYYYYK
KY$$YYYK
KYYYYYYK
KYkkkkYK
KYYYYYYK
KKKKKKKK`), { K: '#7a5a00', Y: '#ffe36b', $: '#1f9e3a', k: '#7a5a00' });

export const MEGAFONE_ONDA = sprite('megafoneOnda', rows(`
.W..
W.W.
.W.W
.W.W
W.W.
.W..`), { W: '#ffffff' });

// --- HUD e efeitos ---
export const HEART_FULL = sprite('hud.heart', rows(`
.KK.KK.
KRRKRRK
KRrRRRK
KRRRRRK
.KRRRK.
..KRK..
...K...`), { K: '#1a1a1a', R: '#e23b4a', r: '#ff9aa4' });

export const HEART_EMPTY = sprite('hud.heartEmpty', rows(`
.KK.KK.
KggKggK
KgggggK
KgggggK
.KgggK.
..KgK..
...K...`), { K: '#1a1a1a', g: '#4a4a55' });

export const URNA_ICON = sprite('hud.urna', rows(`
.KKKKKK.
KggggggK
KgKKKKgK
KgKGGKgK
KggggggK
KgkgkgK.
KggggggK
.KKKKKK.`), { K: '#1a1a1a', g: '#d8d8d8', k: '#6a6a6a', G: '#7cf27c' });

export const SPARK = sprite('fx.spark', rows(`
..W..
..Y..
WYWYW
..Y..
..W..`), { W: '#ffffff', Y: '#f5d000' });

export const MINI_HEART = sprite('fx.miniHeart', rows(`
R.R
RRR
.R.`), { R: '#ff5f7a' });

export const POEIRA = sprite('fx.poeira', rows(`
.ww.
wwww
.ww.`), { w: '#e8e0d0' });

export const PLAYER_PROJECTILES = { carteira: CARTEIRA, picanha: PICANHA, coracao: CORACAO };
