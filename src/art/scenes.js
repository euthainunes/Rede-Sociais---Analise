// Composições de demonstração ("prints conceituais") de cada fase e das telas.
// Servem como referência visual e teste de legibilidade; o jogo real monta a cena a partir do mapa.

import { draw, rect, roundRect, flatPalette } from './pixel.js';
import { text, measure } from './font.js';
import { CAPITAO, LLIVRE, BIBLIA_ERGUIDA } from './characters.js';
import * as E from './enemies.js';
import * as I from './items.js';
import * as TL from './tiles.js';
import { BACKGROUNDS } from './backgrounds.js';
import { drawHUD, drawBalloon, drawFloat, drawPlantao, drawTouchControls, UI } from './hud.js';

export const W = 384;
export const H = 216;
const GY = 184; // linha do chão

const stand = (ctx, spr, x, opts) => draw(ctx, spr, x, GY - spr.h, opts);
const hearts = (ctx, x, y) => { draw(ctx, I.MINI_HEART, x, y); draw(ctx, I.MINI_HEART, x + 6, y - 4); draw(ctx, I.MINI_HEART, x + 11, y + 1); };

function ground(ctx, theme, segments) {
  rect(ctx, 0, GY, W, H - GY, '#14141c'); // buracos ficam escuros
  for (const [x, w] of segments) TL.drawGround(ctx, theme, x, GY, w, H - GY, x + 3);
}

// ---------------- Fase 1 ----------------
export function fase1(ctx) {
  BACKGROUNDS.bairro(ctx, W, H, 0);
  ground(ctx, 'bairro', [[0, 176], [224, 160]]);
  TL.drawCavalete(ctx, 160, GY);
  TL.drawCavalete(ctx, 224, GY);
  // barraca de pastel com toldo (one-way)
  rect(ctx, 84, 146, 2, 38, '#6a4a2a');
  rect(ctx, 130, 146, 2, 38, '#6a4a2a');
  TL.drawOneWay(ctx, 'bairro', 80, 140, 56);
  rect(ctx, 86, 166, 44, 18, '#c08a4a');
  rect(ctx, 86, 166, 44, 2, '#e8b878');
  draw(ctx, I.PASTEL, 96, 157); draw(ctx, I.PASTEL, 108, 158); draw(ctx, I.PASTEL, 118, 157);
  text(ctx, 'PASTEL', 108, 172, { color: '#5a3a1a', align: 'center' });
  // tijolos e caixote
  TL.drawBlock(ctx, 'bairro', 288, 136, 32, 16);
  draw(ctx, TL.CAIXOTE, 256, GY - 16);
  TL.drawPromessa(ctx, 180, 150, 40);
  TL.drawPlaca(ctx, 4, GY, ['▲ PULA', 'OU SOBE NAS', 'PESQUISAS'], '#ffffff');
  // votos
  for (let i = 0; i < 4; i++) draw(ctx, I.VOTO[i % 2], 92 + i * 12, 126);
  for (let i = 0; i < 3; i++) draw(ctx, I.VOTO[0], 188 + i * 10, 136);
  draw(ctx, I.CAIXA_MUNICAO, 296, 126);
  // personagens
  stand(ctx, CAPITAO.walk1, 52);
  draw(ctx, I.CARTEIRA, 76, 164);
  rect(ctx, 70, 167, 4, 1, '#ffffff'); rect(ctx, 66, 167, 2, 1, '#ffffff');
  stand(ctx, E.MILITANTE.converted, 100);
  hearts(ctx, 102, 152);
  drawFloat(ctx, 108, 146, '+100 CONVERTIDO!');
  stand(ctx, E.TIO_DO_ZAP.walk, 300, { flip: true });
  stand(ctx, E.SINDICALISTA.idle, 340, { flip: true });
  drawBalloon(ctx, 348, GY - 25, 'COMPANHEIRO, VOLTA AQUI!');
  drawHUD(ctx, W, { hp: 3, hpMax: 3, lives: 3, score: 4850, combo: 0, votes: 37, itemId: 'carteira', ammo: 9, engagement: 0.4, progress: 0.18 });
}

// ---------------- Fase 2 ----------------
export function fase2(ctx) {
  BACKGROUNDS.avenida(ctx, W, H, 140);
  ground(ctx, 'avenida', [[0, W]]);
  TL.drawTrio(ctx, 150, GY - 28, 80);
  TL.drawOneWay(ctx, 'avenida', 30, 150, 48);
  TL.drawOneWay(ctx, 'avenida', 290, 140, 64);
  TL.drawBlock(ctx, 'avenida', 252, 168, 16, 16);
  for (let i = 0; i < 5; i++) draw(ctx, I.VOTO[i % 2], 162 + i * 12, 132);
  draw(ctx, I.HASHTAG, 316, 128);
  // L-Livre pulando sobre o trio e jogando picanha em arco
  draw(ctx, LLIVRE.jump, 186, 100);
  draw(ctx, I.PICANHA, 226, 96);
  for (let i = 0; i < 4; i++) rect(ctx, 206 + i * 5, 106 - i * 2, 2, 1, '#ffffff');
  stand(ctx, E.PATRIOTA.walk, 270, { flip: true });
  stand(ctx, E.INFLUENCER.idle, 330, { flip: true });
  draw(ctx, I.TEXTAO, 314, 168);
  stand(ctx, E.REPORTER.idle, 96);
  drawBalloon(ctx, 104, GY - 25, 'AO VIVO: O CAOS ESTÁ CONTROLADO');
  drawPlantao(ctx, W, 'PLANTÃO', 'CHUVA! BANDEIRAS ESCORREGADIAS POR 8S');
  drawHUD(ctx, W, { hp: 3, hpMax: 4, lives: 2, score: 21340, combo: 4, votes: 64, itemId: 'picanha', ammo: 2, engagement: 0.7, progress: 0.42 });
}

// ---------------- Fase 3 ----------------
export function fase3(ctx) {
  BACKGROUNDS.reparticao(ctx, W, H, 60);
  ground(ctx, 'reparticao', [[0, W]]);
  TL.drawBlock(ctx, 'reparticao', 0, 120, 32, 64);
  TL.drawOneWay(ctx, 'reparticao', 40, 136, 48);
  TL.drawOneWay(ctx, 'reparticao', 112, 112, 40);
  TL.drawCarimbo(ctx, 176, 60, 111, 0.3);
  TL.drawCarimbo(ctx, 226, 60, 111, 1);
  TL.drawPromessa(ctx, 300, 120, 40, true);
  // fila do INSS (bloqueia o caminho até acertar o atendente)
  for (let i = 0; i < 4; i++) stand(ctx, E.TIO_DO_ZAP.idle, 290 + i * 9, { palette: flatPalette(E.TIO_DO_ZAP.idle, '#8a8a9a') });
  stand(ctx, E.ATENDENTE.idle, 352, { flip: true });
  drawBalloon(ctx, 360, GY - 25, 'O SISTEMA CAIU.');
  draw(ctx, I.SANTINHO, 124, 96);
  draw(ctx, CAPITAO.jump, 52, 104);
  drawFloat(ctx, 100, 70, 'SOBREVIVEU À BUROCRACIA!');
  drawHUD(ctx, W, { hp: 2, hpMax: 3, lives: 3, score: 38720, combo: 0, votes: 102, itemId: 'carteira', ammo: 6, engagement: 1, progress: 0.55 });
}

// ---------------- Fase 4 ----------------
export function fase4(ctx) {
  BACKGROUNDS.grupo(ctx, W, H, 80);
  ground(ctx, 'grupo', [[0, 128], [192, W - 192]]);
  TL.drawChatBubble(ctx, 40, 128, 70, 12, 'in', 'BOM DIA GRUPO!!');
  TL.drawChatBubble(ctx, 140, 122, 64, 12, 'out', 'FONTE?');
  TL.drawChatBubble(ctx, 236, 98, 92, 12, 'in', 'ÁUDIO DE 7 MIN');
  TL.drawFakeBlock(ctx, 140, 160, 1);
  TL.drawFakeBlock(ctx, 156, 160, 0);
  TL.drawFakeBlock(ctx, 172, 160, 1);
  draw(ctx, LLIVRE.throw, 152, 98);
  draw(ctx, I.PICANHA, 172, 92);
  stand(ctx, E.TIO_DO_ZAP.walk, 220, { flip: true });
  drawBalloon(ctx, 228, GY - 25, 'NÃO VI NA TV, MAS É VERDADE!');
  stand(ctx, E.COACH.idle, 300, { flip: true });
  draw(ctx, I.CURSO_GRATIS, 284, 166);
  stand(ctx, E.INFLUENCER.converted, 40);
  hearts(ctx, 42, 152);
  for (let i = 0; i < 4; i++) draw(ctx, I.VOTO[0], 250 + i * 12, 84);
  drawHUD(ctx, W, { hp: 4, hpMax: 4, lives: 4, score: 55210, combo: 7, votes: 151, itemId: 'picanha', ammo: 4, engagement: 0.55, progress: 0.71 });
}

// ---------------- Fase 5 ----------------
export function fase5(ctx) {
  BACKGROUNDS.plenario(ctx, W, H, 40);
  ground(ctx, 'plenario', [[0, W]]);
  TL.drawOneWay(ctx, 'plenario', 30, 140, 56);
  TL.drawOneWay(ctx, 'plenario', 130, 120, 48);
  TL.drawMovingPlatform(ctx, 'plenario', 230, 130, 48);
  draw(ctx, E.CENTRAO.idle, 300, GY - 24);
  drawBalloon(ctx, 312, GY - 25, 'TRÊS ITENS E EU TE APOIO.');
  draw(ctx, E.CENTRAO_ALIADO.capitao, 100, GY - 24);
  hearts(ctx, 106, 152);
  drawFloat(ctx, 112, 148, 'TOMA LÁ, DÁ CÁ!');
  stand(ctx, CAPITAO.throw, 250);
  draw(ctx, I.CARTEIRA, 272, 168);
  stand(ctx, E.SINDICALISTA.walk, 190);
  draw(ctx, I.MEGAFONE_ONDA, 208, 164);
  drawPlantao(ctx, W, 'URGENTE', 'CPI INSTAURADA! INIMIGOS MAIS RÁPIDOS');
  drawHUD(ctx, W, { hp: 1, hpMax: 3, lives: 2, score: 71030, combo: 0, votes: 188, itemId: 'carteira', ammo: 3, engagement: 0.2, progress: 0.86 });
}

// ---------------- Fase 6 (chefe) ----------------
export function fase6(ctx) {
  BACKGROUNDS.planalto(ctx, W, H, 0);
  ground(ctx, 'planalto', [[0, W]]);
  TL.drawOneWay(ctx, 'planalto', 60, 140, 48);
  TL.drawOneWay(ctx, 'planalto', 276, 140, 48);
  // L-Livre jogador vs Capitão chefe (1,5x com aura)
  stand(ctx, LLIVRE.idle, 70);
  const boss = CAPITAO.special;
  const bx = 280;
  const by = GY - boss.h * 2;
  for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) draw(ctx, boss, bx + ox, by + oy, { scale: 2, palette: flatPalette(boss, '#fff3a0', '_') });
  draw(ctx, boss, bx, by, { scale: 2, flip: true });
  draw(ctx, BIBLIA_ERGUIDA, bx - 6, by + 6, { scale: 2 });
  // onda de corações do especial do L-Livre
  for (let i = 0; i < 6; i++) draw(ctx, I.CORACAO, 110 + i * 22, 150 - (i % 2) * 10);
  drawBalloon(ctx, bx + 16, by - 2, 'DEUS ACIMA DE TODOS!');
  // barra de vida do chefe
  roundRect(ctx, 92, 196, 200, 14, UI.panel);
  text(ctx, 'O RIVAL', 98, 200, { color: UI.white });
  rect(ctx, 130, 200, 156, 6, '#1a1a1a');
  rect(ctx, 131, 201, 100, 4, UI.red);
  text(ctx, 'FASE 2/3', 286, 200, { color: UI.gold, align: 'right' });
  drawHUD(ctx, W, { hp: 2, hpMax: 4, lives: 1, score: 98450, combo: 0, votes: 240, itemId: 'picanha', ammo: 5, engagement: 1, progress: 1 });
}

// ---------------- Telas ----------------
export function title(ctx) {
  BACKGROUNDS.planalto(ctx, W, H, 0);
  rect(ctx, 0, 0, W, H, 'rgba(20,10,40,0.35)');
  // logo
  const logo = 'BR-WAR';
  text(ctx, logo, W / 2 + 3, 31, { color: '#0d3a18', scale: 6, align: 'center' });
  text(ctx, logo, W / 2, 28, { color: '#f5d000', scale: 6, align: 'center', shadow: '#1f9e3a', outline: true });
  text(ctx, 'A CORRIDA PARA O PLANALTO', W / 2, 70, { color: '#ffffff', align: 'center', shadow: '#1a1a1a', outline: true });
  // personagens se encarando
  draw(ctx, CAPITAO.idle, 112, 96, { scale: 3 });
  draw(ctx, LLIVRE.idle, 224, 96, { scale: 3, flip: true });
  text(ctx, 'VS', W / 2, 130, { color: '#ffffff', scale: 3, align: 'center', shadow: '#c8202f', outline: true });
  text(ctx, 'APERTE QUALQUER TECLA', W / 2, 180, { color: '#ffffff', align: 'center', shadow: '#1a1a1a', outline: true });
  text(ctx, 'OBRA DE FICÇÃO SATÍRICA. PERSONAGENS SÃO CARICATURAS DE DISCURSOS POLÍTICOS.', W / 2, 205, { color: '#d8d0e8', align: 'center' });
}

function card(ctx, x, y, ch, name, frase, attrs, focus, itemSpr, especial) {
  const w = 150;
  const h = 150;
  ctx.globalAlpha = focus ? 1 : 0.6;
  roundRect(ctx, x, y, w, h, focus ? '#203050' : '#1a2238', focus ? '#f5d000' : '#4a5570');
  draw(ctx, ch.front, x + 10, y + 12, { scale: 3 });
  text(ctx, name, x + 64, y + 12, { color: focus ? '#f5d000' : '#ffffff', scale: 2 });
  text(ctx, frase, x + 64, y + 28, { color: '#c8d0e0' });
  attrs.forEach(([label, v], i) => {
    text(ctx, label, x + 64, y + 42 + i * 11, { color: '#a8b0c0' });
    for (let k = 0; k < 5; k++) rect(ctx, x + 108 + k * 7, y + 42 + i * 11, 6, 5, k < v ? '#f5d000' : '#3a4560');
  });
  rect(ctx, x + 8, y + 98, w - 16, 1, '#3a4560');
  draw(ctx, itemSpr, x + 10, y + 106);
  text(ctx, especial[0], x + 22, y + 107, { color: '#ffffff' });
  draw(ctx, I.SPARK, x + 10, y + 122);
  text(ctx, especial[1], x + 22, y + 122, { color: '#f5d000' });
  text(ctx, especial[2], x + 22, y + 131, { color: '#c8d0e0' });
  ctx.globalAlpha = 1;
}

export function selecao(ctx) {
  rect(ctx, 0, 0, W, H, '#0e1424');
  for (let i = 0; i < W; i += 16) rect(ctx, i, 0, 1, H, '#141c30');
  text(ctx, 'ESCOLHA SEU CANDIDATO', W / 2, 10, { color: '#ffffff', scale: 2, align: 'center', shadow: '#1f9e3a', outline: true });
  card(ctx, 30, 34, CAPITAO, 'CAPITÃO', 'MISSÃO DADA...', [['VELOC.', 4], ['PULO', 2], ['RESIST.', 2], ['MUNIÇÃO', 4]], true,
    I.CARTEIRA, ['CARTEIRA (RETA)', 'DEUS ACIMA DE TODOS', 'ESCUDO + VELOCIDADE']);
  card(ctx, 204, 34, LLIVRE, 'L-LIVRE', 'COMPANHEIRO!', [['VELOC.', 3], ['PULO', 4], ['RESIST.', 4], ['MUNIÇÃO', 2]], false,
    I.PICANHA, ['PICANHA (ARCO)', 'O AMOR VENCEU', 'CONVERTE A TELA']);
  text(ctx, '◀ ▶ ESCOLHER    ENTER CONFIRMAR    ESC VOLTAR', W / 2, 196, { color: '#8a94b0', align: 'center' });
}

export function conclusao(ctx) {
  rect(ctx, 0, 0, W, H, '#2a2a2a');
  // página de jornal
  roundRect(ctx, 40, 10, 304, 196, '#f4efe2', '#8a8270');
  text(ctx, 'DIÁRIO DO PLANALTO', W / 2, 18, { color: '#1a1a1a', scale: 2, align: 'center' });
  rect(ctx, 50, 32, 284, 1, '#1a1a1a');
  text(ctx, 'EDIÇÃO EXTRA  -  FASE 1 CONCLUÍDA', W / 2, 36, { color: '#5a5a5a', align: 'center' });
  rect(ctx, 50, 44, 284, 1, '#1a1a1a');
  text(ctx, 'CANDIDATO AVANÇA E PROMETE', W / 2, 52, { color: '#1a1a1a', scale: 2, align: 'center' });
  text(ctx, 'CONCLUIR A FASE ANTERIOR', W / 2, 66, { color: '#1a1a1a', scale: 2, align: 'center' });
  draw(ctx, CAPITAO.victory, 60, 88, { scale: 2 });
  const lines = [['VOTOS', '1.230'], ['CONVERSÕES', '4.800'], ['COMBOS', '2.100'], ['FASE CONCLUÍDA', '2.000'], ['BÔNUS DE TEMPO', '1.140'], ['FICHA LIMPA', '1.500']];
  lines.forEach(([l, v], i) => {
    text(ctx, l, 110, 90 + i * 11, { color: '#2a2a2a' });
    for (let d = 110 + measure(l) + 3; d < 300 - measure(v) - 3; d += 3) rect(ctx, d, 94 + i * 11, 1, 1, '#8a8270');
    text(ctx, v, 300, 90 + i * 11, { color: '#2a2a2a', align: 'right' });
  });
  rect(ctx, 110, 158, 190, 1, '#1a1a1a');
  text(ctx, 'TOTAL', 110, 163, { color: '#1a1a1a', scale: 2 });
  text(ctx, '12.770', 300, 163, { color: '#1a1a1a', scale: 2, align: 'right' });
  roundRect(ctx, 250, 178, 84, 16, '#c8202f');
  text(ctx, '★ NOVO RECORDE!', 292, 183, { color: '#ffffff', align: 'center' });
  text(ctx, 'ENTER: PRÓXIMA FASE', 60, 184, { color: '#5a5a5a' });
}

export function gameOver(ctx) {
  rect(ctx, 0, 0, W, H, '#1a0a0e');
  roundRect(ctx, 60, 24, 264, 168, '#f4efe2', '#8a8270');
  text(ctx, 'URGENTE', W / 2, 34, { color: '#c8202f', scale: 2, align: 'center' });
  text(ctx, 'CANDIDATURA', W / 2, 56, { color: '#1a1a1a', scale: 3, align: 'center' });
  text(ctx, 'IMPUGNADA', W / 2, 80, { color: '#1a1a1a', scale: 3, align: 'center' });
  draw(ctx, LLIVRE.front, W / 2 - 16, 104, { scale: 2, palette: flatPalette(LLIVRE.front, '#9a9a9a') });
  text(ctx, 'SEU MARQUETEIRO PEDIU DEMISSÃO.', W / 2, 158, { color: '#3a3a3a', align: 'center' });
  text(ctx, '▶ TENTAR DE NOVO   TROCAR CANDIDATO   MENU', W / 2, 176, { color: '#1a1a1a', align: 'center' });
}

export function celular(ctx) {
  fase1(ctx);
  drawTouchControls(ctx, W, H);
}

export const SCENES = { title, selecao, fase1, fase2, fase3, fase4, fase5, fase6, conclusao, gameOver, celular };
