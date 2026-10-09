// Desenho da Missão Patriota: fase, entidades, HUD e telas (título, missão, pausa, game over, Checagem).

import { VIEW_W, VIEW_H } from '../config/constants.js';
import { draw, rect, roundRect, flatPalette } from '../art/pixel.js';
import { text, measure } from '../art/font.js';
import * as E from '../art/enemies.js';
import * as I from '../art/items.js';
import * as TL from '../art/tiles.js';
import { drawBalloon, drawFloat, drawPlantao, wrapText, UI } from '../art/hud.js';
import { PATRICIO, CHECADOR, FISCAL, ZERO_UM, CARECA_DO_MAL } from '../art/missao/characters.js';
import { FASES } from '../data/missao/fases.js';
import * as M from '../art/missao/items.js';
import { BACKGROUNDS_MISSAO } from '../art/missao/backgrounds.js';
import { drawHUDMissao } from '../art/missao/hud.js';
import { HITBOX } from '../data/characters.js';
import { TOUCH_BUTTONS } from './input.js';
import { drawRotate as drawRotateBase } from './render.js';
import { drawUrnaBloco } from '../art/missao/items.js';

export const drawRotate = drawRotateBase;

const ENEMY_ART = { militante: E.MILITANTE, sindicalista: E.SINDICALISTA, checador: CHECADOR, fiscal: FISCAL };

// cache de sprites em canvas (desempenho no celular)
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

function drawPortao(ctx, x, groundY, open, label, theme) {
  if (theme === 'galpao') {
    // sala do "código-fonte": porta de servidor com luzinhas
    rect(ctx, x - 8, groundY - 64, 64, 64, '#2a2e38');
    rect(ctx, x, groundY - 50, 48, 50, open ? '#1a1a1a' : '#4a5260');
    for (let i = 0; i < 6; i++) rect(ctx, x + 6 + i * 7, groundY - 44, 3, 2, i % 2 ? '#7cf27c' : '#ff4040');
    roundRect(ctx, x - 4, groundY - 62, 56, 10, '#c8202f');
    text(ctx, label, x + 24, groundY - 60, { color: '#ffffff', align: 'center' });
    return;
  }
  rect(ctx, x - 8, groundY - 64, 64, 64, '#e8dcc0');
  rect(ctx, x - 8, groundY - 64, 64, 5, '#c8b890');
  rect(ctx, x, groundY - 50, 48, 50, '#3a4a2a');
  if (!open) for (let i = 2; i < 48; i += 6) rect(ctx, x + i, groundY - 50, 2, 50, '#6a7a4a');
  roundRect(ctx, x + 4, groundY - 62, 40, 10, '#1f3a2a');
  text(ctx, label, x + 24, groundY - 60, { color: '#f5d000', align: 'center' });
}

export function renderMissao(ctx, g) {
  const st = g.fsm.state;
  if (st === 'TITLE') return drawTitle(ctx, g);
  if (st === 'MAP') return drawMap(ctx, g);
  if (st === 'MISSION') return drawMission(ctx, g);
  if (st === 'CHECAGEM') return drawChecagem(ctx, g);

  const { level, camera, player: p, session: s } = g;
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  const groundY = (y) => y - cy;
  BACKGROUNDS_MISSAO[level.data.background](ctx, VIEW_W, VIEW_H, cx);
  ctx.drawImage(g.levelCanvas, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  const L = level.entities;

  for (const pr of L.promessas) {
    if (pr.state === 'gone') continue;
    TL.drawPromessa(ctx, pr.x - cx, pr.y - cy, pr.w, pr.state === 'shaking' && Math.floor(g.time * 30) % 2 === 0);
  }
  drawPortao(ctx, L.finish.x - cx, groundY(L.finish.y + 48), g.objectiveDone(), level.data.finishLabel, level.data.theme);
  for (const u of g.urnas.values()) drawUrnaBloco(ctx, u.tx * 16 - cx, u.ty * 16 - cy - (u.bump > 0 ? 3 : 0), u.open, g.time);
  for (const cp of L.checkpoints) blit(ctx, cp.active ? M.PNEU.on : M.PNEU.off, cp.x - cx, cp.y + 18 - cy);

  // acampados (recebem marmita)
  for (const a of g.acampados) {
    const spr = a.fed ? E.PATRIOTA.converted : E.PATRIOTA.idle;
    const ax = a.x + 4; // posição do sprite dentro da área de entrega
    const ay = a.y + 32;
    blit(ctx, spr, ax - 3 - cx, ay - cy, p.x < ax);
    if (a.fed && a.timer < 2) { draw(ctx, I.MINI_HEART, ax - cx, ay - 6 - cy); draw(ctx, I.MINI_HEART, ax + 7 - cx, ay - 9 - cy); }
    if (!a.fed) {
      const bob = Math.floor(g.time * 3) % 2;
      roundRect(ctx, ax - 2 - cx, ay - 13 - bob - cy, 14, 10, '#ffffff', '#1a1a1a');
      draw(ctx, M.MARMITA, ax - cx, ay - 11 - bob - cy);
    }
  }
  const bob = Math.round(Math.sin(g.time * 4));
  for (const m of g.marmitas) if (!m.taken) blit(ctx, M.MARMITA, m.drawX - cx, m.drawY + bob - cy);
  for (const d of g.pendrives) if (!d.taken) blit(ctx, M.PENDRIVE, d.x - cx, d.y + bob - cy);
  for (const c of g.chargers) if (!c.taken) blit(ctx, M.CARREGADOR, c.x - cx, c.y - cy);
  const coinFrame = Math.floor(g.time * 5) % 4 === 3 ? 1 : 0;
  for (const v of L.votes) if (!v.taken) blit(ctx, I.VOTO[coinFrame], v.x - cx, v.y - cy);

  // inimigos
  for (const e of g.enemies) {
    if (e.state === 'gone') continue;
    const art = ENEMY_ART[e.kind];
    const x = e.x - 3 - cx;
    const y = e.y - 2 - cy;
    if (e.state === 'converted') {
      draw(ctx, art.converted, x, y, { flip: e.dir < 0, alpha: Math.max(0, 1 - e.timer / 1.6) });
      draw(ctx, I.MINI_HEART, x + 4, y - 6 - e.timer * 10);
    } else {
      const spr = e.state === 'walk' && Math.floor(e.animTime * 4) % 2 ? art.walk : art.idle;
      blit(ctx, spr, x, y, e.dir < 0);
      if (e.state === 'stunned') draw(ctx, M.ZZZ, x + 9, y - 8);
    }
  }

  // correntes de Zap
  for (const z of g.zaps) {
    if (!z.alive) continue;
    draw(ctx, M.CORRENTE_ZAP, z.x - cx, z.y - cy, { flip: z.vx < 0, alpha: z.returning ? 0.75 : 1 });
  }

  // Patrício
  const blink = p.invuln > 0 && Math.floor(g.time * 20) % 2;
  if (!blink && !(g.fsm.is('DYING') && Math.floor(g.fsm.time * 20) % 2)) {
    blit(ctx, playerFrame(p), p.x - HITBOX.offsetX - cx, p.y - HITBOX.offsetY - cy, p.facing < 0);
  }

  for (const f of g.floats) drawFloat(ctx, Math.round(f.x - cx), Math.round(f.y - cy), f.text, f.color);
  if (g.balloon) drawBalloon(ctx, Math.round(p.x + p.w / 2 - cx), Math.min(Math.round(p.y - 4 - cy), VIEW_H - 40), g.balloon.text, { maxWidth: 150 });
  if (g.banner) drawPlantao(ctx, VIEW_W, g.banner.label, g.banner.text, 42);

  drawHUDMissao(ctx, VIEW_W, {
    fe: s.fe / 100, lives: s.lives, score: s.score, votes: s.votes, zap: s.zap, provas: s.provas,
    provasMax: g.pendrives.length, hours72: s.hours72, progress: Math.min(1, p.x / L.finish.x),
    objective: g.objectiveText(),
  });

  if (g.input.touchMode) drawTouch(ctx);
  if (g.debug) drawDebug(ctx, g);
  if (g.fsm.is('PAUSED')) drawPause(ctx);
  if (g.fsm.is('GAMEOVER')) drawGameOver(ctx, g);
}

function drawTouch(ctx) {
  const labels = { left: '◀', right: '▶', jump: 'PULO', pause: 'II', throw: 'ZAP' };
  ctx.globalAlpha = 0.45;
  for (const b of TOUCH_BUTTONS) {
    roundRect(ctx, b.x, b.y, b.w, b.h, b.action === 'throw' ? '#7cf27c' : '#ffffff', '#1a1a1a');
    text(ctx, labels[b.action], b.x + b.w / 2, b.y + b.h / 2 - 2, { color: UI.ink, align: 'center' });
  }
  ctx.globalAlpha = 1;
}

function drawDebug(ctx, g) {
  const p = g.player;
  const lines = [`FPS ${g.fps.toFixed(0)}`, `X ${p.x.toFixed(0)} Y ${p.y.toFixed(0)} ${p.state}`, `ZAPS ${g.zaps.length} INIMIGOS ${g.enemies.filter((e) => e.state !== 'gone').length}`];
  rect(ctx, 2, 44, 130, lines.length * 8 + 6, 'rgba(0,0,0,0.7)');
  lines.forEach((l, i) => text(ctx, l, 5, 48 + i * 8, { color: '#7cf27c' }));
}

function dim(ctx, a = 0.6) { rect(ctx, 0, 0, VIEW_W, VIEW_H, `rgba(10,10,20,${a})`); }

function drawPause(ctx) {
  dim(ctx);
  text(ctx, 'PAUSA PRA REZAR', VIEW_W / 2, 70, { color: UI.gold, scale: 2, align: 'center', shadow: UI.ink, outline: true });
  text(ctx, 'ESC / P  CONTINUAR', VIEW_W / 2, 105, { color: UI.white, align: 'center' });
  text(ctx, 'R  RECOMEÇAR A FASE', VIEW_W / 2, 118, { color: UI.white, align: 'center' });
  text(ctx, 'X  VOLTAR AO MAPA', VIEW_W / 2, 131, { color: UI.white, align: 'center' });
  text(ctx, 'M  LIGA/DESLIGA O SOM', VIEW_W / 2, 144, { color: UI.white, align: 'center' });
}

function drawGameOver(ctx, g) {
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#1a0a0e');
  draw(ctx, PATRICIO.awake, VIEW_W / 2 - 24, 30, { scale: 3 });
  const fe = g.session.fe <= 0;
  text(ctx, fe ? 'VOCÊ ACORDOU.' : 'CANDIDATURA A PATRIOTA IMPUGNADA', VIEW_W / 2, 118, { color: '#ffffff', scale: fe ? 2 : 1, align: 'center' });
  text(ctx, fe ? 'O PATRÍCIO LEU CHECAGENS DEMAIS E PERDEU A FÉ.' : 'CAIU EM BURACOS DEMAIS. TODOS DE OBRAS PARADAS.', VIEW_W / 2, 140, { color: '#c8d0e0', align: 'center' });
  text(ctx, '"...MAS TAMBÉM, QUEM CHECA OS CHECADORES?"', VIEW_W / 2, 154, { color: UI.gold, align: 'center' });
  text(ctx, `PONTOS ${g.session.score}`, VIEW_W / 2, 172, { color: '#ffffff', align: 'center' });
  text(ctx, '▶ ENTER / TOQUE: VOLTAR PRO GRUPO E RECUPERAR A FÉ', VIEW_W / 2, 188, { color: '#ffffff', align: 'center' });
  text(ctx, 'ESC: MAPA', VIEW_W / 2, 200, { color: '#8a94b0', align: 'center' });
}

function drawTitle(ctx, g) {
  g.titleScreen(ctx);
}

function drawMission(ctx, g) {
  const m = g.current.mission;
  BACKGROUNDS_MISSAO[g.levelData.background](ctx, VIEW_W, VIEW_H, 0);
  dim(ctx, 0.55);
  roundRect(ctx, 20, 14, 344, 188, '#f4efe2');
  roundRect(ctx, 22, 16, 340, 184, '#0b3b33');
  // cabeçalho de "mensagem encaminhada"
  rect(ctx, 22, 16, 340, 18, '#075e54');
  roundRect(ctx, 28, 19, 12, 12, '#f5d000');
  text(ctx, m.remetente, 46, 22, { color: '#ffffff' });
  text(ctx, '↪ ENCAMINHADA COM FREQUÊNCIA', 356, 22, { color: '#a8d8cc', align: 'right' });
  text(ctx, `FASE ${g.levelData.numero} - ${g.levelData.name}`, 32, 42, { color: '#f5d000', scale: 1 });
  roundRect(ctx, 30, 54, 324, 84, '#d9fdd3');
  wrapText(m.texto, 312).forEach((l, i) => text(ctx, l, 36, 59 + i * 10, { color: '#1a1a1a' }));
  text(ctx, `MEDIDA: ${m.medida}`, 32, 146, { color: '#7cf27c' });
  text(ctx, m.controles, 32, 158, { color: '#c8d0e0' });
  draw(ctx, PATRICIO.front, 320, 140);
  rect(ctx, 22, 176, 340, 24, '#1f9e3a');
  const blink = Math.floor(g.time * 2) % 2;
  text(ctx, blink ? 'APERTE PULO / TOQUE PARA COMEÇAR ▶' : 'APERTE PULO / TOQUE PARA COMEÇAR', 352, 185, { color: '#ffffff', align: 'right' });
  draw(ctx, ZERO_UM, 30, 178, { alpha: 0.9 });
  text(ctx, 'OBJETIVO FINAL: SOLTAR O MITO', 52, 185, { color: '#f5d000' });
}

const TAG_COLORS = { FATO: '#1f9e3a', FAKE: '#c8202f', MEME: '#f5a020', PIADA: '#8a4ad0', ACUSAÇÃO: '#2f80ed' };

function drawChecagem(ctx, g) {
  const c = g.current.checagem;
  const s = g.session;
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#f4f6f8');
  rect(ctx, 0, 0, VIEW_W, 18, '#1f2a3d');
  text(ctx, c.titulo, VIEW_W / 2, 7, { color: '#ffffff', align: 'center' });
  let y = 24;
  for (const it of c.itens) {
    roundRect(ctx, 8, y, 36, 10, TAG_COLORS[it.tag] ?? '#5a5a5a');
    text(ctx, it.tag, 26, y + 3, { color: '#ffffff', align: 'center' });
    const lines = wrapText(it.texto, 324);
    lines.forEach((l, i) => text(ctx, l, 50, y + 3 + i * 9, { color: '#1a1a1a' }));
    y += Math.max(14, lines.length * 9 + 5);
  }
  rect(ctx, 8, y, VIEW_W - 16, 1, '#c8ccd4');
  y += 5;
  draw(ctx, M.PENDRIVE, 8, y - 1);
  const provas = s.provas ? `PROVAS DA FRAUDE: ${s.provas}/${g.pendrives.length}  ·  ${'PASTA_NOVA (2): 0 ARQUIVOS  '.repeat(Math.min(s.provas, 2)).trim()}` : `PROVAS DA FRAUDE: 0/${g.pendrives.length}  ·  NENHUMA (O QUE TAMBÉM PROVA TUDO)`;
  text(ctx, provas, 20, y, { color: '#c8202f' });
  y += 11;
  text(ctx, `PONTOS ${s.score}   ${g.objectiveText()}   VOTOS ${s.votes}   TEMPO ${Math.floor(s.time)}S`, 8, y, { color: '#1a1a1a' });
  if (g.result?.newRecord) text(ctx, '★ RECORDE!', VIEW_W - 8, y, { color: '#c8202f', align: 'right' });
  rect(ctx, 0, VIEW_H - 30, VIEW_W, 30, '#1f2a3d');
  text(ctx, g.result?.headline ?? '', VIEW_W / 2, VIEW_H - 26, { color: '#f5d000', align: 'center' });
  text(ctx, `FONTES: ${c.fontes.map((f) => f.nome.split(':')[0]).join(', ')} (LINKS NO README)`, VIEW_W / 2, VIEW_H - 16, { color: '#a8b0c0', align: 'center' });
  const next = FASES[g.levelIndex + 1];
  const hasNext = g.levelIndex + 1 < g.levels.length;
  const hint = hasNext ? `ENTER: PRÓXIMA FASE (${next.nome})` : `ENTER: MAPA · FASE ${g.levelIndex + 2} "${next?.nome ?? ''}" EM BREVE`;
  text(ctx, `${hint}   ·   R: JOGAR DE NOVO`, VIEW_W / 2, VIEW_H - 7, { color: '#ffffff', align: 'center' });
}

// ---------- mapa da Operação: 7 pontos até Brasília ----------
const MAP_POINTS = [[70, 156], [112, 128], [150, 152], [192, 120], [232, 146], [272, 112], [318, 90]];

function drawMap(ctx, g) {
  rect(ctx, 0, 0, VIEW_W, VIEW_H, '#2a6a9a');
  for (let y = 4; y < VIEW_H; y += 8) for (let x = (y / 8) % 2 ? 0 : 6; x < VIEW_W; x += 14) rect(ctx, x, y, 5, 1, '#4a8aba');
  ctx.fillStyle = '#5aa83a';
  ctx.beginPath();
  ctx.moveTo(40, 80); ctx.lineTo(190, 50); ctx.lineTo(310, 56); ctx.lineTo(360, 96); ctx.lineTo(330, 160);
  ctx.lineTo(250, 200); ctx.lineTo(160, 204); ctx.lineTo(80, 190); ctx.lineTo(42, 140); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 18; i++) rect(ctx, 70 + ((i * 47) % 250), 76 + ((i * 31) % 110), 8, 5, '#4a8a2e');
  draw(ctx, CARECA_DO_MAL, 18, 34, { alpha: 0.25 });
  // trilha
  for (let i = 0; i < MAP_POINTS.length - 1; i++) {
    const [x1, y1] = MAP_POINTS[i]; const [x2, y2] = MAP_POINTS[i + 1];
    for (let k = 1; k < 8; k++) rect(ctx, Math.round(x1 + ((x2 - x1) * k) / 8), Math.round(y1 + ((y2 - y1) * k) / 8), 3, 3, i < g.unlocked ? '#f5e6a0' : '#3a7a2e');
  }
  // Brasília (destino: soltar o Mito)
  rect(ctx, 338, 46, 4, 22, '#ffffff'); rect(ctx, 344, 46, 4, 22, '#ffffff'); rect(ctx, 326, 68, 34, 3, '#ffffff');
  text(ctx, 'BRASÍLIA', 343, 36, { color: '#ffffff', align: 'center', shadow: '#1a1a1a', outline: true });
  const records = g.save.records ?? {};
  MAP_POINTS.forEach(([x, y], i) => {
    const playable = i < g.levels.length;
    const done = playable && records[g.levels[i].data.id];
    const open = i <= g.unlocked && playable;
    const fill = done ? '#1f9e3a' : open ? '#c8202f' : '#5a5a62';
    roundRect(ctx, x - 7, y - 7, 15, 15, fill, '#1a1a1a');
    text(ctx, done ? '✓' : open ? String(i + 1) : '?', x + (done ? -2 : 0), y - 2, { color: '#ffffff', align: done ? 'left' : 'center' });
  });
  const [px, py] = MAP_POINTS[g.mapCursor];
  draw(ctx, PATRICIO.front, px - 8, py - 30 - (Math.floor(g.time * 3) % 2));
  // painel
  const f = FASES[g.mapCursor];
  const rec = records[g.levels[g.mapCursor]?.data.id];
  roundRect(ctx, 8, 6, VIEW_W - 16, 26, '#0e1424');
  text(ctx, `FASE ${g.mapCursor + 1} · ${f.ano}`, 16, 10, { color: '#f5d000' });
  text(ctx, f.nome, 16, 20, { color: '#ffffff' });
  text(ctx, 'PULO: ENTRAR  ◀ ▶: ESCOLHER', VIEW_W - 16, 10, { color: '#c8d0e0', align: 'right' });
  text(ctx, rec ? `RECORDE ${rec.score}` : 'OBJETIVO FINAL: SOLTAR O MITO', VIEW_W - 16, 20, { color: rec ? '#7cf27c' : '#c8d0e0', align: 'right' });
  if (g.unlocked + 1 >= g.levels.length && g.levels.length < FASES.length) {
    roundRect(ctx, 96, 192, 192, 14, '#0e1424');
    text(ctx, `FASES ${g.levels.length + 1}-7 EM PRODUÇÃO. FALTAM 72 HORAS.`, VIEW_W / 2, 196, { color: '#f5d000', align: 'center' });
  }
}
