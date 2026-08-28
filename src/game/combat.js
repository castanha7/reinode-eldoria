// ---------------------------------------------------------------------------
// combat.js — fórmulas de dano, textos flutuantes e utilidades de acerto
// ---------------------------------------------------------------------------

/** Mitigação por defesa (assintótica). */
export function mitigate(dmg, def) {
  return dmg * (1 - def / (def + 38));
}

export function rollDamage(atk, def, mul = 1, variance = 0.12) {
  const base = mitigate(atk * mul, Math.max(0, def));
  return Math.max(1, base * (1 + (Math.random() * 2 - 1) * variance));
}

export function isCrit(critChance) {
  return Math.random() < critChance;
}

/** Ângulo entre dois pontos. */
export function angleBetween(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Direção (0=baixo,1=esquerda,2=direita,3=cima) a partir de um ângulo. */
export function facingFromAngle(a) {
  const deg = (a * 180) / Math.PI;
  if (deg >= -45 && deg < 45) return 2;   // direita
  if (deg >= 45 && deg < 135) return 0;   // baixo
  if (deg >= -135 && deg < -45) return 3; // cima
  return 1;                               // esquerda
}

/** O ponto (px,py) está dentro do cone de ataque? */
export function inCone(ox, oy, dir, halfArc, px, py, range, radius = 0) {
  const dx = px - ox, dy = py - oy;
  const d = Math.hypot(dx, dy);
  if (d > range + radius) return false;
  if (d < 1) return true;
  let diff = Math.atan2(dy, dx) - dir;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfArc;
}

// ---------------------------------------------------------------------------
export class FloatTexts {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }

  add(x, y, text, color = '#ffffff', size = 7, opts = {}) {
    if (this.list.length > 90) this.list.shift();
    this.list.push({
      x: x + (Math.random() * 8 - 4), y,
      vy: opts.vy === undefined ? -26 : opts.vy,
      vx: opts.vx || (Math.random() * 14 - 7),
      life: opts.life || 0.85, max: opts.life || 0.85,
      text: String(text), color, size,
      crit: !!opts.crit,
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.life -= dt;
      if (t.life <= 0) { this.list.splice(i, 1); continue; }
      t.vy += 34 * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
    }
  }

  draw(ctx) {
    ctx.textAlign = 'center';
    for (const t of this.list) {
      const a = Math.min(1, t.life / t.max * 1.8);
      ctx.globalAlpha = a;
      const s = t.crit ? t.size + 3 : t.size;
      ctx.font = `bold ${s}px "Courier New", monospace`;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(10,8,18,0.9)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
