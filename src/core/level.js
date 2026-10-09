// Converte os dados de uma fase (mapa em texto) em mapa de colisão + entidades.

import { TILE } from '../config/constants.js';
import { TileMap } from './physics.js';
import { createPromessa } from './platforms.js';

const ENTITY_CHARS = new Set(['S', 'o', 'U', 'F', 'P']);

export function loadLevel(data) {
  const rows = data.map.map((r) => r.padEnd(Math.max(...data.map.map((x) => x.length)), '.'));
  const entities = { spawn: null, votes: [], checkpoints: [], promessas: [], finish: null };

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
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === 'S') entities.spawn = { x: x + 3, y: y + TILE - 22 };
      if (ch === 'o') entities.votes.push({ id: `v${tx}_${ty}`, x: x + 4, y: y + 4, w: 8, h: 8, taken: false });
      if (ch === 'U') entities.checkpoints.push({ id: `cp${tx}`, x, y: y - 16, w: 16, h: 32, active: false, spawnX: x + 3, spawnY: y + TILE - 22 });
      if (ch === 'F') entities.finish = { x, y: y - 32, w: 48, h: 48 };
    }
  });

  // Entidades não fazem parte do mapa de colisão
  const collisionRows = rows.map((r) => [...r].map((c) => (ENTITY_CHARS.has(c) ? '.' : c)).join(''));
  const map = new TileMap(collisionRows);

  if (!entities.spawn) throw new Error(`${data.id}: mapa sem ponto de início 'S'`);
  if (!entities.finish) throw new Error(`${data.id}: mapa sem chegada 'F'`);
  return { data, map, entities };
}
