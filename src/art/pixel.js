// Utilitários de pixel art: sprites definidos como grades de letras + paleta.
// Fonte única da arte do jogo: nenhum arquivo de imagem é necessário no MVP.

/** Converte um bloco de texto (uma linha por fileira de pixels) em array de strings. */
export function rows(text) {
  return text.split('\n').map((r) => r.trim()).filter((r) => r.length > 0);
}

/**
 * Cria um sprite a partir das fileiras e de uma paleta { letra: '#rrggbb' }.
 * '.' é sempre transparente. Valida largura e letras para pegar erros cedo.
 */
export function sprite(name, rowList, palette) {
  const h = rowList.length;
  const w = rowList[0].length;
  rowList.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: fileira ${i} tem ${r.length} px (esperado ${w})`);
    for (const ch of r) {
      if (ch !== '.' && !(ch in palette)) throw new Error(`${name}: letra '${ch}' sem cor na paleta`);
    }
  });
  return { name, w, h, rows: rowList, palette };
}

/** Aplica remendos [x, y, ['fileira', ...]] sobre uma cópia das fileiras. '.' no remendo = manter; '_' = apagar. */
export function patch(rowList, patches) {
  const out = rowList.map((r) => r.split(''));
  for (const [px, py, lines] of patches) {
    lines.forEach((line, dy) => {
      [...line].forEach((ch, dx) => {
        const y = py + dy;
        const x = px + dx;
        if (ch === '.' || y < 0 || y >= out.length || x < 0 || x >= out[y].length) return;
        out[y][x] = ch === '_' ? '.' : ch;
      });
    });
  }
  return out.map((r) => r.join(''));
}

/** Empilha blocos verticais (ex.: cabeça + tronco + pernas). */
export function stack(...parts) {
  return parts.flat();
}

/** Desenha um sprite num contexto 2D, em coordenadas de pixel lógico. */
export function draw(ctx, spr, x, y, opts = {}) {
  const { flip = false, palette = spr.palette, scale = 1, alpha = 1 } = opts;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  for (let j = 0; j < spr.h; j++) {
    const r = spr.rows[j];
    for (let i = 0; i < spr.w; i++) {
      const ch = r[i];
      if (ch === '.') continue;
      const color = palette[ch] ?? spr.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      const dx = flip ? spr.w - 1 - i : i;
      ctx.fillRect(Math.round(x) + dx * scale, Math.round(y) + j * scale, scale, scale);
    }
  }
  ctx.globalAlpha = prevAlpha;
}

/** Paleta com todas as cores trocadas por uma só (piscar de dano, silhueta). */
export function flatPalette(spr, color, keep = 'K') {
  const p = {};
  for (const k of Object.keys(spr.palette)) p[k] = k === keep ? spr.palette[k] : color;
  return p;
}

/** Gerador pseudoaleatório determinístico (cenários iguais a cada execução). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Retângulo com cantos de 1 px recortados (aparência de pixel art). */
export function roundRect(ctx, x, y, w, h, fill, border) {
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  } else {
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
  }
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
