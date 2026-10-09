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

// Marmita de alumínio (coletável da fase 1).
export const MARMITA = sprite('marmita', rows(`
.KKKKKKK.
KwwwwwwwK
KgggggggK
KwwwwwwwK
KwwwwwwwK
.KKKKKKK.`), { K: '#5a5a62', w: '#d8dce4', g: '#9aa0aa' });

// Carregador: recarrega correntes de Zap.
export const CARREGADOR = sprite('carregador', rows(`
.KKKKKK.
KGGGGGGK
KGGYGGGK
KGYYGGGK
KGGYYGGK
KGGGYGGK
KGGGGGGK
.KKKKKK.
...KK...
...KK...`), { K: '#1a1a1a', G: '#25d366', Y: '#ffffff' });

/** Urna gigante (bloco 16x16 que se abre com uma cabeçada por baixo). open: já auditada. */
export function drawUrnaBloco(ctx, x, y, open = false, t = 0) {
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  // brilho amarelo pulsante nas urnas ainda não auditadas (destaque do fundo)
  if (!open && Math.floor(t * 2) % 2 === 0) { r(-1, -1, 18, 18, '#f5d000'); }
  r(0, 0, 16, 16, '#1a1a1a');
  r(1, 1, 14, 14, open ? '#9a9aa0' : '#d8d8d8');
  r(1, 1, 14, 1, open ? '#b8b8c0' : '#ffffff');
  r(3, 3, 10, 5, open ? '#3a3a3a' : '#3a4a3a');
  if (open) {
    // tela mostra "0" (nada encontrado)
    r(7, 4, 2, 3, '#7cf27c'); r(6, 4, 1, 3, '#7cf27c'); r(9, 4, 1, 3, '#7cf27c');
    r(7, 5, 2, 1, '#3a3a3a');
  } else {
    // "?" piscando, estilo bloco de mistério
    const on = Math.floor(t * 3) % 2 === 0;
    const c = on ? '#7cf27c' : '#4aa04a';
    r(6, 3, 4, 1, c); r(9, 4, 1, 1, c); r(8, 5, 1, 1, c); r(8, 7, 1, 1, c);
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) r(3 + i * 3, 10 + j * 2, 2, 1, open ? '#7a7a80' : '#ffffff');
  r(12, 12, 2, 1, open ? '#5a7a5a' : '#1f9e3a');
}

// Notinha (dinheiro vivo) e caixa de depósito (fase 3).
export const NOTINHA = sprite('notinha', rows(`
KKKKKKKKKK
KGGGGGGGGK
KGgGGWGGgK
KGGGWWWGGK
KGgGGWGGgK
KGGGGGGGGK
KKKKKKKKKK`), { K: '#2a5a2a', G: '#7ab85a', g: '#4a8a3a', W: '#d8f0c8' });

/** Caixa de depósito "boca do caixa" (16x28). glow: 0..1 quando o Patrício pode depositar. */
export function drawCaixaDeposito(ctx, x, y, glow = 0) {
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  if (glow) r(-2, -2, 20, 32, `rgba(124,242,124,${0.35 * glow})`);
  r(0, 0, 16, 28, '#1a1a1a');
  r(1, 1, 14, 26, '#5a6a7a');
  r(2, 2, 12, 3, '#c8202f');
  r(3, 7, 10, 6, '#9ad8ff');
  r(4, 9, 4, 1, '#1a3a5a');
  r(3, 15, 10, 2, '#1a1a1a'); // fenda do depósito
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) r(4 + i * 3, 19 + j * 3, 2, 2, '#d8d8d8');
}
