// ---------------------------------------------------------------------------
// npc.js — NPCs amigáveis e baús de tesouro
// ---------------------------------------------------------------------------
import { npcDef } from '../data/npcs.js';
import { S, drawShadow } from '../sprites.js';
import { rollEquipment, consumable } from '../data/items.js';
import { facingFromAngle } from './combat.js';

let _nid = 1;

export class Npc {
  constructor(npcId, x, y, face = 0) {
    this.def = npcDef(npcId);
    this.npcId = npcId;
    this.uid = _nid++;
    this.x = x; this.y = y;
    this.radius = 7;
    this.facing = face;
    this.baseFacing = face;
    this.frame = 0;
    this.animT = Math.random() * 4;
    this.isNpc = true;
    this.talked = false;
    this.bobT = Math.random() * 6;
    // NPCs que passeiam (pets, viajantes, bardo...)
    this.homeX = x; this.homeY = y;
    this.wander = this.def.wander || 0;
    this.wanderT = Math.random() * 3;
    this.wanderGoal = null;
    this.moving = false;
  }

  wanderStep(dt, game) {
    this.moving = false;
    if (!this.wander) return;
    const p = game.player;
    // para quando o jogador está perto (para conversar)
    if (Math.hypot(p.x - this.x, p.y - this.y) < 44) return;
    this.wanderT -= dt;
    if (this.wanderT <= 0 && !this.wanderGoal) {
      this.wanderT = 2 + Math.random() * 4;
      const a = Math.random() * Math.PI * 2, r = Math.random() * this.wander;
      const gx = this.homeX + Math.cos(a) * r, gy = this.homeY + Math.sin(a) * r;
      const tx = Math.floor(gx / 16), ty = Math.floor(gy / 16);
      if (game.map.isOpenSpot(tx, ty) && (!game.map.isSafeAt(this.homeX, this.homeY) || game.map.isSafeAt(gx, gy))) this.wanderGoal = { x: gx, y: gy };
    }
    if (!this.wanderGoal) return;
    const dx = this.wanderGoal.x - this.x, dy = this.wanderGoal.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) { this.wanderGoal = null; return; }
    const sp = this.def.role === 'pet' ? 34 : 24;
    // colisão no corpo (4px acima dos pés): os pés de NPCs ficam na borda inferior do tile
    const m = game.map.move(this.x, this.y - 4, (dx / d) * sp * dt, (dy / d) * sp * dt, 4);
    if (Math.hypot(m.x - this.x, (m.y + 4) - this.y) < 0.02) { this.wanderGoal = null; return; }
    this.x = m.x; this.y = m.y + 4;
    this.moving = true;
    this.facing = facingFromAngle(Math.atan2(dy, dx));
    this.baseFacing = this.facing;
  }

  update(dt, game) {
    this.bobT += dt;
    this.wanderStep(dt, game);
    this.animT += dt * (this.moving ? 5 : 1.4);
    this.frame = Math.floor(this.animT) % 4;
    const p = game.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (d < 70 && !this.moving && this.def.role !== 'pet') this.facing = facingFromAngle(Math.atan2(p.y - this.y, p.x - this.x));
    else if (!this.moving) this.facing = this.baseFacing;
    this.near = d < 34;
  }

  draw(ctx) {
    const key = `npc:${this.def.sprite}:${this.facing}:${this.frame}`;
    const spr = S(key);
    if (!spr) return;
    const bob = this.frame === 1 || this.frame === 3 ? -1 : 0;
    drawShadow(ctx, this.x, this.y, 8);
    ctx.drawImage(spr, Math.round(this.x - spr.width / 2), Math.round(this.y - spr.height + bob));
    if (this.near && !this.def.boss && this.def.role !== 'pet') {
      const y = this.y - spr.height - 8 + Math.sin(this.bobT * 4) * 1.5;
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(this.x - 1, y, 2, 4);
      ctx.fillRect(this.x - 1, y + 5, 2, 2);
    }
  }
}

// ---------------------------------------------------------------------------
export class Chest {
  constructor(x, y, tier, opts = {}) {
    this.x = x; this.y = y;
    this.tier = Math.max(1, Math.min(4, tier));
    this.uid = 'c' + (_nid++);
    this.opened = false;
    this.radius = 9;
    this.secret = !!opts.secret;
    this.bossChest = !!opts.bossChest;
    this.glowT = Math.random() * 6;
  }

  update(dt, game) {
    this.glowT += dt;
    const d = Math.hypot(game.player.x - this.x, game.player.y - this.y);
    this.near = d < 30;
    if (!this.opened && d < 90 && Math.random() < dt * 6) {
      game.particles.spawn({
        x: this.x + (Math.random() * 14 - 7), y: this.y - 6,
        vy: -22, life: 0.9, size: 2, color: ['#ffe066', '#fff2c0', '#ffd85a'][(Math.random() * 3) | 0],
        kind: 'fade', drag: 0.4,
      });
    }
  }

  open(game) {
    if (this.opened) return null;
    const p = game.player;
    if (p.inventory.length >= 26) {
      game.notify('Mochila cheia! Libere espaço (I) antes de abrir o baú.', '#ff8a8a');
      game.sfx('deny');
      return null;
    }
    this.opened = true;
    const gold = Math.round((12 + this.tier * 22) * (0.7 + Math.random() * 0.8) * (1 + (p.stats.goldFind || 0)) * game.rewardMul());
    if (this.key) game.openedChests.add(this.key);
    p.gold += gold;
    game.float(this.x, this.y - 22, `+${gold} ouro`, '#ffd85a', 8);
    game.sfx('chest');
    game.particles.burst(this.x, this.y - 8, 22, { color: ['#ffe066', '#fff2c0', '#c9a13c'], speed: 90, life: 0.8 });
    p.chestsOpened++;

    const item = rollEquipment(Math.random, p.cls.id, this.tier);
    let extra = null;
    if (Math.random() < 0.4) extra = consumable(Math.random() < 0.6 ? 'potion_hp' : 'potion_mana');

    // com a mochila cheia o item é vendido na hora (nunca se perde)
    game.giveItem(item, `Baú ${this.secret ? 'secreto' : this.bossChest ? 'do chefe' : 'antigo'}`);
    if (extra) game.giveItem(extra, null, `Também havia: ${extra.name}`);
    game.save();
    return item;
  }

  draw(ctx) {
    const idx = this.opened ? 0 : this.tier - 1;
    const spr = S(`chest:${idx}:${this.opened ? 1 : 0}`);
    if (!spr) return;
    if (!this.opened) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(this.glowT * 3) * 0.08;
      const colors = ['#c9a13c', '#4a9ac9', '#a855f7', '#ffa32a'];
      ctx.fillStyle = colors[this.tier - 1];
      ctx.beginPath();
      ctx.arc(this.x, this.y - 7, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawShadow(ctx, this.x, this.y, 9);
    ctx.drawImage(spr, Math.round(this.x - spr.width / 2), Math.round(this.y - spr.height));
  }
}
