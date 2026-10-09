// Mapa de tiles e colisão AABB resolvida por eixo (§3.5 e §9.6). Sem dependência de tela.

import { TILE } from '../config/constants.js';

const SOLID = new Set(['#', 'B', 'C']);
const ONE_WAY = new Set(['=']);

export class TileMap {
  constructor(rows) {
    this.rows = rows;
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.pixelW = this.w * TILE;
    this.pixelH = this.h * TILE;
  }

  at(tx, ty) {
    if (ty < 0 || ty >= this.h || tx < 0 || tx >= this.w) return '.';
    return this.rows[ty][tx] ?? '.';
  }

  isSolid(tx, ty) {
    // Paredes invisíveis nas laterais da fase; abaixo do mapa é vazio (buraco).
    if (tx < 0 || tx >= this.w) return true;
    return SOLID.has(this.at(tx, ty));
  }

  isOneWay(tx, ty) {
    return ONE_WAY.has(this.at(tx, ty));
  }
}

/**
 * Move um corpo { x, y, w, h, vx, vy } por dt e resolve colisões.
 * platforms: superfícies dinâmicas atravessáveis por baixo { x, y, w, solid: true }.
 * opts.dropThrough: ignora plataformas one-way (↓ + pulo).
 * Retorna { onGround, hitWall, hitCeiling, standingOn }.
 */
export function moveAndCollide(body, map, dt, platforms = [], opts = {}) {
  const result = { onGround: false, hitWall: 0, hitCeiling: false, standingOn: null };

  // ---- eixo X ----
  body.x += body.vx * dt;
  const top = Math.floor(body.y / TILE);
  const bottom = Math.floor((body.y + body.h - 0.001) / TILE);
  if (body.vx > 0) {
    const tx = Math.floor((body.x + body.w - 0.001) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (map.isSolid(tx, ty)) {
        body.x = tx * TILE - body.w;
        body.vx = 0;
        result.hitWall = 1;
        break;
      }
    }
  } else if (body.vx < 0) {
    const tx = Math.floor(body.x / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (map.isSolid(tx, ty)) {
        body.x = (tx + 1) * TILE;
        body.vx = 0;
        result.hitWall = -1;
        break;
      }
    }
  }

  // ---- eixo Y ----
  const prevBottom = body.y + body.h;
  body.y += body.vy * dt;
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.w - 0.001) / TILE);

  if (body.vy >= 0) {
    const newBottom = body.y + body.h;
    const ty = Math.floor((newBottom - 0.001) / TILE);
    let landY = Infinity;
    for (let tx = left; tx <= right; tx++) {
      const surface = ty * TILE;
      if (map.isSolid(tx, ty) && prevBottom <= surface + 0.5) landY = Math.min(landY, surface);
      if (!opts.dropThrough && map.isOneWay(tx, ty) && prevBottom <= surface + 0.5) landY = Math.min(landY, surface);
    }
    for (const p of platforms) {
      if (!p.solid) continue;
      const overlapX = body.x + body.w > p.x && body.x < p.x + p.w;
      if (overlapX && prevBottom <= p.y + 0.5 && newBottom >= p.y && p.y < landY) {
        landY = p.y;
        result.standingOn = p;
      }
    }
    if (landY !== Infinity && newBottom >= landY) {
      body.y = landY - body.h;
      body.vy = 0;
      result.onGround = true;
      if (result.standingOn && result.standingOn.y !== landY) result.standingOn = null;
    } else {
      result.standingOn = null;
    }
  } else {
    const ty = Math.floor(body.y / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (map.isSolid(tx, ty)) {
        body.y = (ty + 1) * TILE;
        body.vy = 0;
        result.hitCeiling = true;
        break;
      }
    }
  }
  return result;
}

/** Sobreposição entre dois retângulos { x, y, w, h }. */
export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
