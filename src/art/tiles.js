// Tiles (16x16) e objetos de cenário. Tiles são desenhados proceduralmente por tema,
// o que permite plataformas de qualquer largura sem emendas aparentes.

import { rows, sprite, rect, roundRect, rng } from './pixel.js';
import { text, measure } from './font.js';

export const T = 16;

export const THEMES = {
  bairro: {
    top: '#c9c3b6', topEdge: '#e6e1d6', topShadow: '#9d978a', fill: '#4a4a52', fillDot: '#3c3c44', fillLine: '#e8c440',
    block: '#c8643c', blockMortar: '#e9b48a', blockDark: '#9a4428',
  },
  avenida: {
    top: '#b8bcc4', topEdge: '#dfe2e8', topShadow: '#8a8e96', fill: '#3a3d45', fillDot: '#30333a', fillLine: '#ffffff',
    block: '#9aa0aa', blockMortar: '#c7ccd4', blockDark: '#767c86',
  },
  reparticao: {
    top: '#d8cba8', topEdge: '#eadfc4', topShadow: '#b0a27c', fill: '#8a7a5a', fillDot: '#7a6a4a', fillLine: '#6c8a5c',
    block: '#7d8a8f', blockMortar: '#a7b3b8', blockDark: '#5c676c',
  },
  grupo: {
    top: '#25d366', topEdge: '#7ef0a8', topShadow: '#128c4a', fill: '#0b5f45', fillDot: '#0a5039', fillLine: '#13775a',
    block: '#ffffff', blockMortar: '#dfe7e3', blockDark: '#b6c4be',
  },
  plenario: {
    top: '#2f7a4a', topEdge: '#4fa06a', topShadow: '#1f5a34', fill: '#6b4426', fillDot: '#5a381e', fillLine: '#8a5a34',
    block: '#8a5a34', blockMortar: '#a8733f', blockDark: '#5a381e',
  },
  quartel: {
    top: '#5aa83a', topEdge: '#8ad060', topShadow: '#3a7a2a', fill: '#8a5a34', fillDot: '#6e4626', fillLine: '#a0703c',
    block: '#5a6a3a', blockMortar: '#7a8a52', blockDark: '#3e4a28',
  },
  rodovia: {
    top: '#9a9aa0', topEdge: '#c0c0c8', topShadow: '#6a6a70', fill: '#2e2e34', fillDot: '#26262c', fillLine: '#f5d000',
    block: '#c8c8c8', blockMortar: '#e8e8e8', blockDark: '#8a8a8a',
  },
  chocolate: {
    top: '#c9925a', topEdge: '#e8b87a', topShadow: '#8a5a2c', fill: '#4a2614', fillDot: '#3a1c0e', fillLine: '#6b3a1a',
    block: '#6b3a1a', blockMortar: '#8a4e26', blockDark: '#3a1c0e',
  },
  porto: {
    top: '#a8a49a', topEdge: '#d0ccc0', topShadow: '#7a766c', fill: '#5a5850', fillDot: '#4a4840', fillLine: '#f5d000',
    block: '#c8202f', blockMortar: '#e04050', blockDark: '#8a1420',
  },
  casa: {
    top: '#a8703c', topEdge: '#c99a60', topShadow: '#7a4e26', fill: '#5a3a1e', fillDot: '#4a2e16', fillLine: '#6a4626',
    block: '#8a6a9a', blockMortar: '#a88ab8', blockDark: '#5a4468',
  },
  planalto: {
    top: '#f2efe8', topEdge: '#ffffff', topShadow: '#c9c4b8', fill: '#d8d2c4', fillDot: '#c6bfae', fillLine: '#b8b0a0',
    block: '#ebe7de', blockMortar: '#ffffff', blockDark: '#bdb6a6',
  },
};

/** Chão: faixa superior (calçada/piso) + preenchimento. w e h em pixels (múltiplos de 16). */
export function drawGround(ctx, theme, x, y, w, h, seed = 7) {
  const t = THEMES[theme];
  const r = rng(seed);
  rect(ctx, x, y, w, h, t.fill);
  // textura do preenchimento
  for (let i = 0; i < (w * h) / 40; i++) rect(ctx, x + Math.floor(r() * w), y + 6 + Math.floor(r() * (h - 6)), 1, 1, t.fillDot);
  // faixa superior
  rect(ctx, x, y, w, 6, t.top);
  rect(ctx, x, y, w, 1, t.topEdge);
  rect(ctx, x, y + 5, w, 1, t.topShadow);
  for (let gx = x; gx < x + w; gx += 16) rect(ctx, gx, y + 1, 1, 4, t.topShadow);

  if (theme === 'bairro' || theme === 'avenida' || theme === 'rodovia') {
    // faixa de asfalto pintada
    for (let gx = x + 4; gx < x + w; gx += 24) rect(ctx, gx, y + 16, 12, 2, t.fillLine);
  }
  if (theme === 'reparticao') {
    // piso xadrez
    for (let gx = x; gx < x + w; gx += 8) for (let gy = y + 6; gy < y + h; gy += 8) if (((gx - x) / 8 + (gy - y - 6) / 8) % 2 === 0) rect(ctx, gx, gy, Math.min(8, x + w - gx), Math.min(8, y + h - gy), t.fillLine);
  }
  if (theme === 'grupo') {
    // barra de digitação do "aplicativo"
    rect(ctx, x, y + 6, w, h - 6, '#f0f2f5');
    for (let gx = x + 6; gx < x + w - 20; gx += 64) {
      roundRect(ctx, gx, y + 9, 48, 9, '#ffffff', '#c8d0d6');
      text(ctx, 'MENSAGEM', gx + 4, y + 11, { color: '#a0a8b0' });
    }
  }
  if (theme === 'plenario') {
    for (let gx = x; gx < x + w; gx += 16) {
      rect(ctx, gx, y + 6, 16, h - 6, (gx / 16) % 2 ? t.fill : t.fillLine);
      rect(ctx, gx, y + 6, 1, h - 6, t.fillDot);
    }
  }
  if (theme === 'casa') {
    // assoalho de tacos
    for (let gy = y + 6; gy < y + h; gy += 5) {
      rect(ctx, x, gy, w, 1, t.fillDot);
      for (let gx = x + ((gy / 5) % 2 ? 6 : 0); gx < x + w; gx += 12) rect(ctx, gx, gy, 1, 5, t.fillDot);
    }
  }
  if (theme === 'chocolate') {
    // chocolate escorrendo da borda
    for (let gx = x + 3; gx < x + w; gx += 11) rect(ctx, gx, y + 6, 3, 3 + ((gx * 7) % 5), '#6b3a1a');
  }
  if (theme === 'planalto') {
    // pedra portuguesa em ondas (padrão preto e branco)
    for (let gx = x; gx < x + w; gx++) {
      const wave = Math.round(Math.sin((gx - x) / 5) * 3);
      rect(ctx, gx, y + 12 + wave, 1, 3, '#3a3a3a');
      rect(ctx, gx, y + 24 + wave, 1, 3, '#3a3a3a');
    }
  }
}

/** Bloco sólido de tema (tijolo, concreto, arquivo de aço, balão, bancada, coluna). */
export function drawBlock(ctx, theme, x, y, w = 16, h = 16) {
  const t = THEMES[theme];
  if (theme === 'bairro') {
    // tijolo baiano aparente
    rect(ctx, x, y, w, h, t.blockMortar);
    for (let row = 0; row < h / 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let bx = -off; bx < w; bx += 8) {
        const sx = Math.max(x, x + bx + 1);
        const ex = Math.min(x + w, x + bx + 8);
        if (ex > sx) {
          rect(ctx, sx, y + row * 4 + 1, ex - sx, 3, t.block);
          rect(ctx, sx, y + row * 4 + 3, ex - sx, 1, t.blockDark);
        }
      }
    }
    return;
  }
  if (theme === 'reparticao') {
    // arquivo de aço com gavetas
    rect(ctx, x, y, w, h, t.block);
    rect(ctx, x, y, w, 1, t.blockMortar);
    rect(ctx, x + w - 1, y, 1, h, t.blockDark);
    for (let gy = y + 2; gy < y + h - 2; gy += 8) {
      rect(ctx, x + 2, gy, w - 4, 6, t.blockDark);
      rect(ctx, x + 3, gy + 1, w - 6, 4, t.block);
      rect(ctx, x + w / 2 - 2, gy + 2, 4, 1, '#d8dde0');
    }
    return;
  }
  if (theme === 'grupo') {
    roundRect(ctx, x, y, w, h, t.block, t.blockDark);
    rect(ctx, x + 2, y + 2, w - 4, 1, '#ffffff');
    return;
  }
  if (theme === 'planalto') {
    // coluna do Planalto (estilizada)
    rect(ctx, x, y, w, h, t.block);
    rect(ctx, x, y, w, 2, t.blockMortar);
    rect(ctx, x + 3, y + 2, 2, h - 2, t.blockDark);
    rect(ctx, x + w - 5, y + 2, 2, h - 2, t.blockDark);
    return;
  }
  if (theme === 'chocolate') {
    // barra de chocolate em gomos
    rect(ctx, x, y, w, h, t.blockDark);
    for (let gx = x; gx < x + w; gx += 8) for (let gy = y; gy < y + h; gy += 8) {
      rect(ctx, gx + 1, gy + 1, 6, 6, t.block);
      rect(ctx, gx + 1, gy + 1, 6, 1, t.blockMortar);
    }
    return;
  }
  if (theme === 'porto') {
    // contêiner com frisos verticais
    rect(ctx, x, y, w, h, t.block);
    for (let gx = x + 2; gx < x + w - 1; gx += 3) rect(ctx, gx, y + 1, 1, h - 2, t.blockDark);
    rect(ctx, x, y, w, 1, t.blockMortar);
    rect(ctx, x, y + h - 1, w, 1, t.blockDark);
    return;
  }
  if (theme === 'quartel') {
    // sacos de areia
    rect(ctx, x, y, w, h, '#3e4a28');
    for (let row = 0; row < h / 6; row++) {
      const off = row % 2 ? 4 : 0;
      for (let bx = -off; bx < w; bx += 8) {
        const sx = Math.max(x, x + bx);
        const ex = Math.min(x + w, x + bx + 8);
        if (ex > sx + 1) { rect(ctx, sx, y + row * 6, ex - sx - 1, 5, '#c8b07a'); rect(ctx, sx, y + row * 6 + 4, ex - sx - 1, 1, '#9a8458'); }
      }
    }
    return;
  }
  // concreto / madeira
  rect(ctx, x, y, w, h, t.block);
  rect(ctx, x, y, w, 1, t.blockMortar);
  rect(ctx, x, y + h - 1, w, 1, t.blockDark);
  for (let gx = x; gx < x + w; gx += 16) rect(ctx, gx, y, 1, h, t.blockDark);
  if (theme === 'plenario') for (let gy = y + 4; gy < y + h; gy += 5) rect(ctx, x + 1, gy, w - 2, 1, t.blockDark);
}

/** Plataforma atravessável por baixo (one-way). Altura visual 6–8 px. */
export function drawOneWay(ctx, theme, x, y, w) {
  if (theme === 'bairro') {
    // toldo listrado de barraca de feira
    for (let i = 0; i < w; i += 4) rect(ctx, x + i, y, 4, 5, (i / 4) % 2 ? '#ffffff' : '#d93a3a');
    for (let i = 0; i < w; i += 4) rect(ctx, x + i + 1, y + 5, 2, 2, (i / 4) % 2 ? '#e8e8e8' : '#b02a2a');
    rect(ctx, x, y, w, 1, '#ff7a6a');
    return;
  }
  if (theme === 'avenida') {
    // grade de contenção de manifestação
    rect(ctx, x, y, w, 2, '#e8c440');
    rect(ctx, x, y + 2, w, 1, '#a88a20');
    for (let i = 2; i < w; i += 6) rect(ctx, x + i, y + 3, 1, 5, '#a0a6b0');
    return;
  }
  if (theme === 'reparticao') {
    // pilha de pastas e processos
    const cols = ['#e8c45a', '#d98a4a', '#8ab0d9', '#e8e0c8'];
    for (let i = 0; i < w; i += 8) {
      rect(ctx, x + i, y, 8, 3, cols[(i / 8) % 4]);
      rect(ctx, x + i, y + 3, 8, 3, cols[(i / 8 + 2) % 4]);
      rect(ctx, x + i, y + 3, 8, 1, '#5a4a3a');
    }
    rect(ctx, x, y + 6, w, 1, '#5a4a3a');
    return;
  }
  if (theme === 'grupo') {
    drawChatBubble(ctx, x, y, w, 10, (x / 16) % 2 ? 'in' : 'out');
    return;
  }
  if (theme === 'plenario') {
    // mesa de negociação
    rect(ctx, x, y, w, 3, '#a8733f');
    rect(ctx, x, y, w, 1, '#c99a60');
    rect(ctx, x, y + 3, w, 2, '#5a381e');
    rect(ctx, x + 2, y + 5, 2, 6, '#5a381e');
    rect(ctx, x + w - 4, y + 5, 2, 6, '#5a381e');
    return;
  }
  if (theme === 'quartel') {
    // lona de barraca esticada
    rect(ctx, x, y, w, 4, '#2f80ed');
    rect(ctx, x, y, w, 1, '#6ab0ff');
    for (let i = 0; i < w; i += 8) rect(ctx, x + i, y + 4, 4, 2, '#1f5ab0');
    return;
  }
  if (theme === 'rodovia') {
    // defensa metálica (guard-rail)
    rect(ctx, x, y, w, 4, '#c8ccd4');
    rect(ctx, x, y + 1, w, 1, '#8a8e96');
    for (let i = 4; i < w; i += 16) rect(ctx, x + i, y + 4, 2, 8, '#6a6e76');
    return;
  }
  if (theme === 'chocolate') {
    // esteira rolante
    rect(ctx, x, y, w, 5, '#3a3a3a');
    for (let i = 0; i < w; i += 4) rect(ctx, x + i, y, 2, 1, '#8a8a8a');
    rect(ctx, x, y + 5, w, 2, '#1a1a1a');
    for (let i = 2; i < w; i += 8) rect(ctx, x + i, y + 2, 3, 3, '#5a5a5a');
    return;
  }
  if (theme === 'porto') {
    // palete de madeira
    rect(ctx, x, y, w, 2, '#c08a4a');
    for (let i = 0; i < w; i += 6) rect(ctx, x + i, y + 2, 3, 3, '#8a5a2a');
    rect(ctx, x, y + 5, w, 2, '#c08a4a');
    return;
  }
  if (theme === 'casa') {
    // prateleira
    rect(ctx, x, y, w, 3, '#c99a60');
    rect(ctx, x, y + 3, w, 1, '#7a4e26');
    rect(ctx, x + 2, y + 4, 2, 4, '#5a5a5a');
    rect(ctx, x + w - 4, y + 4, 2, 4, '#5a5a5a');
    return;
  }
  // planalto: degrau de mármore
  rect(ctx, x, y, w, 4, '#ffffff');
  rect(ctx, x, y + 4, w, 2, '#c9c4b8');
}

/** Balão de chat (plataforma da fase 4). type 'in' = branco à esquerda, 'out' = verde à direita. */
export function drawChatBubble(ctx, x, y, w, h, type = 'in', label = null) {
  const fill = type === 'in' ? '#ffffff' : '#d9fdd3';
  const edge = type === 'in' ? '#c6ccd2' : '#9ad99a';
  roundRect(ctx, x, y, w, h, fill, edge);
  // rabinho
  if (type === 'in') { rect(ctx, x - 2, y + 1, 3, 2, edge); rect(ctx, x - 1, y + 1, 2, 1, fill); }
  else { rect(ctx, x + w - 1, y + 1, 3, 2, edge); rect(ctx, x + w - 1, y + 1, 2, 1, fill); }
  if (label) text(ctx, label, x + 4, y + 3, { color: '#4a5560' });
  else for (let i = x + 4; i < x + w - 6; i += 7) rect(ctx, i, y + 4, 5, 1, '#b8c0c8');
  text(ctx, '✓✓', x + w - 14, y + h - 7, { color: type === 'in' ? '#b8c0c8' : '#53bdeb' });
}

/** Bloco "FAKE": sólido quando visible=1, fantasma quando 0 (ciclo de 2 s). */
export function drawFakeBlock(ctx, x, y, visible = 1) {
  ctx.globalAlpha = visible ? 1 : 0.3;
  rect(ctx, x, y, 16, 16, '#7a1020');
  rect(ctx, x + 1, y + 1, 14, 14, '#d42a3c');
  rect(ctx, x + 1, y + 1, 14, 1, '#ff6a7a');
  text(ctx, 'FAKE', x + 1, y + 6, { color: '#ffffff' });
  ctx.globalAlpha = 1;
}

/** Plataforma que cai ("Promessa de campanha"): placa de madeira escrita "PROMESSA". */
export function drawPromessa(ctx, x, y, w = 40, shaking = false) {
  const dx = shaking ? 1 : 0;
  rect(ctx, x + dx, y, w, 8, '#8a5a2a');
  rect(ctx, x + dx, y, w, 1, '#c08a4a');
  rect(ctx, x + dx, y + 7, w, 1, '#5a3a1a');
  text(ctx, 'PROMESSA', x + dx + Math.round((w - measure('PROMESSA')) / 2), y + 2, { color: '#ffe8b0' });
}

/** Plataforma móvel genérica (vaivém). */
export function drawMovingPlatform(ctx, theme, x, y, w) {
  if (theme === 'avenida') return drawTrio(ctx, x, y, w);
  rect(ctx, x, y, w, 6, '#5a6a7a');
  rect(ctx, x, y, w, 1, '#9aaaba');
  for (let i = 3; i < w - 2; i += 6) rect(ctx, x + i, y + 2, 2, 2, '#f5d000');
}

/** Trio elétrico (plataforma móvel da avenida). Topo é a superfície pisável. */
export function drawTrio(ctx, x, y, w = 64) {
  const h = 26;
  // caixas de som no topo
  rect(ctx, x, y, w, 2, '#ffde4a');
  rect(ctx, x, y + 2, w, h - 8, '#2a2a3a');
  for (let i = 4; i < w - 8; i += 12) {
    rect(ctx, x + i, y + 4, 9, 9, '#14141c');
    rect(ctx, x + i + 2, y + 6, 5, 5, '#4a4a5c');
    rect(ctx, x + i + 4, y + 8, 1, 1, '#9a9ab0');
  }
  rect(ctx, x, y + h - 9, w, 3, '#e23b4a');
  text(ctx, 'TRIO DO POVO', x + w / 2, y + h - 15, { color: '#ffde4a', align: 'center' });
  rect(ctx, x + 2, y + h - 6, w - 4, 2, '#14141c');
  // rodas
  for (const wx of [x + 8, x + w - 16]) {
    rect(ctx, wx, y + h - 4, 8, 6, '#111111');
    rect(ctx, wx + 3, y + h - 2, 2, 2, '#888888');
  }
}

// --- Objetos (sprites) ---

export const CAIXOTE = sprite('caixote', rows(`
KKKKKKKKKKKKKKKK
KbbbbbbbbbbbbbbK
KbBBBBBBBBBBBBbK
KbBbbbbbbbbbbBbK
KbBbbbbbbbbbbBbK
KbBBBBBBBBBBBBbK
KbbbbbbbbbbbbbbK
KbbYYYYYYYYYYbbK
KbbYbYbYbYbYYbbK
KbbYYYYYYYYYYbbK
KbbbbbbbbbbbbbbK
KbBBBBBBBBBBBBbK
KbBbbbbbbbbbbBbK
KbBBBBBBBBBBBBbK
KbbbbbbbbbbbbbbK
KKKKKKKKKKKKKKKK`), { K: '#3a2410', b: '#b07a42', B: '#8a5a2c', Y: '#e8d8a8' });

export const CONE = sprite('cone', rows(`
.......KK.......
......KOOK......
......KOOK......
.....KWWWWK.....
.....KOOOOK.....
....KOOOOOOK....
....KWWWWWWK....
...KOOOOOOOOK...
...KOOOOOOOOK...
..KKKKKKKKKKKK..
..KkkkkkkkkkkK..
..KKKKKKKKKKKK..`), { K: '#3a1a0a', O: '#ff7a1a', W: '#ffffff', k: '#2a2a2a' });

export const URNA = {
  off: sprite('urna.off', rows(`
....KKKKKKKK....
...KggggggggK...
...KgKKKKKKgK...
...KgKkkkkKgK...
...KgKKKKKKgK...
...KggggggggK...
...KgwgwgwggK...
...KgwgwgwggK...
...KgwgwgwRgK...
...KggggggggK...
....KKKKKKKK....
.....KmmmmK.....
.....KmmmmK.....
.....KmmmmK.....
....KmmmmmmK....
...KKKKKKKKKK...`), { K: '#1a1a1a', g: '#c8c8c8', k: '#3a4a3a', w: '#ffffff', R: '#e23b4a', m: '#6a6a6a' }),
  on: sprite('urna.on', rows(`
....KKKKKKKK....
...KggggggggK...
...KgKKKKKKgK...
...KgKGGGGKgK...
...KgKKKKKKgK...
...KggggggggK...
...KgwgwgwggK...
...KgwgwgwggK...
...KgwgwgwGgK...
...KggggggggK...
....KKKKKKKK....
.....KmmmmK.....
.....KmmmmK.....
.....KmmmmK.....
....KmmmmmmK....
...KKKKKKKKKK...`), { K: '#1a1a1a', g: '#c8c8c8', G: '#7cf27c', w: '#ffffff', m: '#6a6a6a' }),
};

/** Carimbo gigante (perigo). phase 0..1: 0 = recolhido no alto, 1 = batendo no chão. */
export function drawCarimbo(ctx, x, y, travel = 40, phase = 0) {
  const py = y + Math.round(travel * phase);
  rect(ctx, x + 6, y - 20, 4, py - y + 20, '#5a4a3a'); // haste
  rect(ctx, x + 2, py, 12, 6, '#7a4a2a'); // cabo
  rect(ctx, x + 2, py, 12, 1, '#a8703c');
  rect(ctx, x - 2, py + 6, 20, 4, '#3a3a3a'); // base
  rect(ctx, x - 2, py + 10, 20, 3, '#c8202f'); // borracha com tinta
  if (phase > 0.95) text(ctx, 'INDEFERIDO', x + 8, py + 16, { color: '#c8202f', align: 'center' });
}

/** Faixa de chegada (palanque) das fases 1–5. */
export function drawChegada(ctx, x, groundY, label = 'PALANQUE') {
  rect(ctx, x, groundY - 48, 3, 48, '#5a5a5a');
  rect(ctx, x + 45, groundY - 48, 3, 48, '#5a5a5a');
  rect(ctx, x, groundY - 48, 48, 12, '#1f9e3a');
  rect(ctx, x, groundY - 44, 48, 4, '#f5d000');
  text(ctx, label, x + 24, groundY - 46, { color: '#ffffff', align: 'center', shadow: '#0d5a20' });
  // tablado
  rect(ctx, x - 6, groundY - 10, 60, 10, '#8a5a2a');
  rect(ctx, x - 6, groundY - 10, 60, 2, '#c08a4a');
  for (let i = x - 4; i < x + 54; i += 8) rect(ctx, i, groundY - 7, 1, 7, '#5a3a1a');
}

/** Placa de propaganda (tutorial embutido). */
export function drawPlaca(ctx, x, groundY, linhas, cor = '#f5d000') {
  const w = Math.max(...linhas.map((l) => l.length)) * 4 + 8;
  const h = linhas.length * 8 + 4;
  rect(ctx, x + w / 2 - 1, groundY - 14, 2, 14, '#5a3a1a');
  rect(ctx, x, groundY - 14 - h, w, h, '#1a1a1a');
  rect(ctx, x + 1, groundY - 13 - h, w - 2, h - 2, cor);
  linhas.forEach((l, i) => text(ctx, l, x + w / 2, groundY - 11 - h + i * 8, { color: '#1a1a1a', align: 'center' }));
}

/** Buraco de "obra parada": cavalete listrado na borda. */
export function drawCavalete(ctx, x, groundY) {
  rect(ctx, x + 1, groundY - 10, 2, 10, '#5a5a5a');
  rect(ctx, x + 13, groundY - 10, 2, 10, '#5a5a5a');
  for (let i = 0; i < 16; i += 4) rect(ctx, x + i, groundY - 12, 4, 4, (i / 4) % 2 ? '#ffffff' : '#ff7a1a');
  text(ctx, 'OBRA', x + 8, groundY - 20, { color: '#ffffff', align: 'center', shadow: '#1a1a1a' });
}
