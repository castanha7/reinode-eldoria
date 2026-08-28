// ---------------------------------------------------------------------------
// raster.mjs — Canvas 2D em software (raster) para gerar PNGs reais dos
// sprites e do mapa sem precisar de um browser.
// ---------------------------------------------------------------------------
import zlib from 'zlib';

function parseColor(c) {
  if (typeof c !== 'string') return [0, 0, 0, 255];
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s));
    return [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p[3] === undefined ? 1 : p[3]) * 255)];
  }
  const named = { white: [255, 255, 255, 255], black: [0, 0, 0, 255], red: [255, 0, 0, 255] };
  return named[c] || [255, 0, 255, 255];
}

export class RasterCanvas {
  constructor(w, h) {
    this._w = w; this._h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    this.style = {};
    this._ctx = null;
  }
  get width() { return this._w; }
  set width(v) { this._w = v; this.data = new Uint8ClampedArray(v * this._h * 4); }
  get height() { return this._h; }
  set height(v) { this._h = v; this.data = new Uint8ClampedArray(this._w * v * 4); }
  getContext() {
    if (!this._ctx) this._ctx = new RasterCtx(this);
    return this._ctx;
  }
  toPNG() { return encodePNG(this.width, this.height, this.data); }
}

class RasterCtx {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.lineWidth = 1;
    this.imageSmoothingEnabled = false;
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.font = '10px monospace';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
  }
  save() { this.stack.push([this.m.slice(), this.globalAlpha, this.globalCompositeOperation]); }
  restore() {
    const s = this.stack.pop();
    if (s) { this.m = s[0]; this.globalAlpha = s[1]; this.globalCompositeOperation = s[2]; }
  }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  transform(m2) {
    const [a, b, c, d, e, f] = this.m;
    const [a2, b2, c2, d2, e2, f2] = m2;
    this.m = [
      a * a2 + c * b2, b * a2 + d * b2,
      a * c2 + c * d2, b * c2 + d * d2,
      a * e2 + c * f2 + e, b * e2 + d * f2 + f,
    ];
  }
  translate(x, y) { this.transform([1, 0, 0, 1, x, y]); }
  scale(x, y) { this.transform([x, 0, 0, y, 0, 0]); }
  rotate(a) { this.transform([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); }
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arcTo() {} rect() {}
  arc() {} ellipse() {} setLineDash() {} clip() {}
  fill() {} stroke() {} fillText() {} strokeText() {}
  measureText(t) { return { width: String(t).length * 6 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  clearRect(x, y, w, h) {
    const [r, g, b, a] = [0, 0, 0, 0];
    this._rect(x, y, w, h, [r, g, b, a], 'copy');
  }
  fillRect(x, y, w, h) {
    this._rect(x, y, w, h, parseColor(this.fillStyle), this.globalCompositeOperation);
  }
  strokeRect(x, y, w, h) {
    const c = parseColor(this.strokeStyle);
    this.fillRect(x, y, w, this.lineWidth);
    this.fillRect(x, y + h - this.lineWidth, w, this.lineWidth);
    this.fillRect(x, y, this.lineWidth, h);
    this.fillRect(x + w - this.lineWidth, y, this.lineWidth, h);
  }
  _rect(x, y, w, h, color, op) {
    const cv = this.canvas;
    const [a, b, c, d, e, f] = this.m;
    // transforma os 4 cantos e usa o bounding box
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [px, py] of pts) {
      minx = Math.min(minx, px); maxx = Math.max(maxx, px);
      miny = Math.min(miny, py); maxy = Math.max(maxy, py);
    }
    const x0 = Math.max(0, Math.floor(minx)), x1 = Math.min(cv.width - 1, Math.ceil(maxx));
    const y0 = Math.max(0, Math.floor(miny)), y1 = Math.min(cv.height - 1, Math.ceil(maxy));
    if (x1 < x0 || y1 < y0) return;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) return;
    const ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
    const ie = -(ia * e + ic * f), if_ = -(ib * e + id * f);
    const alpha = (color[3] / 255) * this.globalAlpha;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const sx = ia * (px + 0.5) + ic * (py + 0.5) + ie;
        const sy = ib * (px + 0.5) + id * (py + 0.5) + if_;
        if (sx < x || sx > x + w || sy < y || sy > y + h) continue;
        const i = (py * cv.width + px) * 4;
        if (op === 'source-in' && cv.data[i + 3] === 0) continue;
        if (op === 'copy') {
          cv.data[i] = color[0]; cv.data[i + 1] = color[1]; cv.data[i + 2] = color[2]; cv.data[i + 3] = color[3];
          continue;
        }
        const dr = cv.data[i], dg = cv.data[i + 1], db = cv.data[i + 2], da = cv.data[i + 3] / 255;
        const sa = alpha;
        const oa = sa + da * (1 - sa);
        if (oa <= 0) continue;
        cv.data[i] = (color[0] * sa + dr * da * (1 - sa)) / oa;
        cv.data[i + 1] = (color[1] * sa + dg * da * (1 - sa)) / oa;
        cv.data[i + 2] = (color[2] * sa + db * da * (1 - sa)) / oa;
        cv.data[i + 3] = oa * 255;
      }
    }
  }
  drawImage(img, dx, dy, dw, dh) {
    if (!img || !img.width) return;
    if (dw === undefined) { dw = img.width; dh = img.height; }
    const src = img.data || (img._raster && img._raster.data);
    if (!src) return;
    const sw = img.width, sh = img.height;
    const cv = this.canvas;
    const [a, b, c, d, e, f] = this.m;
    const pts = [[dx, dy], [dx + dw, dy], [dx, dy + dh], [dx + dw, dy + dh]].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [px, py] of pts) {
      minx = Math.min(minx, px); maxx = Math.max(maxx, px);
      miny = Math.min(miny, py); maxy = Math.max(maxy, py);
    }
    const x0 = Math.max(0, Math.floor(minx)), x1 = Math.min(cv.width - 1, Math.ceil(maxx));
    const y0 = Math.max(0, Math.floor(miny)), y1 = Math.min(cv.height - 1, Math.ceil(maxy));
    if (x1 < x0 || y1 < y0) return;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) return;
    const ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
    const ie = -(ia * e + ic * f), iff = -(ib * e + id * f);
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const lx = ia * (px + 0.5) + ic * (py + 0.5) + ie;
        const ly = ib * (px + 0.5) + id * (py + 0.5) + iff;
        if (lx < dx || lx >= dx + dw || ly < dy || ly >= dy + dh) continue;
        const sx = Math.min(sw - 1, Math.max(0, Math.floor(((lx - dx) / dw) * sw)));
        const sy = Math.min(sh - 1, Math.max(0, Math.floor(((ly - dy) / dh) * sh)));
        const si = (sy * sw + sx) * 4;
        const sa0 = src[si + 3] / 255;
        if (sa0 <= 0) continue;
        const sa = sa0 * this.globalAlpha;
        const i = (py * cv.width + px) * 4;
        const da = cv.data[i + 3] / 255;
        const oa = sa + da * (1 - sa);
        if (oa <= 0) continue;
        cv.data[i] = (src[si] * sa + cv.data[i] * da * (1 - sa)) / oa;
        cv.data[i + 1] = (src[si + 1] * sa + cv.data[i + 1] * da * (1 - sa)) / oa;
        cv.data[i + 2] = (src[si + 2] * sa + cv.data[i + 2] * da * (1 - sa)) / oa;
        cv.data[i + 3] = oa * 255;
      }
    }
  }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  getImageData(x, y, w, h) {
    const cv = this.canvas;
    const out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const si = ((y + j) * cv.width + (x + i)) * 4;
        const di = (j * w + i) * 4;
        out[di] = cv.data[si]; out[di + 1] = cv.data[si + 1]; out[di + 2] = cv.data[si + 2]; out[di + 3] = cv.data[si + 3];
      }
    }
    return { width: w, height: h, data: out };
  }
  putImageData(img, x, y) {
    const cv = this.canvas;
    for (let j = 0; j < img.height; j++) {
      for (let i = 0; i < img.width; i++) {
        const di = (j * img.width + i) * 4;
        const si = ((y + j) * cv.width + (x + i)) * 4;
        if (si < 0 || si >= cv.data.length) continue;
        cv.data[si] = img.data[di]; cv.data[si + 1] = img.data[di + 1];
        cv.data[si + 2] = img.data[di + 2]; cv.data[si + 3] = img.data[di + 3];
      }
    }
  }
}

// --- PNG -------------------------------------------------------------------
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}
export function encodePNG(w, h, data) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = data[y * w * 4 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
