// ---------------------------------------------------------------------------
// game.js — orquestrador: loop, mundo, combate, progressão e save
// ---------------------------------------------------------------------------
import { GameMap, TS } from '../world/map.js';
import { generateOverworld, generateDungeon, generateThrone } from '../world/mapgen.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Projectile, TimedEffect } from './projectile.js';
import { Npc, Chest } from './npc.js';
import { FloatTexts, rollDamage, isCrit } from './combat.js';
import { Particles } from '../core/particles.js';
import { Camera } from '../core/camera.js';
import { Input } from '../core/input.js';
import { sfx as playSfx } from '../core/audio.js';
import { enemyDef, pickSpawn, REGION_SPAWNS } from '../data/enemies.js';
import { QUESTS, questById, enemyTags } from '../data/quests.js';
import { rollEquipment, consumable, shopStock, instantiate } from '../data/items.js';
import { drawHud, drawMinimap } from '../ui/hud.js';
import { S } from '../sprites.js';
import { clamp } from '../core/utils.js';

const SAVE_KEY = 'eldoria_save_v1';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ui = ui;
    this.camera = new Camera();
    this.particles = new Particles();
    this.floats = new FloatTexts();
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.abilityFx = [];
    this.toasts = [];
    this.time = 0;
    this.state = 'title';
    this.mouseWorld = { x: 0, y: 0 };
    this.lastDamageTaken = -99;
    this.lastDamageDealt = -99;
    this.maps = {};
    this.mapData = {};
    this.map = null;
    this.player = null;
    this.zoneName = '';
    this.zoneFade = 0;
    this.boss = null;
    this.spawnTimer = 1;
    this.stats = { kills: 0, chests: 0, gold: 0, time: 0, deaths: 0 };
    this.ui.setGame(this);
  }

  // =========================================================================
  // ciclo de vida
  // =========================================================================
  init() {
    this.buildMaps();
    // cena de fundo animada atrás da tela de título
    this.player = new Player('knight');
    const sp = this.maps.overworld.spawn;
    this.loadMap('overworld', sp, true);
    this.state = 'title';
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildMaps() {
    this.maps = {
      overworld: new GameMap(generateOverworld(20260828)),
      dungeon: new GameMap(generateDungeon(777)),
      throne: new GameMap(generateThrone()),
    };
    for (const id of Object.keys(this.maps)) this.mapData[id] = { npcs: [], chests: [], enemies: [], spawned: false };
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.viewScale = w / window.innerWidth;
    this.camera.resize(w, h, 3 * this.viewScale);
    this.screenW = w;
    this.screenH = h;
    if (!this.lightCanvas || this.lightCanvas.width !== w || this.lightCanvas.height !== h) {
      this.lightCanvas = document.createElement('canvas');
      this.lightCanvas.width = w;
      this.lightCanvas.height = h;
      this.lightCtx = this.lightCanvas.getContext('2d');
    }
  }

  startRun(classId) {
    this.player = new Player(classId);
    const sp = this.maps.overworld.spawn;
    this.player.x = sp.x;
    this.player.y = sp.y;
    this.quests = {};
    for (const q of QUESTS) this.quests[q.id] = { state: 'available', progress: 0 };
    this.quests[QUESTS[0].id].state = 'active';
    this.stats = { kills: 0, chests: 0, gold: 0, time: 0, deaths: 0 };
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.abilityFx = [];
    this.particles.clear();
    this.floats.clear();
    this.loadMap('overworld', sp, true);
    this.state = 'playing';
    this.ui.closeAll();
    this.notify(`${this.player.cls.name} — ${this.player.cls.tagline}`, this.player.cls.color);
    this.notify('WASD move • Mouse mira e ataca • 1/2/3 habilidades • E interage • I inventário', '#c9c9d4');
  }

  loadMap(id, pos, snap) {
    const map = this.maps[id];
    if (!map) return;
    this.map = map;
    const data = this.mapData[id];
    if (!data.spawned) {
      data.spawned = true;
      for (const e of map.entities) {
        const x = e.tx * TS + 8, y = e.ty * TS + 16;
        if (e.type === 'npc') data.npcs.push(new Npc(e.npcId, x, y, e.face || 0));
        else if (e.type === 'chest') {
          const c = new Chest(x, y, e.tier, { secret: e.secret, bossChest: e.bossChest });
          c.key = `${id}:${e.tx},${e.ty}`;
          data.chests.push(c);
        } else if (e.type === 'enemy') {
          const en = new Enemy(e.enemy, x, y, { hpMul: 1, dmgMul: 1 });
          en.mapId = id;
          en.static = true;
          data.enemies.push(en);
        }
      }
    }
    this.enemies = data.enemies.filter((e) => !e.dead);
    this.npcs = data.npcs;
    this.chests = data.chests;
    this.projectiles = [];
    this.effects = [];
    this.abilityFx = [];
    if (pos) {
      this.player.x = pos.x;
      this.player.y = pos.y;
    }
    this.camera.snap(this.player.x, this.player.y, { w: map.pxW, h: map.pxH });
    this.boss = null;
    this.ui.setMapName(map.name);
  }

  // =========================================================================
  // loop
  // =========================================================================
  frame(dt) {
    this.time += dt;
    if (this.state === 'playing') {
      this.stats.time += dt;
      this.updatePlaying(dt);
    } else if (this.state === 'title' && this.map) {
      this.camera.x += 9 * dt;
      if (this.camera.x > this.map.pxW - this.camera.vw) this.camera.x = 0;
      this.camera.y = this.map.pxH * 0.55;
    }
    this.render();
    Input.endFrame();
  }

  updatePlaying(dt) {
    const p = this.player;
    p.update(dt, this);
    if (p.dead) {
      p.respawnT -= 0;
      if (p.respawnT <= 0) this.respawnPlayer();
    }

    for (const e of this.enemies) e.update(dt, this);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead && e.deathT > 0.6) {
        this.enemies.splice(i, 1);
        const d = this.mapData[this.map.id];
        const di = d.enemies.indexOf(e);
        if (di >= 0) d.enemies.splice(di, 1);
      }
    }

    for (const n of this.npcs) n.update(dt, this);
    for (const c of this.chests) c.update(dt, this);

    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].update(dt);
      if (this.effects[i].dead) this.effects.splice(i, 1);
    }
    for (let i = this.abilityFx.length - 1; i >= 0; i--) {
      if (!this.abilityFx[i].update(dt, this)) this.abilityFx.splice(i, 1);
    }

    this.particles.update(dt);
    this.floats.update(dt);
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].life -= dt;
      if (this.toasts[i].life <= 0) this.toasts.splice(i, 1);
    }
    this.zoneFade = Math.max(0, this.zoneFade - dt);

    this.camera.follow(p.x, p.y - 8, dt, { w: this.map.pxW, h: this.map.pxH });

    // zona atual
    const z = this.map.zoneAt(p.x, p.y);
    const zn = z ? z.name : this.map.name;
    if (zn !== this.zoneName) {
      this.zoneName = zn;
      this.zoneFade = 3;
      if (z && z.secret) this.notify(`Área secreta descoberta: ${z.name}!`, '#b875f0');
    }

    this.boss = this.enemies.find((e) => e.isBoss && !e.dead) || null;

    // spawn dinâmico no mundo aberto
    if (this.map.id === 'overworld') this.dynamicSpawn(dt);

    // interação
    if (!this.uiBlocking() && Input.hit('KeyE')) this.interact();
  }

  dynamicSpawn(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 1.6;
    const cap = 26;
    if (this.enemies.length >= cap) return;
    const zones = this.map.spawnZones || [];
    if (!zones.length) return;
    const z = zones[(Math.random() * zones.length) | 0];
    for (let attempt = 0; attempt < 14; attempt++) {
      const tx = z.x + ((Math.random() * z.w) | 0);
      const ty = z.y + ((Math.random() * z.h) | 0);
      if (this.map.isSolidTile(tx, ty)) continue;
      const x = tx * TS + 8, y = ty * TS + 8;
      const d = Math.hypot(x - this.player.x, y - this.player.y);
      if (d < 300 || d > 900) continue;
      const type = pickSpawn(Math.random, z.region);
      this.spawnEnemy(type, x, y);
      return;
    }
  }

  spawnEnemy(type, x, y, opts = {}) {
    const lvl = this.player ? this.player.level : 1;
    const hpMul = (opts.hpMul || 1) * (1 + Math.max(0, lvl - 4) * 0.07);
    const dmgMul = (opts.dmgMul || 1) * (1 + Math.max(0, lvl - 4) * 0.045);
    const e = new Enemy(type, x, y, { hpMul, dmgMul });
    e.mapId = this.map.id;
    this.enemies.push(e);
    this.mapData[this.map.id].enemies.push(e);
    return e;
  }

  // =========================================================================
  // combate
  // =========================================================================
  spawnProjectile(o) {
    const pr = new Projectile(o);
    this.projectiles.push(pr);
    return pr;
  }
  addEffect(o) {
    const fx = new TimedEffect(o);
    this.effects.push(fx);
    return fx;
  }
  addFx(fx) {
    this.abilityFx.push(fx);
    return fx;
  }
  float(x, y, text, color, size, opts) {
    this.floats.add(x, y, text, color, size, opts);
  }
  sfx(name) { playSfx(name); }

  hitEnemy(e, rawDmg, opts = {}) {
    if (e.dead) return 0;
    const crit = opts.crit !== undefined ? opts.crit : false;
    let dmg = rollDamage(rawDmg, e.defense, 1, 0.1);
    if (crit) dmg *= opts.critDmg || 1.8;
    dmg = Math.max(1, Math.round(dmg));
    this.float(e.x, e.y - e.radius * 2 - 8, String(dmg), crit ? '#ffe066' : '#ffffff', crit ? 9 : 7, { crit });
    this.particles.burst(e.x, e.y - 8, crit ? 12 : 7, {
      color: crit ? ['#ffe066', '#ffffff', '#ff9a2a'] : ['#e0e0f0', '#a0a0c0'],
      speed: crit ? 120 : 70, life: 0.35,
    });
    this.sfx(crit ? 'crit' : 'hit');
    this.lastDamageDealt = this.time;
    if (opts.lifesteal && opts.from && opts.from.isPlayer) {
      const heal = dmg * opts.lifesteal;
      opts.from.hp = Math.min(opts.from.maxHp, opts.from.hp + heal);
      if (heal > 1.5) this.float(opts.from.x, opts.from.y - 30, '+' + Math.round(heal), '#7ae88a', 6);
    }
    e.takeDamage(this, dmg, opts);
    return dmg;
  }

  hitPlayer(rawDmg, opts = {}) {
    if (!this.player || this.player.dead) return 0;
    return this.player.takeDamage(this, rawDmg, opts);
  }

  aoeDamage(x, y, radius, dmg, opts = {}) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (opts.except && opts.except.has(e.uid)) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > radius + e.radius) continue;
      const ang = Math.atan2(e.y - y, e.x - x);
      this.hitEnemy(e, dmg, { ...opts, angle: ang, knock: opts.knock || 90 });
    }
  }

  onEnemyKilled(e, from) {
    this.sfx('kill');
    this.stats.kills++;
    if (this.player) this.player.kills++;
    const lvl = this.player ? this.player.level : 1;
    const xp = Math.round(e.d.xp * (1 + Math.max(0, lvl - 4) * 0.05));
    const gold = Math.round((e.d.gold[0] + Math.random() * (e.d.gold[1] - e.d.gold[0])) * (1 + Math.max(0, lvl - 4) * 0.04));
    this.player.gainXp(xp, this);
    this.player.gold += gold;
    this.stats.gold += gold;
    this.float(e.x, e.y - 20, `+${xp} XP`, '#9ae8ff', 7);
    this.float(e.x + 8, e.y - 12, `+${gold} ouro`, '#ffd85a', 6);
    this.particles.burst(e.x, e.y - 8, 20, {
      color: [e.d.color, '#ffffff', shadeOf(e.d.color, -0.3)], speed: 110, life: 0.7,
    });
    // drops
    for (const drop of e.d.drops || []) {
      if (Math.random() < drop.chance) {
        const it = consumable(drop.id);
        if (this.player.addItem(it)) this.notify(`Saque: ${it.name}`, '#9ae8ff');
      }
    }
    if (e.isElite || e.isBoss) {
      const tier = e.isBoss ? 4 : 3;
      const it = rollEquipment(Math.random, this.player.cls.id, tier);
      if (this.player.addItem(it)) this.showLoot(it, e.isBoss ? 'Espólio do chefe' : 'Espólio de elite');
    }
    if (e.isBoss) {
      this.notify(`${e.d.name} foi derrotado!`, '#ffd85a');
      this.camera.kick(9, 1.2);
      this.particles.burst(e.x, e.y - 20, 70, { color: ['#b875f0', '#ffd85a', '#ffffff'], speed: 220, life: 1.4 });
      for (const c of this.chests) if (c.bossChest && !c.opened) this.notify('Um baú se revelou na sala do chefe!', '#ffd85a');
    }
    this.progressQuests(e);
    this.save();
  }

  progressQuests(e) {
    const tags = enemyTags(e.d);
    for (const q of QUESTS) {
      const st = this.quests[q.id];
      if (!st || st.state !== 'active') continue;
      if (q.goal.type !== 'kill') continue;
      if (tags.indexOf(q.goal.tag) < 0) continue;
      st.progress++;
      if (st.progress >= q.goal.count) {
        st.state = 'done';
        this.notify(`Missão concluída: ${q.name} — fale com o Rei!`, '#ffd85a');
        this.sfx('quest');
      } else {
        this.notify(`${q.name}: ${st.progress}/${q.goal.count}`, '#c9c9d4');
      }
    }
  }

  onLevelUp(ups) {
    this.sfx('levelup');
    this.notify(`Nível ${this.player.level}! Atributos aumentados.`, '#ffd85a');
    this.float(this.player.x, this.player.y - 34, 'NÍVEL ' + this.player.level, '#ffd85a', 11, { life: 1.4 });
    this.addEffect({ sprite: 'fx:ring', frames: 5, x: this.player.x, y: this.player.y - 8, life: 0.6, scale: 2 });
    this.particles.burst(this.player.x, this.player.y - 10, 40, { color: ['#ffd85a', '#fff2c0', '#ffffff'], speed: 130, life: 1.1 });
    this.camera.kick(3, 0.4);
    this.save();
  }

  onPlayerDeath() {
    this.stats.deaths++;
    this.ui.showDeath();
  }

  respawnPlayer() {
    this.ui.hideDeath();
    this.player.respawn(this);
    this.save();
  }

  inCombat(sec = 4) {
    return this.time - this.lastDamageTaken < sec || this.time - this.lastDamageDealt < 1.2;
  }

  // =========================================================================
  // interação
  // =========================================================================
  interact() {
    const p = this.player;
    // saída / portal
    for (const ex of this.map.exits) {
      if (Math.hypot(ex.x - p.x, ex.y - p.y) < ex.r + 10) {
        this.travel(ex);
        return;
      }
    }
    for (const c of this.chests) {
      if (c.near) { c.open(this); return; }
    }
    let best = null, bd = 40;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best) { this.ui.openNpc(best); return; }
  }

  travel(ex) {
    this.sfx('ui');
    if (ex.target === 'overworld' && ex.label === 'Saída') {
      this.loadMap('overworld', ex.spawn);
    } else {
      const target = this.maps[ex.target];
      this.loadMap(ex.target, { x: target.spawn.x, y: target.spawn.y });
    }
    this.particles.burst(this.player.x, this.player.y - 8, 24, { color: ['#8a5aff', '#ffffff'], speed: 110, life: 0.8 });
    this.notify(this.map.name, '#c9c9d4');
  }

  // =========================================================================
  // UI helpers
  // =========================================================================
  uiBlocking() {
    return this.ui.blocking || this.state !== 'playing';
  }

  notify(text, color = '#c9c9d4') {
    this.toasts.push({ text, color, life: 4, max: 4 });
    if (this.toasts.length > 5) this.toasts.shift();
    this.ui.pushToast(text, color);
  }

  showLoot(item, source) {
    this.ui.showLoot(item, source);
  }

  giveQuestRewards(q) {
    const p = this.player;
    p.gold += q.reward.gold;
    this.stats.gold += q.reward.gold;
    p.gainXp(q.reward.xp, this);
    this.notify(`Recompensa: ${q.reward.gold} ouro, ${q.reward.xp} XP`, '#ffd85a');
    if (q.reward.item) {
      const tier = { rare: 2, epic: 3, legendary: 4 }[q.reward.item] || 1;
      const it = rollEquipment(Math.random, p.cls.id, tier);
      if (p.addItem(it)) this.showLoot(it, 'Recompensa real');
    }
    this.sfx('quest');
  }

  // =========================================================================
  // desenho
  // =========================================================================
  render() {
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0a12';
    ctx.fillRect(0, 0, this.screenW, this.screenH);
    if (!this.map || !this.player) return;

    cam.apply(ctx);
    this.map.drawGround(ctx, cam, this.time);

    // ordena por Y: objetos altos + entidades
    const drawList = [];
    for (const o of this.map.visibleObjects(cam)) drawList.push({ y: o.y, kind: 'obj', ref: o });
    for (const e of this.enemies) if (cam.visible(e.x, e.y, 80)) drawList.push({ y: e.y, kind: 'enemy', ref: e });
    for (const n of this.npcs) if (cam.visible(n.x, n.y, 60)) drawList.push({ y: n.y, kind: 'npc', ref: n });
    for (const c of this.chests) if (cam.visible(c.x, c.y, 60)) drawList.push({ y: c.y, kind: 'chest', ref: c });
    drawList.push({ y: this.player.y, kind: 'player', ref: this.player });
    drawList.sort((a, b) => a.y - b.y);
    for (const d of drawList) {
      if (d.kind === 'obj') this.map.drawObject(ctx, d.ref, this.time);
      else d.ref.draw(ctx, this);
    }

    for (const fx of this.abilityFx) fx.draw(ctx);
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const e of this.effects) e.draw(ctx);
    this.particles.draw(ctx, cam);

    // mira
    if (!this.uiBlocking()) {
      const mw = this.mouseWorld;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = this.player.cls.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mw.x, mw.y, 5, 0, Math.PI * 2);
      ctx.moveTo(mw.x - 8, mw.y); ctx.lineTo(mw.x - 3, mw.y);
      ctx.moveTo(mw.x + 3, mw.y); ctx.lineTo(mw.x + 8, mw.y);
      ctx.moveTo(mw.x, mw.y - 8); ctx.lineTo(mw.x, mw.y - 3);
      ctx.moveTo(mw.x, mw.y + 3); ctx.lineTo(mw.x, mw.y + 8);
      ctx.stroke();
      ctx.restore();
    }

    this.floats.draw(ctx);
    this.drawLighting(ctx, cam);

    // HUD em espaço de tela
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (this.state !== 'title') drawHud(ctx, this);
  }

  drawLighting(ctx, cam) {
    const amb = this.map.ambient;
    if (amb === 'day') {
      // leve vinheta
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createRadialGradient(this.screenW / 2, this.screenH / 2, this.screenH * 0.35, this.screenW / 2, this.screenH / 2, this.screenH * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(10,8,20,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.screenW, this.screenH);
      ctx.restore();
      cam.apply(ctx);
      return;
    }
    const lc = this.lightCtx;
    const z = this.camera.zoom;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = amb === 'cave' ? 'rgba(4,3,12,0.9)' : 'rgba(12,8,24,0.78)';
    lc.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
    lc.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, r, strength = 1) => {
      const sx = (wx - cam.left) * z, sy = (wy - cam.top) * z, rr = r * z;
      const g = lc.createRadialGradient(sx, sy, 0, sx, sy, rr);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.75})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(sx, sy, rr, 0, Math.PI * 2);
      lc.fill();
    };
    punch(this.player.x, this.player.y - 8, 92, 1);
    for (const l of this.map.lights) {
      if (l.x < cam.left - 120 || l.x > cam.right + 120 || l.y < cam.top - 120 || l.y > cam.bottom + 120) continue;
      punch(l.x, l.y, l.r, 0.95);
    }
    for (const pr of this.projectiles) punch(pr.x, pr.y, 40, 0.7);
    lc.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.lightCanvas, 0, 0);
    ctx.restore();
    cam.apply(ctx);
  }

  // =========================================================================
  // save / load
  // =========================================================================
  save() {
    if (!this.player || this.state === 'title') return;
    try {
      const opened = [];
      for (const id of Object.keys(this.mapData)) {
        for (const c of this.mapData[id].chests) if (c.opened && c.key) opened.push(c.key);
      }
      const deadStatics = [];
      for (const id of Object.keys(this.mapData)) {
        for (const e of this.mapData[id].enemies) if (e.static && e.dead) deadStatics.push(`${id}:${e.type}:${Math.round(e.homeX)},${Math.round(e.homeY)}`);
      }
      const data = {
        v: 1,
        cls: this.player.cls.id,
        level: this.player.level,
        xp: this.player.xp,
        gold: this.player.gold,
        hp: this.player.hp,
        mana: this.player.mana,
        equip: this.player.equip,
        inventory: this.player.inventory,
        upgrades: this.player.weaponUpgrades,
        kills: this.player.kills,
        chestsOpened: this.player.chestsOpened,
        deaths: this.player.deaths,
        map: this.map ? this.map.id : 'overworld',
        pos: { x: this.player.x, y: this.player.y },
        quests: this.quests,
        opened,
        deadStatics,
        stats: this.stats,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* ignora */ }
  }

  static hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }

  loadSave() {
    let data;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
    if (!data) return false;
    this.player = new Player(data.cls);
    this.player.level = data.level;
    this.player.xp = data.xp;
    this.player.gold = data.gold;
    this.player.equip = data.equip || { weapon: null, armor: null, trinket: null };
    this.player.inventory = data.inventory || [];
    this.player.weaponUpgrades = data.upgrades || 0;
    this.player.kills = data.kills || 0;
    this.player.chestsOpened = data.chestsOpened || 0;
    this.player.deaths = data.deaths || 0;
    this.player.recompute();
    this.player.hp = Math.min(data.hp || this.player.maxHp, this.player.maxHp);
    this.player.mana = Math.min(data.mana || this.player.maxMana, this.player.maxMana);
    this.quests = data.quests || {};
    for (const q of QUESTS) if (!this.quests[q.id]) this.quests[q.id] = { state: 'available', progress: 0 };
    this.stats = data.stats || this.stats;
    this.enemies = [];
    this.projectiles = [];
    this.loadMap(data.map || 'overworld', data.pos || this.maps.overworld.spawn, true);
    // aplica estado de baús e inimigos estáticos
    const opened = new Set(data.opened || []);
    for (const id of Object.keys(this.mapData)) {
      for (const c of this.mapData[id].chests) if (opened.has(c.key)) c.opened = true;
    }
    const dead = new Set(data.deadStatics || []);
    for (const id of Object.keys(this.mapData)) {
      for (const e of this.mapData[id].enemies) {
        const k = `${id}:${e.type}:${Math.round(e.homeX)},${Math.round(e.homeY)}`;
        if (dead.has(k)) { e.dead = true; e.deathT = 99; }
      }
    }
    this.enemies = this.mapData[this.map.id].enemies.filter((e) => !e.dead);
    this.state = 'playing';
    this.ui.closeAll();
    this.notify('Jogo carregado.', '#9ae8ff');
    return true;
  }

  wipeSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignora */ }
  }
}

function shadeOf(hex, amt) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
