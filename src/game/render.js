// Desenho do jogo: cenário pré-renderizado, entidades, jogador, HUD e telas sobrepostas.

import { VIEW_W, VIEW_H, TILE } from '../config/constants.js';
import { draw, rect, roundRect } from '../art/pixel.js';
import { text } from '../art/font.js';
import { CAPITAO, LLIVRE } from '../art/characters.js';
import * as I from '../art/items.js';
import * as TL from '../art/tiles.js';
import { BACKGROUNDS } from '../art/backgrounds.js';
import { drawHUD, drawBalloon, drawFloat, wrapText, UI } from '../art/hud.js';
import { HITBOX } from '../data/characters.js';
import { TOUCH_BUTTONS } from './input.js';

const SPRITES = { capitao: CAPITAO, llivre: LLIVRE };

// ---------- cache de sprites em canvas (desenhar pixel a pixel a cada quadro é caro no celular) ----------
const spriteCache = new Map();
function cached(spr, flip) {
  const key = spr;
  let entry = spriteCache.get(key);
  if (!entry) {
    entry = {};
    for (const f of [false, true]) {
      const c = document.createElement('canvas');
      c.width = spr.w; c.height = spr.h;
      draw(c.getContext('2d'), spr, 0, 0, { flip: f });
      entry[f] = c;
    }
    spriteCache.set(key, entry);
  }
  return entry[flip];
}
function blit(ctx, spr, x, y, flip = false) {
  ctx.drawImage(cached(spr, flip), Math.round(x), Math.round(y));
}

// ---------- cenário estático da fase (desenhado uma vez) ----------
export function prerenderLevel(level) {
  const { map, data } = level;
  const c = document.createElement('canvas');
  c.width = map.pixelW;
  c.height = map.pixelH;
  const ctx = c.getContext('2d');
  const theme = data.theme;
  const rows = map.rows;
  const groundTopOf = (tx) => rows.findIndex((r) => r[tx] === '#');

  // buracos: escuridão abaixo da linha do chão
  const groundRow = rows.findIndex((r) => r.includes('#'));
  if (groundRow >= 0) {
    for (let tx = 0; tx < map.w; tx++) {
      if (rows[groundRow][tx] === '#') continue;
      rect(ctx, tx * TILE, groundRow * TILE, TILE, (map.h - groundRow) * TILE, '#14141c');
      rect(ctx, tx * TILE, groundRow * TILE + 6, TILE, 2, '#262630');
    }
  }

  // placas (atrás de tudo)
  for (const s of data.signs ?? []) {
    const gy = groundTopOf(s.col) * TILE;
    TL.drawPlaca(ctx, s.col * TILE, gy, s.lines, s.color);
  }

  // postes dos toldos até o próximo apoio abaixo
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (rows[ty][tx] !== '=') continue;
      const isStart = rows[ty][tx - 1] !== '=';
      const isEnd = rows[ty][tx + 1] !== '=';
      if (!isStart && !isEnd) continue;
      let by = ty + 1;
      while (by < map.h && !map.isSolid(tx, by)) by++;
      if (by >= map.h) continue; // toldo sobre buraco: sem poste
      const px = isStart ? tx * TILE + 3 : tx * TILE + TILE - 5;
      rect(ctx, px, ty * TILE + 6, 2, (by - ty) * TILE - 6, '#6a4a2a');
    }
  }

  // chão: faixas horizontais de '#' cujo tile de cima não é '#'
  for (let ty = 0; ty < map.h; ty++) {
    let start = -1;
    for (let tx = 0; tx <= map.w; tx++) {
      const isTop = rows[ty]?.[tx] === '#' && rows[ty - 1]?.[tx] !== '#';
      if (isTop && start < 0) start = tx;
      if (!isTop && start >= 0) {
        let depth = 0;
        while (rows[ty + depth]?.[start] === '#') depth++;
        TL.drawGround(ctx, theme, start * TILE, ty * TILE, (tx - start) * TILE, depth * TILE, start);
        // cavaletes de obra nas bordas dos buracos
        if (start > 0 && rows[ty][start - 1] === '.') TL.drawCavalete(ctx, start * TILE, ty * TILE);
        if (tx < map.w && rows[ty][tx] === '.') TL.drawCavalete(ctx, (tx - 1) * TILE, ty * TILE);
        start = -1;
      }
    }
  }

  // blocos, caixotes e toldos
  for (let ty = 0; ty < map.h; ty++) {
    let runChar = null;
    let start = -1;
    for (let tx = 0; tx <= map.w; tx++) {
      const ch = rows[ty][tx];
      if (ch === 'C') draw(ctx, TL.CAIXOTE, tx * TILE, ty * TILE);
      const runnable = ch === 'B' || ch === '=' ? ch : null;
      if (runnable !== runChar) {
        if (runChar === 'B') TL.drawBlock(ctx, theme, start * TILE, ty * TILE, (tx - start) * TILE, TILE);
        if (runChar === '=') TL.drawOneWay(ctx, theme, start * TILE, ty * TILE, (tx - start) * TILE);
        runChar = runnable;
        start = tx;
      }
    }
  }
  return c;
}

// ---------- jogador ----------
function playerFrame(p) {
  const set = SPRITES[p.character.id];
  switch (p.state) {
    case 'jump':
    case 'fall':
      return set.jump;
    case 'walk': {
      const seq = [set.walk1, set.idle, set.walk2, set.idle];
      return seq[Math.floor(p.animTime * 8) % 4];
    }
    case 'run': {
      const seq = [set.walk1, set.walk2];
      return seq[Math.floor(p.animTime * 12) % 2];
    }
    default:
      return set.idle;
  }
}

// ---------- quadro completo ----------
export function renderGame(ctx, g) {
  const { level, camera, player } = g;
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);

  BACKGROUNDS[level.data.background](ctx, VIEW_W, VIEW_H, cx);
  ctx.drawImage(g.levelCanvas, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

  const E = level.entities;
  // plataformas PROMESSA
  for (const pr of E.promessas) {
    if (pr.state === 'gone') continue;
    const shaking = pr.state === 'shaking' && Math.floor(g.time * 30) % 2 === 0;
    TL.drawPromessa(ctx, pr.x - cx, pr.y - cy, pr.w, shaking);
  }
  // checkpoints (urna)
  for (const cp of E.checkpoints) {
    blit(ctx, cp.active ? TL.URNA.on : TL.URNA.off, cp.x - cx, cp.y + 16 - cy);
    if (cp.active) {
      rect(ctx, cp.x + 7 - cx, cp.y - 14 - cy, 1, 14, '#5a5a5a');
      rect(ctx, cp.x + 8 - cx, cp.y - 14 - cy, 9, 6, '#1f9e3a');
      rect(ctx, cp.x + 10 - cx, cp.y - 12 - cy, 5, 2, '#f5d000');
    }
  }
  // chegada
  TL.drawChegada(ctx, E.finish.x - cx, E.finish.y + 48 - cy, 'PALANQUE');
  // votos (giram)
  const coinFrame = Math.floor(g.time * 5) % 4 === 3 ? 1 : 0;
  for (const v of E.votes) if (!v.taken) blit(ctx, I.VOTO[coinFrame], v.x - cx, v.y - cy);

  // jogador
  if (!(g.fsm.is('DYING') && Math.floor(g.fsm.time * 20) % 2)) {
    const spr = playerFrame(player);
    blit(ctx, spr, player.x - HITBOX.offsetX - cx, player.y - HITBOX.offsetY - cy, player.facing < 0);
  }

  // textos flutuantes
  for (const f of g.floats) drawFloat(ctx, Math.round(f.x - cx), Math.round(f.y - cy), f.text, f.color);
  // balão de fala do jogador
  if (g.balloon) {
    const by = Math.min(Math.round(player.y - 4 - cy), VIEW_H - 40); // não sai da tela quando o jogador cai
    drawBalloon(ctx, Math.round(player.x + player.w / 2 - cx), by, g.balloon.text, { maxWidth: 140 });
  }

  drawHUD(ctx, VIEW_W, {
    hp: g.session.hp, hpMax: player.character.hp, lives: g.session.lives, score: g.session.score, combo: 0,
    votes: g.session.votes, itemId: player.character.item, ammo: player.character.ammo, engagement: 0,
    progress: Math.min(1, player.x / (E.finish.x || 1)),
  });

  if (g.input.touchMode) drawTouch(ctx);
  if (g.debug) drawDebug(ctx, g, cx, cy);

  if (g.fsm.is('PAUSED')) drawPause(ctx);
  if (g.fsm.is('GAMEOVER')) drawGameOver(ctx, g);
  if (g.fsm.is('COMPLETE')) drawComplete(ctx, g);
}

function drawTouch(ctx) {
  ctx.globalAlpha = 0.45;
  const labels = { left: '◀', right: '▶', jump: 'PULO', pause: 'II' };
  for (const b of TOUCH_BUTTONS) {
    roundRect(ctx, b.x, b.y, b.w, b.h, '#ffffff', '#1a1a1a');
    text(ctx, labels[b.action], b.x + b.w / 2, b.y + b.h / 2 - 2, { color: UI.ink, align: 'center' });
  }
  ctx.globalAlpha = 1;
}

function drawDebug(ctx, g, cx, cy) {
  const p = g.player;
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(p.x - cx) + 0.5, Math.round(p.y - cy) + 0.5, p.w - 1, p.h - 1);
  const lines = [
    `FPS ${g.fps.toFixed(0)}  ${p.character.name}`,
    `X ${p.x.toFixed(1)} Y ${p.y.toFixed(1)}`,
    `VX ${p.vx.toFixed(0)} VY ${p.vy.toFixed(0)}`,
    `${p.state.toUpperCase()} ${p.onGround ? 'CHÃO' : 'AR'} COYOTE ${p.coyote.toFixed(2)}`,
    `T TROCA PERSONAGEM  R REINICIA`,
  ];
  rect(ctx, 2, 34, 150, lines.length * 8 + 6, 'rgba(0,0,0,0.7)');
  lines.forEach((l, i) => text(ctx, l, 5, 38 + i * 8, { color: '#7cf27c' }));
}

function dim(ctx, alpha = 0.6) {
  rect(ctx, 0, 0, VIEW_W, VIEW_H, `rgba(10,10,20,${alpha})`);
}

function drawPause(ctx) {
  dim(ctx);
  text(ctx, 'SESSÃO SUSPENSA', VIEW_W / 2, 70, { color: UI.gold, scale: 2, align: 'center', shadow: UI.ink, outline: true });
  text(ctx, 'ESC / P  CONTINUAR', VIEW_W / 2, 105, { color: UI.white, align: 'center' });
  text(ctx, 'R  REINICIAR DO CHECKPOINT', VIEW_W / 2, 118, { color: UI.white, align: 'center' });
  text(ctx, 'T  TROCAR PERSONAGEM', VIEW_W / 2, 131, { color: UI.white, align: 'center' });
}

function newspaper(ctx, top, headline, color = '#1a1a1a') {
  roundRect(ctx, 52, 24, 280, 168, '#f4efe2', '#8a8270');
  text(ctx, 'DIÁRIO DO PLANALTO', VIEW_W / 2, 32, { color: '#1a1a1a', scale: 2, align: 'center' });
  rect(ctx, 62, 46, 260, 1, '#1a1a1a');
  text(ctx, top, VIEW_W / 2, 50, { color: color, align: 'center' });
  rect(ctx, 62, 58, 260, 1, '#1a1a1a');
  wrapText(headline, 250).forEach((l, i) => text(ctx, l, VIEW_W / 2, 66 + i * 10, { color: '#1a1a1a', align: 'center' }));
}

function drawGameOver(ctx, g) {
  dim(ctx, 0.7);
  newspaper(ctx, 'URGENTE: CANDIDATURA IMPUGNADA', g.headline ?? '', '#c8202f');
  text(ctx, `VOTOS ${g.session.votes}`, VIEW_W / 2, 120, { color: '#3a3a3a', align: 'center' });
  text(ctx, `PONTOS ${g.session.score}`, VIEW_W / 2, 132, { color: '#3a3a3a', align: 'center' });
  text(ctx, '▶ ENTER / TOQUE: TENTAR DE NOVO', VIEW_W / 2, 170, { color: '#1a1a1a', align: 'center' });
}

function drawComplete(ctx, g) {
  dim(ctx, 0.6);
  newspaper(ctx, `EDIÇÃO EXTRA - ${g.level.data.name} CONCLUÍDO`, g.headline ?? '');
  const t = g.session.time;
  const rows = [
    ['TEMPO', `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`],
    ['VOTOS', `${g.session.votes}/${g.level.entities.votes.length}`],
    ['PONTOS', `${g.session.score}`],
  ];
  rows.forEach(([l, v], i) => {
    text(ctx, l, 110, 104 + i * 12, { color: '#2a2a2a' });
    text(ctx, v, 274, 104 + i * 12, { color: '#2a2a2a', align: 'right' });
  });
  if (g.session.newRecord) text(ctx, '★ NOVO RECORDE!', VIEW_W / 2, 146, { color: '#c8202f', align: 'center' });
  text(ctx, '▶ ENTER / TOQUE: JOGAR DE NOVO', VIEW_W / 2, 170, { color: '#1a1a1a', align: 'center' });
}

export function drawRotate(ctx) {
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#0e1424');
  text(ctx, 'GIRE O APARELHO', VIEW_W / 2, 90, { color: UI.gold, scale: 2, align: 'center' });
  text(ctx, 'O PLANALTO FICA NA HORIZONTAL', VIEW_W / 2, 115, { color: UI.white, align: 'center' });
}
