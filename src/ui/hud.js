// ---------------------------------------------------------------------------
// hud.js — HUD desenhada no canvas (barras, habilidades, minimapa, avisos)
// ---------------------------------------------------------------------------
import { S } from '../sprites.js';
import { TILE } from '../world/tiles.js';
import { clamp } from '../core/utils.js';

const MINIMAP_COLORS = {
  [TILE.GRASS]: '#4e8f26', [TILE.GRASS_TALL]: '#5aa02c', [TILE.DARK_GRASS]: '#3a6a34',
  [TILE.DIRT]: '#8a6a44', [TILE.ROAD]: '#b09a70', [TILE.WATER]: '#2a6ac9',
  [TILE.SAND]: '#dcc484', [TILE.SAND_PATH]: '#c0a268', [TILE.SWAMP]: '#4a6a3a',
  [TILE.CROP]: '#c9a03a', [TILE.COBBLE]: '#8a8a96', [TILE.STONE_FLOOR]: '#8f8f9c',
  [TILE.WALL]: '#6a6a78', [TILE.TREE]: '#2b6327', [TILE.PINE]: '#24521f',
  [TILE.ROCK]: '#7a7a88', [TILE.MOUNTAIN]: '#5a5a68', [TILE.FENCE]: '#8a6a3a',
  [TILE.BRIDGE]: '#a4803f', [TILE.BUSH]: '#3f7a3a', [TILE.CAVE_FLOOR]: '#4a4458',
  [TILE.CAVE_WALL]: '#241f30', [TILE.STUMP]: '#6a4a2c', [TILE.LILY]: '#3a7ad8',
  [TILE.LAVA]: '#e8721a', [TILE.CRYSTAL]: '#7a5ad8', [TILE.RUINS]: '#7a7a86',
  [TILE.PORTAL]: '#8a5aff', [TILE.STAIRS]: '#8a8498', [TILE.FLOWERS]: '#59a02f',
  [TILE.MOSS_ROCK]: '#6a7a5a',
};

const minimaps = new Map();

function getMinimap(map) {
  let c = minimaps.get(map.id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = map.w;
  c.height = map.h;
  const x = c.getContext('2d');
  const img = x.createImageData(map.w, map.h);
  for (let i = 0; i < map.tiles.length; i++) {
    const col = MINIMAP_COLORS[map.tiles[i]] || '#333344';
    const n = parseInt(col.slice(1), 16);
    img.data[i * 4] = (n >> 16) & 255;
    img.data[i * 4 + 1] = (n >> 8) & 255;
    img.data[i * 4 + 2] = n & 255;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  minimaps.set(map.id, c);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(8,6,16,0.82)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), h - 2);
  ctx.strokeStyle = 'rgba(220,215,240,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // brilho superior
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), 1);
}

export function drawHud(ctx, game) {
  const p = game.player;
  if (!p) return;
  const vs = game.viewScale || 1;
  ctx.save();
  ctx.scale(vs, vs);
  const W = game.screenW / vs, H = game.screenH / vs;
  ctx.textBaseline = 'alphabetic';

  // ---- painel do jogador ---------------------------------------------------
  const px = 14, py = 12, pw = 232;
  ctx.fillStyle = 'rgba(12,10,24,0.78)';
  roundRect(ctx, px - 6, py - 6, pw + 12, 84, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,170,220,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ícone da classe
  const icon = S(`heroicon:${p.cls.id}`);
  if (icon) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px, py, 34, 34);
    ctx.drawImage(icon, px + 6, py + 5, 22, 22);
    ctx.strokeStyle = p.cls.color;
    ctx.strokeRect(px + 0.5, py + 0.5, 33, 33);
  }
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f0ecff';
  ctx.fillText(p.cls.name, px + 42, py + 12);
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#a9a2c9';
  ctx.fillText(`Nível ${p.level}`, px + 42 + ctx.measureText(p.cls.name).width * 0 + 68, py + 12);

  // HP
  const bx = px + 42, bw = pw - 48;
  bar(ctx, bx, py + 17, bw, 11, p.hp / p.maxHp, '#d8455a');
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, bx + bw / 2, py + 26);
  // recurso
  bar(ctx, bx, py + 31, bw, 9, p.maxMana ? p.mana / p.maxMana : 0, '#4a8ae0');
  ctx.fillStyle = '#dce8ff';
  ctx.font = '8px "Courier New", monospace';
  ctx.fillText(`${p.cls.resource} ${Math.floor(p.mana)}/${p.maxMana}`, bx + bw / 2, py + 38);
  // XP
  bar(ctx, bx, py + 43, bw, 5, p.xpFrac, '#e8c85a');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8f88ad';
  ctx.font = '8px "Courier New", monospace';
  ctx.fillText(`XP ${p.xp}/${p.xpNeed}`, bx, py + 57);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd85a';
  ctx.fillText(`${p.gold} ouro`, bx + bw, py + 57);
  ctx.textAlign = 'left';

  // ---- habilidades ---------------------------------------------------------
  const sx = px, sy = py + 92;
  for (let i = 0; i < 3; i++) {
    const sk = p.cls.skills[i];
    const x = sx + i * 46, y = sy, s = 40;
    ctx.fillStyle = 'rgba(12,10,24,0.8)';
    roundRect(ctx, x, y, s, s, 5);
    ctx.fill();
    const unlocked = p.skillUnlocked(i);
    ctx.strokeStyle = unlocked ? 'rgba(230,220,255,0.45)' : 'rgba(120,110,150,0.3)';
    ctx.stroke();
    if (icon) {
      ctx.save();
      ctx.globalAlpha = unlocked ? 0.95 : 0.25;
      ctx.beginPath();
      roundRect(ctx, x + 2, y + 2, s - 4, s - 4, 4);
      ctx.clip();
      ctx.drawImage(icon, x + 8, y + 6, 24, 24);
      ctx.restore();
    }
    // número da tecla
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x + 2, y + s - 12, 12, 10);
    ctx.fillStyle = '#e8e4ff';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + 8, y + s - 4);
    // custo
    ctx.fillStyle = p.mana >= sk.cost ? '#8ab6ff' : '#ff8a8a';
    ctx.font = '8px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(sk.cost), x + s - 3, y + s - 4);
    ctx.textAlign = 'left';
    if (!unlocked) {
      ctx.fillStyle = 'rgba(8,6,16,0.6)';
      roundRect(ctx, x, y, s, s, 5);
      ctx.fill();
      ctx.fillStyle = '#c9c2e0';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Nv' + sk.level, x + s / 2, y + s / 2 + 4);
      ctx.textAlign = 'left';
    } else if (p.skillCd[i] > 0) {
      const frac = p.skillCd[i] / p.skillCooldown(i);
      ctx.fillStyle = 'rgba(8,6,16,0.72)';
      ctx.fillRect(x + 2, y + 2 + (s - 4) * (1 - frac), s - 4, (s - 4) * frac);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.skillCd[i].toFixed(1), x + s / 2, y + s / 2 + 4);
      ctx.textAlign = 'left';
    }
  }

  // ---- buffs ---------------------------------------------------------------
  let bxp = sx + 3 * 46 + 8;
  for (const b of p.buffs) {
    ctx.fillStyle = 'rgba(12,10,24,0.8)';
    roundRect(ctx, bxp, sy, 30, 18, 4);
    ctx.fill();
    ctx.fillStyle = b.color || '#ffd85a';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.time.toFixed(0) + 's', bxp + 15, sy + 12);
    ctx.textAlign = 'left';
    bxp += 34;
  }

  // ---- minimapa ------------------------------------------------------------
  drawMinimap(ctx, game, W - 152, 12, 140, Math.round(140 * (game.map.h / game.map.w)));

  // ---- barra do chefe ------------------------------------------------------
  if (game.boss) {
    const bw2 = Math.min(460, W - 120), bx2 = (W - bw2) / 2, by2 = 22;
    ctx.fillStyle = 'rgba(12,10,24,0.85)';
    roundRect(ctx, bx2 - 8, by2 - 14, bw2 + 16, 34, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(184,117,240,0.6)';
    ctx.stroke();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0c8ff';
    ctx.fillText(game.boss.name, W / 2, by2 - 2);
    bar(ctx, bx2, by2 + 2, bw2, 10, game.boss.hp / game.boss.maxHp, '#b875f0');
    ctx.textAlign = 'left';
  }

  // ---- nome da zona --------------------------------------------------------
  if (game.zoneFade > 0) {
    const a = Math.min(1, game.zoneFade);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(game.zoneName, W / 2 + 1, 96 + 1);
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText(game.zoneName, W / 2, 96);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#c9c2e0';
    ctx.fillText(game.map.name, W / 2, 112);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ---- prompt de interação --------------------------------------------------
  const prompt = interactionPrompt(game);
  if (prompt && !game.uiBlocking()) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Courier New", monospace';
    const tw = ctx.measureText(prompt).width;
    ctx.fillStyle = 'rgba(12,10,24,0.82)';
    roundRect(ctx, W / 2 - tw / 2 - 10, H - 74, tw + 20, 22, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,102,0.5)';
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.fillText(prompt, W / 2, H - 59);
    ctx.textAlign = 'left';
  }

  // ---- ajuda rápida ---------------------------------------------------------
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(200,195,225,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText('WASD mover  •  Mouse mirar/atacar  •  1/2/3 habilidades  •  E interagir  •  I inventário  •  Q missões  •  R poção  •  ESC menu', 14, H - 12);

  ctx.restore();
}

export function interactionPrompt(game) {
  const p = game.player;
  if (!p || p.dead) return null;
  for (const ex of game.map.exits) {
    if (Math.hypot(ex.x - p.x, ex.y - p.y) < ex.r + 10) return `[E] ${ex.prompt || ex.label}`;
  }
  for (const c of game.chests) {
    if (c.near) return c.opened ? null : '[E] Abrir baú';
  }
  let best = null, bd = 40;
  for (const n of game.npcs) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < bd) { bd = d; best = n; }
  }
  if (best) {
    const role = best.def.role;
    const label = role === 'shop' ? 'Comerciar' : role === 'smith' ? 'Reforjar arma' : role === 'healer' ? 'Curar' : role === 'quest' ? 'Falar com o Rei' : 'Conversar';
    return `[E] ${label} — ${best.def.name}`;
  }
  return null;
}

export function drawMinimap(ctx, game, x, y, w, h) {
  const map = game.map;
  const mm = getMinimap(map);
  ctx.save();
  ctx.fillStyle = 'rgba(8,6,16,0.82)';
  roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,170,220,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.92;
  ctx.drawImage(mm, x, y, w, h);
  ctx.globalAlpha = 1;
  const sx = w / map.pxW, sy = h / map.pxH;
  const dot = (wx, wy, color, r = 1.6) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + wx * sx, y + wy * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const c of game.chests) if (!c.opened) dot(c.x, c.y, '#ffd85a', 1.4);
  for (const n of game.npcs) dot(n.x, n.y, '#7ab6ff', 1.4);
  for (const ex of map.exits) dot(ex.x, ex.y, '#b875f0', 2.2);
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.isBoss) dot(e.x, e.y, '#ff3a5a', 3);
    else if (e.isElite) dot(e.x, e.y, '#ff8a4a', 2);
  }
  // jogador
  const plx = x + game.player.x * sx, ply = y + game.player.y * sy;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(plx, ply, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = game.player.cls.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  // moldura
  ctx.fillStyle = 'rgba(220,215,240,0.75)';
  ctx.font = '8px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(map.name, x + w, y + h + 11);
  ctx.textAlign = 'left';
  ctx.restore();
}
