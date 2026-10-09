// Camada de interface em alta resolução: textos com fontes pixel legíveis (minúsculas, acentos e
// números claros), desenhados num canvas próprio por cima do jogo. Coordenadas lógicas (384x216);
// o contexto já vem escalado para os pixels reais da tela.
//  - weight 400 → Tiny5 (texto corrido)   - weight 700 → Jersey 10 (títulos, HUD e números)

import { TINY5, JERSEY10 } from './fontData.js';

export const UI_FONT = 'PixelUI';
export const UI_FONT_HEAD = 'PixelHead';
const FALLBACK = '"Courier New", monospace';
// Jersey 10 é mais alta e estreita: um pouco maior para casar com a Tiny5
const HEAD_SCALE = 1.35;
let loaded = false;

/** Registra a fonte embutida. Seguro chamar várias vezes; resolve mesmo se falhar (usa a reserva). */
export async function loadUIFont() {
  if (loaded || typeof FontFace === 'undefined') return;
  try {
    const noLig = { featureSettings: '"liga" 0, "clig" 0' };
    const faces = [new FontFace(UI_FONT, `url(${TINY5})`, noLig), new FontFace(UI_FONT_HEAD, `url(${JERSEY10})`, noLig)];
    await Promise.all(faces.map((f) => f.load()));
    faces.forEach((f) => document.fonts.add(f));
    loaded = true;
  } catch {
    /* sem a fonte: segue com a reserva monoespaçada */
  }
}

function font(size, weight) {
  return weight >= 700 ? `${size * HEAD_SCALE}px ${UI_FONT_HEAD}, ${FALLBACK}` : `${size}px ${UI_FONT}, ${FALLBACK}`;
}

export function uiMeasure(ctx, str, size = 8, weight = 400) {
  ctx.font = font(size, weight);
  return ctx.measureText(str).width;
}

/**
 * Escreve texto. (x, y) é o topo da linha. opts: size, weight, color, align, shadow (cor), outline (bool), alpha.
 * Retorna a largura escrita.
 */
export function uiText(ctx, str, x, y, opts = {}) {
  const { size = 8, weight = 400, color = '#ffffff', align = 'left', shadow = null, outline = false, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font(size, weight);
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  const off = Math.max(0.5, size / 10);
  if (shadow) {
    ctx.fillStyle = shadow;
    if (outline && size >= 9) { // em texto pequeno o contorno borra: usa só sombra
      for (const [ox, oy] of [[-off, 0], [off, 0], [0, -off], [0, off], [off, off]]) ctx.fillText(str, x + ox, y + oy);
    } else {
      ctx.fillText(str, x + off, y + off);
    }
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** Quebra o texto em linhas que caibam em maxWidth (pixels lógicos). */
export function uiWrap(ctx, str, maxWidth, size = 8, weight = 400) {
  ctx.font = font(size, weight);
  const out = [];
  for (const paragraph of String(str).split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > maxWidth && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

/** Painel arredondado (cantos de 1 px lógico). */
export function uiPanel(ctx, x, y, w, h, fill, border) {
  ctx.fillStyle = border ?? fill;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  if (border) {
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
}
