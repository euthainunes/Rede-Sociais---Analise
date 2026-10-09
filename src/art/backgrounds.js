// Cenários de fundo procedurais com parallax (3 camadas) para as 6 fases.
// Cada função desenha a tela inteira (W x H) dado o deslocamento da câmera camX.
// Camadas: céu (fixo), distante (camX * 0.2), meio (camX * 0.5).

import { rect, rng, roundRect } from './pixel.js';
import { text } from './font.js';

function skyBands(ctx, w, h, colors) {
  const band = Math.ceil(h / colors.length);
  colors.forEach((c, i) => rect(ctx, 0, i * band, w, band + 1, c));
}

function wrap(v, period) {
  return ((v % period) + period) % period;
}

function clouds(ctx, w, camX, y, color, seed) {
  const r = rng(seed);
  for (let i = 0; i < 6; i++) {
    const cx = Math.round(wrap(r() * 600 - camX * 0.1, 600)) - 100;
    const cy = y + Math.round(r() * 30);
    const cw = 24 + Math.round(r() * 24);
    rect(ctx, cx, cy + 3, cw, 5, color);
    rect(ctx, cx + 4, cy, cw - 12, 4, color);
    rect(ctx, cx + 8, cy - 2, 10, 3, color);
  }
}

// ---------------- Fase 1: Comício no Bairro ----------------
export function bairro(ctx, w, h, camX = 0) {
  skyBands(ctx, w, h, ['#5fb4f0', '#74c0f2', '#8ccdf4', '#a6dbf6', '#c4e8f8', '#e2f4fa']);
  clouds(ctx, w, camX, 14, '#ffffff', 3);

  // Camada distante: morro com casinhas coloridas empilhadas
  const far = Math.round(camX * 0.2);
  const r = rng(11);
  const hill = (x) => 108 - Math.round(Math.sin(x / 70) * 22 + Math.sin(x / 23) * 6);
  for (let x = 0; x < w; x++) {
    const wx = x + far;
    rect(ctx, x, hill(wx), 1, h, '#4f8a5a');
  }
  const housePal = ['#e8735a', '#f2c14e', '#6ab0de', '#b48ad8', '#f29ab0', '#9ad48a', '#f0e6d0'];
  for (let i = 0; i < 70; i++) {
    const hx = Math.floor(r() * 900);
    const sx = Math.round(wrap(hx - far, 900)) - 60;
    if (sx < -20 || sx > w + 20) continue;
    const base = hill(hx) + 4 + Math.floor(r() * 26);
    const hw = 8 + Math.floor(r() * 8);
    const hh = 6 + Math.floor(r() * 6);
    rect(ctx, sx, base - hh, hw, hh, housePal[Math.floor(r() * housePal.length)]);
    rect(ctx, sx, base - hh, hw, 1, '#7a6a5a');
    rect(ctx, sx + 2, base - hh + 2, 2, 2, '#3a3a4a');
    if (r() < 0.4) rect(ctx, sx + hw - 4, base - hh - 3, 3, 3, '#2a6ac8'); // caixa d'água azul
  }

  // Camada do meio: casas da rua, varais e postes com fiação
  const mid = Math.round(camX * 0.5);
  const r2 = rng(29);
  const period = 420;
  for (let i = 0; i < 8; i++) {
    const hx = i * 56;
    const sx = Math.round(wrap(hx - mid, period * 1.2)) - 70;
    const hw = 44 + Math.floor(r2() * 10);
    const hh = 40 + Math.floor(r2() * 26);
    const col = housePal[i % housePal.length];
    const top = 168 - hh;
    rect(ctx, sx, top, hw, hh, col);
    rect(ctx, sx, top, hw, 3, '#d8d0c0'); // laje
    rect(ctx, sx + 3, top - 8, 9, 8, '#2a6ac8'); // caixa d'água
    rect(ctx, sx + 3, top - 8, 9, 2, '#4a8ae8');
    // janelas e porta
    rect(ctx, sx + 6, top + 10, 10, 9, '#3a4a5a');
    rect(ctx, sx + 7, top + 11, 8, 3, '#8ab8d8');
    rect(ctx, sx + hw - 16, top + 10, 10, 9, '#3a4a5a');
    rect(ctx, sx + hw / 2 - 5, 168 - 20, 10, 20, '#6a4a2a');
    if (hh > 52) {
      // segundo andar em tijolo aparente ("puxadinho")
      rect(ctx, sx + 4, top - 2, hw - 18, 3, '#c8643c');
    }
    // varal
    if (i % 2 === 0) {
      rect(ctx, sx + hw - 2, top + 4, 26, 1, '#5a5a5a');
      const roupas = ['#e23b4a', '#ffffff', '#2f80ed', '#f5d000'];
      for (let k = 0; k < 4; k++) rect(ctx, sx + hw + k * 6, top + 5, 4, 5 + (k % 2) * 2, roupas[k]);
    }
  }
  // postes e fios
  for (let i = 0; i < 4; i++) {
    const px = Math.round(wrap(i * 130 - mid, 520)) - 40;
    rect(ctx, px, 70, 3, 100, '#7a7a80');
    rect(ctx, px - 8, 74, 19, 2, '#7a7a80');
    for (let k = 0; k < 130; k++) {
      const sag = Math.round(Math.sin((k / 130) * Math.PI) * 10);
      rect(ctx, px + k, 75 + sag, 1, 1, '#2a2a2a');
      rect(ctx, px + k, 80 + sag, 1, 1, '#2a2a2a');
    }
  }
  // tênis pendurado no fio (clássico)
  const tx = Math.round(wrap(60 - mid, 520)) - 40;
  rect(ctx, tx, 86, 4, 3, '#ffffff');
  rect(ctx, tx + 6, 87, 4, 3, '#ffffff');
}

// ---------------- Fase 2: Domingo na Avenida ----------------
export function avenida(ctx, w, h, camX = 0) {
  skyBands(ctx, w, h, ['#7fb2d8', '#93bfde', '#a8cbe2', '#bdd6e6', '#d2e2ea', '#e6eef0']);
  clouds(ctx, w, camX, 10, '#f4f8fa', 5);
  // prédios distantes (skyline)
  const far = Math.round(camX * 0.2);
  const r = rng(41);
  for (let i = 0; i < 30; i++) {
    const bx = i * 26 + Math.floor(r() * 10);
    const sx = Math.round(wrap(bx - far, 780)) - 40;
    const bw = 18 + Math.floor(r() * 14);
    const bh = 50 + Math.floor(r() * 80);
    const shade = ['#8a96a6', '#97a2b0', '#7e8a9a'][i % 3];
    rect(ctx, sx, 170 - bh, bw, bh, shade);
    for (let wy = 170 - bh + 4; wy < 160; wy += 5) for (let wx = sx + 3; wx < sx + bw - 3; wx += 4) rect(ctx, wx, wy, 2, 2, '#b8c4d0');
    if (r() < 0.25) { rect(ctx, sx + bw / 2, 170 - bh - 12, 1, 12, '#5a6470'); rect(ctx, sx + bw / 2 - 1, 170 - bh - 13, 3, 2, '#e23b4a'); }
  }
  // multidões nas laterais com bandeiras (meio)
  const mid = Math.round(camX * 0.5);
  const r2 = rng(77);
  for (let i = 0; i < 90; i++) {
    const hx = i * 6;
    const sx = Math.round(wrap(hx - mid, 540)) - 20;
    const lado = Math.floor(hx / 270) % 2; // metade verde-amarela, metade vermelha
    const shirt = lado ? ['#e23b4a', '#c8202f', '#ffffff'][i % 3] : ['#f5d000', '#1f9e3a', '#ffffff'][i % 3];
    const hy = 138 + Math.floor(r2() * 6);
    rect(ctx, sx, hy, 5, 4, ['#e3a982', '#c98a62', '#8a5a3a', '#f0c8a0'][i % 4]);
    rect(ctx, sx - 1, hy + 4, 7, 14, shirt);
    if (i % 7 === 0) {
      rect(ctx, sx + 2, hy - 18, 1, 18, '#5a3a1a');
      if (lado) { rect(ctx, sx + 3, hy - 18, 12, 8, '#e23b4a'); }
      else { rect(ctx, sx + 3, hy - 18, 12, 8, '#1f9e3a'); rect(ctx, sx + 6, hy - 16, 6, 4, '#f5d000'); rect(ctx, sx + 8, hy - 15, 2, 2, '#2a5db0'); }
    }
    if (i % 11 === 0) { rect(ctx, sx + 1, hy - 28, 6, 7, lado ? '#ff5f7a' : '#f5d000'); rect(ctx, sx + 4, hy - 21, 1, 7, '#aaaaaa'); }
  }
  // névoa leve para separar o fundo da camada de jogo
  rect(ctx, 0, 0, w, h, 'rgba(225,232,240,0.22)');
  // faixa central
  const bx = Math.round(wrap(400 - mid, 540)) - 60;
  rect(ctx, bx, 104, 120, 14, '#ffffff');
  rect(ctx, bx, 104, 120, 1, '#c8c8c8');
  text(ctx, 'FORA TODO MUNDO!', bx + 60, 108, { color: '#1a1a1a', align: 'center' });
}

// ---------------- Fase 3: Labirinto da Repartição ----------------
export function reparticao(ctx, w, h, camX = 0) {
  rect(ctx, 0, 0, w, h, '#e8dcb8');
  // rodapé de madeira e meia parede verde-repartição
  rect(ctx, 0, 110, w, 70, '#9ab89a');
  rect(ctx, 0, 110, w, 2, '#6a8a6a');
  // luminárias fluorescentes
  for (let i = 0; i < 6; i++) {
    const lx = Math.round(wrap(i * 80 - camX * 0.2, 480)) - 40;
    rect(ctx, lx, 0, 40, 4, '#c8c8c8');
    rect(ctx, lx + 2, 4, 36, 2, i === 3 ? '#9a9a9a' : '#ffffff'); // uma queimada, claro
  }
  const mid = Math.round(camX * 0.5);
  for (let i = 0; i < 6; i++) {
    const sx = Math.round(wrap(i * 96 - mid, 576)) - 60;
    // janela com persiana
    rect(ctx, sx, 26, 44, 50, '#6a5a3a');
    rect(ctx, sx + 2, 28, 40, 46, '#bfe0f0');
    for (let k = 30; k < 60; k += 3) rect(ctx, sx + 2, k, 40, 2, '#f0eadc');
    // arquivos ao fundo
    rect(ctx, sx + 52, 82, 22, 48, '#7d8a8f');
    for (let k = 86; k < 126; k += 10) { rect(ctx, sx + 54, k, 18, 8, '#6a767b'); rect(ctx, sx + 61, k + 3, 4, 1, '#d8dde0'); }
    // pilhas de processos em cima do arquivo
    const pc = ['#e8c45a', '#d98a4a', '#e8e0c8', '#8ab0d9'];
    for (let k = 0; k < 6; k++) rect(ctx, sx + 52 + (k % 2), 82 - (k + 1) * 3, 20, 3, pc[k % 4]);
  }
  // relógio parado e placa de senha
  const cx = Math.round(wrap(130 - mid, 576)) - 60;
  roundRect(ctx, cx, 86, 18, 18, '#ffffff', '#3a3a3a');
  rect(ctx, cx + 9, 89, 1, 7, '#1a1a1a');
  rect(ctx, cx + 9, 95, 5, 1, '#1a1a1a');
  const px = Math.round(wrap(330 - mid, 576)) - 60;
  rect(ctx, px, 84, 60, 26, '#1a1a1a');
  text(ctx, 'SENHA', px + 30, 87, { color: '#ff4040', align: 'center' });
  text(ctx, '0001', px + 30, 97, { color: '#ff4040', align: 'center', scale: 1 });
  text(ctx, 'ATENDENDO: 0002', px + 30, 113, { color: '#3a3a3a', align: 'center' });
  // cartaz
  const kx = Math.round(wrap(440 - mid, 576)) - 60;
  rect(ctx, kx, 40, 50, 30, '#fff8d0');
  rect(ctx, kx, 40, 50, 1, '#c8b880');
  text(ctx, 'VOLTE', kx + 25, 46, { color: '#1a1a1a', align: 'center' });
  text(ctx, 'AMANHÃ', kx + 25, 56, { color: '#c8202f', align: 'center' });
}

// ---------------- Fase 4: Grupo da Família ----------------
export function grupo(ctx, w, h, camX = 0) {
  rect(ctx, 0, 0, w, h, '#e9e2d6');
  // padrão de rabiscos do papel de parede (parallax lento)
  const off = Math.round(camX * 0.2);
  const doodle = '#d9cfbf';
  for (let y = 24; y < h; y += 22) {
    for (let x = -32; x < w + 32; x += 22) {
      const sx = x - wrap(off, 22);
      const k = (Math.floor((x + off) / 22) + y) % 4;
      if (k === 0) { rect(ctx, sx, y, 5, 4, doodle); rect(ctx, sx + 1, y - 1, 3, 1, doodle); }
      else if (k === 1) { rect(ctx, sx + 2, y - 2, 1, 6, doodle); rect(ctx, sx, y, 5, 1, doodle); }
      else if (k === 2) { rect(ctx, sx, y, 2, 2, doodle); rect(ctx, sx + 3, y + 2, 2, 2, doodle); }
      else { rect(ctx, sx + 1, y, 3, 3, doodle); }
    }
  }
  // balões de conversa ao fundo (camada do meio, apagados)
  const mid = Math.round(camX * 0.5);
  const msgs = [
    ['in', 'BOM DIA! ☀', 90], ['in', 'URGENTE!!! REPASSEM', 120], ['out', 'FONTE?', 60], ['in', 'VI NO YOUTUBE', 92],
    ['in', 'ÁUDIO (7:42)', 84], ['out', 'TIA, ISSO É MENTIRA', 112], ['in', 'KKKKKKKK', 66], ['in', 'AMÉM', 50],
  ];
  msgs.forEach(([type, label, mw], i) => {
    const sx = Math.round(wrap(i * 74 - mid, 592)) - 60 + (type === 'out' ? 30 : 0);
    const sy = 40 + (i % 4) * 22;
    ctx.globalAlpha = 0.55;
    roundRect(ctx, sx, sy, mw, 14, type === 'in' ? '#ffffff' : '#d9fdd3', type === 'in' ? '#d0d6dc' : '#a8e0a8');
    text(ctx, label, sx + 5, sy + 5, { color: '#5a6570' });
    ctx.globalAlpha = 1;
  });
  // mensagem fixada do grupo (logo abaixo do HUD)
  roundRect(ctx, w / 2 - 92, 32, 184, 18, '#075e54');
  text(ctx, 'GRUPO FAMÍLIA ❤ PATRIOTAS & CIA', w / 2, 35, { color: '#ffffff', align: 'center' });
  text(ctx, 'TIA LÚCIA, TIO ZÉ, VOCÊ E +244', w / 2, 43, { color: '#a8d8cc', align: 'center' });
}

// ---------------- Fase 5: Votação no Plenário ----------------
export function plenario(ctx, w, h, camX = 0) {
  skyBands(ctx, w, h, ['#1d3a2a', '#21422f', '#254a34', '#2a5239']);
  const far = Math.round(camX * 0.2);
  // painel de votação ao fundo
  const px = Math.round(wrap(190 - far, 600)) - 100;
  rect(ctx, px, 50, 180, 50, '#0e0e14');
  rect(ctx, px + 2, 52, 176, 46, '#14141e');
  text(ctx, 'PAINEL DE VOTAÇÃO', px + 90, 55, { color: '#f5d000', align: 'center' });
  text(ctx, 'PL 0000/26 - OBRA PARADA', px + 90, 64, { color: '#ffffff', align: 'center' });
  text(ctx, 'SIM', px + 30, 75, { color: '#7cf27c', align: 'center', scale: 2 });
  text(ctx, 'NÃO', px + 90, 75, { color: '#ff5050', align: 'center', scale: 2 });
  text(ctx, 'ABST.', px + 150, 75, { color: '#f5d000', align: 'center', scale: 2 });
  text(ctx, '257', px + 30, 89, { color: '#7cf27c', align: 'center' });
  text(ctx, '256', px + 90, 89, { color: '#ff5050', align: 'center' });
  text(ctx, '0', px + 150, 89, { color: '#f5d000', align: 'center' });
  // fileiras em semicírculo (bancadas) — camada do meio
  const mid = Math.round(camX * 0.5);
  for (let row = 0; row < 5; row++) {
    const y = 108 + row * 15;
    rect(ctx, 0, y, w, 3, '#7a4e2a');
    rect(ctx, 0, y + 3, w, 10, '#2f7a4a');
    for (let x = -20; x < w + 20; x += 14) {
      const sx = x - wrap(mid + row * 5, 14);
      rect(ctx, sx, y - 6, 8, 8, '#2a5a3a'); // cadeira
      rect(ctx, sx + 1, y - 5, 6, 3, '#3a7a4a');
      if ((x + row * 3) % 28 === 0) { rect(ctx, sx + 2, y - 10, 4, 4, '#d9a070'); rect(ctx, sx + 1, y - 6, 6, 3, '#3a3a4a'); } // parlamentar
    }
  }
}

// ---------------- Fase 6: Rampa do Planalto ----------------
export function planalto(ctx, w, h, camX = 0) {
  skyBands(ctx, w, h, ['#2a2350', '#4a2f6a', '#7a3a72', '#b54a6a', '#e8735a', '#f5a55a', '#ffd27a']);
  // sol
  roundRect(ctx, 260, 104, 40, 40, '#ffe8a0');
  const far = Math.round(camX * 0.15);
  // Congresso Nacional (silhueta): duas torres, cúpula e cuia
  const cx = 150 - far;
  const sil = '#2a1f3a';
  rect(ctx, cx + 40, 60, 10, 86, sil);
  rect(ctx, cx + 53, 60, 10, 86, sil);
  rect(ctx, cx + 50, 90, 3, 4, sil); // passarela entre torres
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    const dy = Math.round(Math.sin(t * Math.PI) * 14);
    rect(ctx, cx - 20 + i, 140 - dy, 1, 6 + dy, sil); // cúpula (Senado)
  }
  for (let i = 0; i < 80; i++) {
    const t = (i - 40) / 40;
    const dy = Math.round(t * t * 16);
    rect(ctx, cx + 70 + i, 124 + dy, 1, 22 - dy, sil); // cuia (Câmara)
  }
  rect(ctx, cx - 40, 144, 230, 6, sil); // plataforma
  // mastro com bandeira
  const fx = Math.round(wrap(330 - camX * 0.3, 700)) - 100;
  rect(ctx, fx, 30, 2, 120, '#3a2f4a');
  rect(ctx, fx + 2, 30, 34, 22, '#1f9e3a');
  for (let i = 0; i < 14; i++) rect(ctx, fx + 19 - i, 34 + Math.round(i * 0.5), i * 2 - 2 < 0 ? 0 : i * 2 - 2, 1, '#f5d000');
  for (let i = 0; i < 14; i++) rect(ctx, fx + 19 - i, 47 - Math.round(i * 0.5), i * 2 - 2 < 0 ? 0 : i * 2 - 2, 1, '#f5d000');
  roundRect(ctx, fx + 14, 36, 10, 10, '#2a5db0');
  rect(ctx, fx + 14, 40, 10, 1, '#ffffff');
  // Palácio do Planalto (meio): fachada com colunas e rampa
  const mid = Math.round(camX * 0.5);
  const px = 300 - mid;
  rect(ctx, px, 112, 220, 6, '#f2efe8');
  rect(ctx, px, 118, 220, 30, '#c8d8e0');
  for (let i = 0; i < 220; i += 10) rect(ctx, px + i, 118, 1, 30, '#8aa0aa');
  rect(ctx, px, 148, 220, 4, '#f2efe8');
  for (let i = 4; i < 220; i += 28) {
    // colunas em forma de "cálice" do Niemeyer (estilizadas)
    rect(ctx, px + i, 152, 2, 18, '#ffffff');
    rect(ctx, px + i - 2, 150, 6, 2, '#ffffff');
    rect(ctx, px + i - 1, 168, 4, 2, '#ffffff');
  }
  // rampa
  for (let i = 0; i < 60; i++) rect(ctx, px - 60 + i, 170 - Math.round(i * 0.35), 1, 4, '#ffffff');
  // gramado da Esplanada
  rect(ctx, 0, 170, w, h - 170, '#4a7a3a');
}

export const BACKGROUNDS = { bairro, avenida, reparticao, grupo, plenario, planalto };
