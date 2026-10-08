// ---------------------------------------------------------------------------
// enemy.js — inimigos, IA e comportamentos
// ---------------------------------------------------------------------------
import { enemyDef } from '../data/enemies.js';
import { S, getTinted, drawShadow } from '../sprites.js';
import { facingFromAngle } from './combat.js';
import { clamp } from '../core/utils.js';
import { consumable } from '../data/items.js';

let _eid = 1;

/** Projéteis especiais dos atiradores (por tipo de inimigo). */
const PROJ = {
  skeleton: { sprite: 'fx:bone' },
  spider: { sprite: 'fx:web', size: 10, trail: '#e8e8f0', dmgMul: 0.8, hitOpts: { web: 1.6, slowPlayer: 1.6 } },
  cultist: { sprite: 'fx:orb', size: 11, trail: '#b04ae0' },
};
const SUMMONS = { boss: 'slime', spider_queen: 'spider', lich: 'skeleton', titan: 'golem' };

const FOUR_DIR = new Set(['soldier_sword', 'soldier_archer', 'soldier_heavy', 'bandit', 'cultist']);
const FLIP_RIGHT = new Set(['wolf', 'direwolf', 'boar']);

export class Enemy {
  constructor(type, x, y, opts = {}) {
    this.d = enemyDef(type);
    this.type = type;
    this.uid = _eid++;
    this.x = x; this.y = y;
    this.homeX = x; this.homeY = y;
    this.radius = this.d.radius;
    const hpMul = opts.hpMul || 1;
    const dmgMul = opts.dmgMul || 1;
    this.maxHp = Math.round(this.d.hp * hpMul);
    this.hp = this.maxHp;
    this.dmgMul = dmgMul;
    this.defense = this.d.def;
    this.speed = this.d.speed;
    this.isEnemy = true;
    this.dead = false;
    this.deathT = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.atkCd = Math.random() * 0.8;
    this.facing = 0;
    this.frame = 0;
    this.animT = Math.random() * 4;
    this.hurtFlash = 0;
    this.slowT = 0;
    this.slowAmt = 0;
    this.kx = 0; this.ky = 0;
    this.wanderAng = Math.random() * Math.PI * 2;
    this.wanderT = 0;
    this.aggroRange = this.d.ai === 'ranged' ? 250 : this.d.ai === 'boss' ? 420 : 175;
    this.leash = this.d.boss ? (this.d.bossKind ? 380 : 9999) : 420;
    this.stunT = 0;
    this.stolen = 0;
    this.summons = 0;
    this.bossKind = this.d.bossKind || 'guardian';
    this.hitCd = 0;
    this.phase = 1;
    this.pattern = 0;
    this.patternT = 2;
    this.summonT = 8;
    this.dashDir = 0;
    this.telegraph = 0;
    this.spawnT = 0.35;
  }

  /** Chefe que perdeu o jogador: volta ao ponto de origem com vida cheia. */
  resetFight() {
    if (this.dead || (this.hp >= this.maxHp && this.state === 'idle')) return;
    this.hp = this.maxHp;
    this.x = this.homeX; this.y = this.homeY;
    this.state = 'idle'; this.stateT = 0;
    this.phase = 1; this.speed = this.d.speed;
    this.summons = 0; this.summonT = 8; this.patternT = 2; this.stunT = 0; this.slowT = 0;
    this.kx = 0; this.ky = 0;
  }

  get name() { return this.d.name; }
  get isBoss() { return !!this.d.boss; }
  get isElite() { return !!this.d.elite || !!this.d.boss; }

  applySlow(amt, time) {
    if (amt > this.slowAmt || this.slowT <= 0) {
      this.slowAmt = Math.max(this.slowAmt, amt);
      this.slowT = Math.max(this.slowT, time);
    }
  }

  update(dt, game) {
    if (this.dead) {
      this.deathT += dt;
      return;
    }
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    this.slowT = Math.max(0, this.slowT - dt);
    this.stunT = Math.max(0, this.stunT - dt);
    if (this.slowT <= 0) this.slowAmt = 0;
    this.hitCd = Math.max(0, this.hitCd - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.stateT += dt;
    this.telegraph = Math.max(0, this.telegraph - dt);

    // knockback
    if (this.kx || this.ky) {
      const p = game.map.move(this.x, this.y, this.kx * dt, this.ky * dt, this.radius);
      this.x = p.x; this.y = p.y;
      this.kx *= Math.max(0, 1 - 9 * dt);
      this.ky *= Math.max(0, 1 - 9 * dt);
      if (Math.abs(this.kx) < 4) this.kx = 0;
      if (Math.abs(this.ky) < 4) this.ky = 0;
    }

    const p = game.player;
    const canFight = !p.dead && game.map.id === (this.mapId || game.map.id) && !game.map.isSafeAt(p.x, p.y);
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);

    // atordoado / cego: não age
    if (this.stunT > 0) {
      this.moving = false;
      if (this.state === 'windup' || this.state === 'dash' || this.state === 'volley') { this.state = 'chase'; this.stateT = 0; }
      return;
    }

    if (this.isBoss && canFight) this.updateBoss(dt, game, dist, ang, canFight);

    const slowMul = 1 - this.slowAmt;
    const terrain = this.d.flyer ? 1 : game.map.speedMulAt(this.x, this.y);
    const spd = this.speed * slowMul * terrain;

    if (!canFight) {
      // jogador morto, fora do mapa ou na zona segura: volta para casa
      if (this.state !== 'idle' && this.state !== 'return') { this.state = 'return'; this.stateT = 0; }
      if (this.state === 'return') {
        const dh0 = Math.hypot(this.x - this.homeX, this.y - this.homeY);
        if (dh0 < 20) { this.state = 'idle'; this.hp = this.maxHp; }
        else this.moveToward(dt, game, this.homeX, this.homeY, spd * 1.1);
      } else this.moveIdle(dt, game, spd * 0.5);
      this.anim(dt, spd);
      return;
    }

    // leash
    const dh = Math.hypot(this.x - this.homeX, this.y - this.homeY);
    if (this.state !== 'return' && dh > this.leash) {
      this.state = 'return';
      this.stateT = 0;
    }
    if (this.state === 'return') {
      if (dh < 20) { this.state = 'idle'; this.hp = this.maxHp; this.summons = 0; }
      else this.moveToward(dt, game, this.homeX, this.homeY, spd * 1.1);
      this.anim(dt, spd);
      return;
    }

    // detecção
    const sees = dist < this.aggroRange && game.map.lineOfSight(this.x, this.y, p.x, p.y);
    if (sees && this.state === 'idle') {
      this.state = 'chase';
      this.stateT = 0;
      if (this.isElite && Math.random() < 0.5) game.notify(`${this.d.name} percebeu você!`, '#ff8a8a');
    }
    if (!sees && this.state === 'chase' && dist > this.aggroRange * 1.5) {
      this.state = 'idle';
    }

    switch (this.d.ai) {
      case 'ranged': this.aiRanged(dt, game, dist, ang, spd, sees); break;
      case 'charger': this.aiCharger(dt, game, dist, ang, spd, sees); break;
      case 'brute': this.aiBrute(dt, game, dist, ang, spd, sees); break;
      case 'boss': this.aiBoss(dt, game, dist, ang, spd); break;
      default: this.aiChaser(dt, game, dist, ang, spd, sees); break;
    }
    this.anim(dt, spd);
  }

  moveIdle(dt, game, spd) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 1.5 + Math.random() * 3;
      this.wanderAng = Math.random() * Math.PI * 2;
      this.wanderMove = Math.random() < 0.6;
    }
    if (!this.wanderMove) return;
    const tx = this.homeX + Math.cos(this.wanderAng) * 40;
    const ty = this.homeY + Math.sin(this.wanderAng) * 40;
    this.moveToward(dt, game, tx, ty, spd * 0.45);
  }

  moveToward(dt, game, tx, ty, spd, stopAt = 0) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < stopAt || d < 1) return;
    let vx = (dx / d) * spd, vy = (dy / d) * spd;
    // separação de outros inimigos
    for (const o of game.enemies) {
      if (o === this || o.dead) continue;
      const ox = this.x - o.x, oy = this.y - o.y;
      const od = Math.hypot(ox, oy);
      const min = this.radius + o.radius + 2;
      if (od < min && od > 0.01) {
        vx += (ox / od) * spd * 0.9;
        vy += (oy / od) * spd * 0.9;
      }
    }
    const m = Math.hypot(vx, vy) || 1;
    let p = game.map.move(this.x, this.y, (vx / m) * spd * dt, (vy / m) * spd * dt, this.radius);
    // inimigos não entram na zona segura (cidade)
    if (game.map.isSafeAt(p.x, p.y) && !game.map.isSafeAt(this.x, this.y)) p = { x: this.x, y: this.y };
    const moved = Math.hypot(p.x - this.x, p.y - this.y);
    this.x = p.x; this.y = p.y;
    this.moving = moved > 0.05;
    if (moved > 0.05) this.facing = facingFromAngle(Math.atan2(vy, vx));
  }

  anim(dt, spd) {
    if (this.moving) {
      this.animT += dt * (spd / 26 + 1.2);
      this.frame = Math.floor(this.animT) % 4;
    } else {
      this.animT += dt * 1.6;
      this.frame = Math.floor(this.animT) % 4;
    }
  }

  // --- IAs -----------------------------------------------------------------
  aiChaser(dt, game, dist, ang, spd, sees) {
    const A = this.d.attack;
    if (this.state === 'windup') {
      if (this.stateT >= A.windup) {
        this.state = 'attack';
        this.stateT = 0;
        this.doMelee(game, dist, ang, A);
      }
      return;
    }
    if (this.state === 'attack') {
      if (this.stateT > 0.25) { this.state = 'chase'; this.stateT = 0; }
      return;
    }
    if (sees && dist < A.range + this.radius) {
      if (this.atkCd <= 0) { this.state = 'windup'; this.stateT = 0; this.atkCd = A.cd; }
      return;
    }
    if (sees) {
      let tx = game.player.x, ty = game.player.y;
      if (this.d.erratic) {
        // voo em zigue-zague
        const off = Math.sin(game.time * 6 + this.uid) * 30;
        tx += -Math.sin(ang) * off; ty += Math.cos(ang) * off;
      }
      this.moveToward(dt, game, tx, ty, spd, A.range * 0.6);
    } else this.moveIdle(dt, game, spd);
  }

  aiRanged(dt, game, dist, ang, spd, sees) {
    const A = this.d.attack;
    if (this.state === 'windup') {
      if (this.stateT >= A.windup) {
        this.state = 'attack';
        this.stateT = 0;
        const p = game.player;
        const pj = PROJ[this.type] || {};
        game.spawnProjectile({
          x: this.x, y: this.y - 10,
          angle: Math.atan2(p.y - 8 - (this.y - 10), p.x - this.x),
          speed: A.projSpeed,
          dmg: this.dmg() * (pj.dmgMul || 1),
          from: this, hostile: true,
          sprite: pj.sprite || 'fx:arrow',
          size: pj.size || 8, life: 2.2, trail: pj.trail || null, hitOpts: pj.hitOpts || null,
        });
        game.sfx(this.d.caster ? 'fire' : 'shoot');
      }
      return;
    }
    if (this.state === 'attack') {
      if (this.stateT > 0.3) { this.state = 'chase'; this.stateT = 0; }
      return;
    }
    if (!sees) { this.moveIdle(dt, game, spd); return; }
    if (dist > A.range * 0.85) this.moveToward(dt, game, game.player.x, game.player.y, spd);
    else if (dist < A.minRange) {
      this.moveToward(dt, game, this.x - (game.player.x - this.x), this.y - (game.player.y - this.y), spd);
    }
    if (dist < A.range && this.atkCd <= 0 && game.map.lineOfSight(this.x, this.y, game.player.x, game.player.y)) {
      this.state = 'windup'; this.stateT = 0; this.atkCd = A.cd;
    }
  }

  aiCharger(dt, game, dist, ang, spd, sees) {
    const A = this.d.attack;
    if (this.state === 'windup') {
      this.moving = false;
      if (this.stateT >= A.windup) {
        this.state = 'dash';
        this.stateT = 0;
        this.dashDir = ang;
      }
      return;
    }
    if (this.state === 'dash') {
      const s = A.dashSpeed * (1 - this.slowAmt);
      const p = game.map.move(this.x, this.y, Math.cos(this.dashDir) * s * dt, Math.sin(this.dashDir) * s * dt, this.radius);
      this.x = p.x; this.y = p.y;
      this.moving = true;
      this.facing = facingFromAngle(this.dashDir);
      game.particles.spawn({ x: this.x, y: this.y - 4, life: 0.25, size: 3, color: '#8a8a7a', drag: 4 });
      const pl = game.player;
      if (!pl.dead && this.hitCd <= 0 && Math.hypot(pl.x - this.x, pl.y - this.y) < this.radius + pl.radius + 6) {
        this.hitCd = 0.6;
        game.hitPlayer(this.dmg() * 1.2, { angle: this.dashDir, knock: 200 });
      }
      if (this.stateT >= A.dashTime) { this.state = 'chase'; this.stateT = 0; this.atkCd = A.cd; }
      return;
    }
    if (!sees) { this.moveIdle(dt, game, spd); return; }
    if (dist < 200 && dist > 40 && this.atkCd <= 0) {
      this.state = 'windup'; this.stateT = 0;
      return;
    }
    this.moveToward(dt, game, game.player.x, game.player.y, spd, 14);
    if (dist < A.range && this.atkCd <= 0) {
      this.atkCd = A.cd;
      this.doMelee(game, dist, ang, A);
    }
  }

  aiBrute(dt, game, dist, ang, spd, sees) {
    const A = this.d.attack;
    if (this.state === 'windup') {
      this.moving = false;
      this.telegraph = 1;
      if (this.stateT >= A.windup) {
        this.state = 'attack';
        this.stateT = 0;
        this.doMelee(game, dist, ang, A, 1.15);
        game.camera.kick(2.5, 0.2);
        game.particles.burst(this.x + Math.cos(ang) * 20, this.y + Math.sin(ang) * 20, 10, { color: ['#b9a882', '#8a7a5a'], speed: 80, life: 0.4 });
      }
      return;
    }
    if (this.state === 'attack') {
      if (this.stateT > 0.35) { this.state = 'chase'; this.stateT = 0; }
      return;
    }
    if (!sees) { this.moveIdle(dt, game, spd); return; }
    this.moveToward(dt, game, game.player.x, game.player.y, spd, A.range * 0.7);
    if (dist < A.range + this.radius && this.atkCd <= 0) {
      this.state = 'windup'; this.stateT = 0; this.atkCd = A.cd;
    }
  }

  // --- chefe ---------------------------------------------------------------
  updateBoss(dt, game, dist, ang, canFight) {
    const frac = this.hp / this.maxHp;
    const np = frac < 0.34 ? 3 : frac < 0.67 ? 2 : 1;
    if (np !== this.phase) {
      this.phase = np;
      this.speed = this.d.speed * (1 + (np - 1) * 0.22);
      const names = this.d.phaseNames;
      game.notify(names ? names[np - 2] : (np === 3 ? `${this.d.name} entra em fúria!` : `${this.d.name} ruge de dor!`), '#b875f0');
      game.sfx('boss');
      game.camera.kick(7, 0.7);
      game.particles.burst(this.x, this.y - 16, 40, { color: ['#b875f0', '#ff6ac9', '#ffffff'], speed: 170, life: 0.9 });
    }
    // convocação de crias (fase 3 do Guardião; fase 2+ dos chefes do mundo)
    const minPhase = this.bossKind === 'guardian' ? 3 : 2;
    if (this.phase >= minPhase) {
      this.summonT -= dt;
      let near = 0;
      for (const o of game.enemies) {
        if (!o.dead && o !== this && Math.hypot(o.x - this.x, o.y - this.y) < 150) near++;
      }
      if (this.summonT <= 0 && near < 8 && this.summons < 10) {
        this.summonT = this.bossKind === 'guardian' ? 9 : 11;
        this.summons += 2;
        const kind = SUMMONS[this.type] || 'slime';
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const sx = this.x + Math.cos(a) * 44, sy = this.y + Math.sin(a) * 44;
          const f = game.map.isBlockedTile(Math.floor(sx / 16), Math.floor(sy / 16)) ? { x: this.x, y: this.y } : { x: sx, y: sy };
          game.spawnEnemy(kind, f.x, f.y, { summoned: true });
        }
        game.particles.burst(this.x, this.y, 24, { color: ['#4fbf6a', '#b875f0'], speed: 120, life: 0.7 });
        game.notify(`${this.d.name} invoca reforços!`, '#8aff8a');
      }
    }
  }

  aiBoss(dt, game, dist, ang, spd) {
    const A = this.d.attack;
    if (this.state === 'windup') {
      this.moving = false;
      this.telegraph = 1;
      if (this.stateT >= A.windup) {
        this.state = 'attack';
        this.stateT = 0;
        this.bossStrike(game, ang);
      }
      return;
    }
    if (this.state === 'attack') {
      if (this.stateT > 0.5) { this.state = 'chase'; this.stateT = 0; }
      return;
    }
    if (this.state === 'volley') {
      this.moving = false;
      this.telegraph = this.cast === 'blink' ? 1 : 0;
      if (this.stateT > (this.cast === 'blink' ? 0.5 : 0.15) && !this.volleyDone) {
        this.volleyDone = true;
        this.bossCast(game, this.cast, ang);
      }
      if (this.stateT > 0.8) { this.state = 'chase'; this.stateT = 0; }
      return;
    }
    // escolha de padrão
    this.patternT -= dt;
    if (this.patternT <= 0) {
      this.patternT = Math.max(1.6, 2.6 - this.phase * 0.2) + Math.random() * 1.4;
      const r = Math.random();
      const pool = this.castPool();
      if (pool.length && r < 0.42) {
        this.state = 'volley'; this.stateT = 0; this.volleyDone = false;
        this.cast = pool[(Math.random() * pool.length) | 0];
        return;
      }
      this.state = 'windup'; this.stateT = 0;
      return;
    }
    // chefes à distância mantêm-se um pouco afastados
    this.moveToward(dt, game, game.player.x, game.player.y, spd, A.range * 0.55);
    if (dist < A.range + this.radius && this.atkCd <= 0) {
      this.state = 'windup'; this.stateT = 0; this.atkCd = A.cd;
      this.patternT = 2.2;
    }
  }

  /** Magias disponíveis por chefe e fase. */
  castPool() {
    const ph = this.phase;
    switch (this.bossKind) {
      case 'spider': return ph >= 3 ? ['webs', 'webring'] : ['webs'];
      case 'lich': return ph >= 3 ? ['bones', 'orbring', 'blink'] : ph >= 2 ? ['bones', 'orbring'] : ['bones'];
      case 'titan': return ph >= 2 ? ['rocks', 'quake'] : ['rocks'];
      default: return ph >= 2 ? ['volley'] : [];
    }
  }

  bossCast(game, kind, ang) {
    const p = game.player;
    const base = Math.atan2(p.y - 8 - (this.y - 20), p.x - this.x);
    const shoot = (a, sprite, o = {}) => game.spawnProjectile({
      x: this.x, y: this.y - 20, angle: a, speed: o.speed || 220, dmg: this.dmg() * (o.dmgMul || 0.55),
      from: this, hostile: true, sprite, size: o.size || 13, life: o.life || 3, trail: o.trail || null, hitOpts: o.hitOpts || null,
    });
    switch (kind) {
      case 'webs':
        for (let i = -2; i <= 2; i++) shoot(base + i * 0.2, 'fx:web', { speed: 210, size: 12, trail: '#e8e8f0', dmgMul: 0.45, hitOpts: { web: 2, slowPlayer: 2 } });
        game.sfx('shoot');
        break;
      case 'webring':
        for (let i = 0; i < 12; i++) shoot((i / 12) * Math.PI * 2, 'fx:web', { speed: 150, size: 12, trail: '#e8e8f0', dmgMul: 0.4, hitOpts: { web: 2, slowPlayer: 2 } });
        game.sfx('boss');
        break;
      case 'bones':
        for (let i = -2; i <= 2; i++) shoot(base + i * 0.16, 'fx:bone', { speed: 250, size: 10, trail: '#5ad8c0', dmgMul: 0.5 });
        game.sfx('shoot');
        break;
      case 'orbring':
        for (let i = 0; i < 14; i++) shoot((i / 14) * Math.PI * 2 + game.time, 'fx:orb', { speed: 140, size: 12, trail: '#b04ae0', dmgMul: 0.45, life: 3.4 });
        game.sfx('fire');
        break;
      case 'blink': {
        // teleporta para perto do jogador e solta uma explosão
        const a = Math.random() * Math.PI * 2;
        const tx = p.x + Math.cos(a) * 60, ty = p.y + Math.sin(a) * 60;
        game.particles.burst(this.x, this.y - 12, 24, { color: ['#5ad8c0', '#ffffff'], speed: 100, life: 0.6 });
        if (!game.map.blocked(tx, ty, this.radius) && !game.map.isSafeAt(tx, ty)) { this.x = tx; this.y = ty; }
        game.particles.burst(this.x, this.y - 12, 24, { color: ['#5ad8c0', '#ffffff'], speed: 100, life: 0.6 });
        game.addEffect({ sprite: 'fx:ring', frames: 5, x: this.x, y: this.y - 6, life: 0.5, scale: 2.4 });
        if (!p.dead && Math.hypot(p.x - this.x, p.y - this.y) < 64) game.hitPlayer(this.dmg() * 0.8, { angle: Math.atan2(p.y - this.y, p.x - this.x), knock: 220 });
        game.sfx('crit');
        break;
      }
      case 'rocks':
        for (let i = -1; i <= 1; i++) shoot(base + i * 0.28, 'fx:stone', { speed: 200, size: 15, trail: '#8a8478', dmgMul: 0.7 });
        game.sfx('hit');
        break;
      case 'quake': {
        game.camera.kick(9, 0.7);
        game.sfx('boss');
        for (let ring = 0; ring < 2; ring++) {
          game.addEffect({ sprite: 'fx:shock', frames: 5, x: this.x, y: this.y - 4, life: 0.6 + ring * 0.2, scale: 3.2 + ring * 1.4 });
        }
        for (let i = 0; i < 10; i++) shoot((i / 10) * Math.PI * 2, 'fx:stone', { speed: 170, size: 14, trail: '#ff8a2a', dmgMul: 0.55 });
        if (!p.dead && Math.hypot(p.x - this.x, p.y - this.y) < 110) game.hitPlayer(this.dmg() * 0.7, { angle: Math.atan2(p.y - this.y, p.x - this.x), knock: 300 });
        break;
      }
      default: // 'volley' do Guardião
        for (let i = -2; i <= 2; i++) shoot(base + i * 0.16, 'fx:fireball', { speed: 220, size: 13, trail: '#b875f0', dmgMul: 0.55 });
        game.sfx('fire');
    }
  }

  bossStrike(game, ang) {
    game.sfx('crit');
    game.camera.kick(8, 0.45);
    const p = game.player;
    if (this.bossKind === 'titan') {
      // pisão: onda de choque ao redor do chefe
      game.addEffect({ sprite: 'fx:shock', frames: 5, x: this.x, y: this.y - 4, life: 0.5, scale: 2.6 });
      game.particles.burst(this.x, this.y - 4, 30, { color: ['#8a8478', '#ff8a2a', '#ffffff'], speed: 170, life: 0.7 });
      if (!p.dead && Math.hypot(p.x - this.x, p.y - this.y) < 84) {
        game.hitPlayer(this.dmg(), { angle: Math.atan2(p.y - this.y, p.x - this.x), knock: 340 });
      }
      return;
    }
    const col = this.bossKind === 'spider' ? ['#b04ac8', '#e8e8f0', '#ffffff'] : this.bossKind === 'lich' ? ['#5ad8c0', '#e8ffff', '#ffffff'] : ['#b875f0', '#ff6ac9', '#ffffff'];
    game.addEffect({ sprite: 'fx:boom', frames: 5, x: this.x + Math.cos(ang) * 34, y: this.y - 6, life: 0.45, scale: 1.4 });
    game.particles.burst(this.x + Math.cos(ang) * 34, this.y - 6, 28, { color: col, speed: 160, life: 0.7 });
    if (!p.dead && Math.hypot(p.x - (this.x + Math.cos(ang) * 34), p.y - this.y) < 60) {
      game.hitPlayer(this.dmg(), { angle: ang, knock: 320 });
    }
  }

  // --- ataque corpo a corpo -------------------------------------------------
  doMelee(game, dist, ang, A, mul = 1) {
    const p = game.player;
    if (p.dead) return;
    if (dist < A.range + this.radius + p.radius + 8) {
      const dealt = game.hitPlayer(this.dmg() * mul, { angle: ang, knock: A.knock || 90 });
      if (dealt > 0 && this.d.thief && p.gold > 0) {
        const take = Math.min(p.gold, Math.round(6 + Math.random() * 10 + p.level * 1.5));
        p.gold -= take;
        this.stolen += take;
        game.float(p.x, p.y - 34, `-${take} ouro roubado!`, '#ffd85a', 7);
      }
      if (dealt > 0 && this.d.drain) {
        const heal = Math.round(dealt * 0.6);
        this.hp = Math.min(this.maxHp, this.hp + heal);
        game.particles.burst(this.x, this.y - 8, 6, { color: ['#7ad6c8', '#ffffff'], speed: 40, life: 0.4 });
      }
    }
    game.sfx('swing');
  }

  dmg() { return this.d.dmg * this.dmgMul; }

  // --- dano e morte ---------------------------------------------------------
  takeDamage(game, amount, opts = {}) {
    if (this.dead) return 0;
    this.hp -= amount;
    this.hurtFlash = 1;
    if (this.state === 'idle' || this.state === 'return') {
      this.state = 'chase';
      this.stateT = 0;
    }
    if (opts.knock && opts.angle !== undefined && !this.isBoss) {
      const k = opts.knock * (this.isElite ? 0.35 : 1);
      this.kx += Math.cos(opts.angle) * k;
      this.ky += Math.sin(opts.angle) * k;
    }
    if (opts.slow) this.applySlow(opts.slow, opts.slowTime || 2);
    if (opts.stun && !this.isBoss) this.stunT = Math.max(this.stunT, opts.stun);
    else if (opts.stun) this.applySlow(0.4, opts.stun);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathT = 0;
      game.onEnemyKilled(this, opts.from);
    }
    return amount;
  }

  draw(ctx, game) {
    if (this.dead) {
      const t = Math.min(1, this.deathT / 0.5);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(this.x, this.y + t * 4);
      ctx.scale(1 + t * 0.3, Math.max(0.2, 1 - t * 0.8));
      this.drawSprite(ctx, 0, 0, game);
      ctx.restore();
      return;
    }
    const alpha = this.spawnT > 0 ? 1 - this.spawnT / 0.35 : 1;
    ctx.globalAlpha = alpha;
    drawShadow(ctx, this.x, this.y, this.radius + 2);
    this.drawSprite(ctx, this.x, this.y, game);
    ctx.globalAlpha = 1;
    if (this.telegraph > 0 && this.state === 'windup') {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.stateT * 30) * 0.2;
      ctx.strokeStyle = '#ff4a4a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.bossKind === 'titan' && this.isBoss ? 84 : this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // barra de vida
    if (this.hp < this.maxHp && !this.isBoss) {
      const w = Math.max(16, this.radius * 2.4);
      const x = this.x - w / 2, y = this.y - this.spriteH() - 6;
      ctx.fillStyle = 'rgba(10,8,18,0.75)';
      ctx.fillRect(x - 1, y - 1, w + 2, 4);
      ctx.fillStyle = this.isElite ? '#c94a4a' : '#e05252';
      ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), 2);
    }
  }

  spriteH() {
    const spr = S(this.spriteKey());
    return spr ? spr.height : 20;
  }

  spriteKey() {
    if (FOUR_DIR.has(this.type)) return `${this.type}:${this.facing}:${this.frame}`;
    return `${this.type}:${this.frame}`;
  }

  drawSprite(ctx, x, y, game) {
    const key = this.spriteKey();
    let spr = S(key);
    if (!spr) spr = S(`${this.type}:0`);
    if (!spr) return;
    const flip = FLIP_RIGHT.has(this.type) && this.facing === 2;
    const squash = this.state === 'windup' ? 1 : 0;
    ctx.save();
    if (flip) {
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, -spr.width / 2, -spr.height + squash);
    } else {
      ctx.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height + squash));
    }
    ctx.restore();
    if (this.hurtFlash > 0.05) {
      const t = getTinted(key, '#ffffff');
      if (t) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.9, this.hurtFlash);
        if (flip) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(t, -t.width / 2, -t.height); }
        else ctx.drawImage(t, Math.round(x - t.width / 2), Math.round(y - t.height));
        ctx.restore();
      }
    }
    if (this.stunT > 0) {
      ctx.save();
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) {
        const a = (game.time * 5) + i * 2.1;
        ctx.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y - spr.height - 3 + Math.sin(a) * 2), 2, 2);
      }
      ctx.restore();
    }
    if (this.slowT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#7ad6ff';
      ctx.beginPath();
      ctx.arc(x, y - spr.height / 2, spr.width / 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
