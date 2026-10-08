// ---------------------------------------------------------------------------
// sprites_extra.js — arte da v2: novos inimigos, chefes, NPCs, pets, ícones de
// habilidade e efeitos. Tudo desenhado proceduralmente (sem arquivos de imagem).
// ---------------------------------------------------------------------------
import { px, disc, ellipse, shade, ramp, INK, pxLine } from './core/pixel.js';

function shadowOval(c, cx, cy, rx, ry = 2, a = 0.28) {
  c.globalAlpha = a;
  ellipse(c, cx, cy, rx, ry, '#000');
  c.globalAlpha = 1;
}

// ===========================================================================
// INIMIGOS COMUNS
// ===========================================================================
function paintBat(c, f) {
  const R = ramp('#7a5ab8');
  shadowOval(c, 10, 14, 5, 1.5, 0.2);
  const up = [0, 2, 4, 2][f];
  // asas
  const wing = (dir) => {
    for (let i = 0; i < 7; i++) {
      const x = 10 + dir * (3 + i);
      const y = 6 - up + Math.floor(i * 0.9) + (i > 4 ? 1 : 0);
      px(c, dir > 0 ? x : x - 1, y, 1, 4 + Math.floor(i / 3), i % 2 ? R.dark : R.base);
    }
    px(c, 10 + dir * 4 - (dir < 0 ? 1 : 0), 5 - up, 4, 1, R.light);
  };
  wing(1); wing(-1);
  // corpo
  ellipse(c, 10, 9, 3, 4, R.base);
  px(c, 9, 7, 3, 1, R.light);
  // cabeça + orelhas
  disc(c, 10, 6, 3, R.base);
  px(c, 7, 2, 2, 3, R.dark); px(c, 12, 2, 2, 3, R.dark);
  px(c, 8, 6, 1, 1, '#ff4a6a'); px(c, 12, 6, 1, 1, '#ff4a6a');
  px(c, 9, 8, 1, 2, '#fff'); px(c, 11, 8, 1, 2, '#fff');
}

function paintBoar(c, f) {
  const R = ramp('#8a5a3a');
  const bob = f % 2 ? 1 : 0;
  const lo = [0, 1, 0, -1][f];
  shadowOval(c, 14, 19, 10, 2);
  // pernas
  px(c, 7, 14 + bob, 3, 5 - lo, R.dark); px(c, 11, 14 + bob, 3, 5 + lo, R.dark);
  px(c, 17, 14 + bob, 3, 5 + lo, R.dark); px(c, 21, 14 + bob, 3, 5 - lo, R.dark);
  px(c, 7, 18, 3, 1, '#2a1c14'); px(c, 21, 18, 3, 1, '#2a1c14');
  // corpo
  ellipse(c, 15, 11 + bob, 10, 5, R.base);
  ellipse(c, 14, 8 + bob, 8, 2, R.light);
  // pelos do dorso
  for (let x = 8; x < 22; x += 2) px(c, x, 5 + bob, 1, 2, R.darker);
  // rabo
  px(c, 25, 8 + bob, 2, 1, R.dark); px(c, 26, 7 + bob, 1, 2, R.dark);
  // cabeça
  ellipse(c, 5, 11 + bob, 5, 4, R.base);
  px(c, 0, 12 + bob, 3, 3, '#d8a090'); // focinho
  px(c, 0, 13 + bob, 1, 1, '#4a2a22');
  px(c, 2, 14 + bob, 3, 2, '#f0ead8'); px(c, 1, 15 + bob, 2, 1, '#f0ead8'); // presa
  px(c, 5, 8 + bob, 2, 2, R.dark); // orelha
  px(c, 4, 10 + bob, 2, 1, '#ffcc44');
}

function paintSpider(c, f) {
  const R = ramp('#6a3a8a');
  const lift = [0, 1, 0, -1][f];
  shadowOval(c, 12, 16, 8, 2);
  // pernas
  for (let i = 0; i < 4; i++) {
    const off = (i + f) % 2 ? 1 : -1;
    const y = 8 + i * 2;
    pxLine(c, 9, y, 3 - i % 2, y - 3 + off + i, '#2a1a3a');
    pxLine(c, 3 - i % 2, y - 3 + off + i, 1, y + 3, '#2a1a3a');
    pxLine(c, 15, y, 21 + i % 2, y - 3 - off + i, '#2a1a3a');
    pxLine(c, 21 + i % 2, y - 3 - off + i, 23, y + 3, '#2a1a3a');
  }
  // abdômen
  ellipse(c, 12, 10 + lift * 0, 5, 5, R.base);
  ellipse(c, 11, 8, 3, 3, R.light);
  px(c, 11, 9, 2, 3, '#ff4a8a');
  // cabeça
  disc(c, 12, 5, 3, R.dark);
  px(c, 10, 4, 1, 1, '#ff3a3a'); px(c, 14, 4, 1, 1, '#ff3a3a');
  px(c, 11, 3, 1, 1, '#ff9a9a'); px(c, 13, 3, 1, 1, '#ff9a9a');
  px(c, 10, 7, 1, 2, '#e8e2d0'); px(c, 14, 7, 1, 2, '#e8e2d0');
}

function paintWraith(c, f) {
  const wob = [0, 1, 0, -1][f];
  const g = '#7ad6c8';
  c.globalAlpha = 0.28; ellipse(c, 10, 24, 6, 2, '#7ad6c8'); c.globalAlpha = 1;
  // cauda esfarrapada
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 3, len = 5 + ((i + f) % 3) * 2;
    px(c, x, 16, 3, len, i % 2 ? '#4aa8a0' : '#5ac0b4');
  }
  // manto
  ellipse(c, 10, 12 + wob, 7, 8, '#5ac0b4');
  ellipse(c, 9, 10 + wob, 5, 5, '#8ae8dc');
  // capuz
  disc(c, 10, 7 + wob, 5, '#3a8a86');
  disc(c, 10, 8 + wob, 3, '#0c2a2e');
  px(c, 8, 8 + wob, 2, 2, '#e8ffff'); px(c, 11, 8 + wob, 2, 2, '#e8ffff');
  px(c, 9, 9 + wob, 1, 1, g); px(c, 12, 9 + wob, 1, 1, g);
  // braços fantasmas
  px(c, 2, 12 + wob, 3, 6, '#7ad6c8'); px(c, 15, 12 + wob, 3, 6, '#7ad6c8');
  px(c, 1, 17 + wob, 2, 2, '#e8ffff'); px(c, 17, 17 + wob, 2, 2, '#e8ffff');
}

function paintGolem(c, f) {
  const base = '#8a8a7a';
  const R = ramp(base);
  const bob = f === 1 || f === 3 ? -1 : 0;
  const l = f === 1 ? -1 : 0, r = f === 3 ? -1 : 0;
  shadowOval(c, 14, 29, 10, 3, 0.32);
  // pernas
  px(c, 7, 21 + l, 6, 8 - l, R.dark); px(c, 15, 21 + r, 6, 8 - r, R.dark);
  px(c, 6, 28 + l, 8, 1, R.darker); px(c, 14, 28 + r, 8, 1, R.darker);
  // torso
  px(c, 5, 8 + bob, 18, 14, base);
  px(c, 5, 8 + bob, 18, 3, R.light);
  px(c, 20, 8 + bob, 3, 14, R.dark);
  px(c, 8, 12 + bob, 3, 1, R.darker); px(c, 16, 15 + bob, 4, 1, R.darker); px(c, 11, 18 + bob, 1, 3, R.darker);
  // núcleo brilhante
  px(c, 12, 13 + bob, 4, 4, '#ff8a2a'); px(c, 13, 14 + bob, 2, 2, '#ffe066');
  // musgo
  px(c, 5, 8 + bob, 4, 2, '#5a8a3a'); px(c, 17, 21, 3, 1, '#5a8a3a');
  // braços
  px(c, 0, 10 + bob, 5, 13, R.base); px(c, 23, 10 + bob, 5, 13, R.dark);
  px(c, 0, 10 + bob, 5, 2, R.light);
  px(c, 0, 21 + bob, 5, 4, R.light); px(c, 23, 21 + bob, 5, 4, R.base);
  // cabeça
  px(c, 9, 1 + bob, 10, 8, base);
  px(c, 9, 1 + bob, 10, 2, R.light);
  px(c, 17, 1 + bob, 2, 8, R.dark);
  px(c, 10, 4 + bob, 3, 2, '#ff8a2a'); px(c, 15, 4 + bob, 3, 2, '#ff8a2a');
  px(c, 11, 4 + bob, 1, 1, '#ffe066'); px(c, 16, 4 + bob, 1, 1, '#ffe066');
  px(c, 10, 7 + bob, 8, 1, R.darker);
}

// --- humanóides com 4 direções (bandido, cultista) --------------------------
export const BANDIT_SPEC = {
  cloth: '#6a3a2c', pants: '#3a2a22', skin: '#d99a70', hair: '#2a1c14', boots: '#2a1c14',
  trim: '#c9a13c', belt: '#c9a13c', eye: '#20162c',
  decorate(c, S, fc, bob) {
    const y = 5 + bob;
    // capuz + máscara
    px(c, 5, y - 2, 10, 4, '#4a2a22');
    px(c, 5, y - 2, 10, 1, '#6a3a2c');
    if (fc === 0) { px(c, 6, y + 4, 8, 3, '#2a1c14'); px(c, 6, y + 4, 8, 1, '#8a2a2a'); }
    if (fc === 1 || fc === 2) { px(c, 8, y + 4, 6, 3, '#2a1c14'); }
    // bolsa de ouro
    px(c, 13, 16 + bob, 4, 4, '#c9a13c'); px(c, 14, 17 + bob, 2, 1, '#fff2c0');
    // adaga
    px(c, 3, 14 + bob, 1, 5, '#dfe7f2'); px(c, 2, 18 + bob, 3, 1, '#8a6a3a');
  },
};
export const CULTIST_SPEC = {
  cloth: '#4a1c6a', pants: '#2a1040', skin: '#8a7a9a', hair: null, boots: '#1a0c28',
  trim: '#b04ae0', belt: '#b04ae0', eye: '#ff4aff',
  decorate(c, S, fc, bob) {
    const y = 5 + bob;
    // capuz grande
    px(c, 4, y - 2, 12, 5, '#3a1458');
    px(c, 4, y - 2, 12, 1, '#6a2a9a');
    px(c, 4, y + 3, 2, 4, '#3a1458'); px(c, 14, y + 3, 2, 4, '#3a1458');
    if (fc === 0) { px(c, 6, y + 1, 8, 5, '#12061c'); px(c, 7, y + 3, 2, 1, '#ff4aff'); px(c, 11, y + 3, 2, 1, '#ff4aff'); }
    if (fc === 3) px(c, 5, y - 1, 10, 7, '#3a1458');
    if (fc === 2) { px(c, 11, y + 1, 4, 5, '#12061c'); px(c, 12, y + 3, 2, 1, '#ff4aff'); }
    // manto longo
    px(c, 5, 16 + bob, 10, 7, '#4a1c6a');
    px(c, 5, 22 + bob, 10, 1, '#b04ae0');
    // símbolo
    px(c, 9, 14 + bob, 2, 3, '#ff4aff'); px(c, 8, 15 + bob, 4, 1, '#ff4aff');
    // cajado
    px(c, 16, 7 + bob, 1, 17, '#5a3a22'); disc(c, 16, 6 + bob, 2, '#ff4aff'); px(c, 15, 5 + bob, 1, 1, '#ffffff');
  },
};

// ===========================================================================
// CHEFES
// ===========================================================================
function paintSpiderQueen(c, f) {
  const R = ramp('#5a2a7a');
  const lift = [0, 1, 0, -1][f];
  shadowOval(c, 28, 42, 22, 4, 0.34);
  // pernas (4 por lado)
  for (let i = 0; i < 4; i++) {
    const off = (i + f) % 2 ? 2 : -1;
    const y = 18 + i * 4;
    pxLine(c, 22, y, 8 - i * 2, y - 8 + off, '#241034');
    pxLine(c, 8 - i * 2, y - 8 + off, 2 + i, y + 12, '#241034');
    pxLine(c, 34, y, 48 + i * 2, y - 8 - off, '#241034');
    pxLine(c, 48 + i * 2, y - 8 - off, 54 - i, y + 12, '#241034');
    // segunda linha p/ espessura
    pxLine(c, 22, y + 1, 8 - i * 2, y - 7 + off, '#3a1c52');
    pxLine(c, 34, y + 1, 48 + i * 2, y - 7 - off, '#3a1c52');
  }
  // abdômen
  ellipse(c, 28, 26, 11, 12, R.base);
  ellipse(c, 25, 21, 7, 7, R.light);
  ellipse(c, 28, 28, 4, 7, '#12081c');
  px(c, 26, 24, 4, 2, '#ff3a8a'); px(c, 27, 27, 2, 5, '#ff3a8a'); px(c, 26, 32, 4, 2, '#ff3a8a');
  // cefalotórax
  ellipse(c, 28, 13, 8, 6, R.dark);
  ellipse(c, 27, 11, 5, 3, R.base);
  // olhos
  for (const [ex, ey, s] of [[22, 11, 2], [26, 8, 2], [30, 8, 2], [34, 11, 2], [24, 13, 1], [32, 13, 1]]) {
    px(c, ex, ey, s, s, '#ff2a2a'); px(c, ex, ey, 1, 1, '#ffd0d0');
  }
  // presas
  px(c, 23, 17, 2, 5, '#f0ead8'); px(c, 33, 17, 2, 5, '#f0ead8');
  px(c, 23, 21, 1, 2, '#8aff8a'); px(c, 34, 21, 1, 2, '#8aff8a');
  // coroa de espinhos
  px(c, 22, 5, 2, 3, '#e8c85a'); px(c, 26, 3, 2, 4, '#e8c85a'); px(c, 30, 3, 2, 4, '#e8c85a'); px(c, 34, 5, 2, 3, '#e8c85a');
  px(c, 22, 7, 14, 1, '#c9a13c');
}

function paintLich(c, f) {
  const bob = f === 1 || f === 3 ? -1 : 0;
  const hover = [0, 1, 1, 0][f];
  const bone = '#e8e4d2', bd = '#b9b39c';
  shadowOval(c, 20, 47, 13, 3, 0.3);
  // manto/túnica esfarrapada
  px(c, 8, 24 + bob, 24, 22, '#1c4a50');
  px(c, 8, 24 + bob, 24, 3, '#2a6a72');
  px(c, 28, 24 + bob, 4, 22, '#12343a');
  for (let i = 0; i < 6; i++) px(c, 8 + i * 4, 44 + ((i + f) % 2), 4, 3 + (i % 2), '#1c4a50');
  px(c, 8, 42, 24, 1, '#5ad8c0');
  // caixa torácica visível
  px(c, 15, 24 + bob, 10, 10, bd);
  for (let y = 26; y < 34; y += 2) px(c, 16, y + bob, 8, 1, '#1a1a24');
  px(c, 19, 24 + bob, 2, 10, bone);
  // gema no peito
  disc(c, 20, 36 + bob, 2, '#5ad8c0'); px(c, 20, 35 + bob, 1, 1, '#ffffff');
  // braços
  px(c, 3, 25 + bob, 5, 14, '#1c4a50'); px(c, 32, 25 + bob, 5, 14, '#12343a');
  px(c, 3, 38 + bob + hover, 4, 5, bone); px(c, 33, 38 + bob - hover, 4, 5, bone);
  // cajado
  px(c, 1, 6 + bob, 2, 40, '#5a3a22');
  disc(c, 2, 5 + bob, 4, '#5ad8c0'); disc(c, 2, 5 + bob, 2, '#e8ffff');
  // ombreiras
  px(c, 5, 22 + bob, 9, 4, '#2a6a72'); px(c, 26, 22 + bob, 9, 4, '#2a6a72');
  px(c, 5, 22 + bob, 9, 1, '#5ad8c0'); px(c, 26, 22 + bob, 9, 1, '#5ad8c0');
  // crânio
  px(c, 13, 6 + bob, 14, 15, bone);
  px(c, 13, 6 + bob, 14, 2, '#fffaf0');
  px(c, 25, 6 + bob, 2, 15, bd);
  px(c, 15, 11 + bob, 4, 4, '#0c1a1e'); px(c, 21, 11 + bob, 4, 4, '#0c1a1e');
  px(c, 16, 12 + bob, 2, 2, '#5ad8c0'); px(c, 22, 12 + bob, 2, 2, '#5ad8c0');
  px(c, 19, 15 + bob, 2, 2, bd);
  px(c, 15, 18 + bob, 10, 3, '#1a1a24');
  for (let i = 0; i < 5; i++) px(c, 15 + i * 2, 18 + bob, 1, 3, bone);
  // coroa
  px(c, 12, 3 + bob, 16, 4, '#e8c85a');
  px(c, 12, 0 + bob, 3, 4, '#e8c85a'); px(c, 18, -1 + bob < 0 ? 0 : -1 + bob, 4, 5, '#e8c85a'); px(c, 25, 0 + bob, 3, 4, '#e8c85a');
  px(c, 12, 3 + bob, 16, 1, '#fff2c0');
  px(c, 19, 4 + bob, 2, 2, '#ff4a6a');
}

function paintTitan(c, f) {
  const base = '#8a8478';
  const R = ramp(base);
  const bob = f === 1 || f === 3 ? -1 : 0;
  const l = f === 1 ? -2 : 0, r = f === 3 ? -2 : 0;
  shadowOval(c, 30, 58, 22, 5, 0.36);
  // pernas
  px(c, 14, 42 + l, 13, 17 - l, R.dark); px(c, 33, 42 + r, 13, 17 - r, R.dark);
  px(c, 12, 57 + l, 16, 3, R.darker); px(c, 32, 57 + r, 16, 3, R.darker);
  px(c, 14, 42 + l, 13, 2, R.base); px(c, 33, 42 + r, 13, 2, R.base);
  // torso
  px(c, 10, 18 + bob, 40, 26, base);
  px(c, 10, 18 + bob, 40, 5, R.light);
  px(c, 44, 18 + bob, 6, 26, R.dark);
  px(c, 10, 40 + bob, 40, 4, R.dark);
  // rachaduras de lava
  for (const [x, y, w, h] of [[16, 26, 1, 8], [17, 33, 5, 1], [38, 24, 1, 9], [34, 32, 5, 1], [26, 38, 1, 5]]) {
    px(c, x, y + bob, w, h, '#ff8a2a'); px(c, x, y + bob, 1, 1, '#ffe066');
  }
  // núcleo
  disc(c, 30, 30 + bob, 5, '#c94a1a'); disc(c, 30, 30 + bob, 3, '#ffa32a'); disc(c, 30, 30 + bob, 1, '#fff2c0');
  // musgo
  px(c, 10, 18 + bob, 9, 3, '#5a8a3a'); px(c, 22, 18 + bob, 4, 2, '#6aa84a'); px(c, 40, 18 + bob, 6, 2, '#5a8a3a');
  // braços
  px(c, 0, 22 + bob, 10, 24, R.base); px(c, 50, 22 + bob, 10, 24, R.dark);
  px(c, 0, 22 + bob, 10, 4, R.light);
  px(c, 0, 44 + bob, 11, 8, R.light); px(c, 49, 44 + bob, 11, 8, R.base);
  px(c, 0, 51 + bob, 11, 1, R.darker); px(c, 49, 51 + bob, 11, 1, R.darker);
  // ombros
  px(c, 4, 14 + bob, 14, 8, R.base); px(c, 42, 14 + bob, 14, 8, R.dark);
  px(c, 4, 14 + bob, 14, 2, R.light); px(c, 42, 14 + bob, 14, 2, R.base);
  px(c, 8, 10 + bob, 4, 5, '#6aa84a');
  // cabeça
  px(c, 21, 2 + bob, 18, 16, base);
  px(c, 21, 2 + bob, 18, 3, R.light);
  px(c, 36, 2 + bob, 3, 16, R.dark);
  px(c, 23, 8 + bob, 6, 3, '#ff8a2a'); px(c, 32, 8 + bob, 6, 3, '#ff8a2a');
  px(c, 25, 9 + bob, 2, 1, '#fff2c0'); px(c, 34, 9 + bob, 2, 1, '#fff2c0');
  px(c, 23, 14 + bob, 14, 2, R.darker);
  px(c, 25, 14 + bob, 2, 2, '#ff8a2a'); px(c, 30, 14 + bob, 2, 2, '#ff8a2a');
  // cristais nas costas
  px(c, 26, 0 + bob, 3, 4, '#ff8a2a'); px(c, 31, 1 + bob, 3, 3, '#ffa32a');
}

// ===========================================================================
// NPCs
// ===========================================================================
export const NPC_ART_EXTRA = {
  alchemist: {
    cloth: '#4a8a5a', pants: '#2a4a38', skin: '#eab389', hair: '#c96a8a', boots: '#3a2a1c',
    trim: '#e8c85a', belt: '#8a5a2b', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // chapéu pontudo roxo
      px(c, 3, y - 1, 14, 2, '#6a3a9a');
      px(c, 5, y - 4, 10, 3, '#7a4aaa');
      px(c, 8, y - 7, 5, 3, '#7a4aaa'); px(c, 11, y - 9, 3, 2, '#6a3a9a');
      px(c, 5, y - 2, 10, 1, '#e8c85a');
      // óculos de proteção
      if (fc === 0) { px(c, 6, y + 2, 3, 3, '#8ae8ff'); px(c, 11, y + 2, 3, 3, '#8ae8ff'); px(c, 9, y + 3, 2, 1, '#6a5a44'); }
      // avental + frasco
      px(c, 6, 13 + bob, 8, 7, '#e8e2d0'); px(c, 6, 13 + bob, 8, 1, '#ffffff');
      px(c, 15, 15 + bob, 3, 4, '#5af0a0'); px(c, 15, 14 + bob, 3, 1, '#c9a13c'); px(c, 16, 16 + bob, 1, 1, '#d8ffe8');
    },
  },
  bard: {
    cloth: '#c9403a', pants: '#3a2a6a', skin: '#f0c09a', hair: '#8a5a2b', boots: '#6a4a2c',
    trim: '#ffd85a', belt: '#ffd85a', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // chapéu com pena
      px(c, 4, y - 1, 12, 2, '#2a8a6a');
      px(c, 6, y - 3, 8, 2, '#3aaa80');
      px(c, 13, y - 7, 2, 5, '#ffd85a'); px(c, 14, y - 8, 2, 3, '#ff8aa0');
      // alaúde
      px(c, 2, 15 + bob, 6, 5, '#b8783a'); px(c, 3, 16 + bob, 4, 3, '#8a5a2b'); px(c, 4, 17 + bob, 2, 1, '#2a1c14');
      px(c, 7, 12 + bob, 1, 4, '#8a5a2b'); px(c, 6, 11 + bob, 3, 2, '#6a4a2c');
      // bigode
      if (fc !== 3) px(c, 7, y + 5, 6, 1, '#8a5a2b');
    },
  },
  fisher: {
    cloth: '#3a7ab0', pants: '#6a5a44', skin: '#d99a70', hair: '#c9c2b0', boots: '#2a3a4a',
    trim: '#e8e2d0', belt: '#6a4a2c', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // chapéu de palha
      px(c, 2, y - 1, 16, 2, '#e8c46a'); px(c, 5, y - 4, 10, 3, '#f0d27a'); px(c, 5, y - 2, 10, 1, '#b8802a');
      // barba branca
      if (fc !== 3) px(c, 7, y + 5, 6, 3, '#e8e2d0');
      // vara de pescar
      px(c, 17, 4 + bob, 1, 18, '#8a6a3a'); px(c, 18, 3 + bob, 3, 1, '#8a6a3a'); px(c, 20, 4 + bob, 1, 10, '#e8e2d0');
      // peixe
      px(c, 2, 18 + bob, 4, 2, '#8ac8e8'); px(c, 1, 18 + bob, 1, 2, '#6aa8c8');
    },
  },
  miner: {
    cloth: '#8a6a3a', pants: '#4a3a26', skin: '#c98a60', hair: '#2a1c14', boots: '#2a1c14',
    trim: '#c9a13c', belt: '#2a1c14', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // capacete com lanterna
      px(c, 5, y - 2, 10, 4, '#d8b020'); px(c, 5, y - 2, 10, 1, '#fff08a');
      px(c, 9, y - 4, 3, 2, '#ffe066'); px(c, 10, y - 5, 1, 1, '#ffffff');
      // barba suja
      if (fc !== 3) px(c, 7, y + 5, 6, 3, '#3a2a1c');
      // picareta
      px(c, 16, 9 + bob, 1, 14, '#6a4a2c'); px(c, 13, 8 + bob, 7, 2, '#9aa6b6'); px(c, 13, 8 + bob, 7, 1, '#dfe7f2');
      // fuligem
      px(c, 7, 15 + bob, 2, 2, '#2a1c14');
    },
  },
  hermit: {
    cloth: '#6a6a7a', pants: '#4a4a5a', skin: '#e8c0a0', hair: '#e8e2d0', boots: '#3a2a1c',
    trim: '#8ab0ff', belt: '#4a4a5a', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // capuz cinza
      px(c, 4, y - 2, 12, 5, '#7a7a8a'); px(c, 4, y - 2, 12, 1, '#a0a0b0');
      px(c, 4, y + 3, 2, 4, '#7a7a8a'); px(c, 14, y + 3, 2, 4, '#7a7a8a');
      if (fc === 3) px(c, 5, y - 1, 10, 7, '#7a7a8a');
      // barba longa
      if (fc !== 3) { px(c, 7, y + 5, 6, 6, '#e8e2d0'); px(c, 8, y + 11, 4, 1, '#e8e2d0'); }
      // manto
      px(c, 5, 16 + bob, 10, 6, '#6a6a7a');
      // cajado com cristal
      px(c, 16, 6 + bob, 1, 18, '#6a4a2c'); disc(c, 16, 5 + bob, 2, '#8ab0ff'); px(c, 15, 4 + bob, 1, 1, '#ffffff');
    },
  },
  traveler: {
    cloth: '#4a7a4a', pants: '#5a4a34', skin: '#e8b489', hair: '#6a3a22', boots: '#3a2a1c',
    trim: '#c9a13c', belt: '#3a2a1c', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // chapéu de aba
      px(c, 3, y - 1, 14, 2, '#6a5a34'); px(c, 5, y - 3, 10, 2, '#8a7a4a'); px(c, 5, y - 1, 10, 1, '#c9a13c');
      // capa
      px(c, 4, 12 + bob, 3, 9, '#3a5a3a'); px(c, 14, 12 + bob, 2, 9, '#3a5a3a');
      // mochila
      px(c, 14, 13 + bob, 5, 7, '#8a5a2b'); px(c, 14, 13 + bob, 5, 1, '#b8783a'); px(c, 16, 15 + bob, 1, 2, '#c9a13c');
    },
  },
  huntress: {
    cloth: '#4a6a3a', pants: '#5a4a34', skin: '#f0c09a', hair: '#8a3a22', boots: '#3a2a1c',
    trim: '#c9a13c', belt: '#3a2a1c', eye: '#20162c',
    decorate(c, S, fc, bob) {
      const y = 5 + bob;
      // capuz verde
      px(c, 4, y - 2, 12, 3, '#3a5a2a'); px(c, 4, y - 2, 12, 1, '#5a8a3a');
      px(c, 4, y + 1, 2, 5, '#3a5a2a'); px(c, 14, y + 1, 2, 5, '#3a5a2a');
      if (fc === 3) px(c, 5, y - 1, 10, 6, '#3a5a2a');
      // trança
      if (fc === 3) px(c, 9, y + 3, 2, 8, '#8a3a22');
      // arco nas costas
      px(c, 15, 8 + bob, 1, 14, '#8a5a2b'); px(c, 16, 9 + bob, 1, 12, '#e8e2d0');
      // aljava
      px(c, 3, 12 + bob, 3, 8, '#6a4a2c'); px(c, 3, 11 + bob, 1, 2, '#e8e2d0'); px(c, 5, 11 + bob, 1, 2, '#e8e2d0');
    },
  },
};

function paintPet(c, kind, f, flip) {
  const dog = kind === 'dog';
  const base = dog ? '#c9883a' : '#8a8a96';
  const R = ramp(base);
  const bob = f % 2 ? 1 : 0;
  const lo = [0, 1, 0, -1][f];
  if (flip) { c.save(); c.translate(18, 0); c.scale(-1, 1); }
  shadowOval(c, 9, 14, 7, 1.5, 0.22);
  px(c, 4, 10 + bob, 2, 4 - lo, R.dark); px(c, 7, 10 + bob, 2, 4 + lo, R.dark);
  px(c, 11, 10 + bob, 2, 4 + lo, R.dark); px(c, 14, 10 + bob, 2, 4 - lo, R.dark);
  ellipse(c, 10, 8 + bob, 6, 3, R.base);
  px(c, 6, 6 + bob, 8, 1, R.light);
  // cauda
  if (dog) { px(c, 16, 5 + bob, 2, 1, R.base); px(c, 17, 3 + bob, 1, 3, R.base); }
  else { px(c, 16, 6 + bob, 1, 3, R.base); px(c, 17, 3 + bob, 1, 4, R.base); px(c, 17, 3 + bob, 1, 1, R.light); }
  // cabeça
  px(c, 1, 3 + bob, 6, 5, R.base);
  px(c, 0, 6 + bob, 2, 2, R.dark);
  if (dog) { px(c, 1, 3 + bob, 2, 4, R.darker); px(c, 6, 2 + bob, 1, 2, R.darker); px(c, 0, 6 + bob, 1, 1, '#2a1c14'); }
  else { px(c, 1, 1 + bob, 2, 2, R.base); px(c, 5, 1 + bob, 2, 2, R.base); px(c, 0, 6 + bob, 1, 1, '#ff9aa0'); px(c, 8, 7 + bob, 3, 1, R.dark); px(c, 11, 6 + bob, 3, 1, R.dark); }
  px(c, 3, 5 + bob, 1, 1, dog ? '#20162c' : '#8aff8a');
  if (flip) c.restore();
}

// ===========================================================================
// ÍCONES DE HABILIDADE (22x22)
// ===========================================================================
function iconBg(c, col) {
  const R = ramp(col);
  px(c, 0, 0, 22, 22, R.darker);
  px(c, 1, 1, 20, 20, R.dark);
  px(c, 1, 1, 20, 7, shade(col, -0.15));
  px(c, 1, 1, 20, 1, R.light);
}

const ICONS = {
  fireball(c) {
    iconBg(c, '#a8321a');
    pxLine(c, 3, 18, 11, 10, '#ff6a1a'); pxLine(c, 3, 16, 10, 9, '#ffa32a');
    disc(c, 13, 9, 5, '#ff6a1a'); disc(c, 13, 9, 3, '#ffc93a'); disc(c, 13, 9, 1, '#fff2c0');
    px(c, 16, 4, 2, 2, '#ffa32a'); px(c, 7, 6, 1, 1, '#ffc93a');
  },
  arcane_ray(c) {
    iconBg(c, '#4a2aa8');
    pxLine(c, 2, 19, 19, 3, '#b8a0ff'); pxLine(c, 3, 19, 20, 3, '#e8dcff'); pxLine(c, 2, 18, 19, 2, '#7a5ad8');
    disc(c, 5, 16, 3, '#e8dcff'); disc(c, 5, 16, 1, '#ffffff');
    px(c, 16, 8, 2, 2, '#ffffff'); px(c, 11, 13, 1, 1, '#ffffff');
  },
  ice_burst(c) {
    iconBg(c, '#2a6aa8');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pxLine(c, 11, 11, 11 + Math.cos(a) * 8, 11 + Math.sin(a) * 8, '#d8f4ff');
      px(c, 11 + Math.cos(a) * 5, 11 + Math.sin(a) * 5, 2, 2, '#7ad6ff');
    }
    disc(c, 11, 11, 2, '#ffffff');
  },
  meteor_storm(c) {
    iconBg(c, '#7a2a1a');
    for (const [x, y, s] of [[14, 8, 4], [6, 14, 3], [17, 16, 2]]) {
      pxLine(c, x - 6, y - 7, x - 1, y - 1, '#ffa32a');
      pxLine(c, x - 5, y - 7, x, y - 1, '#ff6a1a');
      disc(c, x, y, s, '#ff6a1a'); disc(c, x, y, s - 1, '#ffc93a');
    }
    px(c, 3, 19, 16, 1, '#3a1208');
  },
  power_strike(c) {
    iconBg(c, '#5a6a82');
    pxLine(c, 4, 18, 17, 4, '#ffffff'); pxLine(c, 5, 18, 18, 4, '#dfe7f2'); pxLine(c, 3, 18, 16, 4, '#9aa6b6');
    px(c, 3, 17, 4, 2, '#c9a13c'); px(c, 2, 19, 3, 3, '#6a4a2c');
    for (let a = -0.3; a < 1.2; a += 0.08) px(c, 11 + Math.cos(a) * 9, 11 + Math.sin(a) * 9 - 2, 1, 1, '#ffe066');
  },
  charge(c) {
    iconBg(c, '#4a5a72');
    for (let i = 0; i < 3; i++) {
      pxLine(c, 3 + i * 3, 5 + i * 5, 14 + i * 2, 5 + i * 5, '#d8e4f4');
      pxLine(c, 12 + i * 2, 3 + i * 5, 16 + i * 2, 5 + i * 5, '#ffffff');
      pxLine(c, 12 + i * 2, 7 + i * 5, 16 + i * 2, 5 + i * 5, '#ffffff');
    }
  },
  sword_whirl(c) {
    iconBg(c, '#3a5a8a');
    for (let a = 0.4; a < 5.8; a += 0.07) px(c, 11 + Math.cos(a) * 7, 11 + Math.sin(a) * 7, 2, 2, a > 4.6 ? '#ffffff' : '#9ac8ff');
    pxLine(c, 11, 11, 17, 5, '#ffffff'); px(c, 16, 3, 3, 3, '#ffffff');
    disc(c, 11, 11, 2, '#c9a13c');
  },
  war_cry(c) {
    iconBg(c, '#8a3a1a');
    // chifre / explosão
    pxLine(c, 4, 16, 12, 8, '#f0ead8'); pxLine(c, 4, 17, 12, 9, '#c9c2b0'); pxLine(c, 5, 15, 13, 7, '#ffffff');
    px(c, 3, 16, 3, 4, '#6a4a2c');
    for (let i = 0; i < 3; i++) { for (let a = -0.7; a < 0.7; a += 0.1) px(c, 12 + Math.cos(a - 0.7) * (5 + i * 3), 9 + Math.sin(a - 0.7) * (5 + i * 3), 1, 1, '#ffd85a'); }
  },
  piercing(c) {
    iconBg(c, '#3a6a2a');
    pxLine(c, 2, 19, 18, 3, '#8a6a3a'); pxLine(c, 3, 19, 19, 3, '#a8803a');
    px(c, 17, 1, 4, 4, '#dfe7f2'); px(c, 18, 2, 2, 2, '#ffffff');
    px(c, 1, 17, 3, 3, '#e8e2d0');
    pxLine(c, 4, 14, 12, 6, '#7ae88a');
  },
  arrow_rain(c) {
    iconBg(c, '#2a6a4a');
    for (const [x, y] of [[5, 3], [11, 7], [16, 4], [8, 13]]) {
      px(c, x, y, 1, 7, '#a8803a'); px(c, x - 1, y + 6, 3, 2, '#dfe7f2'); px(c, x - 1, y - 1, 3, 2, '#e8e2d0');
    }
    ellipse(c, 11, 19, 8, 2, '#1a3a2a');
  },
  explosive_arrow(c) {
    iconBg(c, '#8a4a1a');
    pxLine(c, 2, 19, 11, 10, '#8a6a3a');
    disc(c, 14, 8, 5, '#ff6a1a'); disc(c, 14, 8, 3, '#ffc93a'); disc(c, 14, 8, 1, '#fff2c0');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px(c, 14 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 2, 2, '#ff9a2a'); }
  },
  arrow_fan(c) {
    iconBg(c, '#2a6a3a');
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.36;
      pxLine(c, 11, 19, 11 + Math.cos(a) * 16, 19 + Math.sin(a) * 16, i === 0 ? '#ffffff' : '#c8e8b0');
      px(c, 11 + Math.cos(a) * 16, 19 + Math.sin(a) * 16, 2, 2, '#ffffff');
    }
    disc(c, 11, 19, 2, '#a8803a');
  },
  shadow_strike(c) {
    iconBg(c, '#5a1a2a');
    pxLine(c, 3, 19, 18, 4, '#dfe7f2'); pxLine(c, 4, 19, 19, 4, '#ffffff');
    px(c, 2, 18, 4, 3, '#a8324a'); px(c, 0, 20, 3, 2, '#2b2118');
    for (let i = 0; i < 4; i++) pxLine(c, 3, 7 + i * 3, 10, 7 + i * 3 - 3, '#b02a3a');
  },
  twin_blades(c) {
    iconBg(c, '#4a1a3a');
    pxLine(c, 3, 3, 18, 18, '#dfe7f2'); pxLine(c, 3, 4, 18, 19, '#ffffff');
    pxLine(c, 18, 3, 3, 18, '#dfe7f2'); pxLine(c, 18, 4, 3, 19, '#ffffff');
    disc(c, 11, 11, 2, '#ff6a8a');
    px(c, 2, 18, 3, 3, '#a8324a'); px(c, 17, 18, 3, 3, '#a8324a');
  },
  shadow_step(c) {
    iconBg(c, '#2a1a5a');
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = 0.35 + i * 0.3;
      ellipse(c, 5 + i * 5, 12, 3, 6, i === 2 ? '#8a5aff' : '#4a2a8a');
    }
    c.globalAlpha = 1;
    px(c, 14, 8, 2, 2, '#ffffff'); px(c, 17, 8, 1, 2, '#ffffff');
  },
  smoke_bomb(c) {
    iconBg(c, '#4a4a5a');
    for (const [x, y, r] of [[7, 13, 5], [13, 11, 6], [10, 8, 4], [16, 15, 4]]) { disc(c, x, y, r, '#8a8a9a'); disc(c, x - 1, y - 1, r - 2, '#b8b8c8'); }
    disc(c, 11, 18, 2, '#2a2a3a'); px(c, 11, 15, 1, 2, '#ffd85a');
  },
  roll(c) {
    iconBg(c, '#5a5a2a');
    for (let a = 0.5; a < 5.4; a += 0.07) px(c, 11 + Math.cos(a) * 7, 11 + Math.sin(a) * 7, 2, 2, '#ffe9a0');
    px(c, 15, 3, 5, 2, '#ffe9a0'); px(c, 18, 3, 2, 6, '#ffe9a0');
    disc(c, 11, 11, 2, '#c9a13c');
  },
};

// ===========================================================================
// EFEITOS NOVOS
// ===========================================================================
function registerFx(defSoft) {
  for (let f = 0; f < 3; f++) {
    defSoft(`fx:orb:${f}`, 16, 16, (c) => {
      const s = 5 + f * 0.5;
      disc(c, 8, 8, s, '#7a1aaa');
      disc(c, 8, 8, s - 2, '#e060ff');
      disc(c, 8, 8, Math.max(1, s - 4), '#ffd8ff');
      px(c, 1, 7 + f, 3, 2, '#b04ae0');
    });
    defSoft(`fx:web:${f}`, 14, 14, (c) => {
      c.globalAlpha = 0.95;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; pxLine(c, 7 - Math.cos(a) * 6, 7 - Math.sin(a) * 6, 7 + Math.cos(a) * 6, 7 + Math.sin(a) * 6, '#f0f0f8'); }
      for (const r of [2, 4, 6]) for (let a = 0; a < 6.3; a += 0.4) px(c, 7 + Math.cos(a + f * 0.1) * r, 7 + Math.sin(a + f * 0.1) * r, 1, 1, '#d8d8e8');
      c.globalAlpha = 1;
    });
    defSoft(`fx:meteor:${f}`, 20, 28, (c) => {
      pxLine(c, 4, 0, 10, 14, '#ff6a1a'); pxLine(c, 6, 0, 12, 14, '#ffa32a'); pxLine(c, 5, 1, 11, 15, '#ffd85a');
      disc(c, 11, 18, 6 + (f % 2), '#c93a0a'); disc(c, 11, 18, 4, '#ff7a1a'); disc(c, 10, 17, 2, '#ffe066');
    });
  }
  for (let f = 0; f < 5; f++) {
    defSoft(`fx:smoke:${f}`, 56, 56, (c) => {
      const r = 10 + f * 4;
      c.globalAlpha = 0.9 - f * 0.12;
      for (const [x, y, k] of [[0, 0, 1], [-8, 4, 0.7], [8, 3, 0.75], [-3, -7, 0.65], [5, -6, 0.6]]) {
        disc(c, 28 + x * (1 + f * 0.25), 28 + y * (1 + f * 0.25), r * k, '#8a8a9a');
        disc(c, 28 + x * (1 + f * 0.25) - 1, 28 + y * (1 + f * 0.25) - 1, r * k * 0.7, '#b0b0c0');
      }
      c.globalAlpha = 1;
    });
    defSoft(`fx:shock:${f}`, 64, 64, (c) => {
      const r = 8 + f * 6;
      c.globalAlpha = 1 - f * 0.17;
      for (let a = 0; a < Math.PI * 2; a += 0.04) {
        px(c, 32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3, 3, '#ffd85a');
        px(c, 32 + Math.cos(a) * (r - 3), 32 + Math.sin(a) * (r - 3), 2, 2, '#ffffff');
      }
      c.globalAlpha = 1;
    });
  }
}

// ===========================================================================
export function registerExtraSprites({ def, defSoft, paintHumanoid, FOUR_DIR_PAINT }) {
  for (let f = 0; f < 4; f++) {
    def(`bat:${f}`, 20, 16, (c) => paintBat(c, f), false);
    def(`boar:${f}`, 30, 20, (c) => paintBoar(c, f));
    def(`spider:${f}`, 24, 19, (c) => paintSpider(c, f));
    def(`wraith:${f}`, 20, 26, (c) => paintWraith(c, f), false);
    def(`golem:${f}`, 28, 30, (c) => paintGolem(c, f));
    def(`spider_queen:${f}`, 56, 46, (c) => paintSpiderQueen(c, f));
    def(`lich:${f}`, 42, 50, (c) => paintLich(c, f));
    def(`titan:${f}`, 60, 62, (c) => paintTitan(c, f));
  }
  for (let d = 0; d < 4; d++) {
    for (let f = 0; f < 4; f++) {
      def(`bandit:${d}:${f}`, 20, 27, (c) => paintHumanoid(c, BANDIT_SPEC, d, f));
      def(`cultist:${d}:${f}`, 20, 27, (c) => paintHumanoid(c, CULTIST_SPEC, d, f));
    }
  }
  // NPCs
  for (const [id, spec] of Object.entries(NPC_ART_EXTRA)) {
    for (let d = 0; d < 4; d++) for (let f = 0; f < 4; f++) def(`npc:${id}:${d}:${f}`, 22, 27, (c) => paintHumanoid(c, spec, d, f, 22));
  }
  for (const kind of ['dog', 'cat']) {
    for (let d = 0; d < 4; d++) for (let f = 0; f < 4; f++) def(`npc:${kind}:${d}:${f}`, 20, 16, (c) => paintPet(c, kind, f, d === 2 || d === 0));
  }
  // ícones de habilidade
  for (const [id, fn] of Object.entries(ICONS)) {
    defSoft(`skill:${id}`, 22, 22, (c) => fn(c));
  }
  registerFx(defSoft);
  // teia no chão (decalque do covil da Rainha Aranha)
  def('web', 30, 20, (c) => {
    c.globalAlpha = 0.8;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; pxLine(c, 15 - Math.cos(a) * 13, 10 - Math.sin(a) * 8, 15 + Math.cos(a) * 13, 10 + Math.sin(a) * 8, '#e6e6f0'); }
    for (const r of [3, 6, 9, 12]) for (let a = 0; a < 6.3; a += 0.35) px(c, 15 + Math.cos(a) * r, 10 + Math.sin(a) * r * 0.62, 1, 1, '#cfcfe0');
    c.globalAlpha = 1;
  }, false);
}

export const EXTRA_SKILL_ICON_IDS = Object.keys(ICONS);
