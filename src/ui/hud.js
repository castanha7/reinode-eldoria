// ---------------------------------------------------------------------------
// hud.js — HUD desenhada no canvas (barras, habilidades, minimapa, avisos)
// ---------------------------------------------------------------------------
import { S } from '../sprites.js';
import { TILE } from '../world/tiles.js';
import { clamp } from '../core/utils.js';
import { Input } from '../core/input.js';
import { modeById } from '../data/modes.js';

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

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(8,6,16,0.82)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, lighten(color, 0.3));
  g.addColorStop(0.5, color);
  g.addColorStop(1, lighten(color, -0.35));
  ctx.fillStyle = g;
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
  const vs0 = game.viewScale || 1;
  const touch = Input.touch.enabled;
  // em telas pequenas a HUD encolhe para não cobrir o jogo
  const hs = clamp(Math.min(window.innerWidth / 760, window.innerHeight / 430), touch ? 0.55 : 0.7, 1);
  const vs = vs0 * hs;
  ctx.save();
  ctx.scale(vs, vs);
  const W = game.screenW / vs, H = game.screenH / vs;
  ctx.textBaseline = 'alphabetic';

  // vinheta vermelha pulsante com a vida baixa
  const hpFrac = p.hp / p.maxHp;
  if (hpFrac < 0.3 && !p.dead) {
    const pulse = 0.55 + Math.sin(game.time * 6) * 0.25;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, 'rgba(180,0,20,0)');
    g.addColorStop(1, `rgba(200,10,30,${(0.3 - hpFrac) * 1.9 * pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- painel do jogador ---------------------------------------------------
  const px = 14, py = 12, pw = 232;
  const pg = ctx.createLinearGradient(0, py - 6, 0, py + 78);
  pg.addColorStop(0, 'rgba(34,26,64,0.9)');
  pg.addColorStop(1, 'rgba(12,10,28,0.88)');
  ctx.fillStyle = pg;
  roundRect(ctx, px - 6, py - 6, pw + 12, 84, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,190,255,0.4)';
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
  // vidas (modos Clássico e Hardcore)
  if (p.maxLives) {
    const M = modeById(game.mode);
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = M.color;
    ctx.fillText(M.name.toUpperCase(), px, py + 50);
    ctx.font = 'bold 12px "Courier New", monospace';
    const n = Math.max(p.maxLives, p.lives);
    const glyph = game.mode === 'hardcore' ? '☠' : '♥';
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i < p.lives ? (game.mode === 'hardcore' ? '#ff6a6a' : '#ff4a6a') : 'rgba(120,100,140,0.45)';
      ctx.fillText(glyph, px + i * 12, py + 66);
    }
  }

  // ---- habilidades ---------------------------------------------------------
  const sx = px, sy = py + 92;
  const nsk = p.cls.skills.length;
  const sz = 40, gap = 6;
  if (!touch) {
    for (let i = 0; i < nsk; i++) {
      const sk = p.cls.skills[i];
      const x = sx + i * (sz + gap), y = sy, s = sz;
      ctx.fillStyle = 'rgba(14,12,30,0.86)';
      roundRect(ctx, x, y, s, s, 5);
      ctx.fill();
      const unlocked = p.skillUnlocked(i);
      ctx.strokeStyle = unlocked ? p.cls.color : 'rgba(120,110,150,0.3)';
      ctx.stroke();
      const ico = S(`skill:${sk.id}`) || icon;
      if (ico) {
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.25;
        ctx.beginPath();
        roundRect(ctx, x + 2, y + 2, s - 4, s - 4, 4);
        ctx.clip();
        ctx.drawImage(ico, x + 2, y + 2, s - 4, s - 4);
        ctx.restore();
      }
      // número da tecla
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x + 2, y + s - 12, 12, 10);
      ctx.fillStyle = '#e8e4ff';
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x + 8, y + s - 4);
      // custo
      ctx.fillStyle = p.mana >= sk.cost ? '#8ab6ff' : '#ff8a8a';
      ctx.font = 'bold 8px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(sk.cost), x + s - 3, y + s - 4);
      ctx.textAlign = 'left';
      if (!unlocked) {
        ctx.fillStyle = 'rgba(8,6,16,0.62)';
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
    // esquiva (Espaço)
    const rx = sx + nsk * (sz + gap), ry = sy;
    ctx.fillStyle = 'rgba(14,12,30,0.86)';
    roundRect(ctx, rx, ry, sz, sz, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,233,160,0.5)';
    ctx.stroke();
    const rico = S('skill:roll');
    if (rico) ctx.drawImage(rico, rx + 2, ry + 2, sz - 4, sz - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(rx + 2, ry + sz - 12, 22, 10);
    ctx.fillStyle = '#e8e4ff';
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP', rx + 13, ry + sz - 4);
    if (p.rollCd > 0) {
      const frac = p.rollCd / 1.4;
      ctx.fillStyle = 'rgba(8,6,16,0.72)';
      ctx.fillRect(rx + 2, ry + 2 + (sz - 4) * (1 - frac), sz - 4, (sz - 4) * frac);
    }
    ctx.textAlign = 'left';
  }

  // ---- buffs ---------------------------------------------------------------
  let bxp = touch ? px : sx + (nsk + 1) * (sz + gap) + 4;
  const byp = touch ? sy - 2 : sy;
  for (const b of p.buffs) {
    ctx.fillStyle = 'rgba(14,12,30,0.86)';
    roundRect(ctx, bxp, byp, 34, 18, 4);
    ctx.fill();
    ctx.strokeStyle = b.color || '#ffd85a';
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.color || '#ffd85a';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.time.toFixed(0) + 's', bxp + 17, byp + 12);
    ctx.textAlign = 'left';
    bxp += 38;
  }
  // --- estados: veneno/queimadura e juramento (v2.1) -------------------------
  const statusChip = (glyph, color, txt) => {
    ctx.fillStyle = 'rgba(14,12,30,0.86)';
    roundRect(ctx, bxp, byp, 34, 18, 4);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(glyph + (txt ? ' ' + txt : ''), bxp + 17, byp + 13);
    ctx.textAlign = 'left';
    bxp += 38;
  };
  if (p.dotT > 0) statusChip('☣', p.dotColor || '#8aff8a', Math.ceil(p.dotT) + 's');
  if (p.vowT > 0) statusChip('⛨', '#ffd85a', Math.ceil(p.vowT) + 's');

  // ---- minimapa ------------------------------------------------------------
  drawMinimap(ctx, game, W - 152, 12, 140, Math.round(140 * (game.map.h / game.map.w)));
  if (touch) { /* botões de toque cobrem o resto */ }

  // ---- barra do chefe ------------------------------------------------------
  if (game.boss) {
    const bw2 = Math.min(460, W - 120), bx2 = (W - bw2) / 2, by2 = 22;
    ctx.fillStyle = 'rgba(12,10,24,0.85)';
    roundRect(ctx, bx2 - 8, by2 - 14, bw2 + 16, 34, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(184,117,240,0.6)';
    ctx.stroke();
    const bcol = { spider: '#c04ae0', lich: '#3ad8c0', titan: '#ff8a2a', frost: '#6ad8ff', ember: '#ff6a2a' }[game.boss.bossKind] || '#b875f0';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0c8ff';
    ctx.fillText(game.boss.name, W / 2, by2 - 2);
    bar(ctx, bx2, by2 + 2, bw2, 10, game.boss.hp / game.boss.maxHp, bcol);
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = '#c9c2e0';
    ctx.fillText(`Fase ${game.boss.phase}/3`, bx2 + bw2 / 2, by2 + 22);
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
  if (!touch) ctx.fillText('WASD mover  •  Mouse mirar/atacar  •  1-4 habilidades  •  Espaço esquivar  •  E interagir  •  I inventário  •  Q missões  •  R poção  •  ESC menu', 14, H - 12);

  ctx.restore();
}

function keyLabel() { return Input.touch.enabled ? '[✋]' : '[E]'; }

export function interactionPrompt(game) {
  const p = game.player;
  if (!p || p.dead) return null;
  for (const ex of game.map.exits) {
    if (Math.hypot(ex.x - p.x, ex.y - p.y) < ex.r + 10) return `${keyLabel()} ${ex.prompt || ex.label}`;
  }
  for (const c of game.chests) {
    if (c.near && !c.opened) return `${keyLabel()} Abrir baú`;
  }
  let best = null, bd = 40;
  for (const n of game.npcs) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < bd) { bd = d; best = n; }
  }
  if (best) {
    const role = best.def.role;
    const label = { shop: 'Comerciar', smith: 'Reforjar arma', healer: 'Curar', alchemist: 'Comprar elixires', bard: 'Ouvir canções', pet: 'Acariciar' }[role] || 'Conversar';
    return `${keyLabel()} ${label} — ${best.def.name}`;
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
    if (e.dead || e.d.summon) continue;
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
