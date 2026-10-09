// Folha de referência da Missão Patriota.

import { draw, rect } from '../pixel.js';
import { text } from '../font.js';
import { PATRICIO, ZERO_UM, CAPITAO_DOMICILIAR, TIO_SAM, CHECADOR, FISCAL, CARECA_DO_MAL, CACHORRO } from './characters.js';
import * as M from './items.js';
import * as TL from '../tiles.js';

export const SHEET_W = 384;
export const SHEET_H = 300;

export function drawSheetMissao(ctx) {
  rect(ctx, 0, 0, SHEET_W, SHEET_H, '#f4f1e8');
  const h = (s, y) => { text(ctx, s, 6, y, { color: '#1f9e3a' }); rect(ctx, 6, y + 7, SHEET_W - 12, 1, '#c8c0b0'); };
  h('PATRÍCIO, O PATRIOTA (JOGÁVEL)', 4);
  const poses = ['front', 'idle', 'walk1', 'walk2', 'jump', 'throw', 'special', 'pray', 'awake'];
  poses.forEach((p, i) => {
    draw(ctx, PATRICIO[p], 8 + i * 40, 18, { scale: 1 });
    text(ctx, p.toUpperCase(), 16 + i * 40, 46, { color: '#8a8270', align: 'center' });
  });

  h('ELENCO NOVO', 60);
  const cast = [[ZERO_UM, 'O 01'], [CAPITAO_DOMICILIAR, 'CAPITÃO (DOMICILIAR)'], [TIO_SAM, 'TIO SAM'], [CHECADOR.idle, 'CHECADOR'], [FISCAL.idle, 'FISCAL'], [CARECA_DO_MAL, 'CARECA DO MAL'], [CACHORRO, 'CACHORRO INFILTRADO']];
  cast.forEach(([s, n], i) => {
    const x = 8 + i * 54;
    draw(ctx, s, x + 8, 104 - s.h);
    text(ctx, n, x + 16, 108 + (i % 2) * 8, { color: '#1a1a1a', align: 'center' });
  });

  h('ITENS E OBJETOS', 128);
  const items = [[M.CORRENTE_ZAP, 'ZAP'], [M.AUDIO, 'ÁUDIO'], [M.PENDRIVE, 'PROVA'], [M.PNEU.off, 'PNEU'], [M.PNEU.on, 'PNEU ATIVO'], [M.FERRO_DE_SOLDA, 'FERRO'], [M.TORNOZELEIRA, 'TORNOZ.'], [M.LARANJA, 'LARANJA'], [M.BOMBOM, 'BOMBOM'], [M.CAFE, 'CAFÉ'], [M.DISCO, 'DISCO'], [M.HUD_FE, 'FÉ']];
  items.forEach(([s, n], i) => {
    const x = 8 + i * 31;
    draw(ctx, s, x + 12 - s.w / 2, 158 - s.h);
    text(ctx, n, x + 12, 164 + (i % 2) * 8, { color: '#1a1a1a', align: 'center' });
  });

  h('TILES DOS TEMAS NOVOS', 186);
  ['quartel', 'rodovia', 'chocolate', 'porto', 'casa'].forEach((t, i) => {
    const x = 8 + i * 75;
    TL.drawBlock(ctx, t, x, 200, 16, 16);
    TL.drawOneWay(ctx, t, x + 20, 204, 40);
    TL.drawGround(ctx, t, x, 222, 60, 40, i);
    text(ctx, t.toUpperCase(), x + 30, 268, { color: '#1a1a1a', align: 'center' });
  });
}
