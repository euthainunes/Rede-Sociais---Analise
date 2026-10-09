// HUD, balões de fala, textos flutuantes e faixa de "plantão".

import { draw, rect, roundRect } from './pixel.js';
import { text, measure } from './font.js';
import { HEART_FULL, HEART_EMPTY, URNA_ICON, VOTO, PLAYER_PROJECTILES } from './items.js';

export const UI = {
  ink: '#1a1a1a', white: '#ffffff', gold: '#f5d000', green: '#1f9e3a', red: '#e23b4a', panel: 'rgba(16,18,28,0.86)',
};

/**
 * state: { hp, hpMax, lives, score, combo, votes, itemId, ammo, engagement (0..1), progress (0..1), record }
 */
export function drawHUD(ctx, W, state) {
  // barra de progresso da fase (topo)
  rect(ctx, 0, 0, W, 2, 'rgba(0,0,0,0.4)');
  rect(ctx, 0, 0, Math.round(W * state.progress), 2, UI.gold);

  // esquerda: Aprovação (corações) + Candidaturas (vidas)
  roundRect(ctx, 3, 4, 8 * state.hpMax + 30, 23, UI.panel);
  text(ctx, 'APROVAÇÃO', 6, 8, { color: '#a8b0c0' });
  for (let i = 0; i < state.hpMax; i++) draw(ctx, i < state.hp ? HEART_FULL : HEART_EMPTY, 6 + i * 8, 17);
  draw(ctx, URNA_ICON, 8 * state.hpMax + 9, 17);
  text(ctx, `×${state.lives}`, 8 * state.hpMax + 19, 19, { color: UI.white });

  // centro: pontuação e combo
  const score = String(state.score).padStart(7, '0');
  text(ctx, score, W / 2, 6, { color: UI.white, scale: 2, align: 'center', shadow: UI.ink, outline: true });
  if (state.combo >= 3) {
    const mul = state.combo >= 10 ? 4 : state.combo >= 6 ? 3 : 2;
    text(ctx, `COMBO ${state.combo}  ×${mul}`, W / 2, 20, { color: UI.gold, align: 'center', shadow: UI.ink, outline: true });
  }

  // direita: votos, item e engajamento
  const rx = W - 76;
  roundRect(ctx, rx, 4, 73, 23, UI.panel);
  draw(ctx, VOTO[0], rx + 3, 6);
  text(ctx, `${state.votes}`, rx + 13, 8, { color: UI.white });
  const proj = PLAYER_PROJECTILES[state.itemId];
  draw(ctx, proj, rx + 38, 6);
  text(ctx, `×${state.ammo}`, rx + 48, 8, { color: state.ammo <= 2 ? UI.red : UI.white });
  text(ctx, 'ENGAJ.', rx + 3, 18, { color: '#a8b0c0' });
  rect(ctx, rx + 28, 18, 41, 5, '#1a1a1a');
  const full = state.engagement >= 1;
  rect(ctx, rx + 29, 19, Math.round(39 * Math.min(1, state.engagement)), 3, full ? UI.gold : '#2f80ed');
  if (full) text(ctx, 'ESPECIAL!', rx + 48, 29, { color: UI.gold, align: 'center', shadow: UI.ink, outline: true });
}

/** Balão de fala apontando para (x, y) — a boca/cabeça do personagem. */
export function drawBalloon(ctx, x, y, str, opts = {}) {
  const { color = UI.white, ink = UI.ink, maxWidth = 120 } = opts;
  const lines = wrapText(str, maxWidth);
  const w = Math.max(...lines.map((l) => measure(l))) + 8;
  const h = lines.length * 9 + 4;
  const bx = Math.round(Math.min(Math.max(2, x - w / 2), 384 - w - 2));
  const by = y - h - 6;
  roundRect(ctx, bx, by, w, h, color, ink);
  // rabinho
  rect(ctx, x - 1, by + h - 1, 3, 2, color);
  rect(ctx, x - 2, by + h - 1, 1, 3, ink);
  rect(ctx, x + 2, by + h - 1, 1, 2, ink);
  rect(ctx, x - 1, by + h + 1, 2, 1, color);
  rect(ctx, x - 1, by + h + 2, 2, 1, ink);
  lines.forEach((l, i) => text(ctx, l, bx + 4, by + 5 + i * 9, { color: ink }));
}

export function wrapText(str, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (measure(t) > maxWidth && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Texto flutuante (+100 CONVERTIDO!). */
export function drawFloat(ctx, x, y, str, color = UI.gold) {
  text(ctx, str, x, y, { color, align: 'center', shadow: UI.ink, outline: true });
}

/** Faixa de plantão no topo, abaixo do HUD. */
export function drawPlantao(ctx, W, label, str, y = 34) {
  rect(ctx, 0, y, W, 13, '#c8202f');
  rect(ctx, 0, y, W, 1, '#ff5a6a');
  rect(ctx, 0, y + 12, W, 1, '#7a1018');
  rect(ctx, 0, y, measure(label) + 10, 13, '#f5d000');
  text(ctx, label, 5, y + 4, { color: UI.ink });
  text(ctx, str, measure(label) + 16, y + 4, { color: UI.white });
}

/** Controles de toque (aparência para celular). */
export function drawTouchControls(ctx, W, H) {
  ctx.globalAlpha = 0.45;
  roundRect(ctx, 8, H - 34, 26, 26, '#ffffff', '#1a1a1a');
  roundRect(ctx, 40, H - 34, 26, 26, '#ffffff', '#1a1a1a');
  text(ctx, '◀', 20, H - 24, { color: UI.ink, scale: 1 });
  text(ctx, '▶', 52, H - 24, { color: UI.ink, scale: 1 });
  roundRect(ctx, W - 38, H - 38, 30, 30, '#ffffff', '#1a1a1a');
  text(ctx, 'PULO', W - 23, H - 26, { color: UI.ink, align: 'center' });
  roundRect(ctx, W - 66, H - 30, 24, 22, '#ffffff', '#1a1a1a');
  text(ctx, 'JOGA', W - 54, H - 22, { color: UI.ink, align: 'center' });
  roundRect(ctx, W - 58, H - 56, 20, 18, '#f5d000', '#1a1a1a');
  text(ctx, '★', W - 48, H - 50, { color: UI.ink, align: 'center' });
  ctx.globalAlpha = 1;
}
