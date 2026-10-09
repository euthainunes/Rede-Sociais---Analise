// Cenários da Missão Patriota (parallax). Mesmo contrato de backgrounds.js: (ctx, w, h, camX).

import { rect, rng, roundRect } from '../pixel.js';
import { text } from '../font.js';
import { draw } from '../pixel.js';
import { planalto as planaltoBase, grupo as grupoBase } from '../backgrounds.js';
import { CARECA_DO_MAL } from './characters.js';

const wrap = (v, p) => ((v % p) + p) % p;
function sky(ctx, w, h, colors) {
  const band = Math.ceil(h / colors.length);
  colors.forEach((c, i) => rect(ctx, 0, i * band, w, band + 1, c));
}
function clouds(ctx, camX, y, color, seed, count = 6) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const cx = Math.round(wrap(r() * 600 - camX * 0.1, 600)) - 100;
    const cy = y + Math.round(r() * 30);
    const cw = 24 + Math.round(r() * 24);
    rect(ctx, cx, cy + 3, cw, 5, color);
    rect(ctx, cx + 4, cy, cw - 12, 4, color);
    rect(ctx, cx + 8, cy - 2, 10, 3, color);
  }
}
function faixa(ctx, x, y, w, label, bg = '#ffffff', fg = '#1a1a1a') {
  rect(ctx, x, y, w, 11, bg);
  rect(ctx, x, y + 10, w, 1, 'rgba(0,0,0,0.25)');
  rect(ctx, x - 1, y - 2, 1, 16, '#5a3a1a');
  rect(ctx, x + w, y - 2, 1, 16, '#5a3a1a');
  text(ctx, label, x + w / 2, y + 3, { color: fg, align: 'center' });
}
function flag(ctx, x, y, s = 1) {
  rect(ctx, x, y, 14 * s, 9 * s, '#1f9e3a');
  for (let i = 0; i < 5 * s; i++) rect(ctx, x + 7 * s - i - 2 * s + 1, y + 1 + i * 0.7, (i + 2 * s) * 2 - 2, 1, '#f5d000');
  for (let i = 0; i < 5 * s; i++) rect(ctx, x + 7 * s - i - 2 * s + 1, y + 8 * s - i * 0.7, (i + 2 * s) * 2 - 2, 1, '#f5d000');
  rect(ctx, x + 5 * s, y + 3 * s, 4 * s, 3 * s, '#2a5db0');
}
/** A silhueta do Careca do Mal escondida no cenário (a paranoia do Patrício). */
function paranoia(ctx, x, y, alpha = 0.18) {
  draw(ctx, CARECA_DO_MAL, x, y, { alpha });
}

// ---------------- Fase 1: Acampamento do Quartel ----------------
export function quartel(ctx, w, h, camX = 0) {
  sky(ctx, w, h, ['#6fb6e8', '#86c3ec', '#9ed0f0', '#b8ddf2', '#d2e9f4', '#e8f4f6']);
  clouds(ctx, camX, 12, '#ffffff', 9);
  const far = Math.round(camX * 0.2);
  // morros e uma nuvem suspeita
  for (let x = 0; x < w; x++) rect(ctx, x, 112 - Math.round(Math.sin((x + far) / 60) * 10 + Math.sin((x + far) / 17) * 3), 1, h, '#6a9a5a');
  paranoia(ctx, Math.round(wrap(260 - far, 700)) - 40, 30, 0.12);
  // muro do quartel com guarita e portão
  const mid = Math.round(camX * 0.5);
  const qx = Math.round(wrap(40 - mid, 640)) - 120;
  rect(ctx, qx, 100, 420, 68, '#e8dcc0');
  rect(ctx, qx, 100, 420, 4, '#c8b890');
  for (let i = 0; i < 420; i += 30) rect(ctx, qx + i, 104, 2, 64, '#d0c4a6');
  rect(ctx, qx + 160, 120, 60, 48, '#3a4a2a'); // portão
  for (let i = 0; i < 60; i += 6) rect(ctx, qx + 160 + i, 120, 2, 48, '#5a6a3a');
  rect(ctx, qx + 150, 80, 22, 40, '#d8ccb0'); // guarita
  rect(ctx, qx + 148, 76, 26, 6, '#7a6a4a');
  rect(ctx, qx + 154, 88, 14, 8, '#3a4a5a');
  // faixas penduradas no muro (sem texto: o cenário não compete com a leitura)
  faixa(ctx, qx + 20, 132, 100, '');
  faixa(ctx, qx + 250, 132, 96, '', '#f5d000');
  // mastro com bandeira
  rect(ctx, qx + 236, 46, 2, 54, '#5a5a5a');
  flag(ctx, qx + 238, 46, 2);
  // barracas coloridas na frente do muro
  const cols = ['#2f80ed', '#f5d000', '#1f9e3a', '#e8735a', '#ffffff'];
  const r = rng(5);
  for (let i = 0; i < 14; i++) {
    const tx = Math.round(wrap(i * 46 - mid, 644)) - 60;
    const tw = 30 + Math.floor(r() * 10);
    const c = cols[i % cols.length];
    for (let k = 0; k < tw / 2; k++) rect(ctx, tx + k, 168 - Math.round(k * 0.9), tw - k * 2, 1, c);
    rect(ctx, tx + tw / 2 - 3, 160, 6, 8, '#1a1a1a');
  }
  // churrasqueira com fumaça
  const cx = Math.round(wrap(200 - mid, 644)) - 60;
  rect(ctx, cx, 156, 16, 12, '#3a3a3a');
  rect(ctx, cx - 2, 154, 20, 3, '#6a6a6a');
  for (let i = 0; i < 4; i++) rect(ctx, cx + 4 + (i % 2) * 4, 146 - i * 7, 6, 5, 'rgba(220,220,220,0.6)');
}

// ---------------- Fase 2: A Urna Fraudada (galpão de urnas) ----------------
export function galpao(ctx, w, h, camX = 0) {
  rect(ctx, 0, 0, w, h, '#3a3e48');
  const far = Math.round(camX * 0.2);
  // parede de chapas e janelas altas
  for (let x = -20; x < w + 20; x += 20) rect(ctx, x - wrap(far, 20), 0, 1, 180, '#30343c');
  for (let i = 0; i < 5; i++) {
    const wx = Math.round(wrap(i * 120 - far, 600)) - 60;
    rect(ctx, wx, 14, 60, 20, '#8aa8c8');
    for (let k = 0; k < 60; k += 10) rect(ctx, wx + k, 14, 1, 20, '#3a3e48');
  }
  paranoia(ctx, Math.round(wrap(330 - far, 600)) - 60, 16, 0.2);
  // estantes cheias de urnas (camada do meio)
  const mid = Math.round(camX * 0.5);
  for (let i = 0; i < 6; i++) {
    const sx = Math.round(wrap(i * 110 - mid, 660)) - 80;
    for (let lvl = 0; lvl < 4; lvl++) {
      const y = 64 + lvl * 28;
      rect(ctx, sx, y + 20, 90, 3, '#6a7a8a');
      for (let k = 0; k < 6; k++) {
        rect(ctx, sx + 4 + k * 14, y + 8, 12, 12, '#1a1a1a');
        rect(ctx, sx + 5 + k * 14, y + 9, 10, 10, '#c8c8c8');
        rect(ctx, sx + 7 + k * 14, y + 11, 6, 3, '#3a4a3a');
      }
    }
    rect(ctx, sx, 64, 2, 120, '#6a7a8a');
    rect(ctx, sx + 88, 64, 2, 120, '#6a7a8a');
  }
  // penumbra: o fundo fica escuro para as urnas jogáveis se destacarem
  rect(ctx, 0, 0, w, h, 'rgba(16,20,30,0.5)');
}

// ---------------- Fase 2 (antiga): Rodovia do Caminhão ----------------
export function rodovia(ctx, w, h, camX = 0) {
  sky(ctx, w, h, ['#8ac4f0', '#9dcef2', '#b2d8f4', '#c8e2f6', '#ddecf6', '#eef5f6']);
  clouds(ctx, camX, 10, '#ffffff', 21);
  const far = Math.round(camX * 0.15);
  // plantação de soja em faixas até o horizonte
  rect(ctx, 0, 118, w, 60, '#7ab85a');
  for (let y = 120; y < 178; y += 4) for (let x = -10; x < w; x += 10) rect(ctx, x - wrap(far, 10) + ((y / 4) % 2) * 5, y, 6, 2, '#5a9a3e');
  // silo e caixa d'água distantes
  const sx = Math.round(wrap(300 - far, 600)) - 60;
  rect(ctx, sx, 84, 18, 34, '#c8c8d0'); rect(ctx, sx, 80, 18, 6, '#9a9aa8');
  rect(ctx, sx + 24, 92, 14, 26, '#c8c8d0');
  // placas da rodovia (meio)
  const mid = Math.round(camX * 0.5);
  for (let i = 0; i < 3; i++) {
    const px = Math.round(wrap(i * 200 - mid, 600)) - 80;
    rect(ctx, px + 20, 120, 2, 50, '#6a6a6a');
    rect(ctx, px + 60, 120, 2, 50, '#6a6a6a');
    const labels = [['BRASÍLIA 1.015 KM', 'QUARTEL MAIS PRÓXIMO 2 KM'], ['ATENÇÃO', 'PATRIOTA NO PARA-BRISA'], ['BR-116', 'PEDÁGIO: R$ 72']];
    roundRect(ctx, px - 14, 96, 110, 26, '#1f7a3a', '#ffffff');
    labels[i].forEach((l, k) => text(ctx, l, px + 41, 101 + k * 9, { color: '#ffffff', align: 'center' }));
  }
}

// ---------------- Fase 3: A Fábrica de Chocolate ----------------
export function chocolate(ctx, w, h, camX = 0) {
  rect(ctx, 0, 0, w, h, '#3a1c0e');
  // parede de azulejos
  for (let y = 0; y < 180; y += 10) for (let x = -10; x < w + 10; x += 10) {
    const sx = x - wrap(Math.round(camX * 0.2), 10);
    rect(ctx, sx, y, 9, 9, (x / 10 + y / 10) % 2 ? '#f0e2cc' : '#e8d6ba');
  }
  rect(ctx, 0, 120, w, 4, '#6b3a1a');
  const mid = Math.round(camX * 0.5);
  // tanques com chocolate e canos
  for (let i = 0; i < 4; i++) {
    const tx = Math.round(wrap(i * 150 - mid, 600)) - 80;
    rect(ctx, tx, 70, 50, 96, '#b8bcc4');
    rect(ctx, tx + 2, 72, 46, 4, '#e0e4ea');
    rect(ctx, tx + 6, 90, 38, 30, '#6b3a1a');
    rect(ctx, tx + 6, 90, 38, 2, '#9a5a2a');
    rect(ctx, tx + 50, 40, 6, 6, '#8a8e96');
    rect(ctx, tx + 22, 40, 34, 4, '#8a8e96');
    rect(ctx, tx + 22, 40, 4, 30, '#8a8e96');
  }
  // letreiro e caixa registradora com "dinheiro vivo" voando
  const lx = Math.round(wrap(230 - mid, 600)) - 80;
  roundRect(ctx, lx, 40, 140, 22, '#6b3a1a', '#f5d000');
  for (let i = 0; i < 6; i++) rect(ctx, lx + 14 + i * 20, 48, 12, 6, '#9a5a2a'); // letreiro decorativo, sem texto
  const rx = Math.round(wrap(400 - mid, 600)) - 80;
  rect(ctx, rx, 140, 30, 26, '#5a5a5a');
  rect(ctx, rx + 4, 132, 22, 10, '#3a3a3a');

  const r = rng(3);
  for (let i = 0; i < 6; i++) {
    const nx = rx - 10 + Math.floor(r() * 50);
    const ny = 96 + Math.floor(r() * 30);
    rect(ctx, nx, ny, 9, 5, '#7ab85a');
    rect(ctx, nx + 3, ny + 1, 3, 3, '#4a8a3a');
  }
}

// ---------------- Fase 4: Missão Tio Sam (porto) ----------------
export function porto(ctx, w, h, camX = 0) {
  sky(ctx, w, h, ['#7fb2d8', '#93bfde', '#a8cbe2', '#bdd6e6']);
  clouds(ctx, camX, 10, '#f4f8fa', 17);
  rect(ctx, 0, 120, w, 60, '#2a6a9a'); // mar
  for (let y = 124; y < 176; y += 6) for (let x = 0; x < w; x += 18) rect(ctx, x + ((y / 6) % 3) * 6 - wrap(Math.round(camX * 0.1), 18), y, 8, 1, '#4a8aba');
  const far = Math.round(camX * 0.2);
  // navio cargueiro
  const nx = Math.round(wrap(180 - far, 700)) - 100;
  rect(ctx, nx, 104, 160, 18, '#8a1420');
  rect(ctx, nx + 4, 100, 152, 4, '#1a1a1a');
  for (let i = 0; i < 6; i++) rect(ctx, nx + 10 + i * 22, 86, 20, 14, ['#2f80ed', '#f5d000', '#1f9e3a', '#e8735a', '#ffffff', '#c8202f'][i]);
  rect(ctx, nx + 136, 70, 18, 30, '#ffffff');
  text(ctx, 'EXPORTA BRASIL', nx + 70, 110, { color: '#ffffff', align: 'center' });
  // guindastes (meio)
  const mid = Math.round(camX * 0.5);
  for (let i = 0; i < 3; i++) {
    const gx = Math.round(wrap(i * 220 - mid, 660)) - 80;
    rect(ctx, gx, 40, 6, 130, '#f5a020');
    rect(ctx, gx - 30, 40, 90, 5, '#f5a020');
    for (let k = 0; k < 90; k += 8) rect(ctx, gx - 30 + k, 45, 1, 4, '#c87a10');
    rect(ctx, gx + 40, 45, 1, 40, '#3a3a3a');
    rect(ctx, gx + 34, 85, 14, 9, '#c8202f');
    text(ctx, '+50%', gx + 41, 87, { color: '#ffffff', align: 'center' });
  }
  // faixa do tarifaço
  const fx = Math.round(wrap(330 - mid, 660)) - 80;
  rect(ctx, fx, 112, 120, 14, '#ffffff');
  text(ctx, 'OBRIGADO, DUDU! - O TIO SAM', fx + 60, 116, { color: '#1f3a8a', align: 'center' });
}

// ---------------- Fase 5: Grupo da Família (reaproveitado) ----------------
export const grupo = grupoBase;

// ---------------- Fase 6: Domiciliar 2.0 ----------------
export function domiciliar(ctx, w, h, camX = 0) {
  rect(ctx, 0, 0, w, h, '#e8d8b8');
  // papel de parede listrado
  for (let x = -12; x < w + 12; x += 12) rect(ctx, x - wrap(Math.round(camX * 0.2), 12), 0, 6, 170, '#dcc8a0');
  rect(ctx, 0, 150, w, 20, '#a8703c'); // rodapé
  const mid = Math.round(camX * 0.5);
  for (let i = 0; i < 3; i++) {
    const bx = Math.round(wrap(i * 200 - mid, 600)) - 60;
    // janela noturna com viatura
    rect(ctx, bx, 30, 50, 50, '#6a4a2a');
    rect(ctx, bx + 3, 33, 44, 44, '#1a2448');
    rect(ctx, bx + 10, 64, 16, 6, '#ffffff');
    rect(ctx, bx + 12, 61, 4, 3, i % 2 ? '#2f80ed' : '#ff3030');
    // TV ligada no noticiário
    rect(ctx, bx + 80, 70, 56, 36, '#1a1a1a');
    rect(ctx, bx + 83, 73, 50, 26, '#2f80ed');
    rect(ctx, bx + 83, 92, 50, 7, '#c8202f');
    text(ctx, 'PLANTÃO', bx + 108, 93, { color: '#ffffff', align: 'center' });
    rect(ctx, bx + 104, 106, 8, 6, '#1a1a1a');
    // sofá
    rect(ctx, bx + 70, 130, 76, 20, '#7a3a3a');
    rect(ctx, bx + 70, 122, 76, 10, '#8a4a4a');
  }
  // quadro com moldura dourada
  const qx = Math.round(wrap(150 - mid, 600)) - 60;
  rect(ctx, qx, 20, 34, 26, '#c8a020');
  rect(ctx, qx + 3, 23, 28, 20, '#f4efe2');
  text(ctx, 'LAR', qx + 17, 26, { color: '#1a1a1a', align: 'center' });
  text(ctx, 'DOCE LAR', qx + 17, 34, { color: '#1a1a1a', align: 'center' });
}

/** Lasers de segurança da tornozeleira (perigo animado). */
export function drawLaser(ctx, x, y1, y2, t = 0) {
  const on = Math.floor(t * 4) % 2 === 0;
  rect(ctx, x - 2, y1 - 4, 5, 4, '#3a3a3a');
  if (on) {
    rect(ctx, x, y1, 1, y2 - y1, '#ff3030');
    rect(ctx, x - 1, y1, 3, y2 - y1, 'rgba(255,48,48,0.25)');
  }
}

// ---------------- Fase 7: 25 de Outubro ----------------
export function esplanada(ctx, w, h, camX = 0) {
  planaltoBase(ctx, w, h, camX);
  const mid = Math.round(camX * 0.5);
  // urnas gigantes enfileiradas na Esplanada
  for (let i = 0; i < 4; i++) {
    const ux = Math.round(wrap(i * 130 + 40 - mid, 520)) - 60;
    rect(ctx, ux, 120, 40, 46, '#1a1a1a');
    rect(ctx, ux + 2, 122, 36, 42, '#d8d8d8');
    rect(ctx, ux + 6, 126, 28, 12, '#3a4a3a');
    text(ctx, '25/10', ux + 20, 129, { color: '#7cf27c', align: 'center' });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rect(ctx, ux + 9 + c * 8, 142 + r * 6, 6, 4, '#ffffff');
    rect(ctx, ux + 25, 154, 6, 4, '#1f9e3a');
  }
}

/** Painel "telão" com o 01 falando (usado em várias fases). */
export function drawTelao(ctx, x, y, face, label = 'AO VIVO') {
  rect(ctx, x, y, 44, 36, '#1a1a1a');
  rect(ctx, x + 2, y + 2, 40, 28, '#1f3a6a');
  draw(ctx, face, x + 14, y + 6);
  rect(ctx, x + 2, y + 26, 40, 4, '#c8202f');
  text(ctx, label, x + 22, y + 26, { color: '#ffffff', align: 'center' });
  rect(ctx, x + 20, y + 36, 4, 20, '#3a3a3a');
}

export const BACKGROUNDS_MISSAO = { quartel, galpao, rodovia, chocolate, porto, grupo, domiciliar, esplanada };
