// Converte os dados de uma fase (mapa em texto) em mapa de colisão + entidades.
// Tiles de colisão: # B C =. Qualquer outro caractere (exceto '.') é uma entidade:
// as conhecidas viram objetos prontos; as demais ficam em entities.points[caractere].

import { TILE } from '../config/constants.js';
import { TileMap } from './physics.js';
import { createPromessa } from './platforms.js';

const TILE_CHARS = new Set(['#', 'B', 'C', '=', 'Q']);

export function loadLevel(data) {
  const width = Math.max(...data.map.map((x) => x.length));
  const rows = data.map.map((r) => r.padEnd(width, '.'));
  const entities = { spawn: null, votes: [], checkpoints: [], promessas: [], finish: null, points: {} };

  rows.forEach((row, ty) => {
    let promessaStart = -1;
    for (let tx = 0; tx <= row.length; tx++) {
      const ch = row[tx];
      // plataformas PROMESSA contíguas viram uma só
      if (ch === 'P' && promessaStart < 0) promessaStart = tx;
      if (ch !== 'P' && promessaStart >= 0) {
        entities.promessas.push(createPromessa(promessaStart * TILE, ty * TILE, (tx - promessaStart) * TILE));
        promessaStart = -1;
      }
      if (ch === undefined || ch === '.' || TILE_CHARS.has(ch)) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === 'S') entities.spawn = { x: x + 3, y: y + TILE - 22 };
      else if (ch === 'o') entities.votes.push({ id: `v${tx}_${ty}`, x: x + 4, y: y + 4, w: 8, h: 8, taken: false });
      else if (ch === 'U') entities.checkpoints.push({ id: `cp${tx}`, x, y: y - 16, w: 16, h: 32, active: false, spawnX: x + 3, spawnY: y + TILE - 22 });
      else if (ch === 'F') entities.finish = { x, y: y - 32, w: 48, h: 48 };
      else if (ch !== 'P') (entities.points[ch] ??= []).push({ tx, ty, x, y });
    }
  });

  // Só os tiles de colisão ficam no mapa
  const collisionRows = rows.map((r) => [...r].map((c) => (TILE_CHARS.has(c) ? c : '.')).join(''));
  const map = new TileMap(collisionRows);

  if (!entities.spawn) throw new Error(`${data.id}: mapa sem ponto de início 'S'`);
  if (!entities.finish) throw new Error(`${data.id}: mapa sem chegada 'F'`);
  return { data, map, entities };
}
