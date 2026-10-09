// Ponto de entrada da Missão Patriota (fase 1: Acampamento do Quartel).

import { VIEW_W, VIEW_H } from './config/constants.js';
import { QUARTEL } from './data/missao/quartel.js';
import { CHECAGEM, MISSAO_CARD } from './data/missao/checagem.js';
import { title } from './art/missao/scenes.js';
import { MissaoGame } from './game/missao.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

function resize() {
  const fit = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
addEventListener('resize', resize);
resize();

const game = new MissaoGame(canvas, QUARTEL, { titleScreen: title, missionData: MISSAO_CARD.quartel, checagemData: CHECAGEM.quartel });
game.run();
window.brwar = game;
