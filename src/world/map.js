// ---------------------------------------------------------------------------
// map.js — GameMap: acesso a tiles, colisão e desenho do cenário
// ---------------------------------------------------------------------------
import { TILE, SOLID, OPAQUE, HAZARD } from './tiles.js';
import { S, drawShadow } from '../sprites.js';

export const TS = 16; // tamanho do tile em px

export class GameMap {
  constructor(d) {
    this.id = d.id;
    this.name = d.name;
    this.w = d.w;
    this.h = d.h;
    this.tiles = d.tiles;
    this.variant = d.variant;
    this.decals = d.decals || [];
    this.objects = d.objects || [];
    this.lights = d.lights || [];
    this.zones = d.zones || [];
    this.entities = d.entities || [];
    this.spawnZones = d.spawnZones || [];
    this.ambient = d.ambient || 'day';
    this.pxW = d.w * TS;
    this.pxH = d.h * TS;
    this.spawn = d.spawn || { x: 100, y: 100 };
    this.exits = d.exits || [];
    this.tint = d.tint || null;

    // grade de decalques por faixa de Y para desenho rápido
    this.objects.sort((a, b) => a.y - b.y);
  }

  // --- tiles ---------------------------------------------------------------
  idx(tx, ty) { return ty * this.w + tx; }

  tile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return TILE.MOUNTAIN;
    return this.tiles[ty * this.w + tx];
  }
  setTile(tx, ty, v, variant) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
    this.tiles[ty * this.w + tx] = v;
    if (variant !== undefined) this.variant[ty * this.w + tx] = variant;
  }
  isSolidTile(tx, ty) { return SOLID[this.tile(tx, ty)] === 1; }
  isOpaqueTile(tx, ty) { return OPAQUE[this.tile(tx, ty)] === 1; }
  isSolidAt(x, y) { return this.isSolidTile(Math.floor(x / TS), Math.floor(y / TS)); }
  isOpaqueAt(x, y) { return this.isOpaqueTile(Math.floor(x / TS), Math.floor(y / TS)); }
  hazardAt(x, y) { return HAZARD[this.tile(Math.floor(x / TS), Math.floor(y / TS))] || 0; }

  /** Colisão círculo x mundo (tiles sólidos). */
  blocked(x, y, r) {
    const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS);
    const y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolidTile(tx, ty)) {
          // AABB do tile
          const cx = Math.max(tx * TS, Math.min(x, tx * TS + TS));
          const cy = Math.max(ty * TS, Math.min(y, ty * TS + TS));
          const dx = x - cx, dy = y - cy;
          if (dx * dx + dy * dy < r * r) return true;
        }
      }
    }
    return false;
  }

  /** Move um corpo com deslizamento nas paredes. Retorna a posição final. */
  move(x, y, dx, dy, r) {
    let nx = x + dx;
    if (this.blocked(nx, y, r)) nx = x;
    let ny = y + dy;
    if (this.blocked(nx, ny, r)) ny = y;
    return { x: nx, y: ny };
  }

  inBounds(x, y, pad = 8) {
    return x > pad && y > pad && x < this.pxW - pad && y < this.pxH - pad;
  }

  /** Linha de visão desobstruída? */
  lineOfSight(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(d / 8);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isOpaqueAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  /** Acha um tile livre próximo. */
  findFree(tx, ty, maxR = 12, rand = Math.random) {
    if (!this.isSolidTile(tx, ty)) return { x: tx * TS + 8, y: ty * TS + 8 };
    for (let r = 1; r <= maxR; r++) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
        const ax = Math.round(tx + Math.cos(a) * r), ay = Math.round(ty + Math.sin(a) * r);
        if (!this.isSolidTile(ax, ay)) return { x: ax * TS + 8, y: ay * TS + 8 };
      }
    }
    return { x: tx * TS + 8, y: ty * TS + 8 };
  }

  zoneAt(x, y) {
    const tx = x / TS, ty = y / TS;
    for (const z of this.zones) {
      if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z;
    }
    return null;
  }

  // --- desenho -------------------------------------------------------------
  drawGround(ctx, cam, time) {
    const t0x = Math.max(0, Math.floor(cam.left / TS) - 1);
    const t1x = Math.min(this.w - 1, Math.ceil(cam.right / TS) + 1);
    const t0y = Math.max(0, Math.floor(cam.top / TS) - 1);
    const t1y = Math.min(this.h - 1, Math.ceil(cam.bottom / TS) + 1);
    const wf = Math.floor(time * 4) % 3;
    for (let ty = t0y; ty <= t1y; ty++) {
      const row = ty * this.w;
      for (let tx = t0x; tx <= t1x; tx++) {
        const t = this.tiles[row + tx];
        let key;
        if (t === TILE.WATER) key = `tile:${TILE.WATER}:${wf}:${this.variant[row + tx] & 1}`;
        else key = `tile:${t}:${this.variant[row + tx] & 3}`;
        let spr = S(key);
        if (!spr) spr = S(`tile:${TILE.GRASS}:0`);
        if (spr) ctx.drawImage(spr, tx * TS, ty * TS);
      }
    }
    // decalques
    for (const d of this.decals) {
      if (d.x < cam.left - 40 || d.x > cam.right + 40 || d.y < cam.top - 40 || d.y > cam.bottom + 40) continue;
      const spr = S(d.sprite);
      if (!spr) continue;
      const wob = d.kind === 'grass' ? Math.sin(time * 2 + d.x * 0.1) * 0.6 : 0;
      ctx.drawImage(spr, Math.round(d.x - spr.width / 2 + wob), Math.round(d.y - spr.height + 4));
    }
  }

  /** Objetos "altos" visíveis, para ordenar por Y junto com as entidades. */
  visibleObjects(cam) {
    const out = [];
    for (const o of this.objects) {
      if (o.x < cam.left - 120 || o.x > cam.right + 120) continue;
      if (o.y < cam.top - 160 || o.y - (o.h || 0) > cam.bottom + 40) continue;
      out.push(o);
    }
    return out;
  }

  drawObject(ctx, o, time) {
    let spr = null;
    if (o.animated) spr = S(`${o.sprite}:${Math.floor(time * 8) % o.animated}`);
    if (!spr) spr = S(o.sprite);
    if (!spr) spr = S(`${o.sprite}:0`);
    if (!spr) return;
    ctx.drawImage(spr, Math.round(o.x - spr.width / 2), Math.round(o.y - spr.height));
    if (o.light) {
      ctx.globalAlpha = 0.16 + Math.sin(time * 9 + o.x * 0.3) * 0.05;
      ctx.fillStyle = '#ffb04a';
      ctx.beginPath();
      ctx.arc(o.x, o.y - spr.height * 0.65, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

export function drawEntitySprite(ctx, spriteKey, x, y, opts = {}) {
  const spr = S(spriteKey);
  if (!spr) return null;
  if (opts.shadow !== false) drawShadow(ctx, x, y, (opts.radius || 7) + 2);
  const sc = opts.scale || 1;
  const w = spr.width * sc, h = spr.height * sc;
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  ctx.drawImage(spr, Math.round(x - w / 2), Math.round(y - h + (opts.zOff || 0)), Math.round(w), Math.round(h));
  if (opts.alpha !== undefined) ctx.globalAlpha = 1;
  return { w, h };
}
