// ---------------------------------------------------------------------------
// pixel.js — utilitários de pixel art + cache de sprites
// ---------------------------------------------------------------------------

const CACHE = new Map();
const FACTORIES = new Map();

/** Registra uma fábrica de sprite (desenhada em resolução 1x). */
export function defineSprite(key, w, h, draw) {
  FACTORIES.set(key, { w, h, draw });
  CACHE.delete(key);
}

/** Retorna (criando se preciso) o canvas do sprite. */
export function getSprite(key) {
  let c = CACHE.get(key);
  if (c !== undefined) return c;
  const f = FACTORIES.get(key);
  if (!f) return null;
  c = document.createElement('canvas');
  c.width = f.w;
  c.height = f.h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  f.draw(ctx);
  CACHE.set(key, c);
  return c;
}

export function clearSprites() {
  CACHE.clear();
}

/** Tem a fábrica? */
export function hasSprite(key) {
  return FACTORIES.has(key);
}

// --- primitivas de desenho -------------------------------------------------

export function px(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(x | 0, y | 0, w | 0, h | 0);
}

export function pxLine(c, x0, y0, x1, y1, col) {
  c.fillStyle = col;
  let x = x0 | 0, y = y0 | 0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let i = 0; i < 512; i++) {
    c.fillRect(x, y, 1, 1);
    if (x === (x1 | 0) && y === (y1 | 0)) break;
    const e2 = err * 2;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

export function rectOutline(c, x, y, w, h, col) {
  px(c, x, y, w, 1, col);
  px(c, x, y + h - 1, w, 1, col);
  px(c, x, y, 1, h, col);
  px(c, x + w - 1, y, 1, h, col);
}

export function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    c.fillRect((cx - w) | 0, (cy + y) | 0, (w * 2 + 1) | 0, 1);
  }
}

export function ellipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry || 1);
    const w = Math.floor(rx * Math.sqrt(Math.max(0, t)));
    c.fillRect((cx - w) | 0, (cy + y) | 0, (w * 2 + 1) | 0, 1);
  }
}

// --- cores -----------------------------------------------------------------

const _colCache = new Map();
export function shade(col, amt) {
  const k = col + '|' + amt;
  const hit = _colCache.get(k);
  if (hit) return hit;
  let r, g, b;
  if (col[0] === '#') {
    const n = parseInt(col.slice(1), 16);
    r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
  } else {
    return col;
  }
  if (amt >= 0) {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  } else {
    const f = 1 + amt;
    r *= f; g *= f; b *= f;
  }
  const out = '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  _colCache.set(k, out);
  return out;
}

/** Paleta derivada: {base, light, dark, darker} */
export function ramp(base) {
  return {
    base,
    light: shade(base, 0.32),
    lighter: shade(base, 0.6),
    dark: shade(base, -0.3),
    darker: shade(base, -0.55),
  };
}

export const INK = '#14121f';

/** Versão tingida (silhueta) de um sprite, cacheada. */
export function getTinted(key, color) {
  const ck = key + '#' + color;
  const hit = CACHE.get(ck);
  if (hit !== undefined) return hit;
  const src = getSprite(key);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  CACHE.set(ck, c);
  return c;
}
