// ---------------------------------------------------------------------------
// shots.mjs — gera PNGs reais (sprites e trechos do mapa) usando o rasterizador
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { RasterCanvas, encodePNG } from './raster.mjs';

const OUT = process.env.SHOT_DIR || '/home/user/shots';
fs.mkdirSync(OUT, { recursive: true });

const fakeDocument = {
  createElement(tag) {
    if (tag === 'canvas') return new RasterCanvas(1, 1);
    return { style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], dataset: {} };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
};
globalThis.document = fakeDocument;
globalThis.window = { innerWidth: 1280, innerHeight: 800, addEventListener() {}, devicePixelRatio: 1, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
globalThis.localStorage = globalThis.window.localStorage;

const { registerAllSprites, S } = await import('../src/sprites.js');
const { generateOverworld, generateDungeon, generateThrone } = await import('../src/world/mapgen.js');
const { GameMap, TS } = await import('../src/world/map.js');
registerAllSprites();

// --- folha de sprites -------------------------------------------------------
function sheet(name, keys, cellW, cellH, cols, scale = 2, labels = false) {
  const rows = Math.ceil(keys.length / cols);
  const cv = new RasterCanvas(cols * cellW * scale, rows * cellH * scale);
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.scale(scale, scale);
  // xadrez de fundo
  for (let y = 0; y < rows * cellH; y += 4) {
    for (let x = 0; x < cols * cellW; x += 4) {
      c.fillStyle = ((x / 4 + y / 4) % 2) ? '#2a2740' : '#221f34';
      c.fillRect(x, y, 4, 4);
    }
  }
  keys.forEach((k, i) => {
    const spr = S(k);
    const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
    if (spr) c.drawImage(spr, cx + Math.floor((cellW - spr.width) / 2), cy + (cellH - spr.height));
  });
  fs.writeFileSync(path.join(OUT, name), cv.toPNG());
  console.log('  gravado', name, cv.width + 'x' + cv.height);
}

console.log('Sprites:');
const heroKeys = [];
for (const id of ['mage', 'knight', 'archer', 'assassin']) {
  for (let f = 0; f < 4; f++) for (let fr = 0; fr < 4; fr++) heroKeys.push(`hero:${id}:${f}:${fr}`);
}
sheet('heroes.png', heroKeys, 24, 30, 16, 3);

const enemyKeys = [];
for (const t of ['slime', 'goblin', 'wolf', 'skeleton', 'orc', 'elite']) for (let f = 0; f < 4; f++) enemyKeys.push(`${t}:${f}`);
for (const t of ['soldier_sword', 'soldier_archer', 'soldier_heavy']) for (let d = 0; d < 4; d++) for (let f = 0; f < 2; f++) enemyKeys.push(`${t}:${d}:${f}`);
for (let f = 0; f < 4; f++) enemyKeys.push(`boss:${f}`);
sheet('enemies.png', enemyKeys, 34, 40, 12, 3);

const npcKeys = [];
for (const n of ['king', 'blacksmith', 'merchant', 'healer', 'guard', 'villager_m', 'villager_f', 'elder', 'child']) {
  for (let f = 0; f < 4; f++) npcKeys.push(`npc:${n}:${f}:0`);
}
sheet('npcs.png', npcKeys, 26, 32, 9, 3);

const propKeys = ['tree:0', 'tree:1', 'pine', 'deadtree', 'stump', 'rock:0', 'rock:1', 'bush', 'bushberry',
  'mushroom', 'wheat', 'hay', 'sign', 'well', 'statue', 'barrel', 'crate', 'anvil', 'stall', 'tent', 'cart',
  'gravestone', 'pillar', 'brokenpillar', 'crystal:0', 'crystal:1', 'portal', 'throne', 'banner', 'ruinwall',
  'torch:0', 'campfire:0', 'chest:0:0', 'chest:1:0', 'chest:2:0', 'chest:3:0', 'chest:3:1'];
sheet('props.png', propKeys, 42, 44, 10, 2);

// armas
sheet('weapons.png', ['w:staff', 'w:sword', 'w:bow', 'w:dagger', 'w:spear', 'w:hammer', 'w:club', 'w:axe', 'w:greataxe', 'w:scepter'], 36, 36, 10, 3);

// --- trechos do mapa --------------------------------------------------------
console.log('Mapas:');
function renderChunk(name, map, tx, ty, tw, th, scale = 1, time = 0.3) {
  const cv = new RasterCanvas(tw * TS * scale, th * TS * scale);
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.scale(scale, scale);
  const cam = { left: tx * TS, top: ty * TS, right: (tx + tw) * TS, bottom: (ty + th) * TS, visible: () => true };
  c.translate(-cam.left, -cam.top);
  map.drawGround(c, cam, time);
  const list = map.objects
    .filter((o) => o.x > cam.left - 60 && o.x < cam.right + 60 && o.y > cam.top - 80 && o.y < cam.bottom + 40)
    .slice()
    .sort((a, b) => a.y - b.y);
  for (const o of list) map.drawObject(c, o, time);
  fs.writeFileSync(path.join(OUT, name), cv.toPNG());
  console.log('  gravado', name, cv.width + 'x' + cv.height, `(${list.length} objetos)`);
}

const ow = new GameMap(generateOverworld(20260828));
const dn = new GameMap(generateDungeon(777));
const th2 = new GameMap(generateThrone());

renderChunk('map_city.png', ow, 30, 92, 63, 47, 1);
renderChunk('map_forest.png', ow, 8, 30, 56, 40, 1);
renderChunk('map_fields.png', ow, 92, 92, 60, 48, 1);
renderChunk('map_ruins.png', ow, 128, 28, 56, 46, 1);
renderChunk('map_valley.png', ow, 146, 74, 48, 58, 1);
renderChunk('map_cave_entrance.png', ow, 104, 12, 24, 20, 2);
renderChunk('map_dungeon.png', dn, 0, 0, dn.w, dn.h, 1);
renderChunk('map_throne.png', th2, 0, 0, th2.w, th2.h, 2);
console.log('OK');
