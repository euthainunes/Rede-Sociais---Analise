// Folha de referência de todos os sprites e tiles (para revisão de arte).

import { draw, rect } from './pixel.js';
import { text } from './font.js';
import { CAPITAO, LLIVRE } from './characters.js';
import * as E from './enemies.js';
import * as I from './items.js';
import * as TL from './tiles.js';

export const SHEET_W = 384;
export const SHEET_H = 400;

const NAMES = {
  tioDoZap: 'TIO DO ZAP', militante: 'MILITANTE', sindicalista: 'SINDICAL.', patriota: 'PATRIOTA',
  coach: 'COACH', influencer: 'INFLUENCER', atendente: 'ATENDENTE', reporter: 'REPÓRTER',
};

export function drawSheet(ctx) {
  rect(ctx, 0, 0, SHEET_W, SHEET_H, '#f4f1e8');
  const h = (s, y) => { text(ctx, s, 6, y, { color: '#1f9e3a', scale: 1 }); rect(ctx, 6, y + 7, SHEET_W - 12, 1, '#c8c0b0'); };

  h('PERSONAGENS JOGÁVEIS', 4);
  const frames = ['front', 'idle', 'walk1', 'walk2', 'jump', 'throw', 'victory'];
  [[CAPITAO, 'CAPITÃO', 16], [LLIVRE, 'L-LIVRE', 52]].forEach(([ch, name, y]) => {
    text(ctx, name, 6, y + 10, { color: '#1a1a1a' });
    frames.forEach((f, i) => {
      draw(ctx, ch[f], 48 + i * 24, y);
      text(ctx, f.toUpperCase(), 56 + i * 24, y + 27 + (i % 2) * 7, { color: '#8a8270', align: 'center' });
    });
    draw(ctx, ch.idle, 230, y, { flip: true });
    text(ctx, 'ESPELHO', 238, y + 27, { color: '#8a8270', align: 'center' });
  });

  h('INIMIGOS (PARADO / ANDANDO / CONVERTIDO)', 92);
  E.ENEMIES.forEach((en, i) => {
    const x = 6 + (i % 4) * 94;
    const y = 104 + Math.floor(i / 4) * 40;
    draw(ctx, en.idle, x, y);
    draw(ctx, en.walk, x + 20, y);
    draw(ctx, en.converted, x + 40, y);
    draw(ctx, I.MINI_HEART, x + 46, y - 2);
    text(ctx, NAMES[en.id], x + 30, y + 28, { color: '#1a1a1a', align: 'center' });
  });
  draw(ctx, E.CENTRAO.idle, 6, 190);
  draw(ctx, E.CENTRAO_ALIADO.capitao, 34, 190);
  draw(ctx, E.CENTRAO_ALIADO.llivre, 62, 190);
  text(ctx, 'CENTRÃO: NEUTRO / ALIADO DO CAPITÃO / ALIADO DO L-LIVRE', 92, 200, { color: '#1a1a1a' });

  h('ITENS, PROJÉTEIS E HUD', 222);
  const items = [
    [I.CARTEIRA, 'CARTEIRA'], [I.PICANHA, 'PICANHA'], [I.CORACAO, 'CORAÇÃO'], [I.VOTO[0], 'VOTO'], [I.PASTEL, 'PASTEL'],
    [I.SANTINHO, 'SANTINHO'], [I.CAIXA_MUNICAO, 'MUNIÇÃO'], [I.HASHTAG, 'HASHTAG'], [I.CANDIDATURA_EXTRA, '+1 VIDA'],
    [I.TEXTAO, 'TEXTÃO'], [I.CURSO_GRATIS, 'CURSO'], [I.HEART_FULL, 'APROV.'],
  ];
  items.forEach(([s, n], i) => {
    const x = 10 + i * 31;
    draw(ctx, s, x + 8 - s.w / 2 + 4, 236, { scale: 2 });
    text(ctx, n, x + 12, 254 + (i % 2) * 7, { color: '#1a1a1a', align: 'center' });
  });

  h('TILES E OBJETOS POR TEMA', 268);
  const themes = ['bairro', 'avenida', 'reparticao', 'grupo', 'plenario', 'planalto'];
  themes.forEach((t, i) => {
    const x = 6 + i * 63;
    TL.drawGround(ctx, t, x, 296, 48, 32, i);
    TL.drawBlock(ctx, t, x, 280, 16, 16);
    TL.drawOneWay(ctx, t, x + 20, 282, 28);
    text(ctx, t.toUpperCase(), x + 24, 332, { color: '#1a1a1a', align: 'center' });
  });
  draw(ctx, TL.CAIXOTE, 6, 352);
  draw(ctx, TL.CONE, 26, 356);
  draw(ctx, TL.URNA.off, 46, 352);
  draw(ctx, TL.URNA.on, 64, 352);
  TL.drawFakeBlock(ctx, 84, 352, 1);
  TL.drawFakeBlock(ctx, 102, 352, 0);
  TL.drawPromessa(ctx, 122, 356, 32);
  TL.drawCavalete(ctx, 162, 368);
  TL.drawCarimbo(ctx, 194, 368, 0, 0);
  TL.drawChatBubble(ctx, 222, 354, 50, 10, 'out', 'FONTE?');
  TL.drawChegada(ctx, 290, 386, 'CHEGADA');
  text(ctx, 'CAIXOTE  CONE  URNA (CHECKPOINT)  FAKE  PROMESSA  OBRA  CARIMBO  BALÃO', 6, 390, { color: '#8a8270' });
}
