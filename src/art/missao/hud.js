// HUD da Missão Patriota: Barra de Fé, vidas, pontos, contador das 72h, Zap e provas.

import { draw, rect, roundRect } from '../pixel.js';
import { text } from '../font.js';
import { VOTO } from '../items.js';
import { UI } from '../hud.js';
import { HUD_FE, CORRENTE_ZAP, PENDRIVE } from './items.js';

/** state: { fe (0..1), lives, score, combo, votes, zap, provas, provasMax, hours72 (segundos restantes), progress } */
export function drawHUDMissao(ctx, W, s) {
  rect(ctx, 0, 0, W, 2, 'rgba(0,0,0,0.4)');
  rect(ctx, 0, 0, Math.round(W * s.progress), 2, UI.gold);

  // Fé + vidas
  roundRect(ctx, 3, 4, 82, 23, UI.panel);
  draw(ctx, HUD_FE, 6, 7);
  text(ctx, 'FÉ', 17, 8, { color: '#a8b0c0' });
  rect(ctx, 28, 8, 54, 5, '#1a1a1a');
  const low = s.fe < 0.3;
  rect(ctx, 29, 9, Math.round(52 * s.fe), 3, low ? UI.red : UI.gold);
  text(ctx, low ? 'ACORDANDO...' : 'INABALÁVEL', 6, 17, { color: low ? UI.red : '#7cf27c' });
  text(ctx, `×${s.lives}`, 70, 17, { color: UI.white });

  // pontos + contador das 72h
  text(ctx, String(s.score).padStart(7, '0'), W / 2, 6, { color: UI.white, scale: 2, align: 'center', shadow: UI.ink, outline: true });
  const t = Math.max(0, s.hours72);
  const hh = String(Math.floor(t / 3600)).padStart(2, '0');
  const mm = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  roundRect(ctx, W / 2 - 52, 20, 104, 10, '#1a0a0a');
  text(ctx, `FALTAM ${hh}:${mm}:${ss}`, W / 2, 22, { color: '#ff4040', align: 'center' });

  // munição de Zap, votos e provas
  const rx = W - 80;
  roundRect(ctx, rx, 4, 77, 23, UI.panel);
  draw(ctx, CORRENTE_ZAP, rx + 3, 6);
  text(ctx, `×${s.zap}`, rx + 14, 8, { color: UI.white });
  draw(ctx, VOTO[0], rx + 38, 6);
  text(ctx, `${s.votes}`, rx + 48, 8, { color: UI.white });
  draw(ctx, PENDRIVE, rx + 3, 17);
  text(ctx, `PROVAS ${s.provas}/${s.provasMax}`, rx + 14, 19, { color: UI.gold });
}
