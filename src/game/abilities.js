// ---------------------------------------------------------------------------
// abilities.js — execução das habilidades de cada classe
// ---------------------------------------------------------------------------
import { S } from '../sprites.js';
import { inCone } from './combat.js';
import { sfx } from '../core/audio.js';
import { clamp } from '../core/utils.js';

export function castSkill(game, p, index, sk) {
  const P = sk.params;
  const scale = p.skillScale(index);
  const dmg = p.stats.atk * P.dmgMul * scale;
  const aoeMul = 1 + (p.stats.aoe || 0);

  switch (sk.kind) {
    case 'projectile': {
      sfx(P.sound);
      game.spawnProjectile({
        x: p.x + Math.cos(p.aimAngle) * 10,
        y: p.y - 10 + Math.sin(p.aimAngle) * 10,
        angle: p.aimAngle,
        speed: P.speed,
        dmg,
        from: p,
        sprite: P.sprite,
        size: P.size,
        pierce: P.pierce || 0,
        radius: P.radius ? P.radius * aoeMul : 0,
        slow: P.slow,
        slowTime: P.slowTime,
        life: 2.4,
        crit: Math.random() < p.stats.crit,
        critDmg: p.stats.critDmg,
        lifesteal: p.stats.lifesteal,
        trail: P.sprite === 'fx:fireball' ? '#ff9a2a' : P.sprite === 'fx:arrow_fire' ? '#ff6a1a' : null,
      });
      p.swing = 0.2;
      break;
    }

    case 'beam': {
      sfx(P.sound);
      const len = P.length * (1 + (p.stats.range - p.cls.stats.range) / 400);
      const dx = Math.cos(p.aimAngle), dy = Math.sin(p.aimAngle);
      const hitIds = new Set();
      for (const e of game.enemies) {
        if (e.dead) continue;
        // distância do inimigo à reta + projeção dentro do comprimento
        const ex = e.x - p.x, ey = (e.y - 8) - (p.y - 10);
        const proj = ex * dx + ey * dy;
        if (proj < 0 || proj > len) continue;
        const perp = Math.abs(ex * dy - ey * dx);
        if (perp > P.width + e.radius) continue;
        if (hitIds.has(e.id)) continue;
        hitIds.add(e.id);
        game.hitEnemy(e, dmg, {
          from: p, crit: Math.random() < p.stats.crit, critDmg: p.stats.critDmg,
          knock: 40, angle: p.aimAngle, lifesteal: p.stats.lifesteal,
        });
      }
      game.addFx(new BeamFx(p.x, p.y - 10, p.aimAngle, len, P.width, p.cls.color));
      game.particles.burst(p.x + dx * len * 0.9, p.y - 10 + dy * len * 0.9, 14, { color: ['#b8a0ff', '#e8dcff'], speed: 80, life: 0.4 });
      game.camera.kick(1.6, 0.12);
      p.swing = 0.2;
      break;
    }

    case 'nova': {
      sfx(P.sound);
      const maxD = 150;
      const d = Math.min(maxD, Math.hypot(game.mouseWorld.x - p.x, game.mouseWorld.y - p.y));
      const cx = p.x + Math.cos(p.aimAngle) * d;
      const cy = p.y - 8 + Math.sin(p.aimAngle) * d;
      const radius = P.radius * aoeMul;
      game.addFx(new NovaFx(cx, cy, radius, ['#7ad6ff', '#d8f4ff', '#ffffff'], 0.5));
      game.particles.burst(cx, cy, 30, { color: ['#7ad6ff', '#d8f4ff', '#ffffff'], speed: 150, life: 0.7, flat: true });
      game.aoeDamage(cx, cy, radius, dmg, {
        from: p, slow: P.slow, slowTime: P.slowTime, crit: Math.random() < p.stats.crit,
        critDmg: p.stats.critDmg, lifesteal: p.stats.lifesteal, knock: 120,
      });
      game.camera.kick(3.5, 0.3);
      break;
    }

    case 'melee_arc': {
      sfx(P.sound);
      const range = p.stats.range * (P.rangeMul || 1);
      game.addEffect({ sprite: 'fx:slash', frames: 3, x: p.x, y: p.y - 10, rot: p.aimAngle, life: 0.24, scale: range / 18, tint: '#ffd8a0' });
      let any = false;
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (inCone(p.x, p.y - 6, p.aimAngle, P.arc / 2, e.x, e.y - 6, range, e.radius)) {
          game.hitEnemy(e, dmg, {
            from: p, crit: Math.random() < p.stats.crit, critDmg: p.stats.critDmg,
            knock: P.knock || 160, angle: p.aimAngle, lifesteal: p.stats.lifesteal,
          });
          any = true;
        }
      }
      if (any) game.camera.kick(4, 0.25);
      p.swing = 0.26;
      break;
    }

    case 'dash_strike': {
      sfx(P.sound);
      const dir = p.aimAngle;
      const dist = P.distance;
      p.dashT = dist / P.speed;
      p.dashVX = Math.cos(dir) * P.speed;
      p.dashVY = Math.sin(dir) * P.speed;
      p.iframe = Math.max(p.iframe, dist / P.speed + 0.1);
      game.addFx(new DashStrikeFx(p, dir, P, dmg));
      break;
    }

    case 'spin': {
      sfx(P.sound);
      game.addFx(new SpinFx(p, P, dmg * (1 + (p.stats.aoe || 0) * 0.0), P.radius * (1 + (p.stats.aoe || 0) * 0.5)));
      break;
    }

    case 'melee_burst': {
      sfx(P.sound);
      game.addFx(new BurstFx(p, P, dmg));
      break;
    }

    case 'arrow_rain': {
      sfx(P.sound);
      const maxD = 190;
      const d = Math.min(maxD, Math.hypot(game.mouseWorld.x - p.x, game.mouseWorld.y - p.y));
      const cx = p.x + Math.cos(p.aimAngle) * d;
      const cy = p.y - 8 + Math.sin(p.aimAngle) * d;
      game.addFx(new ArrowRainFx(p, cx, cy, P.radius * aoeMul, P.count, P.duration, dmg));
      break;
    }

    case 'blink': {
      sfx(P.sound);
      const dist = P.distance;
      const steps = Math.ceil(dist / 4);
      let nx = p.x, ny = p.y;
      for (let i = 0; i < steps; i++) {
        const tx = nx + Math.cos(p.aimAngle) * 4;
        const ty = ny + Math.sin(p.aimAngle) * 4;
        if (game.map.blocked(tx, ty, p.radius)) break;
        nx = tx; ny = ty;
      }
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        game.addEffect({
          sprite: 'fx:shadowstep', x: p.x + (nx - p.x) * t, y: p.y + (ny - p.y) * t,
          life: 0.3 + t * 0.15, scale: 1, alpha: 0.5,
        });
      }
      game.particles.burst(p.x, p.y - 8, 14, { color: ['#4a2a8a', '#1a1030'], speed: 60, life: 0.4 });
      p.x = nx; p.y = ny;
      p.iframe = Math.max(p.iframe, P.iframes);
      game.particles.burst(nx, ny - 8, 14, { color: ['#8a5aff', '#1a1030'], speed: 70, life: 0.45 });
      break;
    }

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Efeitos de habilidade com lógica própria
// ---------------------------------------------------------------------------
class BeamFx {
  constructor(x, y, ang, len, width, color) {
    this.x = x; this.y = y; this.ang = ang; this.len = len; this.width = width;
    this.color = color;
    this.life = 0.22; this.max = 0.22;
  }
  update(dt) { this.life -= dt; return this.life > 0; }
  draw(ctx) {
    const t = this.life / this.max;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.ang);
    const grad = ctx.createLinearGradient(0, 0, this.len, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, 'rgba(120,90,255,0)');
    ctx.fillStyle = grad;
    const w = this.width * (0.4 + t * 0.6);
    ctx.fillRect(0, -w / 2, this.len, w);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -w / 5, this.len * t, w / 2.5);
    ctx.restore();
  }
}

class NovaFx {
  constructor(x, y, r, colors, life) {
    this.x = x; this.y = y; this.r = r; this.colors = colors;
    this.life = life; this.max = life;
  }
  update(dt) { this.life -= dt; return this.life > 0; }
  draw(ctx) {
    const t = 1 - this.life / this.max;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = this.colors[1];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * (0.3 + t * 0.8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = this.colors[0];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * (0.15 + t * 0.95), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.35;
    ctx.fillStyle = this.colors[1];
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * (0.3 + t * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class DashStrikeFx {
  constructor(p, dir, P, dmg) {
    this.p = p; this.dir = dir; this.P = P; this.dmg = dmg;
    this.hit = new Set();
    this.life = 0.4; this.max = 0.4;
    this.sx = p.x; this.sy = p.y;
    this.done = false;
  }
  update(dt, game) {
    this.life -= dt;
    const p = this.p;
    for (const e of game.enemies) {
      if (e.dead || this.hit.has(e.id)) continue;
      // distância ao segmento sx,sy -> p.x,p.y
      const vx = p.x - this.sx, vy = p.y - this.sy;
      const wx = e.x - this.sx, wy = e.y - this.sy;
      const l2 = vx * vx + vy * vy || 1;
      let t = (wx * vx + wy * vy) / l2;
      t = clamp(t, 0, 1);
      const dx = this.sx + vx * t - e.x, dy = this.sy + vy * t - e.y;
      if (Math.hypot(dx, dy) < this.P.width + e.radius) {
        this.hit.add(e.id);
        game.hitEnemy(e, this.dmg, {
          from: p,
          crit: this.P.guaranteedCrit || Math.random() < p.stats.crit,
          critDmg: p.stats.critDmg,
          knock: 150, angle: this.dir, lifesteal: p.stats.lifesteal,
        });
        game.particles.burst(e.x, e.y - 8, 12, { color: ['#b02a3a', '#ffffff'], speed: 100, life: 0.4 });
      }
    }
    if (p.dashT <= 0) this.done = true;
    return this.life > 0 && !this.done;
  }
  draw(ctx) {
    const t = this.life / this.max;
    ctx.save();
    ctx.globalAlpha = t * 0.6;
    ctx.strokeStyle = this.p.cls.color;
    ctx.lineWidth = this.P.width * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.sx, this.sy - 8);
    ctx.lineTo(this.p.x, this.p.y - 8);
    ctx.stroke();
    ctx.restore();
  }
}

class SpinFx {
  constructor(p, P, dmg, radius) {
    this.p = p; this.P = P; this.dmg = dmg; this.radius = radius;
    this.hits = [];
    for (let i = 0; i < P.pulses; i++) this.hits.push({ at: i * P.pulseGap, done: false, sets: new Set() });
    this.life = P.pulses * P.pulseGap + 0.3;
    this.max = this.life;
    this.t = 0;
  }
  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    for (const h of this.hits) {
      if (h.done || this.t < h.at) continue;
      h.done = true;
      game.addEffect({ sprite: 'fx:ring', frames: 5, x: this.p.x, y: this.p.y - 8, life: 0.35, scale: this.radius / 22 });
      for (const e of game.enemies) {
        if (e.dead || h.sets.has(e.id)) continue;
        if (Math.hypot(e.x - this.p.x, e.y - this.p.y) < this.radius + e.radius) {
          h.sets.add(e.id);
          const ang = Math.atan2(e.y - this.p.y, e.x - this.p.x);
          game.hitEnemy(e, this.dmg, {
            from: this.p, crit: Math.random() < this.p.stats.crit, critDmg: this.p.stats.critDmg,
            knock: 110, angle: ang, lifesteal: this.p.stats.lifesteal,
          });
        }
      }
      game.camera.kick(2, 0.15);
    }
    return this.life > 0;
  }
  draw() {}
}

class BurstFx {
  constructor(p, P, dmg) {
    this.p = p; this.P = P; this.dmg = dmg;
    this.hits = [];
    for (let i = 0; i < P.hits; i++) this.hits.push({ at: i * P.gap, done: false, set: new Set() });
    this.life = P.hits * P.gap + 0.25;
    this.t = 0;
  }
  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    const p = this.p;
    for (const h of this.hits) {
      if (h.done || this.t < h.at) continue;
      h.done = true;
      const range = p.stats.range * (this.P.rangeMul || 1);
      const ang = p.aimAngle + (Math.random() - 0.5) * 0.5;
      game.addEffect({
        sprite: Math.random() < 0.5 ? 'fx:slash' : 'fx:slashred', frames: 3,
        x: p.x, y: p.y - 10, rot: ang, life: 0.14, scale: range / 20,
      });
      for (const e of game.enemies) {
        if (e.dead || h.set.has(e.id)) continue;
        if (inCone(p.x, p.y - 6, ang, this.P.arc / 2, e.x, e.y - 6, range, e.radius)) {
          h.set.add(e.id);
          game.hitEnemy(e, this.dmg, {
            from: p, crit: Math.random() < p.stats.crit, critDmg: p.stats.critDmg,
            knock: 60, angle: ang, lifesteal: p.stats.lifesteal,
          });
        }
      }
      sfx('swing');
    }
    return this.life > 0;
  }
  draw() {}
}

class ArrowRainFx {
  constructor(p, cx, cy, radius, count, duration, dmg) {
    this.p = p; this.cx = cx; this.cy = cy; this.radius = radius;
    this.dmg = dmg;
    this.arrows = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * radius;
      this.arrows.push({
        x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr,
        delay: Math.random() * duration, t: 0, hit: false, fall: 0.35,
      });
    }
    this.life = duration + 0.6;
    this.max = this.life;
  }
  update(dt, game) {
    this.life -= dt;
    for (const a of this.arrows) {
      if (a.hit) continue;
      if (a.delay > 0) { a.delay -= dt; continue; }
      a.t += dt;
      if (a.t >= a.fall) {
        a.hit = true;
        game.particles.burst(a.x, a.y, 5, { color: ['#c9b48a', '#8a6a3a'], speed: 50, life: 0.3 });
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - a.x, e.y - a.y) < 20 + e.radius) {
            game.hitEnemy(e, this.dmg, {
              from: this.p, crit: Math.random() < this.p.stats.crit, critDmg: this.p.stats.critDmg,
              lifesteal: this.p.stats.lifesteal, knock: 0,
            });
          }
        }
      }
    }
    return this.life > 0;
  }
  draw(ctx) {
    const spr = S('fx:arrow');
    for (const a of this.arrows) {
      if (a.hit || a.delay > 0) continue;
      const t = a.t / a.fall;
      const y = a.y - (1 - t) * 220;
      ctx.save();
      ctx.globalAlpha = 0.4 + t * 0.6;
      ctx.translate(a.x, y);
      ctx.rotate(Math.PI / 2);
      if (spr) ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#ffe066';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
