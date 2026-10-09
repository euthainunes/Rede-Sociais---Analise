// Itens da Missão Patriota.

import { rows, sprite } from '../pixel.js';

// Corrente de Zap (projétil que se multiplica e volta): balão verde com seta de encaminhar.
export const CORRENTE_ZAP = sprite('correnteZap', rows(`
.GGGGGGG.
GGGGGWGGG
GGWWWWWGG
GGWGGGWGG
GGGGGGGGG
.GGGGGGG.
.GG......
G........`), { G: '#25d366', W: '#ffffff' });

// Áudio de 7 minutos (projétil lento que faz dormir).
export const AUDIO = sprite('audio', rows(`
.GGGGGGGGG.
GGGGWGGGGGG
GWGGWGWGWGG
GWGWWWWWWGG
GWGGWGWGWGG
GGGGWGGGGGG
.GGGGGGGGG.
.........GG`), { G: '#25d366', W: '#ffffff' });

export const ZZZ = sprite('zzz', rows(`
WWW....
..W....
.W.WWW.
WWW..W.
....W..
....WWW`), { W: '#ffffff' });

// Prova da Fraude (pendrive). Ao abrir no fim da fase: vazio.
export const PENDRIVE = sprite('pendrive', rows(`
..KKKK..
..KWWK..
..KKKK..
.KBBBBK.
.KBYYBK.
.KBBBBK.
.KBBBBK.
..KKKK..`), { K: '#1a1a1a', W: '#c8c8c8', B: '#2f80ed', Y: '#f5d000' });

// Pneu sagrado (checkpoint), 16x14. Velinhas acesas quando ativado.
const PNEU_ROWS = rows(`
......f...f.....
......y...y.....
......w...w.....
....KKKKKKKK....
..KKkkkkkkkkKK..
.KkkKkkkkkkKkkK.
.KkKgggggggKkkK.
KkkKgKKKKgKkkkK.
KkkKgKKKKgKkkkK.
.KkKgggggggKkkK.
.KkkKkkkkkkKkkK.
..KKkkkkkkkkKK..
....KKKKKKKK....
................`);
export const PNEU = {
  off: sprite('pneu.off', PNEU_ROWS, { K: '#111111', k: '#2e2e2e', g: '#8a8a8a', w: '#f2f2f2', y: '#f2f2f2', f: '#f2f2f2' }),
  on: sprite('pneu.on', PNEU_ROWS, { K: '#111111', k: '#2e2e2e', g: '#c8c8c8', w: '#f2f2f2', y: '#ffb020', f: '#fff27a' }),
};

export const FERRO_DE_SOLDA = sprite('ferroDeSolda', rows(`
............
KKKKKKKggg..
KRRRRRKgggGG
KKKKKKKggg..`), { K: '#1a1a1a', R: '#c8202f', g: '#9a9a9a', G: '#ff7a1a' });

export const TORNOZELEIRA = sprite('tornozeleira', rows(`
.KKKKKK.
KkkkkkkK
KkRkkkkK
KkkkkkkK
.KKKKKK.`), { K: '#1a1a1a', k: '#3a3a3a', R: '#ff3030' });

export const LARANJA = sprite('laranja', rows(`
...gg...
..KKgK..
.KOOOOK.
KOOoOOOK
KOOOOOOK
KOOOOOoK
.KOOOOK.
..KKKK..`), { K: '#7a3a00', O: '#ff8c1a', o: '#ffc070', g: '#1f9e3a' });

export const BOMBOM = sprite('bombom', rows(`
y......y
yyKKKKyy
.KccCcK.
KccCcccK
KcccccCK
.KcCccK.
yyKKKKyy
y......y`), { K: '#2a1408', c: '#6b3a1a', C: '#9a5a2a', y: '#f5d000' });

// Disco voador do especial (24x10): aparece, pisca e vai embora.
export const DISCO = sprite('disco', rows(`
.........LLLLLL.........
.......LLLWWLLLLL.......
......LLLLLLLLLLLL......
...gggggggggggggggggg...
.gggYggggYggggYggggYggg.
gggggggggggggggggggggggg
.gggggggggggggggggggggg.
....gggggggggggggggg....
......y...y...y...y.....
.....y...y...y...y......`), { L: '#9ad8ff', W: '#ffffff', g: '#9aa0aa', Y: '#f5d000', y: '#fff27a' });

export const CAFE = sprite('cafe', rows(`
KKKKKKKKKKKKKKKK
KbbbbbbbbbbbbbbK
KbBBBBBBBBBBBBbK
KbBwwwwwwwwwwBbK
KbBwkkwkkwkkwBbK
KbBwwwwwwwwwwBbK
KbBBBBBBBBBBBBbK
KbbbbbbbbbbbbbbK
KbRRRRRRRRRRRRbK
KbRWWRWRWWRWWRbK
KbRRRRRRRRRRRRbK
KbbbbbbbbbbbbbbK
KbBBBBBBBBBBBBbK
KbBbbbbbbbbbbBbK
KbbbbbbbbbbbbbbK
KKKKKKKKKKKKKKKK`), { K: '#3a2410', b: '#b07a42', B: '#8a5a2c', w: '#e8d8a8', k: '#5a3a1a', R: '#c8202f', W: '#ffffff' });

// Ícone da Barra de Fé: bandeirinha (a fé aqui é na narrativa, não religiosa).
export const HUD_FE = sprite('hud.fe', rows(`
GGGGGGGG
GGGYYGGG
GGYbbYGG
GGGYYGGG
GGGGGGGG`), { G: '#1f9e3a', Y: '#f5d000', b: '#2a5db0' });
