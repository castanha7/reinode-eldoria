// ---------------------------------------------------------------------------
// projectile.js — projéteis do jogador e dos inimigos
// ---------------------------------------------------------------------------
import { S } from '../sprites.js';
import { clamp } from '../core/utils.js';

let _pid = 1;

export class Projectile {
  constructor(o) {
    this.uid = _pid++;
    this.x = o.x; this.y = o.y;
    this.angle = o.angle;
    this.speed = o.speed;
    this.dmg = o.dmg;
    this.from = o.from;
    this.hostile = !!o.hostile;
    this.sprite = o.sprite || 'fx:bolt';
    this.size = o.size || 10;
    this.pierce = o.pierce || 0;
    this.radius = o.radius || 0;
    this.slow = o.slow;
    this.slowTime = o.slowTime;
    this.life = o.life || 2;
    this.crit = o.crit;
    this.critDmg = o.critDmg || 1.8;
    this.lifesteal = o.lifesteal || 0;
    this.trail = o.trail || null;
    this.hitOpts = o.hitOpts || null; // efeitos extras ao acertar o jogador (slow, dot, etc.)
    this.mark = o.mark || 0;         // Olho de Falcão: +dano recebido pelo alvo
    this.markTime = o.markTime || 0;
    this.dead = false;
    this.hits = new Set();
    this.t = 0;
    this.rot = o.sprite === 'fx:arrow' || o.sprite === 'fx:arrow_fire' || o.sprite === 'fx:bone' ? this.angle : 0;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.explode(game, false); return; }
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    // colisão com cenário
    if (game.map.isSolidAt(nx, ny)) {
      this.x = nx; this.y = ny;
      this.explode(game, false);
      return;
    }
    this.x = nx; this.y = ny;

    if (this.trail && game.particles.list.length < 500) {
      game.particles.spawn({
        x: this.x, y: this.y, life: 0.28, size: 3, color: this.trail, kind: 'fade', drag: 3,
      });
    }

    if (this.hostile) {
      const p = game.player;
      // o corpo do jogador fica ~8px acima dos pés (p.y); o projétil sai da altura do peito
      if (!p.dead && Math.hypot(p.x - this.x, (p.y - 8) - this.y) < p.radius + 2 + this.size * 0.5) {
        game.hitPlayer(this.dmg, { angle: this.angle, knock: 60, ...(this.hitOpts || {}) });
        this.explode(game, true);
        return;
      }
    } else {
      for (const e of game.enemies) {
        if (e.dead || e.untargetable || this.hits.has(e.uid)) continue; // atravessa quem está soterrado
        if (Math.hypot(e.x - this.x, (e.y - e.radius * 0.6) - this.y) < e.radius + this.size * 0.5) {
          this.hits.add(e.uid);
          if (this.mark) e.applyMark(this.mark, this.markTime || 8);
          game.hitEnemy(e, this.dmg, {
            from: this.from, crit: this.crit, critDmg: this.critDmg,
            knock: 90, angle: this.angle, lifesteal: this.lifesteal,
            slow: this.slow, slowTime: this.slowTime,
          });
          if (this.radius > 0) {
            this.explode(game, true);
            return;
          }
          if (this.pierce > 0) {
            this.pierce--;
            continue;
          }
          this.explode(game, true);
          return;
        }
      }
    }
  }

  explode(game, hitSomething) {
    if (this.dead) return;
    this.dead = true;
    if (this.radius > 0) {
      game.addEffect({ sprite: 'fx:boom', frames: 5, x: this.x, y: this.y, life: 0.4, scale: this.radius / 26 });
      game.particles.burst(this.x, this.y, 18, { color: ['#ff9a2a', '#ffc93a', '#ffffff'], speed: 130, life: 0.55 });
      game.sfx('fire');
      game.camera.kick(2.5, 0.18);
      if (!this.hostile) {
        game.aoeDamage(this.x, this.y, this.radius, this.dmg * 0.75, {
          from: this.from, crit: false, knock: 120, slow: this.slow, slowTime: this.slowTime,
          lifesteal: this.lifesteal, except: this.hits,
        });
      }
    } else {
      game.particles.burst(this.x, this.y, hitSomething ? 8 : 5, {
        color: this.trail ? [this.trail, '#ffffff'] : ['#cfd8e4', '#8a97a8'], speed: 60, life: 0.3,
      });
    }
  }

  draw(ctx) {
    const spr = S(`${this.sprite}:${Math.floor(this.t * 18) % 3}`) || S(this.sprite);
    if (!spr) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.rot || this.sprite.startsWith('fx:arrow') || this.sprite === 'fx:bone') ctx.rotate(this.angle);
    else ctx.rotate(this.t * 8);
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
    // brilho
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.trail || '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
/** Efeito visual simples (arco de golpe, explosão, anel). */
export class TimedEffect {
  constructor(o) {
    this.sprite = o.sprite;
    this.frames = o.frames || 1;
    this.x = o.x; this.y = o.y;
    this.rot = o.rot || 0;
    this.life = o.life || 0.3;
    this.max = this.life;
    this.scale = o.scale || 1;
    this.alpha = o.alpha === undefined ? 1 : o.alpha;
    this.tint = o.tint || null;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const f = Math.min(this.frames - 1, Math.floor((1 - this.life / this.max) * this.frames));
    const key = this.frames > 1 ? `${this.sprite}:${f}` : this.sprite;
    const spr = S(key);
    if (!spr) return;
    ctx.save();
    ctx.globalAlpha = this.alpha * clamp(this.life / this.max + 0.2, 0, 1);
    ctx.translate(this.x, this.y);
    if (this.rot) ctx.rotate(this.rot);
    const s = this.scale;
    ctx.drawImage(spr, (-spr.width / 2) * s, (-spr.height / 2) * s, spr.width * s, spr.height * s);
    ctx.restore();
  }
}
