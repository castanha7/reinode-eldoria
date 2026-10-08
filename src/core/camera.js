// ---------------------------------------------------------------------------
// camera.js — câmera com follow suave, shake e limites de mapa
// ---------------------------------------------------------------------------
import { clamp } from './utils.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 3;
    this.shake = 0;
    this.shakeT = 0;
    this.ox = 0;
    this.oy = 0;
    this.vw = 480;
    this.vh = 300;
  }

  resize(w, h, zoom) {
    if (zoom) this.zoom = zoom;
    this.vw = w / this.zoom;
    this.vh = h / this.zoom;
  }

  follow(tx, ty, dt, bounds) {
    const k = 1 - Math.pow(0.0009, dt);
    const goalX = tx - this.vw / 2;
    const goalY = ty - this.vh / 2;
    this.x += (goalX - this.x) * k;
    this.y += (goalY - this.y) * k;
    if (bounds) {
      this.x = clamp(this.x, 0, Math.max(0, bounds.w - this.vw));
      this.y = clamp(this.y, 0, Math.max(0, bounds.h - this.vh));
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shake * Math.max(0, this.shakeT);
      this.ox = (Math.random() * 2 - 1) * m;
      this.oy = (Math.random() * 2 - 1) * m;
    } else {
      this.ox = this.oy = 0;
    }
  }

  kick(amount, dur = 0.25) {
    this.shake = Math.max(this.shake, amount);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  snap(x, y, bounds) {
    this.x = x - this.vw / 2;
    this.y = y - this.vh / 2;
    if (bounds) {
      this.x = clamp(this.x, 0, Math.max(0, bounds.w - this.vw));
      this.y = clamp(this.y, 0, Math.max(0, bounds.h - this.vh));
    }
  }

  get left() { return this.x + this.ox; }
  get top() { return this.y + this.oy; }
  get right() { return this.left + this.vw; }
  get bottom() { return this.top + this.vh; }

  apply(ctx) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -Math.round(this.left * this.zoom), -Math.round(this.top * this.zoom));
    ctx.imageSmoothingEnabled = false;
  }

  toWorld(sx, sy) {
    return { x: sx / this.zoom + this.left, y: sy / this.zoom + this.top };
  }
  visible(x, y, pad = 24) {
    return x > this.left - pad && x < this.right + pad && y > this.top - pad && y < this.bottom + pad;
  }
}
