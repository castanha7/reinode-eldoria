// ---------------------------------------------------------------------------
// player.js — o herói controlado pelo jogador
// ---------------------------------------------------------------------------
import { classById, baseStatsAt, xpForLevel, ROLL } from '../data/classes.js';
import { facingFromAngle, inCone, rollDamage, isCrit, mitigate } from './combat.js';
import { castSkill } from './abilities.js';
import { S, getTinted, drawShadow } from '../sprites.js';
import { clamp } from '../core/utils.js';
import { Input } from '../core/input.js';
import { sfx } from '../core/audio.js';
import { consumable, instantiate, getItem } from '../data/items.js';

const WEAPON_SPRITE = { mage: 'w:staff', knight: 'w:sword', archer: 'w:bow', assassin: 'w:dagger' };
const WEAPON_PIVOT = { mage: [11, 19], knight: [12, 20], archer: [12, 9], assassin: [8, 12] };

export class Player {
  constructor(classId) {
    this.cls = classById(classId);
    this.isPlayer = true;
    this.level = 1;
    this.xp = 0;
    this.gold = 30;
    this.equip = { weapon: null, armor: null, trinket: null };
    this.inventory = [consumable('potion_hp'), consumable('potion_hp'), consumable('potion_mana')];
    this.weaponUpgrades = 0;
    this.kills = 0;
    this.deaths = 0;
    this.lives = 1;
    this.maxLives = 1;
    this.chestsOpened = 0;

    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.radius = 6;
    this.facing = 0;
    this.animT = 0;
    this.frame = 0;
    this.moving = false;
    this.aimAngle = 0;

    this.atkTimer = 0;
    this.swing = 0;
    this.skillCd = [0, 0, 0, 0];
    this.rollCd = 0;
    this.rollT = 0;
    this.rollDir = 0;
    this.webbedT = 0;
    this.iframe = 0;
    this.hurtFlash = 0;
    this.buffs = [];
    this.slowT = 0;
    this.dashVX = 0;
    this.dashVY = 0;
    this.dashT = 0;
    this.dead = false;
    this.respawnT = 0;
    this.pendingLevelUps = 0;

    this.recompute();
    this.hp = this.maxHp;
    this.mana = this.maxMana;
  }

  // --- atributos -----------------------------------------------------------
  recompute() {
    const base = baseStatsAt(this.cls.id, this.level);
    const s = {
      hp: base.hp, mana: base.mana, atk: base.atk, def: base.def, speed: base.speed,
      range: base.range, atkSpeed: base.atkSpeed, manaRegen: base.manaRegen,
      crit: base.crit, critDmg: base.critDmg, projSpeed: base.projSpeed,
      cdRed: 0, lifesteal: 0, aoe: 0, dodge: 0, hpRegen: 0, goldFind: 0,
    };
    for (const slot of ['weapon', 'armor', 'trinket']) {
      const it = this.equip[slot];
      if (!it) continue;
      for (const [k, v] of Object.entries(it.stats)) s[k] = (s[k] || 0) + v;
    }
    // reforços do ferreiro
    s.atk *= 1 + this.weaponUpgrades * 0.08;
    s.range *= 1 + this.weaponUpgrades * 0.04;
    // buffs temporários (elixires)
    const pct = {};
    for (const b of this.buffs) {
      for (const [k, v] of Object.entries(b.mods || {})) pct[k] = (pct[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(pct)) {
      if (s[k] !== undefined) s[k] *= 1 + v;
    }
    // bônus fixos (somados, não percentuais)
    for (const b of this.buffs) {
      for (const [k, v] of Object.entries(b.flat || {})) s[k] = (s[k] || 0) + v;
    }
    s.hp = Math.max(10, Math.round(s.hp));
    s.mana = Math.max(0, Math.round(s.mana));
    s.speed = Math.max(40, s.speed);
    s.atkSpeed = Math.max(0.4, s.atkSpeed);
    s.crit = clamp(s.crit, 0, 0.85);
    s.cdRed = clamp(s.cdRed, 0, 0.6);
    s.dodge = clamp(s.dodge, 0, 0.6);
    s.goldFind = clamp(s.goldFind, 0, 1);
    const prevMax = this.maxHp;
    this.stats = s;
    this.maxHp = s.hp;
    this.maxMana = s.mana;
    if (prevMax !== undefined && prevMax !== this.maxHp) {
      this.hp = clamp(this.hp, 0, this.maxHp);
    }
    this.hp = Math.min(this.hp === undefined ? this.maxHp : this.hp, this.maxHp);
    this.mana = Math.min(this.mana === undefined ? this.maxMana : this.mana, this.maxMana);
  }

  get xpNeed() { return xpForLevel(this.level); }
  get xpFrac() { return clamp(this.xp / this.xpNeed, 0, 1); }

  skillCost(i) {
    const sk = this.cls.skills[i];
    return sk ? sk.cost : 0;
  }
  skillCooldown(i) {
    const sk = this.cls.skills[i];
    if (!sk) return 0;
    return sk.cd * (1 - this.stats.cdRed);
  }
  skillUnlocked(i) {
    const sk = this.cls.skills[i];
    return !!sk && this.level >= sk.level;
  }
  /** Multiplicador de dano da habilidade conforme o nível do jogador. */
  skillScale(i) {
    const sk = this.cls.skills[i];
    if (!sk) return 1;
    const over = Math.max(0, this.level - sk.level);
    return 1 + over * (sk.params.scale || 0.1);
  }

  // --- inventário ----------------------------------------------------------
  addItem(item) {
    if (this.inventory.length >= 26) return false;
    this.inventory.push(item);
    return true;
  }
  removeItem(uid) {
    const i = this.inventory.findIndex((it) => it.uid === uid);
    if (i < 0) return null;
    return this.inventory.splice(i, 1)[0];
  }
  equipItem(uid) {
    const it = this.inventory.find((x) => x.uid === uid);
    if (!it || !it.slot) return false;
    if (it.cls !== this.cls.id) return false;
    const cur = this.equip[it.slot];
    this.removeItem(uid);
    this.equip[it.slot] = it;
    if (cur) this.addItem(cur);
    this.recompute();
    sfx('ui');
    return true;
  }
  addBuff(game, b) {
    this.buffs = this.buffs.filter((x) => x.id !== b.id);
    this.buffs.push({ ...b });
    this.recompute();
    if (game && b.name) game.float(this.x, this.y - 34, b.name, b.color || '#ffe066', 7);
  }
  useItem(uid, game) {
    const it = this.inventory.find((x) => x.uid === uid);
    if (!it || it.kind !== 'consumable') return false;
    // não desperdiça poção sem efeito
    if ((it.heal || it.mana) && !it.buff && !it.effect) {
      const needHp = it.heal && this.hp < this.maxHp - 0.5;
      const needMp = it.mana && this.mana < this.maxMana - 0.5;
      if (!needHp && !needMp) {
        game.notify(it.heal && it.mana ? 'Vida e mana já estão cheias.' : it.heal ? 'Sua vida já está cheia.' : 'Sua mana já está cheia.', '#9a9ab0');
        sfx('deny');
        return false;
      }
    }
    if (it.effect === 'life') {
      if (!game.useFeather()) return false;
    } else if (it.effect === 'town') {
      if (!game.townPortal()) return false;
    } else if (it.effect === 'thunder') {
      game.castThunder();
    }
    if (it.heal) {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + it.heal);
      game.float(this.x, this.y - 24, '+' + Math.round(this.hp - before), '#7ae88a', 8);
      game.particles.burst(this.x, this.y - 8, 10, { color: ['#7ae88a', '#d8ffd8'], speed: 40, life: 0.5 });
    }
    if (it.mana) {
      const before = this.mana;
      this.mana = Math.min(this.maxMana, this.mana + it.mana);
      game.float(this.x, this.y - 30, '+' + Math.round(this.mana - before), '#7ab6ff', 8);
      game.particles.burst(this.x, this.y - 8, 10, { color: ['#7ab6ff', '#d8ecff'], speed: 40, life: 0.5 });
    }
    if (it.buffFlat) {
      const flat = {};
      for (const k of Object.keys(it.buffFlat)) if (k !== 'time') flat[k] = it.buffFlat[k];
      this.addBuff(game, { id: it.id, name: it.name, time: it.buffFlat.time, mods: {}, flat, color: it.color });
      game.notify(`${it.name}: ${it.desc}`, it.color);
    }
    if (it.buff) {
      const mods = {};
      for (const k of Object.keys(it.buff)) if (k !== 'time') mods[k] = it.buff[k];
      this.buffs = this.buffs.filter((b) => b.id !== it.id);
      this.buffs.push({ id: it.id, name: it.name, time: it.buff.time, mods, color: it.color });
      this.recompute();
      game.notify(`${it.name}: ${Object.keys(mods).map((k) => `+${Math.round(mods[k] * 100)}% ${k}`).join(', ')}`, it.color);
    }
    sfx('heal');
    this.removeItem(uid);
    return true;
  }

  gainXp(n, game) {
    this.xp += n;
    let ups = 0;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      ups++;
    }
    if (ups) {
      const before = { hp: this.stats.hp, atk: this.stats.atk };
      this.recompute();
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      game.onLevelUp(ups);
      for (const sk of this.cls.skills) {
        if (this.level === sk.level) {
          game.notify(`Nova habilidade: ${sk.name}!`, '#ffe066');
          sfx('quest');
        }
      }
    }
  }

  // --- atualização ---------------------------------------------------------
  update(dt, game) {
    if (this.dead) {
      this.respawnT -= dt;
      return;
    }
    // timers
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    for (let i = 0; i < this.skillCd.length; i++) this.skillCd[i] = Math.max(0, this.skillCd[i] - dt);
    this.rollCd = Math.max(0, this.rollCd - dt);
    this.webbedT = Math.max(0, this.webbedT - dt);
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      this.buffs[i].time -= dt;
      if (this.buffs[i].time <= 0) {
        game.notify(`${this.buffs[i].name} terminou.`, '#9a9ab0');
        this.buffs.splice(i, 1);
        this.recompute();
      }
    }
    // regeneração
    this.mana = Math.min(this.maxMana, this.mana + this.stats.manaRegen * dt);
    if (!game.inCombat(3)) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.012 * dt * game.regenMul());
    if (this.stats.hpRegen > 0) this.hp = Math.min(this.maxHp, this.hp + this.stats.hpRegen * dt);

    // --- movimento ---
    const ax = Input.axis();
    let mx = ax.x, my = ax.y;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    this.moving = len > 0.05;
    const analog = Math.min(1, len);

    // rolamento (esquiva) em andamento
    if (this.rollT > 0) {
      this.rollT -= dt;
      const p = game.map.move(this.x, this.y, Math.cos(this.rollDir) * ROLL.speed * dt, Math.sin(this.rollDir) * ROLL.speed * dt, this.radius);
      this.x = p.x; this.y = p.y;
      if (game.particles.list.length < 400) {
        game.particles.spawn({ x: this.x, y: this.y - 4, life: 0.35, size: 3, color: '#e8dcc0', kind: 'fade', drag: 3 });
      }
    } else if (this.dashT > 0) {
      this.dashT -= dt;
      const p = game.map.move(this.x, this.y, this.dashVX * dt, this.dashVY * dt, this.radius);
      this.x = p.x; this.y = p.y;
      if (game.particles.list.length < 400) {
        game.particles.spawn({ x: this.x, y: this.y - 8, life: 0.3, size: 4, color: this.cls.color, kind: 'fade', drag: 3 });
      }
    } else {
      const sp = this.stats.speed * (this.slowT > 0 ? 0.55 : 1) * (this.webbedT > 0 ? 0.5 : 1)
        * game.map.speedMulAt(this.x, this.y) * (analog > 0 ? Math.max(0.45, analog) : 1);
      const p = game.map.move(this.x, this.y, mx * sp * dt, my * sp * dt, this.radius);
      this.x = p.x; this.y = p.y;
      if (this.moving && Math.random() < dt * 6) {
        game.particles.spawn({ x: this.x, y: this.y, life: 0.3, size: 2, color: '#b9a882', drag: 4 });
      }
    }
    this.slowT = Math.max(0, this.slowT - dt);

    // limites do mapa
    this.x = clamp(this.x, 8, game.map.pxW - 8);
    this.y = clamp(this.y, 8, game.map.pxH - 8);

    // --- mira ---
    if (Input.touch.enabled) {
      // celular: mira automática no inimigo mais próximo (ou direção arrastada no botão de ataque)
      const t = Input.touch;
      let ang = t.aim !== null ? t.aim : null, dd = 120;
      if (ang === null) {
        const tg = game.nearestEnemy(this.x, this.y, 300 + (this.stats.range || 0) * 0.5);
        if (tg) { ang = Math.atan2(tg.y - 8 - (this.y - 10), tg.x - this.x); dd = Math.max(30, Math.hypot(tg.x - this.x, tg.y - this.y)); }
        else if (this.moving) ang = Math.atan2(my, mx);
        else ang = this.aimAngle;
      }
      this.aimAngle = ang;
      game.mouseWorld = { x: this.x + Math.cos(ang) * dd, y: this.y - 8 + Math.sin(ang) * dd };
    } else {
      const w = game.camera.toWorld(Input.mouse.x, Input.mouse.y);
      game.mouseWorld = w;
      this.aimAngle = Math.atan2(w.y - (this.y - 10), w.x - this.x);
    }
    if (this.moving) this.facing = facingFromAngle(Math.atan2(my, mx));
    else this.facing = facingFromAngle(this.aimAngle);

    // animação de caminhada
    if (this.moving) {
      this.animT += dt * (this.stats.speed / 34);
      this.frame = Math.floor(this.animT) % 4;
    } else {
      this.frame = 0;
      this.animT = 0;
    }

    // --- ataque básico ---
    const firing = Input.mouse.down || (Input.touch.enabled && Input.touch.fire);
    if (firing && this.atkTimer <= 0 && this.rollT <= 0 && !game.uiBlocking()) {
      this.basicAttack(game);
    }
    // --- habilidades ---
    if (!game.uiBlocking()) {
      // rolamento / esquiva
      if (Input.hit('Space') && this.rollCd <= 0 && this.rollT <= 0) this.roll(game, mx, my);
      for (let i = 0; i < this.cls.skills.length; i++) {
        if (Input.hit('Digit' + (i + 1))) {
          if (!this.skillUnlocked(i)) {
            game.notify(`Habilidade bloqueada — desbloqueia no nível ${this.cls.skills[i].level}.`, '#c96a6a');
            sfx('deny');
          } else if (this.skillCd[i] > 0) {
            sfx('deny');
          } else if (this.mana < this.cls.skills[i].cost) {
            game.notify(`${this.cls.resource} insuficiente!`, '#7ab6ff');
            sfx('deny');
          } else {
            this.cast(game, i);
          }
        }
      }
      // poção rápida
      if (Input.hit('KeyR')) {
        const pot = this.inventory.find((it) => it.kind === 'consumable' && it.heal);
        if (pot) this.useItem(pot.uid, game);
        else { game.notify('Sem poções de vida.', '#c96a6a'); sfx('deny'); }
      }
    }
  }

  roll(game, mx, my) {
    this.rollDir = (mx || my) ? Math.atan2(my, mx) : this.aimAngle + Math.PI;
    this.rollT = ROLL.distance / ROLL.speed;
    this.rollCd = ROLL.cd;
    this.iframe = Math.max(this.iframe, ROLL.iframes);
    this.dashT = 0;
    this.facing = facingFromAngle(this.rollDir);
    sfx('dash');
    game.particles.burst(this.x, this.y - 4, 8, { color: ['#e8dcc0', '#b9a882'], speed: 50, life: 0.35 });
  }

  cast(game, i) {
    const sk = this.cls.skills[i];
    this.mana -= sk.cost;
    this.skillCd[i] = this.skillCooldown(i);
    castSkill(game, this, i, sk);
  }

  basicAttack(game) {
    const a = this.cls.attack;
    this.atkTimer = 1 / this.stats.atkSpeed;
    this.swing = 0.22;
    if (a.kind === 'melee') {
      sfx(a.sound);
      const range = this.stats.range;
      const arc = a.arc;
      game.addEffect({
        sprite: 'fx:slash', frames: 3, x: this.x, y: this.y - 10, rot: this.aimAngle,
        life: 0.18, scale: range / 22,
      });
      let hitAny = false;
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (inCone(this.x, this.y - 6, this.aimAngle, arc / 2, e.x, e.y - 6, range, e.radius)) {
          game.hitEnemy(e, this.stats.atk * a.dmgMul, { from: this, crit: isCrit(this.stats.crit), critDmg: this.stats.critDmg, knock: 90, angle: this.aimAngle, lifesteal: this.stats.lifesteal });
          hitAny = true;
        }
      }
      if (hitAny) game.camera.kick(1.2, 0.1);
    } else {
      sfx(a.sound);
      game.spawnProjectile({
        x: this.x + Math.cos(this.aimAngle) * 8,
        y: this.y - 10 + Math.sin(this.aimAngle) * 8,
        angle: this.aimAngle,
        speed: (this.stats.projSpeed || a.speed),
        dmg: this.stats.atk * a.dmgMul,
        from: this,
        sprite: a.sprite,
        size: a.size,
        life: this.stats.range / Math.max(60, this.stats.projSpeed || a.speed) + 0.25,
        crit: isCrit(this.stats.crit),
        critDmg: this.stats.critDmg,
        lifesteal: this.stats.lifesteal,
      });
    }
  }

  // --- dano ----------------------------------------------------------------
  takeDamage(game, raw, opts = {}) {
    if (this.dead) return 0;
    if (this.iframe > 0) return 0;
    if (opts.web) { this.webbedT = Math.max(this.webbedT, opts.web); }
    if (Math.random() < this.stats.dodge) {
      game.float(this.x, this.y - 26, 'ESQUIVA', '#9ae8ff', 7);
      return 0;
    }
    const dmg = Math.max(1, mitigate(raw, this.stats.def));
    this.hp -= dmg;
    if (opts.slowPlayer) this.slowT = Math.max(this.slowT, opts.slowPlayer);
    this.hurtFlash = 1;
    this.iframe = 0.45;
    game.lastDamageTaken = game.time;
    game.float(this.x, this.y - 26, '-' + Math.round(dmg), '#ff6a6a', 8);
    game.particles.burst(this.x, this.y - 10, 8, { color: ['#c92a2a', '#ff6a6a'], speed: 70, life: 0.4 });
    game.camera.kick(3, 0.22);
    sfx('hurt');
    if (opts.knock && opts.angle !== undefined) {
      this.dashT = 0.12;
      this.dashVX = Math.cos(opts.angle) * opts.knock;
      this.dashVY = Math.sin(opts.angle) * opts.knock;
    }
    if (this.hp <= 0) this.die(game);
    return dmg;
  }

  die(game) {
    this.hp = 0;
    this.dead = true;
    this.respawnT = 4;
    this.deaths++;
    this.rollT = 0; this.dashT = 0;
    sfx('die');
    game.camera.kick(6, 0.6);
    game.particles.burst(this.x, this.y - 10, 26, { color: ['#c92a2a', '#8a1a1a', '#ffffff'], speed: 110, life: 0.9 });
    game.onPlayerDeath();
  }

  respawn(game) {
    this.dead = false;
    this.buffs = [];
    this.slowT = 0; this.webbedT = 0;
    this.dashT = 0; this.dashVX = 0; this.dashVY = 0; this.rollT = 0;
    this.skillCd = this.skillCd.map(() => 0);
    this.recompute();
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.iframe = 2;
    const lost = game.mode === 'normal' ? Math.round(this.gold * 0.15) : Math.round(this.gold * 0.1);
    this.gold = Math.max(0, this.gold - lost);
    game.loadMap('overworld', { x: game.maps.overworld.spawn.x, y: game.maps.overworld.spawn.y });
    game.notify(`Você acordou na cidade. Perdeu ${lost} de ouro.`, '#c96a6a');
  }

  // --- desenho -------------------------------------------------------------
  draw(ctx, game) {
    if (this.dead) return;
    const key = `hero:${this.cls.id}:${this.facing}:${this.frame}`;
    const spr = S(key);
    if (!spr) return;
    const bob = this.swing > 0 ? -1 : 0;
    drawShadow(ctx, this.x, this.y, 8);
    const y = this.y - spr.height + bob;
    ctx.drawImage(spr, Math.round(this.x - spr.width / 2), Math.round(y));
    if (this.hurtFlash > 0.05) {
      const t = getTinted(key, '#ff8a8a');
      if (t) {
        ctx.globalAlpha = Math.min(0.85, this.hurtFlash);
        ctx.drawImage(t, Math.round(this.x - spr.width / 2), Math.round(y));
        ctx.globalAlpha = 1;
      }
    }
    // arma
    const wspr = S(WEAPON_SPRITE[this.cls.id]);
    if (wspr) {
      const [px0, py0] = WEAPON_PIVOT[this.cls.id];
      const hx = this.x + Math.cos(this.aimAngle) * 5;
      const hy = this.y - 11 + Math.sin(this.aimAngle) * 4;
      let ang = this.aimAngle + Math.PI / 2;
      if (this.cls.attack.kind === 'melee' && this.swing > 0) {
        const t = 1 - this.swing / 0.22;
        ang += (-1.1 + t * 2.4) * (this.facing === 1 ? -1 : 1);
      }
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      ctx.drawImage(wspr, -px0, -py0);
      if (this.cls.id === 'assassin') {
        ctx.rotate(-0.5);
        ctx.drawImage(wspr, -px0 - 5, -py0 + 3);
      }
      ctx.restore();
    }
  }
}
