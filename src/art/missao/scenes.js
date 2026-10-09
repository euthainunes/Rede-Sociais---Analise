// Prints conceituais da Missão Patriota (para aprovação de arte).

import { draw, rect, roundRect, flatPalette } from '../pixel.js';
import { text, measure } from '../font.js';
import * as E from '../enemies.js';
import * as I from '../items.js';
import * as TL from '../tiles.js';
import { CAPITAO, LLIVRE } from '../characters.js';
import { drawBalloon, drawFloat, drawPlantao, wrapText, UI } from '../hud.js';
import { PATRICIO, CELULAR, ZERO_UM, CAPITAO_DOMICILIAR, TIO_SAM, CHECADOR, FISCAL, CARECA_DO_MAL, CACHORRO } from './characters.js';
import * as M from './items.js';
import * as BG from './backgrounds.js';
import { drawHUDMissao } from './hud.js';

export const W = 384;
export const H = 216;
const GY = 184;
const stand = (ctx, spr, x, opts) => draw(ctx, spr, x, GY - spr.h, opts);
const hearts = (ctx, x, y) => { draw(ctx, I.MINI_HEART, x, y); draw(ctx, I.MINI_HEART, x + 6, y - 4); draw(ctx, I.MINI_HEART, x + 11, y + 1); };
function ground(ctx, theme, segments) {
  rect(ctx, 0, GY, W, H - GY, '#14141c');
  for (const [x, w] of segments) TL.drawGround(ctx, theme, x, GY, w, H - GY, x + 3);
}
const HUD = (o) => ({ fe: 0.8, lives: 3, score: 0, votes: 0, zap: 12, provas: 0, provasMax: 3, hours72: 72 * 3600, progress: 0.1, ...o });
function zapTrail(ctx, x, y, n = 3) {
  for (let i = 0; i < n; i++) rect(ctx, x - 6 - i * 5, y + 3, 3, 1, '#7cf27c');
}

// ---------- Tela inicial ----------
export function title(ctx) {
  BG.quartel(ctx, W, H, 0);
  rect(ctx, 0, 0, W, H, 'rgba(10,30,10,0.35)');
  text(ctx, 'BR-WAR', W / 2 + 3, 19, { color: '#0d3a18', scale: 5, align: 'center' });
  text(ctx, 'BR-WAR', W / 2, 16, { color: '#f5d000', scale: 5, align: 'center', shadow: '#1f9e3a', outline: true });
  roundRect(ctx, W / 2 - 70, 50, 140, 14, '#c8202f');
  text(ctx, 'MISSÃO PATRIOTA', W / 2, 53, { color: '#ffffff', align: 'center', scale: 1 });
  draw(ctx, PATRICIO.special, W / 2 - 24, 78, { scale: 3 });
  // feixe da lanterna do celular até o disco voador (que vai embora)
  for (let i = 0; i < 10; i++) rect(ctx, W / 2 + 20 + i * 7, 92 - i * 6, 6 + i, 6, 'rgba(255,248,176,0.35)');
  draw(ctx, CELULAR, W / 2 + 18, 96, { scale: 2 });
  draw(ctx, M.DISCO, W / 2 + 86, 22);
  text(ctx, 'VISTO 23:41', W / 2 + 98, 36, { color: '#e0e8f0', align: 'center', shadow: '#1a1a1a', outline: true });
  text(ctx, '"O 01 MANDOU ÁUDIO. MISSÃO DADA!"', W / 2, 160, { color: '#ffffff', align: 'center', shadow: '#1a1a1a', outline: true });
  text(ctx, 'APERTE QUALQUER TECLA', W / 2, 178, { color: '#f5d000', align: 'center', shadow: '#1a1a1a', outline: true });
  text(ctx, 'SÁTIRA. FEITO COM AUXÍLIO DE IA. FATOS COM FONTE NA TELA DE CHECAGEM.', W / 2, 204, { color: '#e0e8d0', align: 'center' });
}

// ---------- Fase 1: Acampamento do Quartel ----------
export function fase1(ctx) {
  BG.quartel(ctx, W, H, 0);
  ground(ctx, 'quartel', [[0, 200], [240, 144]]);
  TL.drawCavalete(ctx, 184, GY); TL.drawCavalete(ctx, 240, GY);
  TL.drawOneWay(ctx, 'quartel', 70, 146, 48);
  TL.drawBlock(ctx, 'quartel', 150, 160, 32, 24);
  draw(ctx, M.PNEU.on, 300, GY - 14);
  stand(ctx, PATRICIO.pray, 316);
  drawBalloon(ctx, 326, GY - 26, 'SENHOR PNEU, ILUMINAI O CAMINHO.');
  stand(ctx, PATRICIO.throw, 40);
  draw(ctx, M.CORRENTE_ZAP, 64, 162); zapTrail(ctx, 64, 162);
  draw(ctx, M.CORRENTE_ZAP, 104, 150); draw(ctx, M.CORRENTE_ZAP, 104, 170);
  stand(ctx, E.MILITANTE.converted, 120); hearts(ctx, 122, 152);
  drawFloat(ctx, 128, 140, 'ENCAMINHADO ×2!');
  stand(ctx, CHECADOR.idle, 214, { flip: true });
  for (let i = 0; i < 4; i++) draw(ctx, I.VOTO[i % 2], 74 + i * 12, 130);
  draw(ctx, M.PENDRIVE, 160, 146);
  drawHUDMissao(ctx, W, HUD({ score: 3250, votes: 22, zap: 11, provas: 1, hours72: 71 * 3600 + 59 * 60 + 12, progress: 0.2 }));
}

// ---------- Fase 2: Rodovia do Caminhão ----------
function caminhao(ctx, x, y, cor = '#c8202f', label = 'TRANSPORTES') {
  rect(ctx, x, y, 90, 34, '#e8e8e8'); // baú
  rect(ctx, x, y, 90, 2, '#ffffff');
  text(ctx, label, x + 45, y + 14, { color: '#3a3a3a', align: 'center' });
  rect(ctx, x + 92, y + 10, 30, 24, cor); // cabine
  rect(ctx, x + 108, y + 13, 12, 9, '#9ad8ff'); // para-brisa
  rect(ctx, x + 92, y + 30, 32, 4, '#3a3a3a');
  for (const wx of [x + 10, x + 30, x + 100]) { rect(ctx, wx, y + 32, 12, 10, '#111111'); rect(ctx, wx + 4, y + 36, 4, 3, '#8a8a8a'); }
}
export function fase2(ctx) {
  BG.rodovia(ctx, W, H, 100);
  ground(ctx, 'rodovia', [[0, W]]);
  caminhao(ctx, 30, 132, '#2f80ed', 'SOJA BRASIL');
  caminhao(ctx, 210, 132, '#c8202f', 'FRETE PATRIOTA');
  // Patrício agarrado ao para-brisa do segundo caminhão
  draw(ctx, PATRICIO.jump, 318, 138);
  drawBalloon(ctx, 328, 136, 'NÃO VOU SOLTAR! É PELO BRASIL!');
  stand(ctx, FISCAL.walk, 150, { flip: true });
  draw(ctx, M.AUDIO, 180, 160); draw(ctx, M.ZZZ, 152, 150);
  stand(ctx, E.SINDICALISTA.idle, 4);
  drawPlantao(ctx, W, 'GRUPO', 'MEU PRIMO DO EXÉRCITO DISSE QUE É AMANHÃ');
  drawHUDMissao(ctx, W, HUD({ score: 12840, votes: 58, zap: 7, provas: 1, hours72: 64 * 3600 + 3 * 60, progress: 0.35 }));
}

// ---------- Fase 3: A Fábrica de Chocolate ----------
export function fase3(ctx) {
  BG.chocolate(ctx, W, H, 40);
  ground(ctx, 'chocolate', [[0, 150], [210, 174]]);
  rect(ctx, 150, GY + 6, 60, H - GY, '#6b3a1a'); // tanque de chocolate no buraco
  for (let i = 152; i < 208; i += 7) rect(ctx, i, GY + 6, 4, 2, '#9a5a2a');
  TL.drawOneWay(ctx, 'chocolate', 140, 140, 80);
  TL.drawBlock(ctx, 'chocolate', 260, 152, 32, 32);
  for (let i = 0; i < 5; i++) draw(ctx, M.BOMBOM, 148 + i * 14, 126);
  stand(ctx, PATRICIO.walk1, 56);
  drawBalloon(ctx, 64, GY - 26, 'QUANTO BOMBOM! O 01 É UM GÊNIO DOS NEGÓCIOS.', { maxWidth: 110 });
  stand(ctx, E.REPORTER.walk, 300, { flip: true });
  drawBalloon(ctx, 306, GY - 26, 'POR QUE TUDO EM ESPÉCIE?');
  draw(ctx, M.PENDRIVE, 270, 120);
  drawHUDMissao(ctx, W, HUD({ fe: 0.55, score: 24310, votes: 97, zap: 9, provas: 2, hours72: 51 * 3600 + 40 * 60, progress: 0.48 }));
}

// ---------- Fase 4: Missão Tio Sam ----------
export function fase4(ctx) {
  BG.porto(ctx, W, H, 60);
  ground(ctx, 'porto', [[0, W]]);
  TL.drawBlock(ctx, 'porto', 20, 136, 64, 48);
  TL.drawBlock(ctx, 'porto', 84, 152, 32, 32);
  draw(ctx, M.CAFE, 150, GY - 16); draw(ctx, M.CAFE, 166, GY - 16); draw(ctx, M.CAFE, 158, GY - 32);
  text(ctx, '+50%', 166, GY - 40, { color: '#c8202f', align: 'center', shadow: '#ffffff', outline: true });
  for (let i = 0; i < 4; i++) draw(ctx, M.LARANJA, 30 + i * 12, 124);
  stand(ctx, PATRICIO.idle, 120);
  drawBalloon(ctx, 128, GY - 26, 'A TARIFA É CULPA DO LULA. EU ACHO. NÃO SEI.');
  draw(ctx, TIO_SAM, 300, GY - 28, { flip: true });
  drawBalloon(ctx, 308, GY - 30, 'THANK YOU, PATRIOT! +50%');
  drawHUDMissao(ctx, W, HUD({ fe: 0.4, score: 38900, votes: 140, zap: 5, provas: 2, hours72: 30 * 3600, progress: 0.62 }));
}

// ---------- Fase 5: Grupo da Família ----------
export function fase5(ctx) {
  BG.grupo(ctx, W, H, 60);
  ground(ctx, 'grupo', [[0, 120], [220, 164]]);
  // chão do "PIX TAXADO": boato que derruba o piso
  for (let i = 0; i < 6; i++) { TL.drawFakeBlock(ctx, 124 + i * 16, 168 + (i % 2) * 6, i % 2); }
  text(ctx, 'PIX TAXADO!!!', 172, 158, { color: '#c8202f', align: 'center', shadow: '#ffffff', outline: true });
  TL.drawChatBubble(ctx, 30, 124, 90, 12, 'in', 'URGENTE!!! REPASSEM');
  TL.drawChatBubble(ctx, 230, 120, 80, 12, 'in', 'ÁUDIO (14:32)');
  draw(ctx, PATRICIO.jump, 156, 96);
  draw(ctx, M.CORRENTE_ZAP, 180, 100); zapTrail(ctx, 180, 100);
  stand(ctx, E.TIO_DO_ZAP.converted, 40); hearts(ctx, 44, 150);
  drawFloat(ctx, 50, 144, 'TIA LÚCIA SAIU DO GRUPO');
  stand(ctx, CHECADOR.walk, 300, { flip: true });
  draw(ctx, CACHORRO, 330, GY - 12);
  drawHUDMissao(ctx, W, HUD({ fe: 0.25, score: 51200, votes: 180, zap: 14, provas: 2, hours72: 12 * 3600 + 7, progress: 0.75 }));
}

// ---------- Fase 6: Domiciliar 2.0 ----------
export function fase6(ctx) {
  BG.domiciliar(ctx, W, H, 20);
  ground(ctx, 'casa', [[0, W]]);
  BG.drawLaser(ctx, 150, 60, GY, 0);
  BG.drawLaser(ctx, 230, 60, GY, 0.3);
  TL.drawOneWay(ctx, 'casa', 170, 130, 48);
  stand(ctx, PATRICIO.walk2, 110);
  draw(ctx, M.FERRO_DE_SOLDA, 126, GY - 14);
  drawBalloon(ctx, 118, GY - 26, 'É SÓ PRA CONSERTAR O RÁDIO, JURO.');
  draw(ctx, CAPITAO_DOMICILIAR, 300, GY - 24);
  draw(ctx, M.TORNOZELEIRA, 302, GY - 5);
  drawBalloon(ctx, 308, GY - 26, 'CURIOSIDADE, TALKEY?');
  drawPlantao(ctx, W, 'ALERTA', 'TORNOZELEIRA DETECTOU CALOR');
  drawHUDMissao(ctx, W, HUD({ fe: 0.6, score: 66420, votes: 221, zap: 8, provas: 3, hours72: 2 * 3600 + 15 * 60, progress: 0.9 }));
}

// ---------- Fase 7: 25 de Outubro ----------
export function fase7(ctx) {
  BG.esplanada(ctx, W, H, 0);
  ground(ctx, 'planalto', [[0, W]]);
  BG.drawTelao(ctx, 40, 96, ZERO_UM, 'AO VIVO');
  drawBalloon(ctx, 62, 98, 'VAI, PATRIOTA! CONFIRMA!');
  stand(ctx, PATRICIO.idle, 170);
  // urna da fase
  rect(ctx, 196, 140, 48, 44, '#1a1a1a');
  rect(ctx, 198, 142, 44, 40, '#d8d8d8');
  rect(ctx, 202, 146, 36, 10, '#3a4a3a');
  text(ctx, '01', 220, 148, { color: '#7cf27c', align: 'center' });
  roundRect(ctx, 202, 168, 36, 10, '#1f9e3a');
  text(ctx, 'CONFIRMA', 220, 170, { color: '#ffffff', align: 'center' });
  draw(ctx, CARECA_DO_MAL, 330, 40, { alpha: 0.35 });
  drawHUDMissao(ctx, W, HUD({ fe: 0.9, score: 88880, votes: 260, zap: 3, provas: 3, hours72: 1, progress: 1 }));
}

// ---------- Final: as duas reações, lado a lado ----------
export function final(ctx) {
  rect(ctx, 0, 0, W, H, '#0e1424');
  const panel = (x, bg, title, body, pose) => {
    roundRect(ctx, x, 30, 180, 150, bg, '#ffffff');
    text(ctx, title, x + 90, 38, { color: '#ffffff', align: 'center' });
    draw(ctx, pose, x + 74, 54, { scale: 2 });
    wrapText(body, 160).forEach((l, i) => text(ctx, l, x + 90, 112 + i * 10, { color: '#ffffff', align: 'center' }));
  };
  text(ctx, 'RESULTADO DO 2º TURNO', W / 2, 10, { color: UI.gold, scale: 2, align: 'center' });
  panel(8, '#1f6a3a', 'SE O 01 GANHAR', 'URNAS 100% CONFIÁVEIS. SEMPRE FORAM. NUNCA DUVIDEI.', PATRICIO.special);
  panel(196, '#8a1420', 'SE O 01 PERDER', 'FRAUDE!!! VOLTEM PRO QUARTEL! FALTAM 72 HORAS!', PATRICIO.throw);
  text(ctx, 'MESMO PATRIOTA. MESMAS URNAS. OPINIÕES DIFERENTES.', W / 2, 192, { color: '#c8d0e0', align: 'center' });
}

// ---------- Tela de Checagem (fim de fase) ----------
export function checagem(ctx) {
  rect(ctx, 0, 0, W, H, '#f4f6f8');
  rect(ctx, 0, 0, W, 22, '#1f2a3d');
  text(ctx, 'CHECAGEM - FASE 1: ACAMPAMENTO DO QUARTEL', W / 2, 8, { color: '#ffffff', align: 'center' });
  const row = (y, tag, color, body) => {
    roundRect(ctx, 14, y, 40, 11, color);
    text(ctx, tag, 34, y + 3, { color: '#ffffff', align: 'center' });
    wrapText(body, 300).forEach((l, i) => text(ctx, l, 62, y + 3 + i * 9, { color: '#1a1a1a' }));
  };
  row(32, 'FATO', '#1f9e3a', 'ENTRE NOV/2022 E JAN/2023 HOUVE ACAMPAMENTOS EM FRENTE A QUARTÉIS PEDINDO INTERVENÇÃO MILITAR.');
  row(58, 'FATO', '#1f9e3a', 'AS FORÇAS ARMADAS NÃO AGIRAM EM 72 HORAS. NEM EM 72 DIAS.');
  row(84, 'MEME', '#f5a020', 'REZAR PARA PNEU: VÍDEO VIRAL DE 2022. A EFICÁCIA DO PNEU NÃO FOI COMPROVADA.');
  row(110, 'PIADA', '#8a4ad0', 'O PATRÍCIO, O CONTADOR DAS 72 HORAS E OS PENDRIVES VAZIOS SÃO FICÇÃO DESTE JOGO.');
  rect(ctx, 14, 140, W - 28, 1, '#c8ccd4');
  text(ctx, 'PROVAS DA FRAUDE ENCONTRADAS: 3', 14, 148, { color: '#1a1a1a' });
  for (let i = 0; i < 3; i++) {
    draw(ctx, M.PENDRIVE, 14 + i * 90, 160);
    text(ctx, 'PASTA_NOVA (2)', 26 + i * 90, 160, { color: '#5a5a5a' });
    text(ctx, '0 ARQUIVOS', 26 + i * 90, 169, { color: '#c8202f' });
  }
  text(ctx, 'FONTES: VER docs/BR-WAR-v2-missao-patriota.md', W / 2, 198, { color: '#5a6070', align: 'center' });
}

// ---------- Game over: Fé zerada ----------
export function gameOver(ctx) {
  rect(ctx, 0, 0, W, H, '#1a0a0e');
  draw(ctx, PATRICIO.awake, W / 2 - 24, 40, { scale: 3 });
  text(ctx, 'VOCÊ ACORDOU.', W / 2, 128, { color: '#ffffff', scale: 2, align: 'center' });
  text(ctx, 'O PATRÍCIO LEU UMA CHECAGEM INTEIRA E PERDEU A FÉ.', W / 2, 150, { color: '#c8d0e0', align: 'center' });
  text(ctx, '"...MAS TAMBÉM, QUEM CHECA OS CHECADORES?"', W / 2, 164, { color: UI.gold, align: 'center' });
  text(ctx, '▶ VOLTAR PRO GRUPO E RECUPERAR A FÉ', W / 2, 188, { color: '#ffffff', align: 'center' });
}

// ---------- Missões: objetivo e medida própria de cada fase ----------
export const MISSOES = [
  { n: 1, nome: 'ACAMPAMENTO DO QUARTEL', ano: '2022', medida: 'FALTAM 72H', texto: 'O 01 mandou áudio: "Aguenta firme no quartel, patriota." Entregue 5 marmitas aos acampados e chegue ao portão antes que as 72 horas acabem. Elas nunca acabam. Reze no pneu para salvar o progresso.' },
  { n: 2, nome: 'RODOVIA DO CAMINHÃO', ano: '2022', medida: 'FORÇA NO BRAÇO', texto: 'Brasília fica a 1.015 km e a carona não para. Pule de caminhão em caminhão e segure B para se agarrar ao para-brisa. Se a força acabar, você cai no acostamento.' },
  { n: 3, nome: 'A FÁBRICA DE CHOCOLATE', ano: '2018', medida: 'DEPÓSITOS 0/1512', texto: 'O 01 é um gênio dos negócios e você vai provar. Venda bombons e deposite tudo em espécie, em notinhas pequenas, sem o Fiscal ver. Você não está entendendo nada, mas confia.' },
  { n: 4, nome: 'MISSÃO TIO SAM', ano: '2025', medida: 'TARIFA +50%', texto: 'Leve as caixas de café e de laranja até o navio. Detalhe: o Tio Sam cobrou 50% a mais e tudo pesa 50% mais. A culpa é do Lula. Você acha. Ninguém te explicou direito.' },
  { n: 5, nome: 'GRUPO DA FAMÍLIA', ano: '2025', medida: 'ALCANCE 0/10', texto: 'Repasse 10 correntes antes que o Checador chegue. Cuidado: corrente que volta acerta você. Se o boato do Pix aparecer, o chão some.' },
  { n: 6, nome: 'DOMICILIAR 2.0', ano: '2025', medida: 'CALOR', texto: 'Leve o ferro de solda até o fim da casa sem disparar os sensores. É só pra consertar o rádio. Juro. Se a barra de CALOR encher, a tornozeleira apita.' },
  { n: 7, nome: '25 DE OUTUBRO', ano: '2026', medida: 'CONFIRMA', texto: 'Chegou o dia. Atravesse a Esplanada e aperte CONFIRMA. O resultado não importa: o Patrício já tem a reação pronta para os dois casos.' },
];

export function missao(ctx) {
  BG.quartel(ctx, W, H, 0);
  rect(ctx, 0, 0, W, H, 'rgba(10,15,30,0.55)');
  const m = MISSOES[0];
  roundRect(ctx, 26, 30, 332, 150, '#f4efe2');
  roundRect(ctx, 28, 32, 328, 146, '#1f3a2a');
  roundRect(ctx, 38, 40, 74, 12, '#f5d000');
  text(ctx, 'ÁUDIO DO 01', 75, 43, { color: '#1a1a1a', align: 'center' });
  draw(ctx, ZERO_UM, 324, 38);
  text(ctx, `FASE ${m.n} - ${m.nome}`, 38, 60, { color: '#f5d000', scale: 1 });
  wrapText(m.texto, 300).forEach((l, i) => text(ctx, l, 38, 76 + i * 10, { color: '#ffffff' }));
  rect(ctx, 38, 140, 308, 1, '#4a6a4a');
  text(ctx, `MEDIDA DA FASE: ${m.medida}`, 38, 146, { color: '#7cf27c' });
  rect(ctx, 28, 160, 328, 18, '#1f9e3a');
  text(ctx, 'APERTE PULO PARA CONTINUAR ▶', 344, 166, { color: '#ffffff', align: 'right' });
  stand(ctx, PATRICIO.idle, 40);
}

export function mapa(ctx) {
  // Mapa estilizado do Brasil com a rota até Brasília
  rect(ctx, 0, 0, W, H, '#2a6a9a');
  for (let y = 4; y < H; y += 8) for (let x = (y / 8) % 2 ? 0 : 6; x < W; x += 14) rect(ctx, x, y, 5, 1, '#4a8aba');
  const pts = [[96, 150], [128, 126], [158, 150], [190, 120], [224, 142], [256, 112], [300, 96]];
  // "continente"
  ctx.fillStyle = '#5aa83a';
  ctx.beginPath();
  ctx.moveTo(60, 70); ctx.lineTo(190, 46); ctx.lineTo(300, 56); ctx.lineTo(352, 98); ctx.lineTo(318, 150);
  ctx.lineTo(250, 196); ctx.lineTo(170, 200); ctx.lineTo(110, 178); ctx.lineTo(70, 130); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a8a2e';
  for (let i = 0; i < 18; i++) rect(ctx, 80 + ((i * 47) % 250), 70 + ((i * 31) % 110), 8, 5, '#4a8a2e');
  // trilha pontilhada
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]; const [x2, y2] = pts[i + 1];
    for (let k = 1; k < 8; k++) rect(ctx, Math.round(x1 + ((x2 - x1) * k) / 8), Math.round(y1 + ((y2 - y1) * k) / 8), 3, 3, '#f5e6a0');
  }
  pts.forEach(([x, y], i) => {
    const done = i < 2;
    roundRect(ctx, x - 7, y - 7, 15, 15, done ? '#1f9e3a' : '#c8202f', '#1a1a1a');
    text(ctx, done ? '✓' : String(i + 1), x + (done ? -2 : 0), y - 2, { color: '#ffffff', align: done ? 'left' : 'center' });
  });
  // Brasília no fim da rota
  rect(ctx, 322, 52, 4, 22, '#ffffff'); rect(ctx, 328, 52, 4, 22, '#ffffff');
  rect(ctx, 310, 74, 34, 3, '#ffffff');
  text(ctx, 'BRASÍLIA', 327, 42, { color: '#ffffff', align: 'center', shadow: '#1a1a1a', outline: true });
  // o Patrício no ponto 3
  draw(ctx, PATRICIO.front, 150, 118);
  // a nuvem suspeita
  draw(ctx, CARECA_DO_MAL, 40, 30, { alpha: 0.25 });
  // painel
  roundRect(ctx, 8, 6, W - 16, 26, '#0e1424');
  text(ctx, 'FASE 3 - 2018', 16, 10, { color: '#f5d000' });
  text(ctx, 'A FÁBRICA DE CHOCOLATE', 16, 19, { color: '#ffffff', scale: 1 });
  text(ctx, 'PULO: ENTRAR NA FASE', W - 16, 10, { color: '#c8d0e0', align: 'right' });
  text(ctx, 'VIDAS 3   PROVAS 6/21', W - 16, 19, { color: '#c8d0e0', align: 'right' });
}

export const SCENES_MISSAO = { title, mapa, missao, fase1, fase2, fase3, fase4, fase5, fase6, fase7, checagem, gameOver, final };
