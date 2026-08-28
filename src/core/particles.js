// ---------------------------------------------------------------------------
// particles.js — partículas e efeitos curtos (fumaça, sangue, brilho, faíscas)
// ---------------------------------------------------------------------------

const MAX = 900;

export class Particles {
  constructor() {
    this.list = [];
  }
  clear() { this.list.length = 0; }

  spawn(o) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push({
      x: o.x, y: o.y,
      vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.4, maxLife: o.life || 0.4,
      size: o.size || 2,
      color: o.color || '#fff',
      color2: o.color2 || null,
      grav: o.grav || 0,
      drag: o.drag === undefined ? 1.8 : o.drag,
      kind: o.kind || 'square',
      grow: o.grow || 0,
      spin: o.spin || 0,
      rot: o.rot || 0,
      z: o.z || 0,
      vz: o.vz || 0,
      light: !!o.light,
    });
  }

  burst(x, y, n, opt = {}) {
    const spd = opt.speed || 60;
    for (let i = 0; i < n; i++) {
      const a = opt.angle === undefined ? Math.random() * Math.PI * 2 : opt.angle + (Math.random() - 0.5) * (opt.spread || Math.PI * 2);
      const s = spd * (0.4 + Math.random() * 0.9);
      this.spawn({
        x: x + (Math.random() - 0.5) * (opt.jitter || 2),
        y: y + (Math.random() - 0.5) * (opt.jitter || 2),
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * (opt.flat ? 0.5 : 1),
        life: (opt.life || 0.4) * (0.6 + Math.random() * 0.8),
        size: opt.size || 2,
        color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color || '#fff'),
        grav: opt.grav, drag: opt.drag, kind: opt.kind, light: opt.light,
      });
    }
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.vy += p.grav * dt;
      p.vz -= 140 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
      if (p.z === 0 && p.vz < 0) p.vz *= -0.35;
      p.rot += p.spin * dt;
      p.size += p.grow * dt;
    }
  }

  draw(ctx, cam) {
    for (const p of this.list) {
      if (!cam.visible(p.x, p.y - p.z, 12)) continue;
      const t = p.life / p.maxLife;
      const s = Math.max(1, Math.round(p.size * (p.kind === 'fade' ? t : 1)));
      ctx.globalAlpha = p.kind === 'fade' ? 1 : Math.min(1, t * 1.6);
      ctx.fillStyle = p.color2 && t < 0.5 ? p.color2 : p.color;
      const x = Math.round(p.x - s / 2);
      const y = Math.round(p.y - p.z - s / 2);
      if (p.kind === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.z, s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.fillRect(x, Math.round(p.y - p.z), s, 1);
        ctx.fillRect(Math.round(p.x), y, 1, s);
      } else {
        ctx.fillRect(x, y, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }
}
