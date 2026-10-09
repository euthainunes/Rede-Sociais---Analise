// Ponto de entrada: cria o canvas, ajusta a escala e inicia a fase 1.

import { VIEW_W, VIEW_H } from './config/constants.js';
import { FASE1 } from './data/levels/fase1.js';
import { Game } from './game/game.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

// Escala inteira quando cabe (pixel art nítido); abaixo de 2x, escala fracionária para caber no celular.
function resize() {
  const fit = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
addEventListener('resize', resize);
resize();

const game = new Game(canvas, FASE1);
game.run();
window.brwar = game; // acesso pelo console para testes
