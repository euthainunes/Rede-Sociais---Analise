// Ponto de entrada da Operação Liberta o Mito.

import { VIEW_W, VIEW_H } from './config/constants.js';
import { QUARTEL } from './data/missao/quartel.js';
import { URNAS } from './data/missao/urnas.js';
import { CHOCOLATE } from './data/missao/chocolate.js';
import { CHECAGEM, MISSAO_CARD } from './data/missao/checagem.js';
import { title } from './art/missao/scenes.js';
import { MissaoGame } from './game/missao.js';
import { Input } from './game/input.js';
import { Sfx } from './game/sfx.js';
import { prerenderLevel } from './game/render.js';
import { renderMissao, drawRotate } from './game/missaoRender.js';

export const LEVELS = [
  { data: QUARTEL, mission: MISSAO_CARD.quartel, checagem: CHECAGEM.quartel },
  { data: URNAS, mission: MISSAO_CARD.urnas, checagem: CHECAGEM.urnas },
  { data: CHOCOLATE, mission: MISSAO_CARD.chocolate, checagem: CHECAGEM.chocolate },
];

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

const params = new URLSearchParams(location.search);
const game = new MissaoGame(canvas, {
  levels: LEVELS,
  titleScreen: title,
  input: new Input(canvas),
  sfx: new Sfx(),
  prerender: prerenderLevel,
  startState: params.has('jogar') ? 'PLAYING' : 'TITLE',
});
// ?fase=2 abre direto uma fase (para testes)
const fase = Number(params.get('fase'));
if (fase >= 1 && fase <= LEVELS.length) { game.levelIndex = fase - 1; game.mapCursor = fase - 1; game.startLevel(); }
// #teste (ou ?teste) libera todas as fases já prontas no mapa, sem precisar zerar as anteriores
if (location.hash === '#teste' || params.has('teste')) game.unlocked = LEVELS.length - 1;
game.debug = params.has('debug');
game.run(renderMissao, drawRotate);
window.brwar = game;
