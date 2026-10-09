// Desenho da Operação Liberta o Mito em duas camadas:
//  - MUNDO (canvas 384x216, pixel art): cenário, plataformas, personagens, itens.
//  - INTERFACE (canvas em alta resolução, fonte Pixelify Sans): HUD, falas, setas, menus e Checagem.
// Separar as camadas deixa o texto nítido e o cenário sem informação escrita competindo com a fala.

import { VIEW_W, VIEW_H, TILE } from '../config/constants.js';
import { draw, rect } from '../art/pixel.js';
import * as E from '../art/enemies.js';
import * as I from '../art/items.js';
import * as TL from '../art/tiles.js';
import { uiText, uiWrap, uiPanel, uiMeasure } from '../art/ui.js';
import { PATRICIO, CHECADOR, FISCAL, ZERO_UM, CARECA_DO_MAL, CELULAR } from '../art/missao/characters.js';
import * as M from '../art/missao/items.js';
import { drawUrnaBloco, drawCaixaDeposito } from '../art/missao/items.js';
import { BACKGROUNDS_MISSAO } from '../art/missao/backgrounds.js';
import { FASES } from '../data/missao/fases.js';
import { HITBOX } from '../data/characters.js';
import { TOUCH_BUTTONS } from './input.js';
import { fiscalSees, FISCAL_VIEW } from './missao.js';

const C = {
  ink: '#10131c', panel: 'rgba(12,16,28,0.88)', panelSolid: '#141a2c', line: '#2c3550', white: '#ffffff', muted: '#a8b0c4',
  gold: '#f5d000', green: '#1f9e3a', zap: '#25d366', red: '#ff5a5a', blue: '#7ab8ff', dim: 'rgba(14,20,36,0.38)',
};
const ENEMY_ART = { militante: E.MILITANTE, sindicalista: E.SINDICALISTA, checador: CHECADOR, fiscal: FISCAL };

// ---------- cache de sprites (desempenho no celular) ----------
const cache = new Map();
function blit(ctx, spr, x, y, flip = false) {
  let entry = cache.get(spr);
  if (!entry) {
    entry = {};
    for (const f of [false, true]) {
      const c = document.createElement('canvas');
      c.width = spr.w; c.height = spr.h;
      draw(c.getContext('2d'), spr, 0, 0, { flip: f });
      entry[f] = c;
    }
    cache.set(spr, entry);
  }
  ctx.drawImage(entry[flip], Math.round(x), Math.round(y));
}

function playerFrame(p) {
  if (p.prayTimer > 0) return PATRICIO.pray;
  if (p.throwTimer > 0) return PATRICIO.throw;
  switch (p.state) {
    case 'jump': case 'fall': return PATRICIO.jump;
    case 'walk': return [PATRICIO.walk1, PATRICIO.idle, PATRICIO.walk2, PATRICIO.idle][Math.floor(p.animTime * 8) % 4];
    case 'run': return [PATRICIO.walk1, PATRICIO.walk2][Math.floor(p.animTime * 12) % 2];
    default: return PATRICIO.idle;
  }
}

/** Ponto de entrada: desenha o mundo em ctx e a interface em g.ui.ctx (ou no próprio ctx, se não houver). */
export function renderMissao(ctx, g) {
  const ui = g.ui?.ctx ?? ctx;
  if (g.ui?.ctx) {
    ui.save();
    ui.setTransform(1, 0, 0, 1, 0, 0);
    ui.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
    ui.restore();
  }
  const st = g.fsm.state;
  if (st === 'TITLE') return drawTitle(ctx, ui, g);
  if (st === 'MAP') return drawMap(ctx, ui, g);
  if (st === 'MISSION') return drawMission(ctx, ui, g);
  if (st === 'CHECAGEM') return drawChecagem(ctx, ui, g);
  if (st === 'GAMEOVER') return drawGameOver(ctx, ui, g);
  drawWorld(ctx, g);
  drawPlayUI(ui, g);
  if (st === 'PAUSED') drawPause(ui);
}

// =====================================================================
// MUNDO
// =====================================================================

function drawDoor(ctx, x, groundY, open, theme) {
  if (theme === 'chocolate') {
    rect(ctx, x - 16, groundY - 70, 80, 70, '#f4efe2');
    rect(ctx, x - 20, groundY - 74, 88, 6, '#c8a020');
    for (let i = 0; i < 4; i++) rect(ctx, x - 12 + i * 22, groundY - 66, 4, 66, '#ffffff');
    rect(ctx, x + 6, groundY - 44, 36, 44, open ? '#3a2410' : '#6b3a1a');
    rect(ctx, x + 23, groundY - 44, 2, 44, '#c8a020');
    return;
  }
  if (theme === 'galpao') {
    rect(ctx, x - 8, groundY - 64, 64, 64, '#2a2e38');
    rect(ctx, x, groundY - 50, 48, 50, open ? '#1a1a1a' : '#4a5260');
    for (let i = 0; i < 6; i++) rect(ctx, x + 6 + i * 7, groundY - 44, 3, 2, i % 2 ? '#7cf27c' : '#ff4040');
    return;
  }
  rect(ctx, x - 8, groundY - 64, 64, 64, '#e8dcc0');
  rect(ctx, x - 8, groundY - 64, 64, 5, '#c8b890');
  rect(ctx, x, groundY - 50, 48, 50, '#3a4a2a');
  if (!open) for (let i = 2; i < 48; i += 6) rect(ctx, x + i, groundY - 50, 2, 50, '#6a7a4a');
}

function drawWorld(ctx, g) {
  const { level, camera, player: p, session: s } = g;
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  BACKGROUNDS_MISSAO[level.data.background](ctx, VIEW_W, VIEW_H, cx);
  rect(ctx, 0, 0, VIEW_W, VIEW_H, C.dim); // fundo mais apagado: personagens e plataformas se destacam
  ctx.drawImage(g.levelCanvas, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  const L = level.entities;

  for (const pr of L.promessas) {
    if (pr.state === 'gone') continue;
    TL.drawPromessa(ctx, pr.x - cx, pr.y - cy, pr.w, pr.state === 'shaking' && Math.floor(g.time * 30) % 2 === 0, false);
  }
  drawDoor(ctx, L.finish.x - cx, L.finish.y + 48 - cy, g.objectiveDone(), level.data.theme);
  for (const u of g.urnas.values()) drawUrnaBloco(ctx, u.tx * TILE - cx, u.ty * TILE - cy - (u.bump > 0 ? 3 : 0), u.open, g.time);
  for (const cp of L.checkpoints) blit(ctx, cp.active ? M.PNEU.on : M.PNEU.off, cp.x - cx, cp.y + 18 - cy);

  for (const a of g.acampados) {
    const ax = a.x + 4;
    const ay = a.y + 32;
    blit(ctx, a.fed ? E.PATRIOTA.converted : E.PATRIOTA.idle, ax - 3 - cx, ay - cy, p.x < ax);
    if (a.fed && a.timer < 2) { draw(ctx, I.MINI_HEART, ax - cx, ay - 6 - cy); draw(ctx, I.MINI_HEART, ax + 7 - cx, ay - 9 - cy); }
    if (!a.fed) {
      const bob = Math.floor(g.time * 3) % 2;
      rect(ctx, ax - 3 - cx, ay - 14 - bob - cy, 16, 11, '#1a1a1a');
      rect(ctx, ax - 2 - cx, ay - 13 - bob - cy, 14, 9, '#ffffff');
      draw(ctx, M.MARMITA, ax - 1 - cx, ay - 12 - bob - cy);
    }
  }
  const bob = Math.round(Math.sin(g.time * 4));
  for (const m of g.marmitas) if (!m.taken) blit(ctx, M.MARMITA, m.drawX - cx, m.drawY + bob - cy);
  for (const d of g.pendrives) if (!d.taken) blit(ctx, M.PENDRIVE, d.x - cx, d.y + bob - cy);
  for (const c of g.chargers) if (!c.taken) blit(ctx, M.CARREGADOR, c.x - cx, c.y - cy);
  const coinFrame = Math.floor(g.time * 5) % 4 === 3 ? 1 : 0;
  const coin = level.data.theme === 'chocolate' ? M.BOMBOM : I.VOTO[coinFrame];
  for (const v of L.votes) if (!v.taken) blit(ctx, coin, v.x - cx, v.y - cy);
  for (const n of g.notinhas) if (!n.taken) blit(ctx, M.NOTINHA, n.drawX - cx, n.drawY + bob - cy);
  for (const c of g.caixas) {
    const canDeposit = s.notinhas > 0 && Math.abs(p.x - c.x) < 64;
    drawCaixaDeposito(ctx, c.drawX - cx, c.drawY - cy, canDeposit ? 0.5 + 0.5 * Math.sin(g.time * 8) : 0);
  }

  // campo de visão do Fiscal (vermelho quando está vendo o Patrício)
  for (const e of g.enemies) {
    if (e.kind !== 'fiscal' || e.state !== 'walk') continue;
    ctx.fillStyle = fiscalSees(e, p) ? 'rgba(255,64,64,0.3)' : 'rgba(255,235,120,0.16)';
    const eyeX = (e.dir > 0 ? e.x + e.w : e.x) - cx;
    const eyeY = e.y + 6 - cy;
    const farX = eyeX + e.dir * FISCAL_VIEW.range;
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY);
    ctx.lineTo(farX, eyeY - FISCAL_VIEW.height);
    ctx.lineTo(farX, eyeY + FISCAL_VIEW.height + 6);
    ctx.closePath();
    ctx.fill();
  }
  for (const e of g.enemies) {
    if (e.state === 'gone') continue;
    const art = ENEMY_ART[e.kind];
    const x = e.x - 3 - cx;
    const y = e.y - 2 - cy;
    if (e.state === 'converted') {
      draw(ctx, art.converted, x, y, { flip: e.dir < 0, alpha: Math.max(0, 1 - e.timer / 1.6) });
      draw(ctx, I.MINI_HEART, x + 4, y - 6 - e.timer * 10);
    } else {
      blit(ctx, e.state === 'walk' && Math.floor(e.animTime * 4) % 2 ? art.walk : art.idle, x, y, e.dir < 0);
      if (e.state === 'stunned') draw(ctx, M.ZZZ, x + 9, y - 8);
    }
  }
  for (const z of g.zaps) if (z.alive) draw(ctx, M.CORRENTE_ZAP, z.x - cx, z.y - cy, { flip: z.vx < 0, alpha: z.returning ? 0.75 : 1 });

  const blink = p.invuln > 0 && Math.floor(g.time * 20) % 2;
  if (!blink && !(g.fsm.is('DYING') && Math.floor(g.fsm.time * 20) % 2)) {
    blit(ctx, playerFrame(p), p.x - HITBOX.offsetX - cx, p.y - HITBOX.offsetY - cy, p.facing < 0);
  }
}

// =====================================================================
// INTERFACE DURANTE O JOGO
// =====================================================================

function drawPlayUI(ui, g) {
  const cx = Math.round(g.camera.x);
  const cy = Math.round(g.camera.y);
  const L = g.level.entities;

  // nome do destino sobre a porta/portão (o único texto "no cenário")
  const fx = L.finish.x - cx + 24;
  if (fx > -40 && fx < VIEW_W + 40) {
    const label = g.levelData.finishLabel;
    const w = uiMeasure(ui, label, 8, 700) + 10;
    uiPanel(ui, fx - w / 2, L.finish.y + 48 - cy - 78, w, 12, '#c8a020', '#1a1a1a');
    uiText(ui, label, fx, L.finish.y + 48 - cy - 76, { size: 8, weight: 700, color: '#1a1a1a', align: 'center' });
  }

  drawObjectiveArrow(ui, g, cx, cy);
  for (const f of g.floats) uiText(ui, f.text, f.x - cx, f.y - cy, { size: 7, weight: 700, color: f.color, align: 'center', shadow: C.ink, outline: true, alpha: Math.min(1, f.ttl * 2) });
  drawHUD(ui, g);
  if (g.dialog) drawDialog(ui, g.dialog);
  if (g.input?.touchMode) drawTouch(ui);
  if (g.debug) {
    const p = g.player;
    uiPanel(ui, 4, 186, 150, 26, C.panel);
    uiText(ui, `FPS ${g.fps.toFixed(0)} · x ${p.x.toFixed(0)} y ${p.y.toFixed(0)} · ${p.state}`, 8, 190, { size: 7, color: '#7cf27c' });
    uiText(ui, `zaps ${g.zaps.length} · inimigos ${g.enemies.filter((e) => e.state !== 'gone').length}`, 8, 200, { size: 7, color: '#7cf27c' });
  }
}

/** Seta que aponta o próximo objetivo: em cima dele, ou na borda da tela se estiver fora de vista. */
function drawObjectiveArrow(ui, g, cx, cy) {
  const t = g.objectiveTarget?.();
  if (!t || t.x === undefined) return;
  const sx = t.x - cx;
  const sy = t.y - cy;
  const bob = Math.sin(g.time * 6) * 2;
  ui.save();
  ui.fillStyle = C.gold;
  ui.strokeStyle = C.ink;
  ui.lineWidth = 1;
  ui.beginPath();
  if (sx > 8 && sx < VIEW_W - 8) {
    const y = Math.max(46, sy - 12 + bob);
    ui.moveTo(sx - 5, y - 6); ui.lineTo(sx + 5, y - 6); ui.lineTo(sx, y);
  } else {
    const right = sx >= VIEW_W - 8;
    const x = right ? VIEW_W - 6 : 6;
    const y = Math.min(Math.max(sy, 80), 170);
    const d = right ? 1 : -1;
    ui.moveTo(x, y); ui.lineTo(x - d * 8, y - 6); ui.lineTo(x - d * 8, y + 6);
  }
  ui.closePath();
  ui.fill();
  ui.stroke();
  ui.restore();
}

function drawHUD(ui, g) {
  const s = g.session;
  const W = VIEW_W;
  // barra de progresso da fase
  ui.fillStyle = 'rgba(0,0,0,0.45)';
  ui.fillRect(0, 0, W, 2);
  ui.fillStyle = C.gold;
  ui.fillRect(0, 0, Math.round(W * Math.min(1, g.player.x / g.level.entities.finish.x)), 2);

  // esquerda: Fé + vidas
  uiPanel(ui, 4, 5, 100, 25, C.panel);
  draw(ui, M.HUD_FE, 8, 9);
  uiText(ui, 'Fé', 19, 7, { size: 8, weight: 700 });
  ui.fillStyle = '#05070c';
  ui.fillRect(33, 9, 66, 6);
  const fe = s.fe / 100;
  const low = fe < 0.3;
  ui.fillStyle = low ? C.red : C.gold;
  ui.fillRect(34, 10, Math.round(64 * fe), 4);
  for (let i = 0; i < s.lives; i++) draw(ui, I.HEART_FULL, 8 + i * 9, 19);
  if (low && Math.floor(g.time * 3) % 2) uiText(ui, 'Acordando…', 99, 18, { size: 7, color: C.red, align: 'right' });

  // centro: objetivo (o mais importante) + relógio das 72 horas
  uiText(ui, g.objectiveText(), W / 2, 5, { size: 10, weight: 700, color: C.white, align: 'center', shadow: C.ink, outline: true });
  const t = Math.max(0, s.hours72);
  const hh = String(Math.floor(t / 3600)).padStart(2, '0');
  const mm = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const flash = g.clockFlash > 0 && Math.floor(g.time * 8) % 2;
  uiText(ui, `faltam ${hh}:${mm} para o Exército agir`, W / 2, 19, { size: 7, color: flash ? C.gold : '#ff8080', align: 'center', shadow: C.ink, outline: true });

  // direita: Zap, provas e pontos
  const rx = W - 84;
  uiPanel(ui, rx, 5, 80, 25, C.panel);
  draw(ui, M.CORRENTE_ZAP, rx + 4, 8);
  uiText(ui, `×${s.zap}`, rx + 15, 7, { size: 8, weight: 700, color: s.zap ? C.white : C.red });
  draw(ui, M.PENDRIVE, rx + 42, 7);
  uiText(ui, `${s.provas}/${g.pendrives.length}`, rx + 52, 7, { size: 8, weight: 700, color: C.gold });
  uiText(ui, `${s.score.toLocaleString('pt-BR')} pts`, rx + 76, 18, { size: 7, color: C.muted, align: 'right' });
}

/** Caixa de fala fixa abaixo do HUD: rosto + nome de quem fala + texto. Nunca no meio do cenário. */
function drawDialog(ui, d) {
  const x = 46;
  const w = VIEW_W - 92;
  const lines = uiWrap(ui, d.text, w - 36, 8).slice(0, 3);
  const h = 16 + lines.length * 10;
  const y = 34;
  const alpha = Math.min(1, d.ttl * 3);
  ui.save();
  ui.globalAlpha = alpha;
  const accent = d.speaker === 'Patrício' ? C.gold : d.speaker === 'Dica' ? C.blue : C.zap;
  uiPanel(ui, x, y, w, h, C.panelSolid, accent);
  // retrato
  uiPanel(ui, x + 4, y + 4, 22, 22, '#24304c');
  if (d.speaker === 'Patrício') {
    ui.save(); ui.beginPath(); ui.rect(x + 5, y + 5, 20, 20); ui.clip();
    draw(ui, PATRICIO.front, x + 7, y + 7);
    ui.restore();
  } else if (d.speaker === 'Dica') {
    uiText(ui, '?', x + 15, y + 8, { size: 14, weight: 700, color: C.blue, align: 'center' });
  } else {
    ui.fillStyle = C.zap;
    ui.beginPath(); ui.arc(x + 15, y + 15, 7, 0, Math.PI * 2); ui.fill();
    uiText(ui, '!', x + 15, y + 9, { size: 10, weight: 700, color: '#063', align: 'center' });
  }
  uiText(ui, d.speaker, x + 31, y + 4, { size: 7, weight: 700, color: accent });
  lines.forEach((l, i) => uiText(ui, l, x + 31, y + 13 + i * 10, { size: 8, color: C.white }));
  ui.restore();
}

function drawTouch(ui) {
  const labels = { left: '◀', right: '▶', jump: 'Pulo', pause: 'II', throw: 'Zap' };
  ui.save();
  ui.globalAlpha = 0.55;
  for (const b of TOUCH_BUTTONS) {
    uiPanel(ui, b.x, b.y, b.w, b.h, b.action === 'throw' ? '#2a7a4a' : '#2a3350', '#ffffff');
    uiText(ui, labels[b.action], b.x + b.w / 2, b.y + b.h / 2 - 5, { size: 8, weight: 700, align: 'center' });
  }
  ui.restore();
}

function drawPause(ui) {
  ui.fillStyle = 'rgba(8,10,18,0.72)';
  ui.fillRect(0, 0, VIEW_W, VIEW_H);
  uiText(ui, 'Pausa pra rezar', VIEW_W / 2, 64, { size: 16, weight: 700, color: C.gold, align: 'center' });
  const rows = [['Esc / P', 'continuar'], ['R', 'recomeçar a fase'], ['X', 'voltar ao mapa'], ['M', 'liga/desliga o som']];
  rows.forEach(([k, v], i) => {
    uiText(ui, k, VIEW_W / 2 - 8, 100 + i * 14, { size: 9, weight: 700, align: 'right' });
    uiText(ui, v, VIEW_W / 2 + 8, 100 + i * 14, { size: 9, color: C.muted });
  });
}

// =====================================================================
// TELAS
// =====================================================================

function blink(g) { return Math.floor(g.time * 2) % 2 === 0; }

function drawTitle(ctx, ui, g) {
  BACKGROUNDS_MISSAO.quartel(ctx, VIEW_W, VIEW_H, g.time * 8);
  rect(ctx, 0, 0, VIEW_W, VIEW_H, 'rgba(10,24,16,0.5)');
  draw(ctx, PATRICIO.special, VIEW_W / 2 - 24, 78, { scale: 3 });
  for (let i = 0; i < 10; i++) rect(ctx, VIEW_W / 2 + 20 + i * 7, 92 - i * 6, 6 + i, 6, 'rgba(255,248,176,0.3)');
  draw(ctx, CELULAR, VIEW_W / 2 + 18, 96, { scale: 2 });
  draw(ctx, M.DISCO, VIEW_W / 2 + 86, 24 + Math.sin(g.time * 2) * 2);

  uiText(ui, 'BR-WAR', VIEW_W / 2, 10, { size: 32, weight: 700, color: C.gold, align: 'center', shadow: '#0d5a20', outline: true });
  uiPanel(ui, VIEW_W / 2 - 74, 50, 148, 16, '#c8202f');
  uiText(ui, 'Operação Liberta o Mito', VIEW_W / 2, 53, { size: 10, weight: 700, align: 'center' });
  uiText(ui, '"O 01 mandou áudio. Missão dada!"', VIEW_W / 2, 158, { size: 9, align: 'center', shadow: C.ink, outline: true });
  if (blink(g)) uiText(ui, 'Aperte Enter ou toque para começar', VIEW_W / 2, 176, { size: 9, weight: 700, color: C.gold, align: 'center', shadow: C.ink, outline: true });
  uiText(ui, 'Sátira. Feito com auxílio de IA. Fatos com fonte na tela de Checagem.', VIEW_W / 2, 200, { size: 7, color: '#d8e0d0', align: 'center', shadow: C.ink });
}

const MAP_POINTS = [[70, 156], [112, 128], [150, 152], [192, 120], [232, 146], [272, 112], [318, 90]];

function drawMap(ctx, ui, g) {
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#2a6a9a');
  for (let y = 4; y < VIEW_H; y += 8) for (let x = (y / 8) % 2 ? 0 : 6; x < VIEW_W; x += 14) rect(ctx, x, y, 5, 1, '#4a8aba');
  ctx.fillStyle = '#5aa83a';
  ctx.beginPath();
  ctx.moveTo(40, 80); ctx.lineTo(190, 50); ctx.lineTo(310, 56); ctx.lineTo(360, 96); ctx.lineTo(330, 160);
  ctx.lineTo(250, 200); ctx.lineTo(160, 204); ctx.lineTo(80, 190); ctx.lineTo(42, 140); ctx.closePath(); ctx.fill();
  draw(ctx, CARECA_DO_MAL, 18, 40, { alpha: 0.2 });
  for (let i = 0; i < MAP_POINTS.length - 1; i++) {
    const [x1, y1] = MAP_POINTS[i]; const [x2, y2] = MAP_POINTS[i + 1];
    for (let k = 1; k < 8; k++) rect(ctx, Math.round(x1 + ((x2 - x1) * k) / 8), Math.round(y1 + ((y2 - y1) * k) / 8), 3, 3, i < g.unlocked ? '#f5e6a0' : '#3a7a2e');
  }
  rect(ctx, 338, 50, 4, 22, '#ffffff'); rect(ctx, 344, 50, 4, 22, '#ffffff'); rect(ctx, 326, 72, 34, 3, '#ffffff');
  const records = g.save.records ?? {};
  MAP_POINTS.forEach(([x, y], i) => {
    const playable = i < g.levels.length;
    const done = playable && records[g.levels[i].data.id];
    const open = i <= g.unlocked && playable;
    uiPanel(ui, x - 8, y - 8, 17, 17, done ? C.green : open ? '#c8202f' : '#5a5a62', '#10131c');
    uiText(ui, done ? '✓' : open ? String(i + 1) : '?', x + 0.5, y - 5, { size: 9, weight: 700, align: 'center' });
  });
  const [px, py] = MAP_POINTS[g.mapCursor];
  draw(ctx, PATRICIO.front, px - 8, py - 32 - (Math.floor(g.time * 3) % 2));
  uiText(ui, 'Brasília', 343, 38, { size: 8, weight: 700, align: 'center', shadow: C.ink, outline: true });

  const f = FASES[g.mapCursor];
  const rec = records[g.levels[g.mapCursor]?.data.id];
  uiPanel(ui, 8, 6, VIEW_W - 16, 28, C.panelSolid);
  uiText(ui, `Fase ${g.mapCursor + 1} · ${f.ano}`, 16, 9, { size: 7, color: C.gold });
  uiText(ui, f.nome, 16, 18, { size: 11, weight: 700 });
  uiText(ui, '◀ ▶ escolher · Enter jogar', VIEW_W - 16, 9, { size: 7, color: C.muted, align: 'right' });
  uiText(ui, rec ? `Recorde: ${rec.score.toLocaleString('pt-BR')} pts` : 'Objetivo final: soltar o Mito', VIEW_W - 16, 20, { size: 8, color: rec ? '#7cf27c' : C.white, align: 'right' });
  if (g.unlocked + 1 >= g.levels.length && g.levels.length < FASES.length) {
    uiPanel(ui, VIEW_W / 2 - 100, 194, 200, 15, C.panelSolid);
    uiText(ui, `Fases ${g.levels.length + 1} a 7 em produção. Faltam 72 horas.`, VIEW_W / 2, 197, { size: 7, color: C.gold, align: 'center' });
  }
}

function drawMission(ctx, ui, g) {
  const m = g.current.mission;
  BACKGROUNDS_MISSAO[g.levelData.background](ctx, VIEW_W, VIEW_H, 0);
  rect(ctx, 0, 0, VIEW_W, VIEW_H, 'rgba(8,10,18,0.65)');
  const x = 24; const y = 12; const w = VIEW_W - 48; const h = 192;
  uiPanel(ui, x, y, w, h, '#0b3b33', '#d8e8e0');
  ui.fillStyle = '#075e54';
  ui.fillRect(x + 1, y + 1, w - 2, 18);
  ui.fillStyle = C.gold;
  ui.beginPath(); ui.arc(x + 12, y + 10, 6, 0, Math.PI * 2); ui.fill();
  uiText(ui, m.remetente, x + 22, y + 5, { size: 8, weight: 700 });
  uiText(ui, 'Encaminhada com frequência', x + w - 8, y + 6, { size: 7, color: '#a8d8cc', align: 'right' });
  uiText(ui, `Fase ${g.levelData.numero} · ${g.levelData.name}`, x + 10, y + 25, { size: 11, weight: 700, color: C.gold });
  const lines = uiWrap(ui, m.texto, w - 32, 9);
  const bh = lines.length * 13 + 10;
  uiPanel(ui, x + 8, y + 42, w - 16, bh, '#dcf8c6');
  lines.forEach((l, i) => uiText(ui, l, x + 15, y + 47 + i * 13, { size: 9, color: '#10131c' }));
  const by = y + 52 + bh;
  uiText(ui, `Objetivo: ${m.medida}`, x + 10, by, { size: 9, weight: 700, color: '#7cf27c' });
  uiText(ui, m.controles, x + 10, by + 16, { size: 8, color: C.muted });
  draw(ctx, ZERO_UM, x + 10, y + h - 21);
  uiText(ui, 'Objetivo final: soltar o Mito', x + 30, y + h - 15, { size: 8, weight: 700, color: C.gold });
  if (blink(g)) uiText(ui, 'Enter ou toque ▶', x + w - 10, y + h - 15, { size: 8, weight: 700, align: 'right' });
}

const TAG_COLORS = { FATO: '#1f9e3a', FAKE: '#c8202f', MEME: '#f5a020', PIADA: '#8a4ad0', ACUSAÇÃO: '#2f80ed', STATUS: '#5a6a8a' };

function drawChecagem(ctx, ui, g) {
  const c = g.current.checagem;
  const s = g.session;
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#f2f4f7');
  ui.fillStyle = '#f2f4f7';
  ui.fillRect(0, 0, VIEW_W, VIEW_H);
  ui.fillStyle = '#1f2a3d';
  ui.fillRect(0, 0, VIEW_W, 18);
  uiText(ui, c.titulo, VIEW_W / 2, 4, { size: 9, weight: 700, align: 'center' });
  let y = 23;
  for (const it of c.itens) {
    uiPanel(ui, 8, y, 46, 12, TAG_COLORS[it.tag] ?? '#5a5a5a');
    uiText(ui, it.tag, 31, y + 1, { size: 7, weight: 700, align: 'center' });
    const lines = uiWrap(ui, it.texto, VIEW_W - 72, 8);
    lines.forEach((l, i) => uiText(ui, l, 60, y + 1.5 + i * 10.5, { size: 8, color: '#10131c' }));
    y += Math.max(16, lines.length * 10.5 + 6);
  }
  ui.fillStyle = '#c8ccd4';
  ui.fillRect(8, y, VIEW_W - 16, 1);
  y += 5;
  draw(ui, M.PENDRIVE, 8, y);
  const provas = s.provas ? `Provas da fraude: ${s.provas}/${g.pendrives.length} — todas "pasta_nova (2)", 0 arquivos` : `Provas da fraude: 0/${g.pendrives.length} — nenhuma (o que também prova tudo)`;
  uiText(ui, provas, 20, y, { size: 7, color: '#c8202f', weight: 700 });
  y += 13;
  uiText(ui, `${s.score.toLocaleString('pt-BR')} pts · ${g.objectiveText()} · ${Math.floor(s.time)} s`, 8, y, { size: 8, color: '#10131c' });
  if (g.result?.newRecord) uiText(ui, '★ Recorde!', VIEW_W - 8, y - 1, { size: 7, weight: 700, color: '#c8202f', align: 'right' });

  ui.fillStyle = '#1f2a3d';
  ui.fillRect(0, VIEW_H - 32, VIEW_W, 32);
  uiText(ui, g.result?.headline ?? '', VIEW_W / 2, VIEW_H - 29, { size: 8, weight: 700, color: C.gold, align: 'center' });
  uiText(ui, `Fontes: ${c.fontes.map((f) => f.nome.split(':')[0]).join(', ')} (links no README)`, VIEW_W / 2, VIEW_H - 19, { size: 7, color: C.muted, align: 'center' });
  const hasNext = g.levelIndex + 1 < g.levels.length;
  const next = FASES[g.levelIndex + 1];
  const hint = hasNext ? `Enter: próxima fase (${next.nome})` : `Enter: mapa · fase ${g.levelIndex + 2} "${next?.nome ?? ''}" em breve`;
  uiText(ui, `${hint} · R: jogar de novo`, VIEW_W / 2, VIEW_H - 10, { size: 7, weight: 700, align: 'center' });
}

function drawGameOver(ctx, ui, g) {
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#1a0a0e');
  draw(ctx, PATRICIO.awake, VIEW_W / 2 - 24, 24, { scale: 3 });
  const fe = g.session.fe <= 0;
  uiText(ui, fe ? 'Você acordou.' : 'Candidatura a patriota impugnada', VIEW_W / 2, 108, { size: fe ? 16 : 12, weight: 700, align: 'center' });
  uiText(ui, fe ? 'O Patrício leu checagens demais e perdeu a fé.' : 'Caiu em buracos demais. Todos de obras paradas.', VIEW_W / 2, 132, { size: 8, color: C.muted, align: 'center' });
  uiText(ui, '"…mas também, quem checa os checadores?"', VIEW_W / 2, 146, { size: 8, color: C.gold, align: 'center' });
  uiText(ui, `${g.session.score.toLocaleString('pt-BR')} pts`, VIEW_W / 2, 164, { size: 8, align: 'center' });
  uiText(ui, 'Enter ou toque: voltar pro Grupo e recuperar a fé', VIEW_W / 2, 184, { size: 8, weight: 700, align: 'center' });
  uiText(ui, 'Esc: mapa', VIEW_W / 2, 198, { size: 7, color: C.muted, align: 'center' });
}

export { drawRotate } from './render.js';
