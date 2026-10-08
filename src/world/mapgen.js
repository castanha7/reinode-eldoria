// ---------------------------------------------------------------------------
// mapgen.js — geração dos mapas: mundo aberto, masmorra e sala do trono
// ---------------------------------------------------------------------------
import { TILE } from './tiles.js';
import { RNG } from '../core/utils.js';
import { buildingSprite, castleSprite } from '../sprites.js';
import { TS } from './map.js';

const BLOCKED = new Set([
  TILE.MOUNTAIN, TILE.WALL, TILE.TREE, TILE.PINE, TILE.ROCK, TILE.BUSH,
  TILE.FENCE, TILE.CAVE_WALL, TILE.STUMP, TILE.CRYSTAL, TILE.WATER, TILE.LAVA,
]);

class Builder {
  constructor(w, h, fill) {
    this.w = w;
    this.h = h;
    this.tiles = new Uint8Array(w * h).fill(fill);
    this.variant = new Uint8Array(w * h);
    this.objects = [];
    this.decals = [];
    this.lights = [];
    this.zones = [];
    this.entities = [];
    this.rng = new RNG(1);
  }
  in(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
  get(tx, ty) { return this.in(tx, ty) ? this.tiles[ty * this.w + tx] : TILE.MOUNTAIN; }
  set(tx, ty, t, v) {
    if (!this.in(tx, ty)) return;
    this.tiles[ty * this.w + tx] = t;
    if (v !== undefined) this.variant[ty * this.w + tx] = v;
  }
  rect(x, y, w, h, t, v) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t, v);
  }
  ellipse(cx, cy, rx, ry, t, v) {
    for (let y = -ry - 1; y <= ry + 1; y++) {
      for (let x = -rx - 1; x <= rx + 1; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.set(cx + x, cy + y, t, v);
      }
    }
  }
  /** Linha grossa. preserve = tiles que não são sobrescritos (viram opts.replace). */
  stroke(points, width, t, opts = {}) {
    const { jitter = 0, vFn, preserve, replace } = opts;
    const hw = Math.floor(width / 2);
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const d = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
      for (let s = 0; s <= d; s++) {
        const tx = Math.round(x0 + ((x1 - x0) * s) / d);
        const ty = Math.round(y0 + ((y1 - y0) * s) / d);
        const jx = jitter ? Math.round(this.rng.float(-jitter, jitter)) : 0;
        const jy = jitter ? Math.round(this.rng.float(-jitter, jitter)) : 0;
        for (let a = -hw; a <= width - hw - 1; a++) {
          for (let b = -hw; b <= width - hw - 1; b++) {
            if (a * a + b * b > hw * hw + hw) continue;
            const cx = tx + a + jx, cy = ty + b + jy;
            if (preserve && preserve.indexOf(this.get(cx, cy)) >= 0) {
              if (replace !== undefined) this.set(cx, cy, replace, 0);
              continue;
            }
            this.set(cx, cy, t, vFn ? vFn() : 0);
          }
        }
      }
    }
  }
  /** Objeto do cenário. feet = (tx*16+8+dx, ty*16+16+dy). */
  prop(sprite, tx, ty, opts = {}) {
    const x = tx * TS + 8 + (opts.dx || 0);
    const y = ty * TS + 16 + (opts.dy || 0);
    const o = { kind: 'prop', sprite, x, y, h: opts.h || 24 };
    if (opts.animated) o.animated = opts.animated;
    if (opts.light) {
      o.light = true;
      this.lights.push({ x, y: y - 10, r: opts.lightR || 90, color: opts.lightColor || '#ffb04a' });
    }
    this.objects.push(o);
    if (opts.solid) {
      const [sw, sh] = opts.solid;
      const ox = opts.solidOff ? opts.solidOff[0] : 0;
      const oy = opts.solidOff ? opts.solidOff[1] : 0;
      for (let j = 0; j < sh; j++) {
        for (let i = 0; i < sw; i++) this.set(tx + ox + i, ty + oy + j, opts.solidTile || TILE.ROCK, 0);
      }
    }
    return o;
  }
  decal(sprite, tx, ty, kind = 'static') {
    this.decals.push({ sprite, x: tx * TS + 8 + this.rng.float(-3, 3), y: ty * TS + 14 + this.rng.float(-3, 3), kind });
  }
  building(tx, ty, wTiles, hTiles, kind, seed) {
    const w = wTiles * TS, h = hTiles * TS;
    const key = buildingSprite(w, h, kind, seed);
    const x = tx * TS + w / 2, y = ty * TS + h;
    this.objects.push({ kind: 'building', sprite: key, x, y, h });
    const wallH = Math.max(2, Math.floor(hTiles * 0.45));
    for (let j = hTiles - wallH; j < hTiles; j++) {
      for (let i = 0; i < wTiles; i++) this.set(tx + i, ty + j, TILE.WALL, 0);
    }
    return { x, y, w, h };
  }
  result(extra) {
    return {
      w: this.w, h: this.h,
      tiles: this.tiles, variant: this.variant,
      decals: this.decals, objects: this.objects, lights: this.lights,
      zones: this.zones, entities: this.entities, exits: this.exits || [],
      ...extra,
    };
  }
}

// ===========================================================================
// MUNDO ABERTO
// ===========================================================================
export function generateOverworld(seed = 20260828) {
  const W = 200, H = 150;
  const B = new Builder(W, H, TILE.GRASS);
  const r = B.rng;
  r.reseed(seed);
  const nz = new RNG(seed ^ 0x9e3779);

  const riverY = (tx) => Math.round(26 + (128 - tx) * 0.375 + Math.sin(tx * 0.05) * 6);

  // --- terreno base --------------------------------------------------------
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const n = nz.fbm(tx, ty, 14, 3);
      B.set(tx, ty, n > 0.6 ? TILE.GRASS_TALL : TILE.GRASS, r.int(0, 3));
    }
  }

  // --- bordas montanhosas --------------------------------------------------
  for (let tx = 0; tx < W; tx++) {
    const depth = 5 + Math.round(nz.value2(tx, 0, 16) * 7);
    for (let ty = 0; ty < depth; ty++) B.set(tx, ty, TILE.MOUNTAIN, r.int(0, 1));
  }
  for (let ty = 0; ty < H; ty++) {
    const wl = 3 + Math.round(nz.value2(0, ty, 16) * 4);
    const wr = 3 + Math.round(nz.value2(W, ty, 16) * 4);
    for (let tx = 0; tx < wl; tx++) B.set(tx, ty, TILE.MOUNTAIN, r.int(0, 1));
    for (let tx = W - wr; tx < W; tx++) B.set(tx, ty, TILE.MOUNTAIN, r.int(0, 1));
  }
  for (let tx = 0; tx < W; tx++) for (let ty = H - 3; ty < H; ty++) B.set(tx, ty, TILE.MOUNTAIN, r.int(0, 1));
  for (let i = 0; i < 46; i++) {
    const cx = r.int(96, 192), cy = r.int(5, 26);
    B.ellipse(cx, cy, r.int(3, 7), r.int(2, 5), TILE.MOUNTAIN, r.int(0, 1));
  }

  // --- pântano / vale sombrio ---------------------------------------------
  for (let ty = 86; ty < 130; ty++) {
    for (let tx = 150; tx < 193; tx++) {
      const n = nz.fbm(tx, ty, 12, 2);
      if (n > 0.5) B.set(tx, ty, TILE.SWAMP, r.int(0, 3));
      else if (n > 0.44) B.set(tx, ty, TILE.DARK_GRASS, r.int(0, 3));
    }
  }
  // floresta profunda (chão escuro) no noroeste
  for (let ty = 4; ty < 48; ty++) {
    for (let tx = 4; tx < 68; tx++) {
      if (nz.fbm(tx, ty, 18, 2) > 0.52) B.set(tx, ty, TILE.DARK_GRASS, r.int(0, 3));
    }
  }

  // --- estradas ------------------------------------------------------------
  const roadMain = [[61, 104], [61, 92], [61, 78], [60, 68], [64, 58], [74, 50], [86, 42], [98, 34], [108, 27], [114, 22]];
  const roadEast = [[90, 118], [104, 118], [122, 116], [140, 112], [156, 108], [172, 106], [186, 108]];
  const roadRuins = [[140, 112], [144, 96], [150, 78], [154, 62], [158, 52]];
  const roadWest = [[31, 118], [22, 118], [14, 112], [10, 100]];
  for (const rd of [roadMain, roadEast, roadRuins, roadWest]) {
    B.stroke(rd, 3, TILE.ROAD, { vFn: () => r.int(0, 3) });
  }

  // --- rio (preserva estradas → pontes) ------------------------------------
  const river = [];
  for (let tx = 130; tx >= 0; tx -= 5) river.push([tx, riverY(tx)]);
  B.stroke(river, 10, TILE.SAND, { preserve: [TILE.ROAD], replace: TILE.SAND_PATH });
  B.stroke(river, 6, TILE.WATER, { preserve: [TILE.ROAD], replace: TILE.BRIDGE, vFn: () => r.int(0, 1) });
  // lago na floresta
  B.ellipse(24, 62, 10, 7, TILE.SAND, 0);
  B.ellipse(24, 62, 8, 5, TILE.WATER, 0);
  // variantes aleatórios da margem do lago (B.ellipse recebe número, não função)
  for (let y = -6; y <= 6; y++) for (let x = -9; x <= 9; x++) {
    if ((x * x) / (9 * 9) + (y * y) / (6 * 6) <= 1 && B.get(24 + x, 62 + y) === TILE.WATER) {
      B.variant[(62 + y) * B.w + (24 + x)] = r.int(0, 1);
    }
  }
  for (let i = 0; i < 8; i++) {
    const tx = 24 + r.int(-6, 6), ty = 62 + r.int(-4, 4);
    if (B.get(tx, ty) === TILE.WATER) B.set(tx, ty, TILE.LILY, 0);
  }

  // =========================================================================
  // CIDADE DE ELDORIA
  // =========================================================================
  const CX = 30, CY = 92, CW = 63, CH = 47;
  B.rect(56, 108, 14, 12, TILE.COBBLE, 0);                       // praça
  B.stroke([[61, 93], [61, 108]], 3, TILE.COBBLE, { vFn: () => r.int(0, 3) });
  B.stroke([[33, 118], [90, 118]], 3, TILE.COBBLE, { vFn: () => r.int(0, 3) });
  B.stroke([[61, 118], [61, 137]], 2, TILE.COBBLE, { vFn: () => r.int(0, 3) });

  for (let tx = CX; tx < CX + CW; tx++) { B.set(tx, CY, TILE.WALL, r.int(0, 1)); B.set(tx, CY + CH - 1, TILE.WALL, r.int(0, 1)); }
  for (let ty = CY; ty < CY + CH; ty++) { B.set(CX, ty, TILE.WALL, r.int(0, 1)); B.set(CX + CW - 1, ty, TILE.WALL, r.int(0, 1)); }
  B.rect(59, CY, 5, 1, TILE.COBBLE, 0);          // portão norte
  B.rect(CX + CW - 1, 116, 1, 5, TILE.COBBLE, 0); // portão leste
  B.rect(CX, 116, 1, 5, TILE.COBBLE, 0);          // portão oeste
  for (const [tx, ty] of [[CX, CY], [CX + CW - 3, CY], [CX, CY + CH - 3], [CX + CW - 3, CY + CH - 3], [CX + 20, CY], [CX + 40, CY]]) {
    B.rect(tx, ty, 3, 3, TILE.WALL, 0);
    B.prop('pillar', tx + 1, ty + 1, { h: 40, solid: [1, 1], solidTile: TILE.WALL });
  }

  // castelo
  const castleW = 26, castleH = 14, castleTX = 48, castleTY = CY + 2;
  B.rect(castleTX, castleTY, castleW, castleH, TILE.STONE_FLOOR, 0);
  B.objects.push({
    kind: 'building',
    sprite: castleSprite(castleW * TS, castleH * TS),
    x: castleTX * TS + (castleW * TS) / 2,
    y: castleTY * TS + castleH * TS,
    h: castleH * TS,
  });
  for (let j = castleTY + 3; j < castleTY + castleH; j++) {
    for (let i = castleTX; i < castleTX + castleW; i++) B.set(i, j, TILE.WALL, 0);
  }
  const doorTX = castleTX + 13, doorTY = castleTY + castleH - 1;
  B.set(doorTX, doorTY, TILE.STAIRS, 0);
  B.set(doorTX, doorTY + 1, TILE.COBBLE, 0);
  B.prop('torch', doorTX - 3, doorTY, { h: 24, animated: 3, light: true, lightR: 90, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('torch', doorTX + 3, doorTY, { h: 24, animated: 3, light: true, lightR: 90, solid: [1, 1], solidTile: TILE.WALL });

  // praça
  B.prop('statue', 61, 112, { h: 34, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('well', 66, 114, { h: 28, solid: [2, 2], solidTile: TILE.WALL, dx: 8 });
  for (const [tx, ty] of [[57, 110], [65, 110], [57, 117], [65, 117]]) {
    B.prop('torch', tx, ty, { h: 24, animated: 3, light: true, lightR: 80, solid: [1, 1], solidTile: TILE.WALL });
  }
  B.prop('banner', 59, 109, { h: 30 });
  B.prop('banner', 63, 109, { h: 30 });

  // mercado
  B.prop('stall', 40, 113, { h: 34, solid: [2, 2], solidTile: TILE.WALL, dx: 8 });
  B.prop('stall', 46, 113, { h: 34, solid: [2, 2], solidTile: TILE.WALL, dx: 8 });
  B.prop('stall', 40, 121, { h: 34, solid: [2, 2], solidTile: TILE.WALL, dx: 8 });
  B.prop('cart', 49, 122, { h: 24, solid: [2, 1], solidTile: TILE.WALL, dx: 8 });
  for (let i = 0; i < 6; i++) B.prop('barrel', 36 + (i % 3) * 2, 126 + Math.floor(i / 3) * 2, { h: 18, solid: [1, 1], solidTile: TILE.WALL });
  for (let i = 0; i < 4; i++) B.prop('crate', 52 + i, 126, { h: 16, solid: [1, 1], solidTile: TILE.WALL });

  // forja e capela
  B.building(34, 96, 8, 7, 'forge', 101);
  B.prop('anvil', 40, 104, { h: 16, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('campfire', 38, 104, { h: 18, animated: 2, light: true, lightR: 70, solid: [1, 1], solidTile: TILE.WALL });
  B.building(78, 96, 9, 8, 'chapel', 202);
  B.prop('torch', 77, 105, { h: 24, animated: 3, light: true, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('torch', 87, 105, { h: 24, animated: 3, light: true, solid: [1, 1], solidTile: TILE.WALL });

  // casas
  const houses = [
    [33, 108, 7, 6], [43, 107, 6, 6], [70, 108, 7, 6], [79, 109, 8, 6],
    [33, 126, 7, 6], [43, 129, 6, 6], [52, 130, 6, 5], [70, 128, 7, 6],
    [80, 129, 8, 6], [65, 131, 6, 5], [33, 134, 6, 4], [84, 121, 7, 6],
  ];
  houses.forEach(([tx, ty, w, h], i) => B.building(tx, ty, w, h, 'house', 300 + i * 17));

  for (let i = 0; i < 30; i++) {
    const tx = r.int(CX + 2, CX + CW - 3), ty = r.int(CY + 2, CY + CH - 3);
    const t = B.get(tx, ty);
    if (t === TILE.GRASS || t === TILE.GRASS_TALL) {
      if (r.chance(0.55)) B.decal('flowers:0', tx, ty);
      else B.decal('grass_tuft', tx, ty, 'grass');
    }
  }
  for (const [tx, ty] of [[31, 98], [90, 98], [31, 134], [90, 134], [31, 116], [90, 116]]) {
    B.prop('torch', tx, ty, { h: 24, animated: 3, light: true, solid: [1, 1], solidTile: TILE.WALL });
  }
  B.prop('sign', 63, 93, { h: 20 });

  // =========================================================================
  // CAMPOS E FAZENDAS
  // =========================================================================
  for (const [fx, fy, fw, fh] of [[100, 100, 12, 8], [116, 99, 10, 7], [104, 122, 14, 8], [124, 120, 12, 9], [134, 130, 10, 7]]) {
    B.rect(fx, fy, fw, fh, TILE.CROP, r.int(0, 1));
    const gap = Math.floor(fw / 2);
    for (let i = 0; i < fw; i++) {
      if (i !== gap) { B.set(fx + i, fy - 1, TILE.FENCE, 0); B.set(fx + i, fy + fh, TILE.FENCE, 0); }
    }
    for (let j = 0; j < fh; j++) { B.set(fx - 1, fy + j, TILE.FENCE, 0); B.set(fx + fw, fy + j, TILE.FENCE, 0); }
  }
  for (const [tx, ty] of [[130, 112], [142, 118], [112, 134]]) B.prop('hay', tx, ty, { h: 20, solid: [2, 1], solidTile: TILE.WALL, dx: 8 });
  B.building(96, 94, 7, 6, 'farm', 401);
  B.building(142, 96, 6, 5, 'farm', 402);
  for (let i = 0; i < 70; i++) {
    const tx = r.int(94, 150), ty = r.int(94, 140);
    const t = B.get(tx, ty);
    if (t !== TILE.GRASS && t !== TILE.GRASS_TALL) continue;
    if (r.chance(0.16)) B.prop('rock:0', tx, ty, { h: 14, solid: [1, 1], solidTile: TILE.ROCK });
    else if (r.chance(0.16)) B.prop(`tree:${r.int(0, 1)}`, tx, ty, { h: 40, solid: [1, 1], solidTile: TILE.TREE });
    else B.decal(r.chance(0.5) ? 'flowers:0' : 'grass_tuft', tx, ty, 'grass');
  }

  // =========================================================================
  // FLORESTA
  // =========================================================================
  const forest = (x0, y0, x1, y1, thresh, dark) => {
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const t = B.get(tx, ty);
        if (t !== TILE.GRASS && t !== TILE.GRASS_TALL && t !== TILE.DARK_GRASS) continue;
        const n = nz.fbm(tx, ty, 9, 2);
        if (n > thresh) {
          const p = r.next();
          const kind = p < (dark ? 0.7 : 0.4) ? 'pine' : p < 0.93 ? `tree:${r.int(0, 1)}` : 'deadtree';
          const tile = kind === 'pine' ? TILE.PINE : TILE.TREE;
          B.prop(kind, tx, ty, { h: kind === 'pine' ? 42 : kind === 'deadtree' ? 38 : 40, solid: [1, 1], solidTile: tile });
        } else if (n < 0.24 && r.chance(0.35)) {
          B.prop(r.chance(0.6) ? 'bush' : 'bushberry', tx, ty, { h: 16, solid: [1, 1], solidTile: TILE.BUSH });
        } else if (r.chance(0.045)) {
          B.prop(`rock:${r.int(0, 1)}`, tx, ty, { h: r.chance(0.4) ? 20 : 14, solid: [1, 1], solidTile: TILE.ROCK });
        } else if (r.chance(0.22)) {
          B.decal(dark ? 'mushroom' : r.chance(0.5) ? 'flowers:0' : 'grass_tuft', tx, ty, 'grass');
        }
      }
    }
  };
  forest(6, 26, 68, 84, 0.575, false);
  forest(5, 4, 66, 28, 0.545, true);

  // =========================================================================
  // RUÍNAS
  // =========================================================================
  for (let ty = 28; ty < 74; ty++) {
    for (let tx = 132; tx < 184; tx++) {
      const n = nz.fbm(tx, ty, 10, 2);
      if (n > 0.64) B.set(tx, ty, TILE.STONE_FLOOR, r.int(0, 3));
      else if (n < 0.36) B.set(tx, ty, TILE.DIRT, r.int(0, 3));
      else B.set(tx, ty, TILE.RUINS, r.int(0, 3));
    }
  }
  for (let i = 0; i < 34; i++) {
    const tx = r.int(134, 182), ty = r.int(30, 72);
    const t = B.get(tx, ty);
    if (t !== TILE.RUINS && t !== TILE.STONE_FLOOR && t !== TILE.DIRT) continue;
    const p = r.next();
    const kind = p < 0.34 ? 'pillar' : p < 0.7 ? 'brokenpillar' : 'ruinwall';
    B.prop(kind, tx, ty, { h: kind === 'pillar' ? 40 : kind === 'ruinwall' ? 26 : 24, solid: [1, 1], solidTile: TILE.ROCK });
  }
  for (let i = 0; i < 16; i++) B.decal('bones', r.int(134, 182), r.int(30, 72));
  for (const [tx, ty] of [[150, 44], [153, 46], [148, 48], [156, 45]]) {
    B.prop('gravestone', tx, ty, { h: 20, solid: [1, 1], solidTile: TILE.ROCK });
  }

  // =========================================================================
  // VALE SOMBRIO
  // =========================================================================
  for (let ty = 74; ty < 136; ty++) {
    for (let tx = 146; tx < 195; tx++) {
      const t = B.get(tx, ty);
      if (t === TILE.GRASS || t === TILE.GRASS_TALL) B.set(tx, ty, TILE.DARK_GRASS, r.int(0, 3));
    }
  }
  for (let i = 0; i < 90; i++) {
    const tx = r.int(148, 193), ty = r.int(76, 134);
    const t = B.get(tx, ty);
    if (t !== TILE.DARK_GRASS && t !== TILE.SWAMP) continue;
    const p = r.next();
    if (p < 0.28) B.prop('deadtree', tx, ty, { h: 38, solid: [1, 1], solidTile: TILE.TREE });
    else if (p < 0.52) B.prop(`rock:${r.int(0, 1)}`, tx, ty, { h: r.chance(0.4) ? 20 : 14, solid: [1, 1], solidTile: TILE.ROCK });
    else if (p < 0.66) B.prop('bush', tx, ty, { h: 16, solid: [1, 1], solidTile: TILE.BUSH });
    else B.decal('bones', tx, ty);
  }
  for (let i = 0; i < 12; i++) {
    const tx = r.int(152, 191), ty = r.int(80, 132);
    if (B.get(tx, ty) === TILE.SWAMP) B.prop('crystal:1', tx, ty, { h: 24, solid: [1, 1], solidTile: TILE.CRYSTAL, light: true, lightColor: '#ff6ac9', lightR: 60 });
  }
  B.prop('tent', 172, 94, { h: 36, solid: [3, 2], solidTile: TILE.WALL, dx: 8 });
  B.prop('tent', 179, 98, { h: 36, solid: [3, 2], solidTile: TILE.WALL, dx: 8 });
  B.prop('campfire', 176, 98, { h: 18, animated: 2, light: true, lightR: 100 });

  // =========================================================================
  // ENTRADA DA CAVERNA
  // =========================================================================
  const caveTX = 114, caveTY = 21;
  B.rect(caveTX - 4, caveTY - 3, 9, 9, TILE.STONE_FLOOR, 0);
  for (let i = -5; i <= 5; i++) {
    for (let j = -4; j <= 0; j++) {
      if (Math.abs(i) + Math.abs(j) * 2 > 6) B.set(caveTX + i, caveTY + j, TILE.MOUNTAIN, r.int(0, 1));
    }
  }
  B.set(caveTX, caveTY, TILE.PORTAL, 0);
  B.set(caveTX, caveTY + 1, TILE.STONE_FLOOR, 0);
  B.prop('portal', caveTX, caveTY, { h: 34, light: true, lightColor: '#8a5aff', lightR: 110 });
  B.prop('torch', caveTX - 3, caveTY + 2, { h: 24, animated: 3, light: true, solid: [1, 1], solidTile: TILE.ROCK });
  B.prop('torch', caveTX + 3, caveTY + 2, { h: 24, animated: 3, light: true, solid: [1, 1], solidTile: TILE.ROCK });
  B.prop('sign', caveTX - 2, caveTY + 3, { h: 20 });
  for (let i = 0; i < 26; i++) {
    const tx = caveTX + r.int(-10, 10), ty = caveTY + r.int(-7, 7);
    const t = B.get(tx, ty);
    if (t === TILE.GRASS || t === TILE.GRASS_TALL || t === TILE.DARK_GRASS) {
      B.prop(`rock:${r.int(0, 1)}`, tx, ty, { h: r.chance(0.4) ? 20 : 14, solid: [1, 1], solidTile: TILE.ROCK });
    }
  }

  // =========================================================================
  // ÁREAS SECRETAS
  // =========================================================================
  const secrets = [];
  const secret = (cx, cy, name, tier) => {
    B.rect(cx - 4, cy - 4, 9, 9, TILE.STONE_FLOOR, 0);
    const wallTile = (tx, ty) => {
      if (tx === cx && ty === cy + 4) return; // abertura escondida
      B.set(tx, ty, TILE.ROCK, 0);
      B.prop(`rock:${r.int(0, 1)}`, tx, ty, { h: 20, solid: [1, 1], solidTile: TILE.ROCK });
    };
    for (let i = -4; i <= 4; i++) { wallTile(cx + i, cy - 4); wallTile(cx + i, cy + 4); }
    for (let j = -4; j <= 4; j++) { wallTile(cx - 4, cy + j); wallTile(cx + 4, cy + j); }
    B.prop('bush', cx - 1, cy + 5, { h: 16 });
    B.prop('bushberry', cx + 1, cy + 5, { h: 16 });
    B.prop('crystal:0', cx - 2, cy - 2, { h: 24, light: true, lightColor: '#8a5aff', lightR: 90 });
    B.prop('crystal:0', cx + 2, cy - 2, { h: 24, light: true, lightColor: '#8a5aff', lightR: 90 });
    B.decal('bones', cx, cy + 1);
    B.entities.push({ type: 'chest', tx: cx, ty: cy - 1, tier, secret: true });
    B.zones.push({ id: 'secret' + cx, name, x: cx - 4, y: cy - 4, w: 9, h: 9, region: 'none', tier, secret: true });
    secrets.push({ cx, cy, name });
  };
  secret(20, 34, 'Clareira Esquecida', 3);
  secret(186, 40, 'Santuário Partido', 4);
  secret(58, 86, 'Esconderijo do Rio', 2);

  // =========================================================================
  // COVIS DOS CHEFES DO MUNDO
  // =========================================================================
  const lairs = [];
  /** Limpa um círculo, coloca piso próprio e decora. Retorna o centro. */
  const arena = (cx, cy, rr, floor, name, id, boss, decor) => {
    B.objects = B.objects.filter((o) => {
      const otx = Math.floor(o.x / TS), oty = Math.floor((o.y - 1) / TS);
      return Math.hypot(otx - cx, oty - cy) > rr + 0.5;
    });
    B.lights = B.lights.filter((l) => Math.hypot(l.x / TS - cx - 0.5, l.y / TS - cy - 0.5) > rr + 0.5);
    B.decals = B.decals.filter((d) => Math.hypot(d.x / TS - cx - 0.5, d.y / TS - cy - 0.5) > rr + 0.5);
    B.ellipse(cx, cy, rr, rr, floor, 0);
    decor(cx, cy, rr);
    B.entities.push({ type: 'enemy', enemy: boss, tx: cx, ty: cy, region: 'lair', boss: true });
    B.entities.push({ type: 'chest', tx: cx, ty: cy - rr + 2, tier: 4, bossChest: true });
    B.zones.push({ id, name, x: cx - rr - 1, y: cy - rr - 1, w: rr * 2 + 3, h: rr * 2 + 3, region: 'none', tier: 4, lair: true });
    lairs.push({ cx, cy, rr });
  };
  // Vyrka, a Rainha Aranha — bolsão fechado da Floresta Profunda (um túnel é aberto até ele)
  arena(31, 10, 6, TILE.DARK_GRASS, 'Covil de Vyrka', 'lair_spider', 'spider_queen', (cx, cy, rr) => {
    for (let i = 0; i < 14; i++) B.decal('web', cx + r.int(-rr + 1, rr - 1), cy + r.int(-rr + 1, rr - 1));
    for (let i = 0; i < 6; i++) B.decal('bones', cx + r.int(-rr + 1, rr - 1), cy + r.int(-rr + 1, rr - 1));
    for (const a of [0.6, 1.9, 3.2, 4.4, 5.6]) {
      const tx = Math.round(cx + Math.cos(a) * (rr - 1)), ty = Math.round(cy + Math.sin(a) * (rr - 1));
      B.prop('crystal:1', tx, ty, { h: 24, solid: [1, 1], solidTile: TILE.CRYSTAL, light: true, lightColor: '#ff6ac9', lightR: 70 });
    }
  });
  // Maldrak, o Rei Esquelético — coração das Ruínas
  arena(164, 56, 8, TILE.RUINS, 'Trono de Maldrak', 'lair_lich', 'lich', (cx, cy, rr) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      B.prop(i % 2 ? 'pillar' : 'brokenpillar', Math.round(cx + Math.cos(a) * (rr - 1)), Math.round(cy + Math.sin(a) * (rr - 1)), { h: i % 2 ? 40 : 24, solid: [1, 1], solidTile: TILE.ROCK });
    }
    for (let i = 0; i < 12; i++) B.decal('bones', cx + r.int(-rr + 2, rr - 2), cy + r.int(-rr + 2, rr - 2));
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      B.prop('torch', cx + dx, cy + dy, { h: 24, animated: 3, light: true, lightColor: '#5ad8c0', lightR: 80 });
    }
  });
  // Grommash, o Colosso de Pedra — planície do Vale Sombrio
  arena(172, 114, 9, TILE.STONE_FLOOR, 'Cratera de Grommash', 'lair_titan', 'titan', (cx, cy, rr) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      B.prop(`rock:${i % 2}`, Math.round(cx + Math.cos(a) * (rr - 1)), Math.round(cy + Math.sin(a) * (rr - 1)), { h: 20, solid: [1, 1], solidTile: TILE.ROCK });
    }
    for (let i = 0; i < 10; i++) B.decal('bones', cx + r.int(-rr + 2, rr - 2), cy + r.int(-rr + 2, rr - 2));
    for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) {
      B.prop('crystal:1', cx + dx, cy + dy, { h: 24, solid: [1, 1], solidTile: TILE.CRYSTAL, light: true, lightColor: '#ff8a2a', lightR: 70 });
    }
  });
  // Skalla, a Rainha do Inverno — alto das Montanhas do Norte (v2.1)
  arena(150, 14, 8, TILE.STONE_FLOOR, 'Cova Gélida', 'lair_frost', 'skalla', (cx, cy, rr) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      B.prop('crystal:0', Math.round(cx + Math.cos(a) * (rr - 1)), Math.round(cy + Math.sin(a) * (rr - 1)), { h: 26, solid: [1, 1], solidTile: TILE.CRYSTAL, light: true, lightColor: '#6ad8ff', lightR: 85 });
    }
    for (let i = 0; i < 8; i++) B.decal('bones', cx + r.int(-rr + 2, rr - 2), cy + r.int(-rr + 2, rr - 2));
    for (const [dx, dy] of [[-3, -3], [3, 3]]) {
      B.prop('torch', cx + dx, cy + dy, { h: 24, animated: 3, light: true, lightColor: '#9ae8ff', lightR: 75 });
    }
  });
  // Ashkaru, o Arauto de Cinzas — oeste do Vale Sombrio (v2.1)
  arena(150, 96, 9, TILE.STONE_FLOOR, 'Altar de Cinzas', 'lair_ember', 'ashkaru', (cx, cy, rr) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      B.prop(i % 3 ? `rock:${i % 2}` : 'crystal:1', Math.round(cx + Math.cos(a) * (rr - 1)), Math.round(cy + Math.sin(a) * (rr - 1)), { h: i % 3 ? 20 : 24, solid: [1, 1], solidTile: i % 3 ? TILE.ROCK : TILE.CRYSTAL, light: i % 3 ? false : true, lightColor: '#ff6a2a', lightR: 80 });
    }
    for (let i = 0; i < 10; i++) B.decal('bones', cx + r.int(-rr + 2, rr - 2), cy + r.int(-rr + 2, rr - 2));
    B.prop('crystal:1', cx, cy + 3, { h: 30, solid: [1, 1], solidTile: TILE.CRYSTAL, light: true, lightColor: '#ffd85a', lightR: 110 });
  });

  // decoração solta
  for (let i = 0; i < 100; i++) {
    const tx = r.int(6, W - 8), ty = r.int(8, H - 6);
    const t = B.get(tx, ty);
    if (t !== TILE.GRASS && t !== TILE.GRASS_TALL && t !== TILE.DARK_GRASS) continue;
    if (r.chance(0.62)) B.decal(r.chance(0.5) ? 'grass_tuft' : 'flowers:0', tx, ty, 'grass');
    else B.prop('stump', tx, ty, { h: 14, solid: [1, 1], solidTile: TILE.STUMP });
  }

  // =========================================================================
  // ZONAS
  // =========================================================================
  B.zones.push(
    { id: 'city', name: 'Cidade de Eldoria', x: CX, y: CY, w: CW, h: CH, region: 'none', tier: 0, safe: true },
    { id: 'deepforest', name: 'Floresta Profunda', x: 4, y: 4, w: 62, h: 24, region: 'deepforest', tier: 3 },
    { id: 'lake', name: 'Lago Espelhado', x: 12, y: 52, w: 26, h: 20, region: 'forest', tier: 2 },
    { id: 'forest', name: 'Floresta Sombria', x: 4, y: 26, w: 68, h: 60, region: 'forest', tier: 2 },
    { id: 'ruins', name: 'Ruínas Antigas', x: 128, y: 26, w: 58, h: 50, region: 'ruins', tier: 3 },
    { id: 'valley', name: 'Vale Sombrio', x: 144, y: 72, w: 52, h: 64, region: 'valley', tier: 4 },
    { id: 'mountains', name: 'Montanhas do Norte', x: 92, y: 4, w: 104, h: 24, region: 'valley', tier: 3 },
    { id: 'fields', name: 'Campos de Eldoria', x: 92, y: 90, w: 60, h: 52, region: 'fields', tier: 1 },
    { id: 'farmroad', name: 'Estrada do Leste', x: 90, y: 106, w: 102, h: 18, region: 'road', tier: 2 },
    { id: 'northroad', name: 'Estrada do Norte', x: 52, y: 18, w: 18, h: 76, region: 'road', tier: 2 },
  );

  // =========================================================================
  // ACESSIBILIDADE
  // =========================================================================
  const home = [61, 114];
  ensureReachable(B, home, [caveTX, caveTY + 2]);
  ensureReachable(B, home, [156, 54]);
  ensureReachable(B, home, [172, 102]);
  ensureReachable(B, home, [120, 118]);
  ensureReachable(B, home, [doorTX, doorTY + 1]);
  for (const s of secrets) ensureReachable(B, [s.cx, s.cy + 6], home);
  for (const l of lairs) {
    // entrada aberta ao sul de cada covil (garante que o chefe é alcançável)
    if (l.cx === 31) carve(B, [22, 17], [l.cx, l.cy + l.rr + 1]); // túnel entre as árvores até o covil de Vyrka
    carve(B, [l.cx, l.cy + l.rr + 1], [l.cx, l.cy + l.rr - 1]);
    ensureReachable(B, home, [l.cx, l.cy + l.rr + 1]);
  }
  for (const e of B.entities) {
    if (e.type === 'chest' && !e.secret) ensureReachable(B, home, [e.tx, e.ty + 1]);
  }

  // =========================================================================
  // BAÚS
  // =========================================================================
  const chests = [
    [16, 46, 1], [40, 22, 2], [62, 66, 1], [30, 76, 2], [12, 70, 2], [48, 52, 2],
    [100, 92, 1], [132, 132, 1], [146, 92, 2], [96, 132, 1], [110, 128, 1],
    [140, 38, 3], [168, 62, 3], [178, 34, 3], [150, 100, 3], [136, 66, 3],
    [188, 122, 4], [164, 120, 4], [110, 40, 2], [74, 88, 2], [50, 60, 2],
    [88, 128, 1], [126, 96, 2], [190, 92, 4], [22, 92, 2], [98, 76, 2],
  ];
  for (const [tx, ty, tier] of chests) B.entities.push({ type: 'chest', tx, ty, tier });

  // =========================================================================
  // SAÍDAS
  // =========================================================================
  B.exits = [
    { x: caveTX * TS + 8, y: caveTY * TS + 20, r: 15, target: 'dungeon', label: 'Caverna Esquecida', prompt: 'Entrar na caverna' },
    { x: doorTX * TS + 8, y: (doorTY + 1) * TS + 12, r: 15, target: 'throne', label: 'Castelo Real', prompt: 'Entrar no castelo' },
  ];

  // =========================================================================
  // NPCs
  // =========================================================================
  const npc = (id, tx, ty, extra = {}) => B.entities.push({ type: 'npc', npcId: id, tx, ty, ...extra });
  npc('guard_gate_1', 60, 94, { face: 0 });
  npc('guard_gate_2', 62, 94, { face: 0 });
  npc('guard_east', 90, 118, { face: 2 });
  npc('villager_1', 56, 111);
  npc('villager_2', 64, 116);
  npc('villager_3', 43, 116);
  npc('child_1', 46, 117);
  npc('blacksmith', 40, 105, { face: 0 });
  npc('merchant', 44, 114, { face: 0 });
  npc('healer', 82, 105, { face: 0 });
  npc('elder', 68, 112, { face: 3 });
  npc('guard_plaza', 58, 109, { face: 0 });
  npc('villager_4', 76, 124);
  npc('farmer', 110, 112);
  npc('hunter', 30, 44);
  npc('alchemist', 47, 109, { face: 0 });
  npc('bard', 59, 113);
  npc('fisher', 74, 78, { face: 1 });
  npc('villager_5', 52, 114);
  npc('villager_6', 41, 108);
  npc('dog', 52, 118);
  npc('cat', 66, 114);
  npc('hermit', 22, 40, { face: 0 });
  npc('traveler', 94, 117, { face: 2 });

  B.spawnZones = [
    { region: 'forest', x: 8, y: 28, w: 58, h: 52, count: 24 },
    { region: 'deepforest', x: 6, y: 6, w: 56, h: 20, count: 18 },
    { region: 'fields', x: 94, y: 94, w: 56, h: 46, count: 14 },
    { region: 'ruins', x: 132, y: 30, w: 50, h: 42, count: 22 },
    { region: 'valley', x: 150, y: 78, w: 42, h: 54, count: 24 },
    { region: 'road', x: 96, y: 110, w: 82, h: 14, count: 8 },
  ];

  return B.result({
    id: 'overworld',
    name: 'Reino de Eldoria',
    ambient: 'day',
    spawn: { x: 61 * TS + 8, y: 116 * TS + 8 },
    spawnZones: B.spawnZones,
  });
}

// ===========================================================================
// MASMORRA
// ===========================================================================
export function generateDungeon(seed = 777) {
  const W = 96, H = 76;
  const B = new Builder(W, H, TILE.CAVE_WALL);
  const r = B.rng;
  r.reseed(seed);

  const rooms = [];
  for (let attempt = 0; attempt < 400 && rooms.length < 12; attempt++) {
    const rw = r.int(7, 13), rh = r.int(6, 10);
    const rx = r.int(2, W - rw - 3), ry = r.int(2, H - rh - 3);
    let ok = true;
    for (const o of rooms) {
      if (rx < o.x + o.w + 2 && rx + rw + 2 > o.x && ry < o.y + o.h + 2 && ry + rh + 2 > o.y) { ok = false; break; }
    }
    if (ok) rooms.push({ x: rx, y: ry, w: rw, h: rh });
  }
  const bossRoom = { x: W - 27, y: Math.floor(H / 2) - 9, w: 23, h: 19, boss: true };
  const entry = { x: 3, y: Math.floor(H / 2) - 4, w: 9, h: 9, entry: true };
  rooms.unshift(entry);
  rooms.push(bossRoom);

  for (const rm of rooms) {
    B.rect(rm.x, rm.y, rm.w, rm.h, TILE.CAVE_FLOOR, 0);
    for (let j = 0; j < rm.h; j++) {
      for (let i = 0; i < rm.w; i++) if (r.chance(0.07)) B.set(rm.x + i, rm.y + j, TILE.DIRT, 0);
    }
  }
  const connect = (a, b) => {
    const ax = a.x + (a.w >> 1), ay = a.y + (a.h >> 1);
    const bx = b.x + (b.w >> 1), by = b.y + (b.h >> 1);
    if (r.chance(0.5)) {
      B.rect(Math.min(ax, bx), ay - 1, Math.abs(bx - ax) + 1, 3, TILE.CAVE_FLOOR, 0);
      B.rect(bx - 1, Math.min(ay, by), 3, Math.abs(by - ay) + 1, TILE.CAVE_FLOOR, 0);
    } else {
      B.rect(ax - 1, Math.min(ay, by), 3, Math.abs(by - ay) + 1, TILE.CAVE_FLOOR, 0);
      B.rect(Math.min(ax, bx), by - 1, Math.abs(bx - ax) + 1, 3, TILE.CAVE_FLOOR, 0);
    }
  };
  const middles = rooms.filter((rm) => !rm.entry && !rm.boss);
  connect(entry, middles[0] || bossRoom);
  for (let i = 0; i < middles.length - 1; i++) connect(middles[i], middles[i + 1]);
  connect(middles[middles.length - 1] || entry, bossRoom);

  for (let ty = 1; ty < H - 1; ty++) {
    for (let tx = 1; tx < W - 1; tx++) {
      if (B.get(tx, ty) !== TILE.CAVE_FLOOR) continue;
      const p = r.next();
      if (p < 0.014) B.prop(`crystal:${r.int(0, 1)}`, tx, ty, { h: 24, solid: [1, 1], solidTile: TILE.CRYSTAL, light: true, lightColor: r.chance(0.5) ? '#8a5aff' : '#ff6ac9', lightR: 70 });
      else if (p < 0.032) B.prop(`rock:${r.int(0, 1)}`, tx, ty, { h: 14, solid: [1, 1], solidTile: TILE.ROCK });
      else if (p < 0.048) B.prop('mushroom', tx, ty, { h: 12 });
      else if (p < 0.062) B.decal('bones', tx, ty);
    }
  }
  for (const rm of rooms) {
    for (const [tx, ty] of [[rm.x + 1, rm.y + 1], [rm.x + rm.w - 2, rm.y + 1], [rm.x + 1, rm.y + rm.h - 2], [rm.x + rm.w - 2, rm.y + rm.h - 2]]) {
      if (r.chance(0.8)) B.prop('torch', tx, ty, { h: 24, animated: 3, light: true, lightR: 115 });
    }
  }
  for (let i = 0; i < 4; i++) {
    const lx = bossRoom.x + r.int(3, bossRoom.w - 6), ly = bossRoom.y + r.int(3, bossRoom.h - 6);
    B.ellipse(lx, ly, 2, 1, TILE.LAVA, 0);
    B.prop('campfire', lx, ly, { h: 18, animated: 2, light: true, lightColor: '#ff6a2a', lightR: 90 });
  }

  for (let i = 0; i < 5 && i < middles.length; i++) {
    const rm = middles[i];
    B.entities.push({ type: 'chest', tx: rm.x + (rm.w >> 1), ty: rm.y + (rm.h >> 1), tier: i < 2 ? 3 : 4 });
  }
  B.entities.push({ type: 'chest', tx: bossRoom.x + 3, ty: bossRoom.y + 3, tier: 4, bossChest: true });

  for (let i = 1; i < middles.length; i++) {
    const rm = middles[i];
    const n = r.int(2, 4);
    for (let k = 0; k < n; k++) {
      B.entities.push({
        type: 'enemy',
        enemy: r.chance(0.4) ? 'skeleton' : r.chance(0.6) ? 'orc' : 'soldier_heavy',
        tx: rm.x + r.int(1, rm.w - 2), ty: rm.y + r.int(1, rm.h - 2), region: 'dungeon',
      });
    }
  }
  B.entities.push({ type: 'enemy', enemy: 'boss', tx: bossRoom.x + (bossRoom.w >> 1), ty: bossRoom.y + (bossRoom.h >> 1), region: 'bossroom', boss: true });
  B.entities.push({ type: 'chest', tx: entry.x + 2, ty: entry.y + 2, tier: 2 });

  const exitTX = entry.x + (entry.w >> 1), exitTY = entry.y + entry.h - 1;
  B.exits = [{
    x: exitTX * TS + 8, y: exitTY * TS + 8, r: 15, target: 'overworld',
    spawn: { x: 114 * TS + 8, y: 23 * TS + 8 }, label: 'Saída', prompt: 'Sair da caverna',
  }];
  B.prop('portal', exitTX, exitTY, { h: 34, light: true, lightColor: '#8a5aff', lightR: 110 });

  return B.result({
    id: 'dungeon',
    name: 'Caverna Esquecida',
    ambient: 'cave',
    spawn: { x: exitTX * TS + 8, y: (exitTY - 1) * TS + 8 },
  });
}

// ===========================================================================
// SALA DO TRONO
// ===========================================================================
export function generateThrone() {
  const W = 30, H = 22;
  const B = new Builder(W, H, TILE.STONE_FLOOR);
  B.rect(0, 0, W, 3, TILE.WALL, 0);
  B.rect(0, 0, 2, H, TILE.WALL, 0);
  B.rect(W - 2, 0, 2, H, TILE.WALL, 0);
  B.rect(0, H - 1, W, 1, TILE.WALL, 0);
  B.rect(13, 6, 4, 14, TILE.RUINS, 0);
  B.rect(14, 6, 2, 14, TILE.COBBLE, 0);
  for (const tx of [5, 9, 20, 24]) {
    B.prop('pillar', tx, 6, { h: 40, solid: [1, 1], solidTile: TILE.WALL });
    B.prop('pillar', tx, 12, { h: 40, solid: [1, 1], solidTile: TILE.WALL });
  }
  B.rect(11, 3, 8, 3, TILE.COBBLE, 0);
  B.prop('throne', 15, 6, { h: 40, solid: [3, 1], solidTile: TILE.WALL, solidOff: [-1, -1], dx: 0 });
  for (const tx of [4, 8, 21, 25]) B.prop('banner', tx, 4, { h: 30 });
  for (let tx = 3; tx < W - 3; tx += 4) B.prop('torch', tx, 3, { h: 24, animated: 3, light: true, lightR: 130 });
  B.prop('torch', 12, 8, { h: 24, animated: 3, light: true, lightR: 100, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('torch', 18, 8, { h: 24, animated: 3, light: true, lightR: 100, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('crate', 26, 16, { h: 16, solid: [1, 1], solidTile: TILE.WALL });
  B.prop('barrel', 27, 17, { h: 18, solid: [1, 1], solidTile: TILE.WALL });

  B.entities.push(
    { type: 'npc', npcId: 'king', tx: 15, ty: 7, face: 0 },
    { type: 'npc', npcId: 'guard_throne_l', tx: 12, ty: 9, face: 0 },
    { type: 'npc', npcId: 'guard_throne_r', tx: 18, ty: 9, face: 0 },
    { type: 'npc', npcId: 'advisor', tx: 21, ty: 11, face: 1 },
  );
  B.exits = [{
    x: 15 * TS + 8, y: (H - 1) * TS + 8, r: 16, target: 'overworld',
    spawn: { x: 61 * TS + 8, y: 109 * TS + 8 }, label: 'Sair do castelo', prompt: 'Sair do castelo',
  }];
  B.zones.push({ id: 'throne', name: 'Salão do Trono', x: 0, y: 0, w: W, h: H, region: 'none', tier: 0, safe: true });

  return B.result({
    id: 'throne',
    name: 'Salão do Trono',
    ambient: 'indoor',
    spawn: { x: 15 * TS + 8, y: 18 * TS + 8 },
  });
}

// ===========================================================================
// ACESSIBILIDADE
// ===========================================================================
function walkable(B, tx, ty) {
  return !BLOCKED.has(B.get(tx, ty));
}

export function ensureReachable(B, from, to) {
  if (reachable(B, from, to)) return false;
  carve(B, from, to);
  return true;
}

function reachable(B, from, to) {
  const { w, h } = B;
  const seen = new Uint8Array(w * h);
  const stack = [from[1] * w + from[0]];
  seen[stack[0]] = 1;
  const target = to[1] * w + to[0];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === target) return true;
    const cx = cur % w, cy = (cur / w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
      const ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (seen[ni]) continue;
      if (!walkable(B, nx, ny)) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  return false;
}

function carve(B, from, to) {
  const put = (tx, ty) => {
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const x = tx + i, y = ty + j;
        if (!walkable(B, x, y)) B.set(x, y, B.get(x, y) === TILE.WATER ? TILE.BRIDGE : TILE.DIRT, 0);
      }
    }
  };
  let [x, y] = from;
  const [tx, ty] = to;
  const sx = Math.sign(tx - x), sy = Math.sign(ty - y);
  let guard = 0;
  while (x !== tx && guard++ < 500) { put(x, y); x += sx; }
  guard = 0;
  while (y !== ty && guard++ < 500) { put(x, y); y += sy; }
  put(x, y);
}
