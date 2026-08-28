// ---------------------------------------------------------------------------
// sprites.js — toda a arte do jogo, desenhada proceduralmente em pixel art
// ---------------------------------------------------------------------------
import { defineSprite, getSprite, hasSprite, px, disc, ellipse, rectOutline, shade, ramp, INK, pxLine } from './core/pixel.js';
import { RNG } from './core/utils.js';
import { TILE } from './world/tiles.js';

export { getTinted, getSprite as spriteByKey } from './core/pixel.js';

export const S = getSprite;

// ---------------------------------------------------------------------------
// utilidades locais
// ---------------------------------------------------------------------------
function def(key, w, h, fn, outline = true) {
  defineSprite(key, w, h, (ctx) => {
    fn(ctx);
    if (outline) autoOutline(ctx);
  });
}
function defSoft(key, w, h, fn) { def(key, w, h, fn, false); }

export function autoOutline(ctx, color = INK) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  const [r, g, b] = hex2rgb(color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 10) continue;
      if (a(x - 1, y) > 10 || a(x + 1, y) > 10 || a(x, y - 1) > 10 || a(x, y + 1) > 10) {
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
function hex2rgb(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Espelha horizontalmente o desenho seguinte. */
function mirror(ctx, w, fn) {
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  fn();
  ctx.restore();
}

// ===========================================================================
// HUMANOID GENÉRICO
// ===========================================================================
// canvas 20x26, pés em y=24, centro x=10
// facing: 0=baixo 1=esquerda 2=direita 3=cima

function legs(ctx, S, frame, x0 = 7) {
  const liftL = frame === 1 ? 1 : 0;
  const liftR = frame === 3 ? 1 : 0;
  const leg = (x, lift) => {
    const top = lift ? 18 : 19;
    const bot = lift ? 22 : 24;
    px(ctx, x, top, 3, bot - top + 1, S.pants || S.cloth);
    px(ctx, x + 2, top, 1, bot - top + 1, shade(S.pants || S.cloth, -0.32));
    px(ctx, x - (lift ? 0 : 0), bot, 3, 1, S.boots);
  };
  leg(x0, liftL);
  leg(x0 + 3, liftR);
}

function arms(ctx, S, frame, facing, bob) {
  const sw1 = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const sw2 = -sw1;
  const arm = (x, sw) => {
    const y = 13 + bob + sw;
    px(ctx, x, y, 2, 5, S.cloth);
    px(ctx, x, y + 5, 2, 1, S.skin);
    px(ctx, x + 1, y, 1, 5, shade(S.cloth, -0.3));
  };
  if (facing === 0) { arm(4, sw1); arm(14, sw2); }
  else { arm(6, sw2); arm(13, sw1); }
}

function headBase(ctx, S, facing, bob) {
  const y = 5 + bob;
  if (facing === 0) {
    px(ctx, 6, y, 8, 7, S.skin);
    px(ctx, 13, y, 1, 7, shade(S.skin, -0.22));
    px(ctx, 7, y + 3, 2, 1, S.eye || INK);
    px(ctx, 11, y + 3, 2, 1, S.eye || INK);
    px(ctx, 9, y + 5, 2, 1, shade(S.skin, -0.35));
  } else if (facing === 3) {
    px(ctx, 6, y, 8, 7, S.skin);
    px(ctx, 13, y, 1, 7, shade(S.skin, -0.22));
  } else {
    px(ctx, 7, y, 7, 7, S.skin);
    px(ctx, 13, y, 1, 7, shade(S.skin, -0.22));
    px(ctx, 12, y + 3, 2, 1, S.eye || INK);
    px(ctx, 13, y + 5, 1, 1, shade(S.skin, -0.3));
  }
  px(ctx, 8, y + 6, 4, 1, shade(S.skin, -0.3));
}

function hair(ctx, S, facing, bob) {
  const y = 5 + bob;
  if (!S.hair) return;
  if (facing === 0) {
    px(ctx, 6, y - 1, 8, 3, S.hair);
    px(ctx, 5, y, 1, 4, S.hair);
    px(ctx, 14, y, 1, 4, S.hair);
    px(ctx, 6, y - 1, 8, 1, shade(S.hair, 0.25));
  } else if (facing === 3) {
    px(ctx, 6, y - 1, 8, 6, S.hair);
    px(ctx, 6, y - 1, 8, 1, shade(S.hair, 0.25));
  } else {
    px(ctx, 6, y - 1, 8, 3, S.hair);
    px(ctx, 6, y + 2, 3, 4, S.hair);
    px(ctx, 6, y - 1, 8, 1, shade(S.hair, 0.25));
  }
}

function torso(ctx, S, facing, bob) {
  if (facing === 0 || facing === 3) {
    px(ctx, 6, 12 + bob, 8, 7, S.cloth);
    px(ctx, 13, 12 + bob, 1, 7, shade(S.cloth, -0.3));
    px(ctx, 6, 12 + bob, 8, 1, shade(S.cloth, 0.22));
    if (S.belt) px(ctx, 6, 17 + bob, 8, 1, S.belt);
    if (facing === 3 && S.cape) px(ctx, 5, 12 + bob, 10, 9, S.cape);
  } else {
    px(ctx, 8, 12 + bob, 6, 7, S.cloth);
    px(ctx, 13, 12 + bob, 1, 7, shade(S.cloth, -0.3));
    px(ctx, 8, 12 + bob, 6, 1, shade(S.cloth, 0.22));
    if (S.belt) px(ctx, 8, 17 + bob, 6, 1, S.belt);
  }
  if (S.trim) {
    if (facing === 0 || facing === 3) { px(ctx, 9, 12 + bob, 2, 6, S.trim); }
    else px(ctx, 11, 12 + bob, 1, 6, S.trim);
  }
}

function shadow(ctx, w, y) {
  ctx.globalAlpha = 0.28;
  ellipse(ctx, w / 2, y, 6, 2, '#000000');
  ctx.globalAlpha = 1;
}

/** Pinta o corpo base (cabeça, torso, braços, pernas) de um humanóide. */
function paintHumanoid(ctx, S, facing, frame, W = 20) {
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  shadow(ctx, W, 25);
  if (facing === 1) {
    mirror(ctx, W, () => {
      legs(ctx, S, frame, 8);
      torso(ctx, S, 2, bob);
      arms(ctx, S, frame, 2, bob);
      headBase(ctx, S, 2, bob);
      hair(ctx, S, 2, bob);
      if (S.decorate) S.decorate(ctx, S, 2, bob, frame);
    });
    return;
  }
  legs(ctx, S, frame, facing === 0 ? 7 : 8);
  torso(ctx, S, facing, bob);
  arms(ctx, S, frame, facing, bob);
  headBase(ctx, S, facing, bob);
  hair(ctx, S, facing, bob);
  if (S.decorate) S.decorate(ctx, S, facing, bob, frame);
}

// ===========================================================================
// HERÓIS
// ===========================================================================
const HERO_ART = {
  mage: {
    cloth: '#4253c9', pants: '#33408f', skin: '#eab389', hair: '#6b4a2a', boots: '#4a3220',
    trim: '#e8c85a', belt: '#c9a13c', eye: '#20162c',
    decorate(ctx, S, facing, bob) {
      const y = 5 + bob;
      // chapéu pontudo
      px(ctx, 4, y + 1, 12, 2, '#4253c9');
      px(ctx, 5, y - 1, 10, 2, '#4253c9');
      px(ctx, 6, y - 3, 8, 2, '#3a48b4');
      px(ctx, 8, y - 6, 5, 3, '#3a48b4');
      px(ctx, 10, y - 8, 3, 2, '#34409f');
      px(ctx, 4, y + 1, 12, 1, '#5c6ee0');
      px(ctx, 5, y, 10, 1, '#e8c85a');
      px(ctx, 10, y - 8, 1, 2, '#5c6ee0');
      // manto longo
      px(ctx, 5, 15 + bob, 10, 6, '#3a48b4');
      px(ctx, 5, 20 + bob, 10, 1, '#2b3690');
      px(ctx, 14, 15 + bob, 1, 6, '#2b3690');
      px(ctx, 9, 15 + bob, 2, 6, '#4f61d8');
      // barba
      if (facing !== 3) { px(ctx, 8, y + 5, 4, 2, '#d8d2c4'); px(ctx, 9, y + 7, 2, 1, '#d8d2c4'); }
      else px(ctx, 6, y + 4, 8, 3, '#d8d2c4');
    },
  },
  knight: {
    cloth: '#c2ccd9', pants: '#9aa6b6', skin: '#eab389', hair: '#4a3620', boots: '#5b4a38',
    trim: '#e8c85a', belt: '#6a4a2c', eye: '#20162c',
    decorate(ctx, S, facing, bob) {
      const y = 5 + bob;
      // elmo
      px(ctx, 6, y - 1, 8, 6, '#c2ccd9');
      px(ctx, 6, y - 1, 8, 1, '#e2e9f2');
      px(ctx, 13, y - 1, 1, 6, '#8b97a8');
      px(ctx, 6, y + 2, 8, 2, '#2b3140');
      if (facing === 0) { px(ctx, 7, y + 2, 2, 2, '#e8c85a'); px(ctx, 11, y + 2, 2, 2, '#e8c85a'); }
      if (facing !== 0 && facing !== 3) px(ctx, 12, y + 2, 2, 2, '#e8c85a');
      px(ctx, 6, y + 4, 8, 1, '#8b97a8');
      // plumagem
      px(ctx, 9, y - 4, 2, 3, '#c0392b');
      px(ctx, 8, y - 5, 4, 1, '#e05a45');
      // ombreiras
      px(ctx, 4, 12 + bob, 3, 3, '#c2ccd9');
      px(ctx, 13, 12 + bob, 3, 3, '#c2ccd9');
      px(ctx, 4, 12 + bob, 3, 1, '#e2e9f2');
      px(ctx, 13, 12 + bob, 3, 1, '#e2e9f2');
      // peitoral
      px(ctx, 7, 13 + bob, 6, 4, '#d7dfea');
      px(ctx, 9, 13 + bob, 2, 4, '#e8c85a');
      // escudo no braço
      if (facing !== 2) {
        px(ctx, 3, 14 + bob, 3, 6, '#8a5a2b');
        px(ctx, 3, 14 + bob, 3, 1, '#a8703a');
        px(ctx, 4, 15 + bob, 1, 4, '#e8c85a');
      }
    },
  },
  archer: {
    cloth: '#3f8f3a', pants: '#4a3a26', skin: '#eab389', hair: '#8a5a2b', boots: '#4a3220',
    trim: '#c8a24a', belt: '#5a4028', eye: '#20162c',
    decorate(ctx, S, facing, bob) {
      const y = 5 + bob;
      // capuz
      px(ctx, 5, y - 2, 10, 4, '#3f8f3a');
      px(ctx, 5, y - 2, 10, 1, '#57ac4c');
      if (facing === 3) { px(ctx, 6, y - 1, 8, 7, '#357a31'); px(ctx, 9, y + 1, 2, 4, '#2b6327'); }
      if (facing !== 3) { px(ctx, 5, y + 2, 2, 3, '#357a31'); px(ctx, 13, y + 2, 2, 3, '#357a31'); }
      // aljava nas costas
      if (facing === 3) { px(ctx, 11, 11 + bob, 3, 8, '#6a4a2c'); px(ctx, 11, 10 + bob, 3, 1, '#c8a24a'); px(ctx, 12, 9 + bob, 1, 2, '#e8e2d0'); }
      if (facing === 2) { px(ctx, 14, 12 + bob, 2, 6, '#6a4a2c'); }
      // cinto com fivela
      px(ctx, 6, 17 + bob, 8, 1, '#5a4028');
      px(ctx, 9, 17 + bob, 2, 1, '#e8c85a');
      // capa curta
      if (facing === 3) px(ctx, 5, 12 + bob, 10, 6, '#2b6327');
    },
  },
  assassin: {
    cloth: '#2f3446', pants: '#232738', skin: '#d9a97f', hair: '#1b1e2a', boots: '#15171f',
    trim: '#a8324a', belt: '#7a2438', eye: '#ff5a5a',
    decorate(ctx, S, facing, bob) {
      const y = 5 + bob;
      // capuz
      px(ctx, 5, y - 2, 10, 4, '#2f3446');
      px(ctx, 5, y - 2, 10, 1, '#454c66');
      px(ctx, 5, y + 2, 1, 3, '#2f3446');
      px(ctx, 14, y + 2, 1, 3, '#2f3446');
      if (facing === 3) px(ctx, 6, y - 1, 8, 7, '#232738');
      // máscara
      if (facing === 0) { px(ctx, 6, y + 4, 8, 3, '#1b1e2a'); px(ctx, 9, y + 5, 2, 1, '#0f1118'); }
      if (facing === 2) { px(ctx, 7, y + 4, 7, 3, '#1b1e2a'); }
      // cachecol
      px(ctx, 6, 11 + bob, 8, 2, '#b02a3a');
      px(ctx, 6, 11 + bob, 8, 1, '#d8485a');
      if (facing === 3) px(ctx, 8, 13 + bob, 4, 5, '#8f2130');
      // faixa
      px(ctx, 6, 16 + bob, 8, 1, '#a8324a');
      // bainhas das adagas
      px(ctx, 4, 16 + bob, 2, 3, '#3a2a1c');
      px(ctx, 14, 16 + bob, 2, 3, '#3a2a1c');
    },
  },
};

export function registerHeroSprites() {
  for (const [id, base] of Object.entries(HERO_ART)) {
    for (let facing = 0; facing < 4; facing++) {
      for (let f = 0; f < 4; f++) {
        def(`hero:${id}:${facing}:${f}`, 20, 27, (ctx) => paintHumanoid(ctx, base, facing, f));
      }
    }
    // ícone de UI (busto)
    def(`heroicon:${id}`, 22, 22, (ctx) => {
      ctx.save();
      ctx.translate(1, -6);
      paintHumanoid(ctx, base, 0, 0);
      ctx.restore();
    });
  }
}

// --- armas (desenhadas rotacionadas durante o ataque) ----------------------
export function registerWeaponSprites() {
  // cajado
  def('w:staff', 22, 22, (ctx) => {
    px(ctx, 10, 6, 2, 15, '#8b5a2b');
    px(ctx, 11, 6, 1, 15, '#6a4220');
    disc(ctx, 11, 5, 4, '#7ff0ff');
    disc(ctx, 11, 5, 2, '#e8ffff');
    px(ctx, 9, 3, 1, 1, '#bff6ff'); px(ctx, 13, 7, 1, 1, '#bff6ff');
  });
  // espada
  def('w:sword', 24, 24, (ctx) => {
    px(ctx, 11, 2, 2, 14, '#dfe7f2');
    px(ctx, 11, 2, 1, 14, '#ffffff');
    px(ctx, 12, 3, 1, 13, '#9aa6b6');
    px(ctx, 11, 1, 2, 1, '#ffffff');
    px(ctx, 8, 16, 8, 2, '#c9a13c');
    px(ctx, 11, 18, 2, 4, '#6a4a2c');
    px(ctx, 10, 22, 4, 1, '#c9a13c');
  });
  // arco
  def('w:bow', 24, 24, (ctx) => {
    px(ctx, 14, 3, 2, 2, '#8b5a2b');
    px(ctx, 12, 5, 2, 3, '#8b5a2b');
    px(ctx, 11, 8, 2, 8, '#a8703a');
    px(ctx, 12, 16, 2, 3, '#8b5a2b');
    px(ctx, 14, 19, 2, 2, '#8b5a2b');
    px(ctx, 16, 5, 1, 14, '#e8e2d0');
  });
  // adaga
  def('w:dagger', 16, 16, (ctx) => {
    px(ctx, 7, 2, 2, 8, '#dfe7f2');
    px(ctx, 7, 2, 1, 8, '#ffffff');
    px(ctx, 5, 10, 6, 1, '#a8324a');
    px(ctx, 7, 11, 2, 3, '#2b2118');
    px(ctx, 7, 1, 2, 1, '#ffffff');
  });
  // lança (guardas)
  def('w:spear', 22, 22, (ctx) => {
    px(ctx, 10, 4, 2, 17, '#8b5a2b');
    px(ctx, 9, 1, 4, 4, '#cfd8e4');
    px(ctx, 10, 1, 1, 4, '#ffffff');
  });
  // martelo (ferreiro)
  def('w:hammer', 20, 20, (ctx) => {
    px(ctx, 9, 6, 2, 12, '#6a4a2c');
    px(ctx, 5, 3, 10, 4, '#7d8896');
    px(ctx, 5, 3, 10, 1, '#a8b2c0');
  });
  // clava (goblin)
  def('w:club', 18, 18, (ctx) => {
    px(ctx, 8, 5, 2, 12, '#7a5433');
    px(ctx, 6, 2, 6, 5, '#8b5a2b');
    px(ctx, 6, 2, 6, 1, '#a8703a');
  });
  // machado (orc)
  def('w:axe', 26, 26, (ctx) => {
    px(ctx, 12, 4, 2, 20, '#6a4a2c');
    px(ctx, 4, 5, 9, 9, '#b6c0cc');
    px(ctx, 4, 5, 2, 9, '#dfe7f2');
    px(ctx, 13, 5, 5, 9, '#8b97a8');
    px(ctx, 4, 5, 9, 1, '#e8eef6');
  });
  // machado grande (chefe/elite)
  def('w:greataxe', 34, 34, (ctx) => {
    px(ctx, 16, 4, 3, 28, '#4a3220');
    px(ctx, 3, 6, 14, 14, '#8b3a4a');
    px(ctx, 3, 6, 3, 14, '#c25a6a');
    px(ctx, 19, 6, 10, 14, '#5f2632');
    px(ctx, 3, 6, 14, 2, '#e08a96');
  });
  // cetro do rei
  def('w:scepter', 20, 20, (ctx) => {
    px(ctx, 9, 5, 2, 14, '#c9a13c');
    disc(ctx, 10, 4, 3, '#e8c85a');
    disc(ctx, 10, 4, 1, '#fff2c0');
  });
}

// ===========================================================================
// INIMIGOS
// ===========================================================================
function paintSlime(ctx, color, frame, size = 1) {
  const R = ramp(color);
  const squash = [0, 1, 0, -1][frame] || 0;
  const h = 12 + squash * 2;
  const w = 8 - squash;
  const top = 14 - h;
  ctx.globalAlpha = 0.28; ellipse(ctx, 10, 16, 7, 2, '#000'); ctx.globalAlpha = 1;
  ellipse(ctx, 10, top + h / 2 + 1, w, h / 2 + 1, R.base);
  ellipse(ctx, 10 - 2, top + h / 2 - 1, w - 3, h / 2 - 2, R.light);
  px(ctx, 7, top + 5, 2, 2, INK);
  px(ctx, 12, top + 5, 2, 2, INK);
  px(ctx, 8, top + 9, 5, 1, R.darker);
  px(ctx, 13, top + 2, 2, 2, '#ffffff');
  if (size > 1) { px(ctx, 4, top + 4, 2, 2, R.lighter); px(ctx, 15, top + 8, 2, 2, R.lighter); }
}

function paintGoblin(ctx, frame) {
  const skin = '#7ea63c', sk2 = shade(skin, -0.3);
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  ctx.globalAlpha = 0.28; ellipse(ctx, 8, 17, 5, 2, '#000'); ctx.globalAlpha = 1;
  // pernas
  const l = frame === 1 ? -1 : 0, r = frame === 3 ? -1 : 0;
  px(ctx, 5, 13 + l, 3, 4 - l, skin); px(ctx, 9, 13 + r, 3, 4 - r, skin);
  px(ctx, 5, 16 + l, 3, 1, '#4a3220'); px(ctx, 9, 16 + r, 3, 1, '#4a3220');
  // torso
  px(ctx, 4, 8 + bob, 8, 6, '#8a6a3a');
  px(ctx, 4, 8 + bob, 8, 1, '#a4803f');
  px(ctx, 11, 8 + bob, 1, 6, '#6a4f28');
  // braços
  px(ctx, 2, 9 + bob, 2, 4, skin); px(ctx, 12, 9 + bob, 2, 4, skin);
  // cabeça
  px(ctx, 4, 2 + bob, 8, 6, skin);
  px(ctx, 11, 2 + bob, 1, 6, sk2);
  px(ctx, 5, 5 + bob, 2, 1, '#ffe066'); px(ctx, 9, 5 + bob, 2, 1, '#ffe066');
  px(ctx, 7, 7 + bob, 2, 1, sk2);
  // orelhas
  px(ctx, 2, 3 + bob, 2, 3, skin); px(ctx, 12, 3 + bob, 2, 3, skin);
  // dentes
  px(ctx, 6, 6 + bob, 1, 1, '#fff'); px(ctx, 9, 6 + bob, 1, 1, '#fff');
}

function paintWolf(ctx, frame, dark) {
  const base = dark ? '#4a4a58' : '#6a6255';
  const R = ramp(base);
  const bob = frame % 2 ? 1 : 0;
  ctx.globalAlpha = 0.28; ellipse(ctx, 13, 17, 9, 2, '#000'); ctx.globalAlpha = 1;
  // pernas
  const lo = [0, 1, 0, -1][frame] || 0;
  px(ctx, 6, 12 + bob, 2, 4 - lo, R.dark); px(ctx, 9, 12 + bob, 2, 4 + lo, R.dark);
  px(ctx, 16, 12 + bob, 2, 4 + lo, R.dark); px(ctx, 19, 12 + bob, 2, 4 - lo, R.dark);
  // corpo
  ellipse(ctx, 13, 10 + bob, 8, 4, R.base);
  ellipse(ctx, 12, 8 + bob, 6, 2, R.light);
  // cauda
  px(ctx, 20, 7 + bob, 4, 2, R.base); px(ctx, 23, 5 + bob, 2, 3, R.dark);
  // cabeça
  px(ctx, 2, 5 + bob, 6, 5, R.base);
  px(ctx, 0, 7 + bob, 3, 2, R.dark);
  px(ctx, 2, 3 + bob, 2, 2, R.base); px(ctx, 6, 3 + bob, 2, 2, R.base);
  px(ctx, 3, 6 + bob, 2, 1, '#ffcc44');
  px(ctx, 0, 9 + bob, 2, 1, '#fff');
}

function paintSkeleton(ctx, frame) {
  const bone = '#e6e2d0', bd = '#b9b39c';
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  ctx.globalAlpha = 0.25; ellipse(ctx, 9, 22, 5, 2, '#000'); ctx.globalAlpha = 1;
  const l = frame === 1 ? -1 : 0, r = frame === 3 ? -1 : 0;
  px(ctx, 6, 15 + l, 2, 6 - l, bone); px(ctx, 10, 15 + r, 2, 6 - r, bone);
  // caixa torácica
  px(ctx, 5, 9 + bob, 8, 6, bone);
  px(ctx, 6, 10 + bob, 6, 1, '#3a3a4a'); px(ctx, 6, 12 + bob, 6, 1, '#3a3a4a'); px(ctx, 6, 14 + bob, 6, 1, '#3a3a4a');
  px(ctx, 8, 9 + bob, 2, 6, bd);
  // braços
  px(ctx, 3, 10 + bob, 2, 5, bone); px(ctx, 13, 10 + bob, 2, 5, bone);
  // crânio
  px(ctx, 5, 2 + bob, 8, 7, bone);
  px(ctx, 5, 2 + bob, 8, 1, '#fffaf0');
  px(ctx, 6, 5 + bob, 2, 2, '#1a1a24'); px(ctx, 10, 5 + bob, 2, 2, '#1a1a24');
  px(ctx, 8, 7 + bob, 2, 1, '#8f8a76');
  px(ctx, 6, 8 + bob, 6, 1, bd);
}

function paintOrc(ctx, frame, elite) {
  const skin = elite ? '#5f8f3a' : '#6f9c46';
  const R = ramp(skin);
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  ctx.globalAlpha = 0.28; ellipse(ctx, 12, 25, 8, 3, '#000'); ctx.globalAlpha = 1;
  const l = frame === 1 ? -1 : 0, r = frame === 3 ? -1 : 0;
  px(ctx, 7, 18 + l, 4, 7 - l, R.dark); px(ctx, 13, 18 + r, 4, 7 - r, R.dark);
  px(ctx, 6, 24 + l, 5, 1, '#3a2a1c'); px(ctx, 13, 24 + r, 5, 1, '#3a2a1c');
  // torso
  px(ctx, 5, 10 + bob, 14, 9, skin);
  px(ctx, 5, 10 + bob, 14, 2, R.light);
  px(ctx, 17, 10 + bob, 2, 9, R.dark);
  px(ctx, 6, 16 + bob, 12, 3, '#7a5433');
  px(ctx, 11, 16 + bob, 2, 3, '#c9a13c');
  // braços
  px(ctx, 2, 11 + bob, 3, 8, skin); px(ctx, 19, 11 + bob, 3, 8, skin);
  px(ctx, 2, 11 + bob, 3, 2, R.light);
  // cabeça
  px(ctx, 7, 2 + bob, 10, 8, skin);
  px(ctx, 15, 2 + bob, 2, 8, R.dark);
  px(ctx, 8, 5 + bob, 2, 2, '#ff6a3a'); px(ctx, 13, 5 + bob, 2, 2, '#ff6a3a');
  px(ctx, 9, 8 + bob, 6, 1, R.darker);
  px(ctx, 9, 8 + bob, 1, 2, '#fff'); px(ctx, 13, 8 + bob, 1, 2, '#fff');
  if (elite) {
    px(ctx, 5, 1 + bob, 3, 2, '#d8d2c4'); px(ctx, 16, 1 + bob, 3, 2, '#d8d2c4');
    px(ctx, 6, 0 + bob, 2, 1, '#f0ead8'); px(ctx, 17, 0 + bob, 2, 1, '#f0ead8');
    px(ctx, 5, 10 + bob, 14, 2, '#8a2b3a');
  } else {
    px(ctx, 7, 1 + bob, 10, 2, '#4a3220');
  }
}

function paintBoss(ctx, frame) {
  const skin = '#5a3a6a';
  const R = ramp(skin);
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const breathe = frame % 2;
  ctx.globalAlpha = 0.35; ellipse(ctx, 26, 49, 17, 5, '#000000'); ctx.globalAlpha = 1;
  const l = frame === 1 ? -1 : 0, r = frame === 3 ? -1 : 0;
  // pernas
  px(ctx, 14, 36 + l, 8, 13 - l, R.dark); px(ctx, 28, 36 + r, 8, 13 - r, R.dark);
  px(ctx, 12, 47 + l, 10, 2, '#2a1c34'); px(ctx, 28, 47 + r, 10, 2, '#2a1c34');
  px(ctx, 13, 48 + l, 3, 1, '#e6e2d0'); px(ctx, 34, 48 + r, 3, 1, '#e6e2d0');
  // torso
  px(ctx, 10, 18 + bob, 30, 20, skin);
  px(ctx, 10, 18 + bob, 30, 4, R.light);
  px(ctx, 36, 18 + bob, 4, 20, R.dark);
  px(ctx, 16, 26 + bob, 18, 8, shade(skin, -0.45));
  px(ctx, 18, 28 + bob, 3, 4, '#ff4a6a'); px(ctx, 24, 28 + bob, 3, 4, '#ff4a6a'); px(ctx, 30, 28 + bob, 3, 4, '#ff4a6a');
  // braços
  px(ctx, 3, 20 + bob, 7, 18, skin); px(ctx, 40, 20 + bob, 7, 18, skin);
  px(ctx, 3, 36 + bob, 8, 5, R.dark); px(ctx, 39, 36 + bob, 8, 5, R.dark);
  px(ctx, 4, 40 + bob, 2, 3, '#e6e2d0'); px(ctx, 44, 40 + bob, 2, 3, '#e6e2d0');
  // ombreiras de osso
  px(ctx, 6, 16 + bob, 10, 5, '#8a3a4a'); px(ctx, 34, 16 + bob, 10, 5, '#8a3a4a');
  px(ctx, 6, 16 + bob, 10, 1, '#c25a6a'); px(ctx, 34, 16 + bob, 10, 1, '#c25a6a');
  // cabeça
  px(ctx, 16, 4 + bob, 18, 14, skin);
  px(ctx, 16, 4 + bob, 18, 2, R.light);
  px(ctx, 32, 4 + bob, 2, 14, R.dark);
  px(ctx, 18, 9 + bob, 5, 4, '#ffe066'); px(ctx, 27, 9 + bob, 5, 4, '#ffe066');
  px(ctx, 19, 10 + bob, 2, 2, '#ff2a2a'); px(ctx, 28, 10 + bob, 2, 2, '#ff2a2a');
  px(ctx, 19, 15 + bob, 12, 3, '#2a1c34');
  for (let i = 0; i < 4; i++) px(ctx, 20 + i * 3, 15 + bob, 2, 2, '#f0ead8');
  // chifres
  px(ctx, 12, 2 + bob, 5, 4, '#d8d2c4'); px(ctx, 33, 2 + bob, 5, 4, '#d8d2c4');
  px(ctx, 9, 0 + bob + breathe, 4, 3, '#f0ead8'); px(ctx, 37, 0 + bob + breathe, 4, 3, '#f0ead8');
  px(ctx, 7, -1 + bob, 3, 2, '#ffffff'); px(ctx, 40, -1 + bob, 3, 2, '#ffffff');
}

export function registerEnemySprites() {
  for (let f = 0; f < 4; f++) {
    def(`slime:${f}`, 20, 18, (c) => paintSlime(c, '#4fbf6a', f), false);
    def(`slimebig:${f}`, 24, 22, (c) => { c.save(); c.translate(2, 4); paintSlime(c, '#b04fbf', f, 2); c.restore(); }, false);
    def(`goblin:${f}`, 16, 19, (c) => paintGoblin(c, f));
    def(`wolf:${f}`, 26, 19, (c) => paintWolf(c, f, false));
    def(`direwolf:${f}`, 26, 19, (c) => paintWolf(c, f, true));
    def(`skeleton:${f}`, 18, 23, (c) => paintSkeleton(c, f));
    def(`orc:${f}`, 24, 26, (c) => paintOrc(c, f, false));
    def(`elite:${f}`, 24, 26, (c) => paintOrc(c, f, true));
    def(`boss:${f}`, 50, 52, (c) => paintBoss(c, f));
  }
  for (let d = 0; d < 4; d++) {
    for (let f = 0; f < 4; f++) {
      def(`soldier_sword:${d}:${f}`, 20, 27, (c) => paintSoldierFacing(c, d, f, 'sword'));
      def(`soldier_archer:${d}:${f}`, 20, 27, (c) => paintSoldierFacing(c, d, f, 'archer'));
      def(`soldier_heavy:${d}:${f}`, 20, 27, (c) => paintSoldierFacing(c, d, f, 'heavy'));
    }
  }
}

function paintSoldierFacing(ctx, facing, frame, kind) {
  const armor = kind === 'heavy' ? '#8b97a8' : '#a8b2c0';
  const tabard = kind === 'archer' ? '#3a6ab0' : kind === 'heavy' ? '#8a2b3a' : '#b03a3a';
  const Spec = {
    cloth: armor, pants: '#6a5a44', skin: '#eab389', hair: '#3a2a1c', boots: '#4a3220',
    trim: tabard, belt: '#4a3220', eye: '#20162c',
    decorate(c, _S, fc, bob) {
      const y = 5 + bob;
      px(c, 6, y - 1, 8, 4, armor);
      px(c, 6, y - 1, 8, 1, shade(armor, 0.3));
      px(c, 13, y - 1, 1, 4, shade(armor, -0.3));
      px(c, 6, y + 3, 8, 1, shade(armor, -0.35));
      if (fc !== 3) px(c, 9, y + 3, 2, 2, shade(armor, -0.2));
      px(c, 8, 13 + bob, 4, 5, tabard);
      px(c, 9, 13 + bob, 2, 5, shade(tabard, 0.25));
      px(c, 4, 12 + bob, 3, 2, armor); px(c, 13, 12 + bob, 3, 2, armor);
      if (kind === 'heavy') {
        px(c, 3, 13 + bob, 4, 7, '#7a5433');
        px(c, 4, 15 + bob, 2, 3, '#c9a13c');
        px(c, 5, 3 + bob, 2, 3, '#8a2b3a');
        px(c, 11, 3 + bob, 2, 3, '#8a2b3a');
      }
      if (kind === 'archer' && fc === 3) { px(c, 11, 11 + bob, 3, 8, '#6a4a2c'); px(c, 12, 9 + bob, 1, 3, '#e8e2d0'); }
      if (kind === 'archer' && fc === 2) px(c, 14, 12 + bob, 2, 6, '#6a4a2c');
    },
  };
  paintHumanoid(ctx, Spec, facing, frame);
}

// ===========================================================================
// NPCs
// ===========================================================================
const NPC_ART = {
  king: {
    cloth: '#8e2b4a', pants: '#5c1e33', skin: '#eab389', hair: '#d8d2c4', boots: '#3a2a1c',
    trim: '#e8c85a', belt: '#c9a13c', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      // coroa
      px(c, 6, y - 2, 8, 2, '#e8c85a');
      px(c, 6, y - 4, 2, 2, '#e8c85a'); px(c, 9, y - 5, 2, 3, '#e8c85a'); px(c, 12, y - 4, 2, 2, '#e8c85a');
      px(c, 9, y - 3, 2, 1, '#ff5a6a');
      px(c, 6, y - 2, 8, 1, '#fff2c0');
      // manto
      px(c, 4, 12 + bob, 12, 10, '#7a2440');
      px(c, 4, 12 + bob, 12, 10, '#8e2b4a');
      px(c, 4, 12 + bob, 12, 1, '#b04a6a');
      px(c, 15, 12 + bob, 1, 10, '#5c1e33');
      px(c, 9, 12 + bob, 2, 10, '#e8c85a');
      // gola de arminho
      px(c, 5, 12 + bob, 10, 2, '#f0ead8');
      // barba
      if (facing !== 3) { px(c, 7, y + 4, 6, 4, '#e8e2d0'); px(c, 8, y + 8, 4, 1, '#e8e2d0'); }
      else px(c, 6, y + 3, 8, 4, '#e8e2d0');
    },
  },
  blacksmith: {
    cloth: '#6a5a44', pants: '#4a3a26', skin: '#d99a70', hair: '#3a2a1c', boots: '#3a2a1c',
    trim: '#8a6a3a', belt: '#3a2a1c', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      // careca + barba
      px(c, 7, y - 1, 6, 2, '#d99a70');
      if (facing !== 3) { px(c, 7, y + 4, 6, 4, '#8a6a3a'); px(c, 8, y + 8, 4, 1, '#8a6a3a'); }
      // avental
      px(c, 7, 13 + bob, 6, 6, '#4a3220');
      px(c, 7, 13 + bob, 6, 1, '#6a4a2c');
      // ombros largos
      px(c, 4, 12 + bob, 3, 3, '#6a5a44'); px(c, 13, 12 + bob, 3, 3, '#6a5a44');
      // queimaduras
      px(c, 8, 15 + bob, 1, 1, '#2a1c14'); px(c, 11, 17 + bob, 1, 1, '#2a1c14');
    },
  },
  merchant: {
    cloth: '#8a5a2b', pants: '#5a3a1c', skin: '#e8b489', hair: '#4a3220', boots: '#3a2a1c',
    trim: '#c9a13c', belt: '#c9a13c', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      // chapéu
      px(c, 4, y - 1, 12, 2, '#6a4a2c');
      px(c, 6, y - 3, 8, 2, '#8a6a3a');
      px(c, 6, y - 1, 8, 1, '#c9a13c');
      // barriga
      px(c, 5, 14 + bob, 10, 5, '#a4703a');
      px(c, 5, 14 + bob, 10, 1, '#c08a4a');
      // barba curta
      if (facing !== 3) { px(c, 8, y + 5, 4, 2, '#4a3220'); }
      // bolsa
      px(c, 14, 16 + bob, 3, 3, '#c9a13c');
      px(c, 15, 17 + bob, 1, 1, '#fff2c0');
    },
  },
  healer: {
    cloth: '#e8e2d0', pants: '#c9c2b0', skin: '#eab389', hair: '#c9a13c', boots: '#8a6a3a',
    trim: '#4a9ac9', belt: '#4a9ac9', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      // capuz branco
      px(c, 5, y - 2, 10, 4, '#f5f0e2');
      px(c, 5, y - 2, 10, 1, '#ffffff');
      if (facing === 3) px(c, 6, y - 1, 8, 7, '#d8d2c4');
      px(c, 5, y + 2, 2, 3, '#e8e2d0'); px(c, 13, y + 2, 2, 3, '#e8e2d0');
      // manto longo
      px(c, 5, 15 + bob, 10, 6, '#f0ead8');
      px(c, 14, 15 + bob, 1, 6, '#c9c2b0');
      // símbolo sagrado
      px(c, 9, 13 + bob, 2, 5, '#4a9ac9'); px(c, 8, 14 + bob, 4, 2, '#4a9ac9');
    },
  },
  guard: {
    cloth: '#a8b2c0', pants: '#6a5a44', skin: '#eab389', hair: '#3a2a1c', boots: '#4a3220',
    trim: '#3a6ab0', belt: '#4a3220', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      px(c, 6, y - 1, 8, 4, '#a8b2c0');
      px(c, 6, y - 1, 8, 1, '#d7dfea');
      px(c, 6, y + 3, 8, 1, '#7d8896');
      if (facing !== 3) px(c, 9, y + 3, 2, 2, '#7d8896');
      px(c, 8, 13 + bob, 4, 5, '#3a6ab0');
      px(c, 4, 12 + bob, 3, 2, '#a8b2c0'); px(c, 13, 12 + bob, 3, 2, '#a8b2c0');
    },
  },
  villager_m: {
    cloth: '#7a6a8a', pants: '#4a4258', skin: '#eab389', hair: '#5a3a22', boots: '#4a3220',
    trim: '#a89ab0', belt: '#4a3220', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      px(c, 5, y - 2, 10, 2, '#6a5a44');
      px(c, 6, y - 3, 8, 1, '#8a7a5a');
      if (facing !== 3) px(c, 8, y + 5, 4, 1, '#5a3a22');
    },
  },
  villager_f: {
    cloth: '#c96a8a', pants: '#a8506a', skin: '#f0c09a', hair: '#c9a13c', boots: '#6a4a2c',
    trim: '#f0a8c0', belt: '#8a3a5a', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      px(c, 5, y - 1, 10, 3, '#c9a13c');
      px(c, 5, y + 2, 2, 6, '#c9a13c'); px(c, 13, y + 2, 2, 6, '#c9a13c');
      px(c, 5, y - 1, 10, 1, '#e8c85a');
      px(c, 5, 16 + bob, 10, 5, '#a8506a');
      px(c, 5, 16 + bob, 10, 1, '#c96a8a');
    },
  },
  elder: {
    cloth: '#4a6a8a', pants: '#33506a', skin: '#e8c0a0', hair: '#e8e2d0', boots: '#3a2a1c',
    trim: '#8ab0c9', belt: '#2a4058', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      if (facing !== 3) { px(c, 7, y + 4, 6, 5, '#e8e2d0'); px(c, 8, y + 9, 4, 1, '#e8e2d0'); }
      else px(c, 6, y + 2, 8, 6, '#e8e2d0');
      px(c, 5, 16 + bob, 10, 5, '#33506a');
      px(c, 6, y - 1, 8, 2, '#e8e2d0');
    },
  },
  child: {
    cloth: '#e8a03c', pants: '#8a6a3a', skin: '#f0c09a', hair: '#8a5a2b', boots: '#4a3220',
    trim: '#ffd08a', belt: '#6a4a2c', eye: '#20162c',
    decorate(c, S, facing, bob) {
      const y = 5 + bob;
      px(c, 6, y - 2, 8, 3, '#8a5a2b');
    },
  },
};

export function registerNpcSprites() {
  for (const [id, spec] of Object.entries(NPC_ART)) {
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 4; f++) {
        const w = id === 'merchant' ? 22 : 20;
        def(`npc:${id}:${d}:${f}`, w, 27, (c) => {
          if (id === 'child') { c.save(); c.translate(0, 5); paintHumanoid(c, spec, d, f); c.restore(); }
          else paintHumanoid(c, spec, d, f, w);
        });
      }
    }
  }
}

// ===========================================================================
// OBJETOS / CENÁRIO
// ===========================================================================
export function registerPropSprites() {
  // ---- árvores ----
  for (const v of [0, 1]) {
    def(`tree:${v}`, 34, 40, (c) => {
      const r = new RNG(900 + v);
      ctx_shadow(c, 17, 38, 11);
      px(c, 14, 22, 6, 17, '#6a4a2c');
      px(c, 14, 22, 2, 17, '#8a6a3a');
      px(c, 19, 24, 1, 14, '#4a3220');
      const g = ['#3f8f3a', '#4fa844', '#2b6327'];
      for (let i = 0; i < 40; i++) {
        const a = r.float(0, 6.28), rad = r.float(2, 13);
        const x = 17 + Math.cos(a) * rad, y = 14 + Math.sin(a) * rad * 0.78;
        px(c, x, y, 3, 3, g[i % 3]);
      }
      disc(c, 17, 13, 12, '#3f8f3a');
      disc(c, 13, 11, 7, '#4fa844');
      disc(c, 22, 15, 6, '#2b6327');
      px(c, 10, 8, 3, 2, '#6cbf5a'); px(c, 16, 5, 3, 2, '#6cbf5a');
      if (v === 1) { px(c, 20, 10, 2, 2, '#d8485a'); px(c, 13, 16, 2, 2, '#d8485a'); px(c, 23, 17, 2, 2, '#d8485a'); }
    }, false);
  }
  def('pine', 26, 42, (c) => {
    ctx_shadow(c, 13, 40, 8);
    px(c, 11, 30, 4, 10, '#5a3a1c');
    const tri = (y, w, col) => px(c, 13 - w / 2, y, w, 5, col);
    tri(4, 8, '#2b6327'); tri(9, 13, '#2f7030'); tri(15, 18, '#2b6327'); tri(22, 23, '#256022');
    px(c, 13 - 4, 5, 4, 3, '#3f8f3a'); px(c, 13 - 6, 11, 4, 3, '#3f8f3a'); px(c, 13 - 9, 18, 5, 3, '#3a8238');
  }, false);
  def('deadtree', 28, 38, (c) => {
    ctx_shadow(c, 14, 36, 8);
    px(c, 12, 12, 4, 25, '#4a3a2c');
    px(c, 12, 12, 1, 25, '#5f4c3a');
    px(c, 6, 8, 6, 2, '#4a3a2c'); px(c, 16, 6, 7, 2, '#4a3a2c');
    px(c, 8, 4, 2, 5, '#4a3a2c'); px(c, 20, 2, 2, 5, '#4a3a2c');
  }, false);
  def('stump', 16, 14, (c) => {
    ctx_shadow(c, 8, 13, 6);
    px(c, 3, 6, 10, 7, '#6a4a2c');
    px(c, 3, 6, 10, 2, '#a4803f');
    ellipse(c, 8, 6, 5, 2, '#c9a13c');
    ellipse(c, 8, 6, 3, 1, '#8a6a3a');
  });
  // ---- pedras ----
  def('rock:0', 18, 14, (c) => {
    ctx_shadow(c, 9, 13, 7);
    ellipse(c, 9, 9, 7, 5, '#8f8f9c');
    ellipse(c, 7, 7, 4, 3, '#a8a8b6');
    px(c, 12, 11, 4, 2, '#6e6e7c');
    px(c, 5, 5, 2, 1, '#c4c4d0');
  });
  def('rock:1', 24, 20, (c) => {
    ctx_shadow(c, 12, 19, 10);
    ellipse(c, 12, 13, 10, 7, '#84848f');
    ellipse(c, 9, 10, 6, 4, '#a0a0ae');
    px(c, 16, 15, 6, 3, '#67676f');
    px(c, 6, 7, 3, 2, '#c0c0cc');
    px(c, 14, 8, 3, 1, '#b6b6c4');
  });
  def('mountain', 32, 34, (c) => {
    px(c, 0, 14, 32, 20, '#6a6a78');
    for (let i = 0; i < 32; i++) px(c, i, 14 + Math.round(Math.abs(Math.sin(i * 0.7)) * 8), 1, 20, '#6a6a78');
    px(c, 6, 4, 20, 28, '#7a7a8a');
    px(c, 10, 0, 12, 30, '#84848f');
    px(c, 13, 0, 5, 10, '#e8eef6');
    px(c, 11, 4, 3, 8, '#e8eef6');
    px(c, 18, 6, 3, 8, '#d0d8e4');
    px(c, 20, 16, 8, 16, '#5a5a68');
    px(c, 0, 22, 8, 12, '#5a5a68');
  });
  // ---- vegetação ----
  def('bush', 18, 16, (c) => {
    ctx_shadow(c, 9, 15, 7);
    disc(c, 6, 11, 5, '#3f8f3a');
    disc(c, 12, 10, 6, '#4fa844');
    disc(c, 9, 7, 4, '#5cbf4f');
    px(c, 13, 6, 2, 2, '#7ed46a');
  });
  def('bushberry', 18, 16, (c) => {
    ctx_shadow(c, 9, 15, 7);
    disc(c, 6, 11, 5, '#3f8f3a');
    disc(c, 12, 10, 6, '#4fa844');
    disc(c, 9, 7, 4, '#5cbf4f');
    px(c, 7, 9, 2, 2, '#d8485a'); px(c, 12, 11, 2, 2, '#d8485a'); px(c, 10, 6, 2, 2, '#d8485a');
  });
  def('flowers:0', 16, 12, (c) => {
    px(c, 3, 8, 1, 3, '#2b6327'); px(c, 3, 6, 2, 2, '#ffd85a');
    px(c, 8, 9, 1, 2, '#2b6327'); px(c, 8, 7, 2, 2, '#f08ad0');
    px(c, 12, 7, 1, 4, '#2b6327'); px(c, 12, 5, 2, 2, '#ffffff');
  }, false);
  def('grass_tuft', 16, 10, (c) => {
    px(c, 4, 4, 1, 5, '#4fa844'); px(c, 5, 2, 1, 7, '#5cbf4f');
    px(c, 6, 5, 1, 4, '#4fa844');
    px(c, 10, 3, 1, 6, '#5cbf4f'); px(c, 11, 5, 1, 4, '#4fa844');
  }, false);
  def('mushroom', 12, 12, (c) => {
    px(c, 5, 6, 2, 5, '#e8e2d0');
    disc(c, 6, 5, 4, '#c93a3a');
    px(c, 4, 4, 2, 1, '#fff'); px(c, 7, 3, 2, 1, '#fff');
  });
  def('wheat', 16, 16, (c) => {
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 4;
      px(c, x, 6, 1, 9, '#a8a03a');
      px(c, x, 3, 2, 4, '#e8c85a');
      px(c, x + 1, 2, 1, 2, '#f0d87a');
    }
  }, false);
  def('hay', 22, 20, (c) => {
    ctx_shadow(c, 11, 19, 9);
    ellipse(c, 11, 12, 9, 7, '#d8b45a');
    ellipse(c, 9, 10, 6, 4, '#e8c86a');
    px(c, 4, 14, 14, 1, '#b89440'); px(c, 6, 8, 10, 1, '#b89440');
  });
  def('lily', 16, 12, (c) => {
    disc(c, 8, 6, 5, '#3f8f3a');
    disc(c, 7, 5, 3, '#4fa844');
    px(c, 9, 4, 2, 2, '#f0a8c0');
  }, false);
  // ---- construções / objetos ----
  def('fence_h', 16, 16, (c) => {
    px(c, 2, 4, 2, 11, '#8a6a3a'); px(c, 12, 4, 2, 11, '#8a6a3a');
    px(c, 0, 6, 16, 2, '#a4803f'); px(c, 0, 11, 16, 2, '#a4803f');
    px(c, 0, 6, 16, 1, '#c9a15a'); px(c, 0, 11, 16, 1, '#c9a15a');
  }, false);
  def('fence_v', 16, 16, (c) => {
    px(c, 6, 2, 4, 13, '#8a6a3a');
    px(c, 6, 2, 1, 13, '#a4803f');
    px(c, 5, 14, 6, 2, '#6a4a2c');
  }, false);
  def('sign', 16, 20, (c) => {
    ctx_shadow(c, 8, 19, 5);
    px(c, 7, 8, 2, 11, '#6a4a2c');
    px(c, 2, 3, 12, 6, '#a4803f');
    px(c, 2, 3, 12, 1, '#c9a15a');
    px(c, 4, 5, 8, 1, '#5a3a1c'); px(c, 4, 7, 6, 1, '#5a3a1c');
  });
  def('well', 26, 28, (c) => {
    ctx_shadow(c, 13, 27, 11);
    px(c, 4, 12, 18, 12, '#8f8f9c');
    px(c, 4, 12, 18, 2, '#a8a8b6');
    px(c, 20, 14, 2, 10, '#6e6e7c');
    px(c, 7, 8, 12, 5, '#2a3a5a');
    px(c, 3, 4, 2, 10, '#6a4a2c'); px(c, 21, 4, 2, 10, '#6a4a2c');
    px(c, 2, 2, 22, 3, '#8a5a2b'); px(c, 2, 2, 22, 1, '#a8703a');
    px(c, 12, 5, 2, 4, '#c9a13c');
  });
  def('statue', 22, 34, (c) => {
    ctx_shadow(c, 11, 33, 8);
    px(c, 5, 28, 12, 5, '#8f8f9c'); px(c, 5, 28, 12, 1, '#a8a8b6');
    px(c, 8, 12, 6, 17, '#a0a0ae'); px(c, 8, 12, 2, 17, '#b6b6c4');
    px(c, 9, 5, 4, 8, '#a0a0ae');
    px(c, 6, 8, 3, 8, '#a0a0ae'); px(c, 13, 8, 3, 8, '#a0a0ae');
    px(c, 10, 2, 2, 3, '#c9a13c');
  });
  def('torch:0', 12, 24, (c) => {
    px(c, 5, 10, 2, 14, '#6a4a2c');
    px(c, 4, 8, 4, 3, '#8a6a3a');
    px(c, 4, 4, 4, 5, '#ff9a2a');
    px(c, 5, 2, 2, 4, '#ffd85a');
    px(c, 5, 6, 2, 2, '#fff2c0');
  });
  def('torch:1', 12, 24, (c) => {
    px(c, 5, 10, 2, 14, '#6a4a2c');
    px(c, 4, 8, 4, 3, '#8a6a3a');
    px(c, 4, 3, 4, 6, '#ff7a1a');
    px(c, 5, 1, 3, 4, '#ffc93a');
    px(c, 6, 5, 2, 2, '#fff2c0');
  });
  def('torch:2', 12, 24, (c) => {
    px(c, 5, 10, 2, 14, '#6a4a2c');
    px(c, 4, 8, 4, 3, '#8a6a3a');
    px(c, 3, 4, 5, 5, '#ffb03a');
    px(c, 6, 1, 2, 5, '#ffe07a');
    px(c, 4, 6, 2, 2, '#fff2c0');
  });
  def('barrel', 16, 18, (c) => {
    ctx_shadow(c, 8, 17, 6);
    px(c, 3, 3, 10, 14, '#8a5a2b');
    px(c, 3, 3, 3, 14, '#a8703a');
    px(c, 11, 3, 2, 14, '#6a4220');
    px(c, 3, 6, 10, 1, '#5a3a1c'); px(c, 3, 13, 10, 1, '#5a3a1c');
    ellipse(c, 8, 3, 5, 2, '#a4803f');
  });
  def('crate', 16, 16, (c) => {
    ctx_shadow(c, 8, 15, 6);
    px(c, 2, 2, 12, 12, '#a4803f');
    px(c, 2, 2, 12, 2, '#c9a15a');
    px(c, 12, 4, 2, 10, '#7a5a2c');
    pxLine(c, 2, 2, 14, 14, '#7a5a2c'); pxLine(c, 14, 2, 2, 14, '#7a5a2c');
  });
  def('anvil', 20, 16, (c) => {
    ctx_shadow(c, 10, 15, 8);
    px(c, 3, 4, 14, 4, '#5f6672');
    px(c, 3, 4, 14, 1, '#8b95a4');
    px(c, 7, 8, 6, 4, '#4a505c');
    px(c, 4, 12, 12, 3, '#5f6672');
    px(c, 15, 5, 3, 2, '#4a505c');
  });
  def('stall', 34, 34, (c) => {
    ctx_shadow(c, 17, 33, 14);
    px(c, 4, 16, 26, 14, '#8a6a3a');
    px(c, 4, 16, 26, 2, '#a4803f');
    px(c, 2, 4, 30, 3, '#b03a3a');
    px(c, 2, 7, 30, 3, '#e8e2d0');
    px(c, 2, 10, 30, 3, '#b03a3a');
    px(c, 3, 4, 2, 12, '#6a4a2c'); px(c, 29, 4, 2, 12, '#6a4a2c');
    px(c, 7, 19, 4, 3, '#e8c85a'); px(c, 13, 19, 4, 3, '#d8485a'); px(c, 19, 19, 4, 3, '#4a9ac9');
    px(c, 25, 19, 4, 3, '#6cbf5a');
    px(c, 6, 24, 22, 1, '#6a4a2c');
  });
  def('tent', 40, 36, (c) => {
    ctx_shadow(c, 20, 35, 16);
    for (let i = 0; i < 18; i++) px(c, 20 - i, 4 + i * 1.7, i * 2, 2, i % 2 ? '#8a2b3a' : '#e8e2d0');
    px(c, 16, 22, 8, 12, '#2a1c14');
    px(c, 19, 0, 2, 6, '#6a4a2c');
    px(c, 20, 0, 6, 3, '#e8c85a');
  });
  def('cart', 30, 24, (c) => {
    ctx_shadow(c, 15, 23, 12);
    px(c, 4, 8, 22, 9, '#8a6a3a');
    px(c, 4, 8, 22, 2, '#a4803f');
    disc(c, 8, 18, 5, '#5a3a1c'); disc(c, 8, 18, 3, '#8a6a3a');
    disc(c, 22, 18, 5, '#5a3a1c'); disc(c, 22, 18, 3, '#8a6a3a');
    px(c, 8, 4, 4, 5, '#c9a13c'); px(c, 15, 3, 5, 6, '#6cbf5a');
  });
  def('gravestone', 16, 20, (c) => {
    ctx_shadow(c, 8, 19, 6);
    px(c, 4, 6, 8, 13, '#8f8f9c');
    px(c, 4, 4, 8, 3, '#a8a8b6');
    px(c, 4, 4, 8, 1, '#c4c4d0');
    px(c, 7, 8, 2, 6, '#6e6e7c'); px(c, 6, 10, 4, 2, '#6e6e7c');
  });
  def('bones', 18, 12, (c) => {
    px(c, 2, 6, 12, 2, '#e6e2d0'); px(c, 1, 5, 2, 4, '#e6e2d0'); px(c, 13, 5, 2, 4, '#e6e2d0');
    px(c, 6, 2, 2, 8, '#d8d2c4');
    px(c, 12, 9, 4, 1, '#d8d2c4');
  }, false);
  def('pillar', 20, 40, (c) => {
    ctx_shadow(c, 10, 39, 8);
    px(c, 4, 34, 12, 5, '#a0a0ae'); px(c, 4, 34, 12, 1, '#c0c0cc');
    px(c, 6, 6, 8, 28, '#b0b0be');
    px(c, 6, 6, 2, 28, '#c8c8d4');
    px(c, 12, 6, 2, 28, '#8f8f9c');
    px(c, 3, 2, 14, 4, '#a0a0ae'); px(c, 3, 2, 14, 1, '#c8c8d4');
    px(c, 7, 12, 3, 1, '#8f8f9c'); px(c, 9, 22, 3, 1, '#8f8f9c');
  });
  def('brokenpillar', 18, 24, (c) => {
    ctx_shadow(c, 9, 23, 7);
    px(c, 3, 19, 12, 4, '#a0a0ae');
    px(c, 5, 6, 8, 14, '#b0b0be');
    px(c, 5, 6, 2, 14, '#c8c8d4');
    px(c, 5, 4, 3, 3, '#b0b0be'); px(c, 9, 3, 3, 4, '#a0a0ae');
    px(c, 11, 6, 2, 8, '#8f8f9c');
  });
  def('crystal:0', 18, 24, (c) => {
    ctx_shadow(c, 9, 23, 6);
    px(c, 7, 6, 4, 17, '#7a5ad8');
    px(c, 7, 6, 1, 17, '#b8a0ff');
    px(c, 9, 2, 2, 6, '#b8a0ff');
    px(c, 10, 6, 1, 17, '#4a2a8a');
    px(c, 3, 12, 3, 11, '#6a4ac8'); px(c, 13, 14, 3, 9, '#6a4ac8');
  });
  def('crystal:1', 18, 24, (c) => {
    ctx_shadow(c, 9, 23, 6);
    px(c, 7, 6, 4, 17, '#c94a8a');
    px(c, 7, 6, 1, 17, '#ff9ac0');
    px(c, 9, 2, 2, 6, '#ff9ac0');
    px(c, 10, 6, 1, 17, '#8a2a5a');
    px(c, 3, 12, 3, 11, '#a83a72'); px(c, 13, 14, 3, 9, '#a83a72');
  });
  // ---- baús ----
  for (const [i, glow] of ['#c9a13c', '#4a9ac9', '#a855f7', '#ff8a2a'].entries()) {
    def(`chest:${i}:0`, 20, 16, (c) => {
      ctx_shadow(c, 10, 15, 8);
      px(c, 2, 6, 16, 9, '#8a5a2b');
      px(c, 2, 2, 16, 5, '#a4703a');
      px(c, 2, 2, 16, 1, '#c98f4a');
      px(c, 9, 2, 2, 13, '#5a3a1c');
      px(c, 2, 7, 16, 1, '#5a3a1c');
      px(c, 8, 7, 4, 4, glow);
      px(c, 9, 9, 2, 2, '#2a1c14');
      px(c, 2, 13, 16, 2, '#6a4220');
    });
    def(`chest:${i}:1`, 20, 18, (c) => {
      ctx_shadow(c, 10, 17, 8);
      px(c, 2, 8, 16, 9, '#8a5a2b');
      px(c, 2, 8, 16, 1, '#5a3a1c');
      px(c, 1, 1, 16, 5, '#a4703a');
      px(c, 1, 1, 16, 1, '#c98f4a');
      px(c, 3, 9, 14, 4, '#3a2a1c');
      px(c, 5, 10, 3, 2, glow); px(c, 11, 10, 3, 2, glow);
      px(c, 2, 15, 16, 2, '#6a4220');
    });
  }
  def('portal', 26, 34, (c) => {
    ctx_shadow(c, 13, 33, 10);
    px(c, 2, 4, 3, 28, '#6a6a78'); px(c, 21, 4, 3, 28, '#6a6a78');
    px(c, 2, 2, 22, 4, '#7a7a8a');
    px(c, 5, 6, 16, 26, '#2a1c3a');
    px(c, 7, 8, 12, 22, '#4a2a8a');
    px(c, 9, 12, 8, 14, '#7a5ad8');
    px(c, 11, 16, 4, 8, '#b8a0ff');
  });
  def('throne', 30, 40, (c) => {
    ctx_shadow(c, 15, 39, 12);
    px(c, 4, 8, 22, 24, '#8a2b3a');
    px(c, 4, 8, 22, 2, '#b04a5a');
    px(c, 6, 20, 18, 12, '#c9a13c');
    px(c, 6, 20, 18, 2, '#e8c85a');
    px(c, 2, 18, 4, 14, '#c9a13c'); px(c, 24, 18, 4, 14, '#c9a13c');
    px(c, 6, 2, 4, 8, '#c9a13c'); px(c, 20, 2, 4, 8, '#c9a13c');
    px(c, 13, 0, 4, 10, '#c9a13c');
    px(c, 14, 2, 2, 3, '#ff5a6a');
    px(c, 8, 12, 14, 6, '#6a1f2a');
  });
  def('banner', 14, 30, (c) => {
    px(c, 2, 2, 10, 1, '#c9a13c');
    px(c, 3, 3, 8, 20, '#3a6ab0');
    px(c, 3, 3, 8, 1, '#5a8ad0');
    px(c, 3, 23, 3, 4, '#3a6ab0'); px(c, 8, 23, 3, 4, '#3a6ab0');
    px(c, 6, 8, 2, 8, '#e8c85a'); px(c, 4, 11, 6, 2, '#e8c85a');
  });
  def('campfire:0', 20, 18, (c) => {
    ctx_shadow(c, 10, 17, 8);
    px(c, 2, 13, 16, 3, '#5a3a1c');
    px(c, 4, 11, 5, 3, '#8a6a3a'); px(c, 11, 11, 5, 3, '#8a6a3a');
    px(c, 7, 6, 6, 7, '#ff9a2a');
    px(c, 8, 3, 4, 5, '#ffd85a');
    px(c, 9, 7, 2, 4, '#fff2c0');
  });
  def('campfire:1', 20, 18, (c) => {
    ctx_shadow(c, 10, 17, 8);
    px(c, 2, 13, 16, 3, '#5a3a1c');
    px(c, 4, 11, 5, 3, '#8a6a3a'); px(c, 11, 11, 5, 3, '#8a6a3a');
    px(c, 6, 5, 7, 8, '#ff7a1a');
    px(c, 9, 2, 4, 5, '#ffc93a');
    px(c, 10, 8, 2, 4, '#fff2c0');
  });
  def('ruinwall', 20, 26, (c) => {
    ctx_shadow(c, 10, 25, 8);
    px(c, 3, 8, 14, 17, '#9a9aa8');
    px(c, 3, 8, 14, 2, '#b6b6c4');
    px(c, 15, 10, 2, 15, '#7a7a88');
    px(c, 3, 4, 4, 5, '#9a9aa8'); px(c, 10, 2, 5, 7, '#9a9aa8');
    px(c, 5, 14, 4, 1, '#7a7a88'); px(c, 11, 18, 4, 1, '#7a7a88');
    px(c, 4, 12, 3, 3, '#4fa844');
  });
  def('gate', 32, 40, (c) => {
    px(c, 2, 6, 4, 34, '#7a7a88'); px(c, 26, 6, 4, 34, '#7a7a88');
    px(c, 2, 4, 28, 4, '#8f8f9c');
    px(c, 6, 8, 20, 32, '#5a3a1c');
    for (let i = 0; i < 5; i++) px(c, 7 + i * 4, 8, 2, 32, '#7a5433');
    px(c, 6, 16, 20, 2, '#4a3220'); px(c, 6, 28, 20, 2, '#4a3220');
    px(c, 13, 4, 6, 4, '#c9a13c');
  });
}

function ctx_shadow(c, x, y, r) {
  c.globalAlpha = 0.26;
  ellipse(c, x, y, r, r * 0.34, '#000000');
  c.globalAlpha = 1;
}

/** Constrói (ou casa, torre etc.) — desenhado de forma paramétrica. */
export function buildingSprite(w, h, kind, seed) {
  const key = `bld:${kind}:${w}x${h}`;
  if (!hasSprite(key)) {
    defineSprite(key, w, h, (c) => {
      const r = new RNG(seed);
      const roofH = Math.max(8, Math.floor(h * 0.42));
      const wallTop = roofH - 2;
      // paredes
      px(c, 2, wallTop, w - 4, h - wallTop - 2, '#c8b48c');
      px(c, 2, wallTop, w - 4, 2, '#dcc9a0');
      px(c, w - 5, wallTop, 3, h - wallTop - 2, '#a8926a');
      // vigas
      for (let x = 4; x < w - 6; x += 7) px(c, x, wallTop + 2, 2, h - wallTop - 4, '#7a5433');
      px(c, 2, h - 4, w - 4, 2, '#8a7050');
      // telhado
      for (let i = 0; i < roofH; i++) {
        const inset = Math.floor((i / roofH) * (w / 2 - 1));
        px(c, 1 + inset, roofH - i - 1, w - 2 - inset * 2, 1, i % 2 ? '#8a3a3a' : '#a04a44');
      }
      px(c, 0, roofH - 1, w, 2, '#6a2a2a');
      px(c, Math.floor(w / 2) - 1, 0, 3, 3, '#c9a13c');
      // porta
      const dw = Math.max(6, Math.floor(w * 0.2));
      const dx = Math.floor(w / 2 - dw / 2);
      px(c, dx, h - 14, dw, 12, '#6a4a2c');
      px(c, dx, h - 14, dw, 1, '#8a6a3a');
      px(c, dx + dw - 2, h - 9, 1, 1, '#e8c85a');
      // janelas
      for (let x = 5; x < w - 9; x += 8) {
        if (Math.abs(x - dx) < dw) continue;
        px(c, x, wallTop + 4, 5, 5, '#2a3a5a');
        px(c, x, wallTop + 4, 5, 1, '#e8c85a');
        px(c, x + 2, wallTop + 4, 1, 5, '#5a3a1c');
      }
      if (r.chance(0.5)) { px(c, w - 8, 2, 3, roofH - 2, '#9a9aa8'); }
      autoOutline(c);
    });
  }
  return key;
}

export function castleSprite(w, h) {
  const key = `castle:${w}x${h}`;
  if (!hasSprite(key)) {
    defineSprite(key, w, h, (c) => {
      const wallTop = Math.floor(h * 0.34);
      // corpo principal
      px(c, 2, wallTop, w - 4, h - wallTop - 2, '#9aa2b0');
      px(c, 2, wallTop, w - 4, 3, '#b6bec9');
      px(c, w - 8, wallTop, 6, h - wallTop - 2, '#7a828f');
      for (let y = wallTop + 4; y < h - 6; y += 6) {
        px(c, 2, y, w - 4, 1, '#868e9c');
        for (let x = 4 + ((y / 6) % 2) * 4; x < w - 6; x += 8) px(c, x, y, 1, 5, '#868e9c');
      }
      // ameias
      for (let x = 2; x < w - 4; x += 6) px(c, x, wallTop - 4, 4, 4, '#b6bec9');
      // torres
      const tower = (tx, tw, th) => {
        px(c, tx, wallTop - th, tw, th + (h - wallTop), '#aab2bf');
        px(c, tx, wallTop - th, tw, 3, '#c6ced9');
        px(c, tx + tw - 3, wallTop - th, 3, th + (h - wallTop), '#7a828f');
        for (let x = tx; x < tx + tw; x += 4) px(c, x, wallTop - th - 4, 3, 4, '#c6ced9');
        for (let i = 0; i < 10; i++) px(c, tx + tw / 2 - 1 - i * 0.4, wallTop - th - 6 - i, tw * 0.6 + i * 0.8, 2, i % 2 ? '#3a6ab0' : '#4a7ac0');
      };
      tower(0, Math.floor(w * 0.18), Math.floor(h * 0.16));
      tower(w - Math.floor(w * 0.18), Math.floor(w * 0.18), Math.floor(h * 0.16));
      // portão
      const gw = Math.max(16, Math.floor(w * 0.22));
      const gx = Math.floor(w / 2 - gw / 2);
      px(c, gx, h - 26, gw, 24, '#2a2230');
      px(c, gx, h - 30, gw, 6, '#2a2230');
      px(c, gx + 1, h - 25, gw - 2, 22, '#5a3a1c');
      for (let i = 0; i < 5; i++) px(c, gx + 2 + i * 4, h - 25, 2, 22, '#7a5433');
      // janelas
      for (let x = 10; x < w - 14; x += 12) {
        if (x > gx - 8 && x < gx + gw + 4) continue;
        px(c, x, wallTop + 8, 6, 9, '#2a3a5a');
        px(c, x, wallTop + 6, 6, 3, '#8a2b3a');
        px(c, x + 2, wallTop + 8, 2, 6, '#e8c85a');
      }
      // bandeira central
      px(c, w / 2 - 1, 2, 2, wallTop - 4, '#c9a13c');
      px(c, w / 2 + 1, 4, 10, 7, '#8a2b3a');
      px(c, w / 2 + 4, 6, 4, 3, '#e8c85a');
      autoOutline(c);
    });
  }
  return key;
}

// ===========================================================================
// TILES
// ===========================================================================
function noisy(c, r, w, h, cols, density) {
  for (let i = 0; i < density; i++) {
    px(c, r.int(0, w - 1), r.int(0, h - 1), r.int(1, 2), 1, r.pick(cols));
  }
}

export function registerTileSprites() {
  const T = TILE;
  const defs = [
    [T.GRASS, '#59a02f', ['#4e8f26', '#63b038', '#52952c'], 26],
    [T.GRASS_TALL, '#4e8f26', ['#3f7a20', '#5aa02c', '#6cbf3a'], 34],
    [T.DARK_GRASS, '#3f7a3a', ['#356a30', '#478a42', '#2b5a28'], 26],
    [T.DIRT, '#8a6a44', ['#7a5a38', '#9a7a50', '#6a4a2c'], 24],
    [T.SAND, '#dcc484', ['#c9ae70', '#e8d49a', '#c0a268'], 22],
    [T.SAND_PATH, '#c9ae70', ['#b89c62', '#d8c088'], 20],
    [T.SWAMP, '#4a6a3a', ['#3a5a2c', '#5a7a44', '#5a6a44'], 28],
    [T.STONE_FLOOR, '#8f8f9c', ['#7a7a88', '#a0a0ae', '#84848f'], 20],
    [T.CAVE_FLOOR, '#5a5468', ['#4a4458', '#6a6478', '#504a60'], 22],
    [T.CRYSTAL, '#3a3448', ['#4a4458', '#2a2438'], 16],
    [T.COBBLE, '#8a8a96', ['#767682', '#9c9ca8', '#6a6a76'], 30],
    [T.ROAD, '#b09a70', ['#9a8660', '#c0aa80', '#8a7650'], 24],
    [T.RUINS, '#7a7a86', ['#6a6a76', '#8a8a96'], 20],
    [T.LAVA, '#c94a1a', ['#e8721a', '#a83a12', '#ffc93a'], 26],
    [T.MOSS_ROCK, '#6a7a5a', ['#5a6a4a', '#7a8a6a', '#4a5a3a'], 24],
  ];
  for (const [t, base, cols, dens] of defs) {
    for (let v = 0; v < 4; v++) {
      defSoft(`tile:${t}:${v}`, 16, 16, (c) => {
        const r = new RNG(t * 977 + v * 31 + 7);
        px(c, 0, 0, 16, 16, base);
        noisy(c, r, 16, 16, cols, dens);
        if (t === T.COBBLE || t === T.STONE_FLOOR) {
          for (let i = 0; i < 5; i++) {
            const x = r.int(0, 12), y = r.int(0, 12);
            rectOutline(c, x, y, r.int(3, 5), r.int(3, 5), shade(base, -0.2));
          }
        }
        if (t === T.GRASS_TALL) {
          for (let i = 0; i < 6; i++) {
            const x = r.int(0, 15);
            px(c, x, r.int(4, 12), 1, r.int(3, 6), '#6cbf3a');
          }
        }
        if (t === T.SWAMP) {
          for (let i = 0; i < 3; i++) ellipse(c, r.int(3, 13), r.int(3, 13), 3, 2, '#3a5a4a');
        }
      });
    }
  }
  // água animada
  for (let f = 0; f < 3; f++) {
    for (let v = 0; v < 2; v++) {
      defSoft(`tile:${T.WATER}:${f}:${v}`, 16, 16, (c) => {
        const r = new RNG(555 + v * 13 + f);
        px(c, 0, 0, 16, 16, '#2a6ac9');
        noisy(c, r, 16, 16, ['#2260b8', '#3a7ad8', '#1e54a8'], 22);
        for (let i = 0; i < 3; i++) {
          const y = (r.int(2, 13) + f * 2) % 16;
          px(c, r.int(1, 10), y, r.int(3, 6), 1, '#7ab6ff');
        }
      });
    }
  }
  // ponte
  defSoft(`tile:${T.BRIDGE}:0`, 16, 16, (c) => {
    px(c, 0, 0, 16, 16, '#8a6a3a');
    for (let y = 0; y < 16; y += 4) px(c, 0, y, 16, 1, '#6a4a2c');
    px(c, 0, 0, 16, 2, '#a4803f'); px(c, 0, 14, 16, 2, '#a4803f');
    px(c, 3, 2, 1, 12, '#7a5433'); px(c, 11, 2, 1, 12, '#7a5433');
  });
  // piso de madeira
  defSoft(`tile:${T.WOOD_FLOOR}:0`, 16, 16, (c) => {
    px(c, 0, 0, 16, 16, '#8a6a3a');
    for (let x = 0; x < 16; x += 4) px(c, x, 0, 1, 16, '#6a4a2c');
    px(c, 0, 7, 16, 1, '#6a4a2c');
    px(c, 1, 0, 1, 16, '#9a7a48');
  });
  // cultivo
  for (let v = 0; v < 2; v++) {
    defSoft(`tile:${T.CROP}:${v}`, 16, 16, (c) => {
      const r = new RNG(31 + v);
      px(c, 0, 0, 16, 16, '#7a5a38');
      for (let x = 1; x < 16; x += 5) {
        px(c, x, 2, 3, 12, '#5a3f24');
        px(c, x + 1, 3, 1, 11, '#e8c85a');
        px(c, x, 4, 1, 8, '#a8a03a');
        px(c, x + 2, 6, 1, 6, '#a8a03a');
      }
      noisy(c, r, 16, 16, ['#6a4a2c'], 10);
    });
  }
  // flores no chão
  for (let v = 0; v < 3; v++) {
    defSoft(`tile:${T.FLOWERS}:${v}`, 16, 16, (c) => {
      const r = new RNG(1200 + v * 7);
      px(c, 0, 0, 16, 16, '#59a02f');
      noisy(c, r, 16, 16, ['#4e8f26', '#63b038'], 24);
      const cols = ['#ffd85a', '#f08ad0', '#ffffff', '#ff8a6a'];
      for (let i = 0; i < 4; i++) {
        const x = r.int(1, 13), y = r.int(1, 13);
        px(c, x, y, 2, 2, cols[(i + v) % 4]);
        px(c, x, y + 2, 1, 1, '#2b6327');
      }
    });
  }
  // estrada com detalhe
  // muro / parede
  for (let v = 0; v < 2; v++) {
    defSoft(`tile:${T.WALL}:${v}`, 16, 16, (c) => {
      px(c, 0, 0, 16, 16, '#8f8f9c');
      for (let y = 0; y < 16; y += 4) {
        px(c, 0, y, 16, 1, '#6e6e7c');
        const off = (y / 4) % 2 ? 0 : 4;
        for (let x = off; x < 16; x += 8) px(c, x, y, 1, 4, '#6e6e7c');
      }
      px(c, 0, 0, 16, 1, '#a8a8b6');
      if (v) { px(c, 2, 3, 3, 3, '#4fa844'); px(c, 11, 10, 3, 2, '#4fa844'); }
    });
  }
  for (let v = 0; v < 2; v++) {
    defSoft(`tile:${T.CAVE_WALL}:${v}`, 16, 16, (c) => {
      const r = new RNG(77 + v * 5);
      px(c, 0, 0, 16, 16, '#3a3448');
      noisy(c, r, 16, 16, ['#2a2438', '#4a4458', '#221e30'], 26);
      px(c, 0, 0, 16, 2, '#2a2438');
      px(c, 0, 14, 16, 2, '#4a4458');
      px(c, r.int(2, 12), r.int(2, 12), 3, 3, '#504a60');
    });
  }
  for (let v = 0; v < 2; v++) {
    defSoft(`tile:${T.MOUNTAIN}:${v}`, 16, 16, (c) => {
      const r = new RNG(404 + v);
      px(c, 0, 0, 16, 16, '#6a6a78');
      noisy(c, r, 16, 16, ['#5a5a68', '#7a7a8a', '#505060'], 26);
      px(c, r.int(1, 10), r.int(1, 10), 4, 3, '#8a8a9a');
      px(c, r.int(1, 12), r.int(8, 13), 3, 2, '#e8eef6');
    });
  }
  // árvore / pinheiro / rocha / arbusto usam sprite de objeto, tile base é grama
  for (const t of [T.TREE, T.PINE, T.BUSH, T.ROCK, T.STUMP, T.FENCE, T.LILY, T.PORTAL]) {
    defSoft(`tile:${t}:0`, 16, 16, (c) => {
      const r = new RNG(t * 13 + 3);
      px(c, 0, 0, 16, 16, t === T.ROCK || t === T.STUMP ? '#59a02f' : '#59a02f');
      noisy(c, r, 16, 16, ['#4e8f26', '#63b038'], 22);
    });
  }
  defSoft(`tile:${T.LILY}:0`, 16, 16, (c) => {
    px(c, 0, 0, 16, 16, '#2a6ac9');
    noisy(c, new RNG(9), 16, 16, ['#2260b8', '#3a7ad8'], 18);
  });
  defSoft(`tile:${T.STAIRS}:0`, 16, 16, (c) => {
    px(c, 0, 0, 16, 16, '#6a6478');
    for (let y = 0; y < 16; y += 4) px(c, 0, y, 16, 3, y % 8 ? '#5a5468' : '#7a7488');
    px(c, 0, 0, 16, 1, '#8a8498');
  });
  defSoft(`tile:${T.PORTAL}:0`, 16, 16, (c) => {
    px(c, 0, 0, 16, 16, '#2a1c3a');
    noisy(c, new RNG(31), 16, 16, ['#4a2a8a', '#7a5ad8'], 20);
  });
}

// ===========================================================================
// PROJÉTEIS E EFEITOS
// ===========================================================================
export function registerEffectSprites() {
  for (let f = 0; f < 3; f++) {
    defSoft(`fx:fireball:${f}`, 16, 16, (c) => {
      const s = 5 + f * 0.5;
      disc(c, 8, 8, s, '#ff6a1a');
      disc(c, 8, 8, s - 2, '#ffc93a');
      disc(c, 8, 8, Math.max(1, s - 4), '#fff2c0');
      px(c, 1, 7 + f, 3, 2, '#ff9a2a');
    });
    defSoft(`fx:ice:${f}`, 16, 16, (c) => {
      const s = 5 + f * 0.4;
      disc(c, 8, 8, s, '#7ad6ff');
      disc(c, 8, 8, s - 2, '#d8f4ff');
      px(c, 8 - s, 8, s * 2, 1, '#ffffff');
      px(c, 8, 8 - s, 1, s * 2, '#ffffff');
    });
    defSoft(`fx:bolt:${f}`, 14, 14, (c) => {
      px(c, 1, 6, 12, 2, '#b8a0ff');
      px(c, 3, 6, 8, 2, '#e8dcff');
      disc(c, 10, 7, 3, '#c9a0ff');
      px(c, 10, 7, 2, 1, '#ffffff');
    });
  }
  defSoft('fx:arrow', 18, 6, (c) => {
    px(c, 2, 2, 13, 2, '#8a6a3a');
    px(c, 14, 1, 4, 4, '#cfd8e4');
    px(c, 15, 2, 3, 2, '#ffffff');
    px(c, 0, 0, 3, 2, '#e8e2d0'); px(c, 0, 4, 3, 2, '#e8e2d0');
  });
  defSoft('fx:arrow_fire', 18, 6, (c) => {
    px(c, 2, 2, 13, 2, '#5a3a1c');
    px(c, 14, 1, 4, 4, '#ff9a2a');
    disc(c, 15, 3, 3, '#ffc93a');
    px(c, 0, 1, 3, 4, '#ff6a1a');
  });
  defSoft('fx:bone', 12, 6, (c) => {
    px(c, 2, 2, 8, 2, '#e6e2d0');
    px(c, 1, 1, 2, 4, '#e6e2d0'); px(c, 9, 1, 2, 4, '#e6e2d0');
  });
  defSoft('fx:stone', 10, 10, (c) => {
    disc(c, 5, 5, 4, '#8f8f9c'); disc(c, 4, 4, 2, '#b0b0be');
  });
  // arco de golpe
  for (let f = 0; f < 3; f++) {
    defSoft(`fx:slash:${f}`, 40, 40, (c) => {
      const r0 = 10 + f * 3, r1 = 17 + f * 3;
      const a0 = -0.9 + f * 0.25, a1 = 0.9 + f * 0.25;
      c.globalAlpha = 1 - f * 0.28;
      for (let a = a0; a < a1; a += 0.04) {
        const x0 = 20 + Math.cos(a) * r0, y0 = 20 + Math.sin(a) * r0;
        const x1 = 20 + Math.cos(a) * r1, y1 = 20 + Math.sin(a) * r1;
        pxLine(c, x0, y0, x1, y1, f === 0 ? '#ffffff' : '#e8f0ff');
      }
      c.globalAlpha = 1;
    });
    defSoft(`fx:slashred:${f}`, 40, 40, (c) => {
      const r0 = 10 + f * 3, r1 = 16 + f * 3;
      const a0 = -0.8 + f * 0.2, a1 = 0.8 + f * 0.2;
      c.globalAlpha = 1 - f * 0.28;
      for (let a = a0; a < a1; a += 0.04) {
        pxLine(c, 20 + Math.cos(a) * r0, 20 + Math.sin(a) * r0, 20 + Math.cos(a) * r1, 20 + Math.sin(a) * r1, '#ff6a8a');
      }
      c.globalAlpha = 1;
    });
  }
  // explosões
  for (let f = 0; f < 5; f++) {
    defSoft(`fx:boom:${f}`, 48, 48, (c) => {
      const r = 6 + f * 5;
      c.globalAlpha = 1 - f * 0.16;
      disc(c, 24, 24, r, '#ff6a1a');
      disc(c, 24, 24, r * 0.68, '#ffc93a');
      disc(c, 24, 24, r * 0.34, '#fff2c0');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + f * 0.2;
        px(c, 24 + Math.cos(a) * (r + 3), 24 + Math.sin(a) * (r + 3), 3, 3, '#ff9a2a');
      }
      c.globalAlpha = 1;
    });
    defSoft(`fx:frost:${f}`, 56, 56, (c) => {
      const r = 8 + f * 6;
      c.globalAlpha = 0.85 - f * 0.14;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        pxLine(c, 28 + Math.cos(a) * r * 0.4, 28 + Math.sin(a) * r * 0.4, 28 + Math.cos(a) * r, 28 + Math.sin(a) * r, i % 2 ? '#7ad6ff' : '#d8f4ff');
      }
      disc(c, 28, 28, r * 0.4, '#d8f4ff');
      c.globalAlpha = 1;
    });
    defSoft(`fx:ring:${f}`, 48, 48, (c) => {
      const r = 6 + f * 5;
      c.globalAlpha = 1 - f * 0.19;
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        px(c, 24 + Math.cos(a) * r, 24 + Math.sin(a) * r, 2, 2, '#e8c85a');
      }
      c.globalAlpha = 1;
    });
  }
  defSoft('fx:shadowstep', 24, 24, (c) => {
    c.globalAlpha = 0.6;
    ellipse(c, 12, 12, 9, 11, '#1a1030');
    ellipse(c, 12, 12, 5, 8, '#4a2a8a');
    c.globalAlpha = 1;
  });
  defSoft('fx:heal', 20, 20, (c) => {
    px(c, 9, 3, 2, 14, '#7ae88a'); px(c, 3, 9, 14, 2, '#7ae88a');
    px(c, 9, 5, 2, 10, '#d8ffd8'); px(c, 5, 9, 10, 2, '#d8ffd8');
  });
  defSoft('fx:star', 12, 12, (c) => {
    px(c, 5, 1, 2, 10, '#fff2c0'); px(c, 1, 5, 10, 2, '#fff2c0');
    px(c, 5, 5, 2, 2, '#ffffff');
  });
  defSoft('fx:levelup', 32, 40, (c) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      px(c, 16 + Math.cos(a) * 13, 34 + Math.sin(a) * 5 - i * 2, 2, 4, '#ffe066');
    }
  });
}

/** Sombra elíptica usada no chão sob entidades. */
export function drawShadow(ctx, x, y, rx, ry = rx * 0.35) {
  ctx.globalAlpha = 0.3;
  ellipse(ctx, x, y, rx, ry, '#000000');
  ctx.globalAlpha = 1;
}

export function registerAllSprites() {
  registerHeroSprites();
  registerWeaponSprites();
  registerEnemySprites();
  registerNpcSprites();
  registerPropSprites();
  registerTileSprites();
  registerEffectSprites();
}
