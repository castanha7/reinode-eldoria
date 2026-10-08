// ---------------------------------------------------------------------------
// run.mjs — suíte de verificação que executa o jogo real em Node
// ---------------------------------------------------------------------------
import { installDom } from './harness.mjs';
installDom();

const { registerAllSprites, } = await import('../src/sprites.js');
const pixel = await import('../src/core/pixel.js');
const { getSprite } = pixel;
const { Game } = await import('../src/game/game.js');
const { UI } = await import('../src/ui/panels.js');
const { Input } = await import('../src/core/input.js');
const { CLASSES, CLASS_IDS, xpForLevel, baseStatsAt } = await import('../src/data/classes.js');
const { ITEMS, rollEquipment, rollRarity, CONSUMABLES, consumable } = await import('../src/data/items.js');
const { ENEMIES, pickSpawn, REGION_SPAWNS } = await import('../src/data/enemies.js');
const { QUESTS } = await import('../src/data/quests.js');
const { generateOverworld, generateDungeon, generateThrone } = await import('../src/world/mapgen.js');
const { TILE, SOLID } = await import('../src/world/tiles.js');
const { Enemy } = await import('../src/game/enemy.js');

// --- utilitário: área aberta (sem obstáculos) dentro de uma zona -----------
function findClearSpot(game, zoneId, tw = 16, th = 5) {
  const m = game.maps.overworld;
  const z = m.zones.find((q) => q.id === zoneId);
  for (let ty = z.y + 2; ty < z.y + z.h - th - 2; ty++) {
    for (let tx = z.x + 2; tx < z.x + z.w - tw - 2; tx++) {
      let clear = true;
      for (let yy = ty; yy < ty + th && clear; yy++) for (let xx = tx; xx < tx + tw; xx++) if (m.isBlockedTile(xx, yy) || m.isSolidTile(xx, yy)) { clear = false; break; }
      if (clear) return { x: (tx + 2) * 16 + 8, y: (ty + 2) * 16 + 8 };
    }
  }
  throw new Error('sem área livre em ' + zoneId);
}
function toField(game, zoneId = 'fields') {
  if (game.map.id !== 'overworld') game.loadMap('overworld', game.maps.overworld.spawn);
  const sp = findClearSpot(game, zoneId);
  game.player.x = sp.x; game.player.y = sp.y;
  game.camera.snap(sp.x, sp.y, { w: game.map.pxW, h: game.map.pxH });
  game.enemies.length = 0;
  return sp;
}

// --- mini framework de testes ----------------------------------------------
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); console.log('  ✗ ' + msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} (esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)})`); }
function section(name) { console.log('\n▸ ' + name); }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, `${msg} (esperado ~${b}, obtido ${a})`); }

// ===========================================================================
section('1. Sprites — todas as chaves usadas pelo jogo existem');
registerAllSprites();
const requiredSprites = [];
for (const id of CLASS_IDS) {
  for (let f = 0; f < 4; f++) for (let fr = 0; fr < 4; fr++) requiredSprites.push(`hero:${id}:${f}:${fr}`);
  requiredSprites.push(`heroicon:${id}`);
}
for (const k of Object.keys(ENEMIES)) {
  const d = ENEMIES[k];
  if (['soldier_sword', 'soldier_archer', 'soldier_heavy', 'bandit', 'cultist', 'shaman'].includes(k)) {
    for (let f = 0; f < 4; f++) for (let fr = 0; fr < 4; fr++) requiredSprites.push(`${k}:${f}:${fr}`);
  } else for (let fr = 0; fr < 4; fr++) requiredSprites.push(`${k}:${fr}`);
}
for (const n of ['king', 'blacksmith', 'merchant', 'healer', 'guard', 'villager_m', 'villager_f', 'elder', 'child']) {
  for (let f = 0; f < 4; f++) for (let fr = 0; fr < 4; fr++) requiredSprites.push(`npc:${n}:${f}:${fr}`);
}
for (const p of ['tree:0', 'tree:1', 'pine', 'deadtree', 'stump', 'rock:0', 'rock:1', 'mountain', 'bush', 'bushberry',
  'mushroom', 'wheat', 'hay', 'lily', 'fence_h', 'fence_v', 'sign', 'well', 'statue', 'barrel', 'crate', 'anvil',
  'stall', 'tent', 'cart', 'gravestone', 'bones', 'pillar', 'brokenpillar', 'crystal:0', 'crystal:1', 'portal',
  'throne', 'banner', 'ruinwall', 'gate']) requiredSprites.push(p);
for (let f = 0; f < 3; f++) requiredSprites.push(`torch:${f}`);
for (let f = 0; f < 2; f++) requiredSprites.push(`campfire:${f}`);
for (let t = 0; t < 4; t++) { requiredSprites.push(`chest:${t}:0`, `chest:${t}:1`); }
for (let f = 0; f < 3; f++) requiredSprites.push(`fx:fireball:${f}`, `fx:ice:${f}`, `fx:bolt:${f}`, `fx:slash:${f}`, `fx:slashred:${f}`);
for (let f = 0; f < 5; f++) requiredSprites.push(`fx:boom:${f}`, `fx:frost:${f}`, `fx:ring:${f}`);
for (const s of ['fx:arrow', 'fx:arrow_fire', 'fx:bone', 'fx:stone', 'fx:shadowstep', 'fx:heal', 'fx:star',
  'w:staff', 'w:sword', 'w:bow', 'w:dagger', 'w:spear', 'w:hammer', 'w:club', 'w:axe', 'w:greataxe', 'w:scepter']) {
  requiredSprites.push(s);
}
let missing = 0;
for (const k of requiredSprites) if (!getSprite(k)) { missing++; if (missing < 8) console.log('   faltando: ' + k); }
eq(missing, 0, `todos os ${requiredSprites.length} sprites obrigatórios existem`);

// tiles
const tileMissing = [];
for (const [name, t] of Object.entries(TILE)) {
  if (name === 'VOID') continue;
  const has = getSprite(`tile:${t}:0`) || (t === TILE.WATER && getSprite(`tile:${TILE.WATER}:0:0`));
  if (!has) tileMissing.push(name);
}
eq(tileMissing.join(','), '', 'todos os tipos de tile têm sprite');

// ===========================================================================
section('2. Geração de mapas e resolução de sprites dos objetos');
const ow = generateOverworld(20260828);
const dn = generateDungeon(777);
const th = generateThrone();
eq(ow.w, 200, 'mundo: largura');
eq(ow.h, 150, 'mundo: altura');
ok(ow.objects.length > 1200, `mundo tem objetos suficientes (${ow.objects.length})`);
const chestCount = ow.entities.filter((e) => e.type === 'chest').length;
const npcCount = ow.entities.filter((e) => e.type === 'npc').length;
ok(chestCount >= 25, `mundo tem baús (${chestCount})`);
ok(npcCount >= 14, `mundo tem NPCs (${npcCount})`);
ok(ow.exits.length === 2, `mundo tem 2 saídas (caverna + castelo), obtido ${ow.exits.length}`);
const secretZones = ow.zones.filter((z) => z.secret).length;
ok(secretZones === 3, `mundo tem 3 áreas secretas, obtido ${secretZones}`);
ok(!SOLID[ow.tiles[Math.floor(ow.spawn.y / 16) * ow.w + Math.floor(ow.spawn.x / 16)]], 'ponto inicial do jogador é caminhável');
ok(dn.entities.some((e) => e.type === 'enemy' && e.boss), 'masmorra tem o chefe');
ok(th.entities.some((e) => e.type === 'npc' && e.npcId === 'king'), 'sala do trono tem o rei');

function resolveObjectSprite(o) {
  if (o.animated) {
    for (let f = 0; f < o.animated; f++) { const s = getSprite(`${o.sprite}:${f}`); if (s) return s; }
  }
  return getSprite(o.sprite) || getSprite(`${o.sprite}:0`);
}
for (const [name, m] of [['overworld', ow], ['dungeon', dn], ['throne', th]]) {
  let bad = 0;
  const badNames = new Set();
  for (const o of m.objects) {
    if (!resolveObjectSprite(o)) { bad++; badNames.add(o.sprite); }
  }
  eq(bad, 0, `${name}: todos os ${m.objects.length} objetos têm sprite` + (bad ? ` — sem sprite: ${[...badNames].join(', ')}` : ''));
}

// ===========================================================================
section('3. Dados de classes, itens e inimigos');
for (const id of CLASS_IDS) {
  const c = CLASSES[id];
  eq(c.skills.length, 5, `${c.name}: 5 habilidades`);
  ok(c.stats.hp > 0 && c.stats.atk > 0, `${c.name}: atributos positivos`);
  for (const s of c.skills) ok(s.params && s.cd > 0 && s.cost >= 0, `${c.name}/${s.name}: parâmetros válidos`);
}
ok(CLASSES.knight.stats.speed < CLASSES.assassin.stats.speed - 30, 'cavaleiro é bem mais lento que o assassino');
ok(CLASSES.knight.stats.hp > CLASSES.mage.stats.hp * 1.8, 'cavaleiro tem muito mais vida que o mago');
ok(CLASSES.mage.stats.atk > CLASSES.knight.stats.atk * 0.7 && CLASSES.mage.stats.range > 200, 'mago ataca de longe');
ok(xpForLevel(2) > xpForLevel(1) && xpForLevel(10) > xpForLevel(9), 'curva de XP crescente');
const lvl10 = baseStatsAt('knight', 10);
ok(lvl10.hp > baseStatsAt('knight', 1).hp * 2, 'atributos crescem com o nível');

let badRoll = 0;
for (const cls of CLASS_IDS) {
  for (let i = 0; i < 200; i++) {
    const it = rollEquipment(Math.random, cls, 1 + (i % 4));
    if (!it || it.cls !== cls || !it.slot) badRoll++;
  }
}
eq(badRoll, 0, 'loot sempre gera equipamento da classe do jogador');
const rarities = new Set();
for (let i = 0; i < 4000; i++) rarities.add(rollRarity(Math.random, 4));
eq(rarities.size, 5, 'todas as 5 raridades aparecem nos baús');
ok(ITEMS.length >= 60, `catálogo de itens (${ITEMS.length})`);
ok(CONSUMABLES.length >= 4, `consumíveis (${CONSUMABLES.length})`);

// inimigos distintos
const names = new Set(Object.values(ENEMIES).map((e) => e.name));
ok(Object.keys(ENEMIES).length >= 11, `tipos de inimigo (${Object.keys(ENEMIES).length})`);
eq(names.size, Object.keys(ENEMIES).length, 'cada inimigo tem nome único');
ok(ENEMIES.boss.hp > ENEMIES.elite.hp, 'chefe é mais forte que o elite');
for (const r of Object.keys(REGION_SPAWNS)) {
  for (const [id] of REGION_SPAWNS[r]) ok(!!ENEMIES[id], `spawn de ${r} referencia inimigo válido (${id})`);
}

// ===========================================================================
section('4. Partida real: movimento, câmera e loop');
const ui = new UI();
const fakeCanvas = document.createElement('canvas');
const game2 = new Game(fakeCanvas, ui);
game2.init();
ok(!!game2.map, 'jogo inicializa com mapa carregado');
eq(game2.state, 'title', 'estado inicial é title');
game2.startRun('knight');
eq(game2.state, 'playing', 'estado após escolher classe');
eq(game2.player.cls.id, 'knight', 'classe escolhida aplicada');
const x0 = game2.player.x, y0 = game2.player.y;
Input.keys.KeyD = true;
for (let i = 0; i < 90; i++) game2.frame(1 / 60);
Input.keys.KeyD = false;
ok(game2.player.x > x0 + 40, `jogador andou para a direita (Δx=${(game2.player.x - x0).toFixed(1)})`);
Input.keys.KeyS = true;
for (let i = 0; i < 60; i++) game2.frame(1 / 60);
Input.keys.KeyS = false;
ok(game2.player.y > y0 + 20, `jogador andou para baixo (Δy=${(game2.player.y - y0).toFixed(1)})`);
ok(!game2.map.blocked(game2.player.x, game2.player.y, game2.player.radius), 'jogador nunca fica dentro de parede');

// colisão: empurrar contra uma parede não atravessa
let blockedOk = true;
for (let i = 0; i < 400; i++) {
  Input.keys.KeyW = true;
  game2.frame(1 / 60);
}
Input.keys.KeyW = false;
ok(!game2.map.blocked(game2.player.x, game2.player.y, game2.player.radius), 'colisão impede atravessar terreno sólido');

// ===========================================================================
section('5. Combate: dano, crítico, morte, XP, ouro e missão');
toField(game2);
game2.player.level = 5;
game2.player.recompute();
game2.player.hp = game2.player.maxHp;
const e = game2.spawnEnemy('slime', game2.player.x + 30, game2.player.y);
const hpBefore = e.hp;
const dealt = game2.hitEnemy(e, 20, { from: game2.player, crit: false });
ok(dealt > 0, `dano aplicado ao slime (${dealt})`);
ok(e.hp < hpBefore, 'PV do inimigo caiu');
const xp0 = game2.player.xp + (game2.player.level - 1) * 1000;
const gold0 = game2.player.gold;
game2.hitEnemy(e, 99999, { from: game2.player });
ok(e.dead, 'inimigo morre com dano suficiente');
for (let i = 0; i < 40; i++) game2.frame(1 / 60);
ok(game2.player.gold > gold0, `ouro ganho ao matar (${gold0} → ${game2.player.gold})`);
ok(game2.enemies.indexOf(e) === -1, 'inimigo morto é removido da lista');
ok(game2.stats.kills >= 1, 'contador de abates incrementa');

// missão do rei progredir com monstros
const q1 = game2.quests[QUESTS[0].id];
eq(q1.state, 'active', 'primeira missão começa ativa');
for (let i = 0; i < QUESTS[0].goal.count + 2; i++) {
  const m = game2.spawnEnemy('slime', game2.player.x + 20, game2.player.y + 20);
  game2.hitEnemy(m, 99999, { from: game2.player });
  for (let f = 0; f < 3; f++) game2.frame(1 / 60);
}
eq(game2.quests[QUESTS[0].id].state, 'done', 'missão fica concluída ao matar o necessário');

// dano no jogador
game2.player.iframe = 0;
const hpP = game2.player.hp;
game2.hitPlayer(30, {});
ok(game2.player.hp < hpP, 'jogador recebe dano');
ok(game2.player.iframe > 0, 'jogador ganha invulnerabilidade temporária');
const hpAfterIframe = game2.player.hp;
game2.hitPlayer(30, {});
eq(game2.player.hp, hpAfterIframe, 'iframe bloqueia dano repetido');

// esquiva/defesa
game2.player.iframe = 0;
const before = game2.player.hp;
game2.hitPlayer(1, {});
ok(before - game2.player.hp < 1.5, 'defesa reduz dano mínimo');
game2.player.iframe = 0;
game2.hitPlayer(100000, {});
ok(game2.player.dead, 'jogador morre com dano massivo');
ok(!document.querySelector('#death').classList.contains('hidden'), 'tela de morte aparece');
for (let i = 0; i < 260; i++) game2.frame(1 / 60);
ok(game2.player.dead, 'jogador continua caído até o jogador escolher renascer (sem renascer sozinho)');
Input.pressed.Enter = true;
game2.frame(1 / 60);
ok(!game2.player.dead, 'jogador renasce ao confirmar (Enter)');
ok(ui.el.death.classList.contains('hidden'), 'tela de morte some após renascer');
eq(game2.map.id, 'overworld', 'renascimento acontece no mundo aberto');

// ===========================================================================
section('6. Habilidades de todas as classes causam efeito');
for (const cls of CLASS_IDS) {
  const C = CLASSES[cls];
  for (let s = 0; s < 4; s++) {
    game2.mapData.overworld.enemies.length = 0;
    game2.startRun(cls);
    game2.player.level = 12;
    game2.player.recompute();
    game2.player.hp = game2.player.maxHp;
    game2.player.mana = game2.player.maxMana;
    toField(game2);
    const targets = [];
    for (let i = 0; i < 4; i++) {
      targets.push(game2.spawnEnemy('goblin', game2.player.x + 30 + i * 14, game2.player.y + (i % 2 ? 7 : -7)));
    }
    const aim = targets[0];
    Input.mouse.x = (aim.x - game2.camera.left) * game2.camera.zoom;
    Input.mouse.y = ((aim.y - 8) - game2.camera.top) * game2.camera.zoom;
    game2.frame(1 / 60); // atualiza a mira
    const hpSum = targets.reduce((a, t) => a + Math.max(0, t.hp), 0);
    game2.player.cast(game2, s);
    for (let f = 0; f < (C.skills[s].kind === 'meteor' ? 170 : 70); f++) {
      Input.mouse.x = (aim.x - game2.camera.left) * game2.camera.zoom;
      Input.mouse.y = ((aim.y - 8) - game2.camera.top) * game2.camera.zoom;
      game2.frame(1 / 60);
    }
    const hpAfter = targets.reduce((a, t) => a + Math.max(0, t.hp), 0);
    const sk = C.skills[s];
    ok(hpAfter < hpSum || sk.kind === 'blink',
      `${C.name} / ${sk.name} (${sk.kind}) causa dano (${hpSum} → ${hpAfter})`);
    ok(game2.player.skillCd[s] > 0, `${C.name} / ${sk.name} entra em cooldown`);
  }
  // ataque básico
  game2.mapData.overworld.enemies.length = 0;
  game2.startRun(cls);
  toField(game2);
  game2.player.level = 8; game2.player.recompute();
  const t2 = game2.spawnEnemy('goblin', game2.player.x + (C.stats.range > 100 ? 90 : 22), game2.player.y);
  Input.mouse.x = (t2.x - game2.camera.left) * game2.camera.zoom;
  Input.mouse.y = ((t2.y - 8) - game2.camera.top) * game2.camera.zoom;
  const hpb = t2.hp;
  Input.mouse.down = true;
  for (let f = 0; f < 90; f++) {
    Input.mouse.x = (t2.x - game2.camera.left) * game2.camera.zoom;
    Input.mouse.y = ((t2.y - 8) - game2.camera.top) * game2.camera.zoom;
    game2.frame(1 / 60);
  }
  Input.mouse.down = false;
  ok(t2.hp < hpb || t2.dead, `${C.name}: ataque básico atinge o alvo (${hpb} → ${t2.hp})`);
}

// ===========================================================================
section('7. Baús, loot adequado à classe e inventário');
for (const cls of CLASS_IDS) {
  game2.startRun(cls);
  const chest = game2.chests.find((c) => !c.opened);
  ok(!!chest, `${CLASSES[cls].name}: há baús no mapa`);
  const inv0 = game2.player.inventory.slice();
  chest.open(game2);
  ok(chest.opened, `${CLASSES[cls].name}: baú abre`);
  const added = game2.player.inventory.filter((i) => !inv0.some((o) => o.uid === i.uid));
  ok(added.length >= 1, `${CLASSES[cls].name}: baú dá pelo menos um item`);
  const equip = added.find((i) => i.slot);
  ok(!!equip, `${CLASSES[cls].name}: baú dá um equipamento`);
  eq(equip.cls, cls, `${CLASSES[cls].name}: equipamento é da classe do jogador (${equip.name})`);
  ok(Object.keys(equip.stats).length > 0, `${CLASSES[cls].name}: equipamento tem atributos`);
  game2.player.equipItem(equip.uid);
  ok(game2.player.equip[equip.slot] === equip, `${CLASSES[cls].name}: equipa no slot ${equip.slot}`);
  // baú aberto não dá item de novo
  const n1 = game2.player.inventory.length;
  chest.open(game2);
  eq(game2.player.inventory.length, n1, 'baú aberto não pode ser saqueado de novo');
}

// ===========================================================================
section('8. NPCs: diálogo, loja, ferreiro, curandeira e missões');
game2.startRun('archer');
game2.player.gold = 5000;
game2.loadMap('throne', { x: game2.maps.throne.spawn.x, y: game2.maps.throne.spawn.y });
const king = game2.npcs.find((n) => n.npcId === 'king');
ok(!!king, 'rei presente na sala do trono');
ok(game2.npcs.filter((n) => n.def.sprite === 'guard').length >= 2, 'guardas protegem o salão do trono');
game2.loadMap('overworld', { x: game2.maps.overworld.spawn.x, y: game2.maps.overworld.spawn.y });
const merchant = game2.npcs.find((n) => n.npcId === 'merchant');
const smith = game2.npcs.find((n) => n.npcId === 'blacksmith');
const healer = game2.npcs.find((n) => n.npcId === 'healer');
ok(!!merchant && !!smith && !!healer, 'ferreiro, comerciante e curandeira existem na cidade');
ok(game2.npcs.length >= 14, `cidade tem NPCs (${game2.npcs.length})`);
for (const n of game2.npcs) ok(!!n.def.name && n.def.dialog.length > 0, `NPC ${n.npcId} tem nome e fala`);
const spritesNpc = new Set(game2.npcs.map((n) => n.def.sprite));
ok(spritesNpc.size >= 4, `NPCs têm visuais variados (${[...spritesNpc].join(', ')})`);

// diálogo do mercador abre a loja
ui.openNpc(merchant);
ok(!ui.el.dialog.classList.contains('hidden'), 'diálogo abre ao falar com NPC');
for (let i = 0; i < 6; i++) ui.advanceDialog();
ok(!ui.el.shop.classList.contains('hidden'), 'loja abre após o diálogo');
ok(ui.shopItems.length >= 3, `loja tem itens à venda (${ui.shopItems.length})`);
ok(ui.shopItems.every((i) => i.cls === 'archer'), 'loja vende itens da classe do jogador');
const goldB = game2.player.gold, invB = game2.player.inventory.length;
ui.onAction({ dataset: { act: 'buy', idx: '0' }, classList: { contains: () => false }, disabled: false });
ok(game2.player.gold < goldB, 'comprar gasta ouro');
eq(game2.player.inventory.length, invB + 1, 'comprar adiciona item');
game2.player.gold = 0;
const gNo = game2.player.gold;
ui.onAction({ dataset: { act: 'buy', idx: '0' }, classList: { contains: () => false }, disabled: false });
eq(game2.player.gold, gNo, 'sem ouro não há compra');
game2.player.gold = 5000;

// vender
const toSell = game2.player.inventory.find((i) => i.slot);
const goldS = game2.player.gold;
ui.onAction({ dataset: { act: 'sell', uid: toSell.uid }, classList: { contains: () => false }, disabled: false });
ok(game2.player.gold > goldS, 'vender rende ouro');

// ferreiro
ui.openNpc(smith);
for (let i = 0; i < 6; i++) ui.advanceDialog();
const up0 = game2.player.weaponUpgrades, atk0 = game2.player.stats.atk;
ui.onAction({ dataset: { act: 'forge' }, classList: { contains: () => false }, disabled: false });
eq(game2.player.weaponUpgrades, up0 + 1, 'ferreiro reforja a arma');
ok(game2.player.stats.atk > atk0, `reforjo aumenta dano (${atk0.toFixed(1)} → ${game2.player.stats.atk.toFixed(1)})`);

// curandeira
game2.player.hp = 5;
ui.openNpc(healer);
for (let i = 0; i < 6; i++) ui.advanceDialog();
ui.onAction({ dataset: { act: 'heal' }, classList: { contains: () => false }, disabled: false });
eq(game2.player.hp, game2.player.maxHp, 'curandeira restaura toda a vida');

// poções
game2.player.hp = 5;
let pot = game2.player.inventory.find((i) => i.heal);
if (!pot) { pot = consumable('potion_hp'); game2.player.addItem(pot); }
game2.player.useItem(pot.uid, game2);
ok(game2.player.hp > 5, 'poção de vida cura');

// rei: aceitar e entregar missão
function advanceToChoices(u, max = 24) {
  for (let i = 0; i < max; i++) {
    const d = u.dialogState;
    if (!d) return null;
    if (d.choices && d.i >= d.lines.length - 1) return d.choices;
    u.advanceDialog();
  }
  return u.dialogState ? u.dialogState.choices : null;
}
game2.quests[QUESTS[0].id] = { state: 'available', progress: 0 };
ui.openNpc(king);
const choices = advanceToChoices(ui);
ok(!!choices && choices.some((c) => c.act === 'quest-accept'), 'rei oferece uma missão');
const qid = choices.find((c) => c.act === 'quest-accept').id;
ui.onAction({ dataset: { act: 'quest-accept', id: qid }, classList: { contains: () => false }, disabled: false });
eq(game2.quests[qid].state, 'active', 'missão aceita fica ativa');
const q = QUESTS.find((x) => x.id === qid);
if (q.goal.zones) {
  // abates fora da zona da missão não contam
  const pr0 = game2.quests[qid].progress;
  const outside = game2.spawnEnemy('slime', game2.player.x + 20, game2.player.y + 20);
  game2.hitEnemy(outside, 99999, { from: game2.player });
  for (let f = 0; f < 2; f++) game2.frame(1 / 60);
  eq(game2.quests[qid].progress, pr0, 'abate fora da zona da missão não conta');
  toField(game2, q.goal.zones[0]);
}
for (let i = 0; i < q.goal.count; i++) {
  const m = game2.spawnEnemy(q.goal.tag === 'soldier' ? 'soldier_sword' : 'slime', game2.player.x + 20, game2.player.y + 20);
  game2.hitEnemy(m, 99999, { from: game2.player });
  for (let f = 0; f < 2; f++) game2.frame(1 / 60);
}
eq(game2.quests[qid].state, 'done', 'missão completa ao cumprir o objetivo');
ui.openNpc(king);
const ch2 = advanceToChoices(ui);
const turn = ch2 && ch2.find((c) => c.act === 'quest-turn');
ok(!!turn, 'rei permite entregar a missão');
const goldQ = game2.player.gold, lvlQ = game2.player.level, xpQ = game2.player.xp;
ui.onAction({ dataset: { act: 'quest-turn', id: qid }, classList: { contains: () => false }, disabled: false });
eq(game2.quests[qid].state, 'complete', 'missão marcada como completa');
ok(game2.player.gold > goldQ, 'recompensa em ouro recebida');
ok(game2.player.level > lvlQ || game2.player.xp > xpQ, 'recompensa em XP recebida');
ui.renderQuests();
ok(ui.el['quests'] !== undefined, 'diário de missões renderiza sem erro');
ui.renderInventory();
ui.renderHelp();

// ===========================================================================
section('9. Viagem entre mapas e chefe');
game2.loadMap('throne', { x: game2.maps.throne.spawn.x, y: game2.maps.throne.spawn.y });
eq(game2.map.id, 'throne', 'entra na sala do trono');
ok(game2.npcs.some((n) => n.npcId === 'king'), 'rei está na sala do trono');
game2.loadMap('dungeon', { x: game2.maps.dungeon.spawn.x, y: game2.maps.dungeon.spawn.y });
eq(game2.map.id, 'dungeon', 'entra na masmorra');
const boss = game2.enemies.find((e) => e.isBoss);
ok(!!boss, 'chefe existe na masmorra');
eq(boss.type, 'boss', 'chefe é o Guardião');
ok(game2.enemies.length >= 5, `masmorra tem inimigos (${game2.enemies.length})`);
ok(game2.chests.length >= 5, `masmorra tem baús (${game2.chests.length})`);
// luta contra o chefe: fases
game2.player.level = 20; game2.player.recompute();
game2.player.hp = game2.player.maxHp;
const bossMax = boss.maxHp;
boss.hp = bossMax * 0.6;
boss.update(0.016, game2);
eq(boss.phase, 2, 'chefe muda para a fase 2');
boss.hp = bossMax * 0.3;
boss.update(0.016, game2);
eq(boss.phase, 3, 'chefe muda para a fase 3');
const enBefore = game2.enemies.length;
boss.summonT = 0;
boss.update(0.016, game2);
ok(game2.enemies.length > enBefore, 'chefe invoca crias na fase 3');
game2.hitEnemy(boss, 999999, { from: game2.player });
ok(boss.dead, 'chefe pode ser derrotado');
eq(game2.quests[QUESTS[3].id] ? true : false, true, 'missão do chefe existe no registro');

// ===========================================================================
section('10. Save / Load');
game2.startRun('mage');
game2.player.level = 7;
game2.player.recompute();
const chest = game2.chests.find((c) => !c.opened);
chest.open(game2);
game2.player.gold = 777;
const invLen = game2.player.inventory.length;
const lvlSave = game2.player.level;
game2.save();
const ui2 = new UI();
const game3 = new Game(document.createElement('canvas'), ui2);
game3.init();
const loaded = game3.loadSave();
ok(loaded, 'save carregado');
eq(game3.player.cls.id, 'mage', 'classe preservada');
eq(game3.player.level, 7, 'nível preservado');
eq(game3.player.gold, 777, 'ouro preservado');
eq(game3.player.inventory.length, invLen, 'inventário preservado');
const c2 = game3.chests.find((c) => c.key === chest.key);
ok(c2 && c2.opened, 'estado de baú aberto preservado');

// ===========================================================================
section('11. Spawn dinâmico e IA dos inimigos');
game2.startRun('assassin');
game2.loadMap('overworld', { x: game2.maps.overworld.spawn.x, y: game2.maps.overworld.spawn.y });
toField(game2);
let spawnedAny = false;
for (let i = 0; i < 1200; i++) {
  game2.frame(1 / 60);
  if (game2.enemies.length > 0) spawnedAny = true;
}
ok(spawnedAny, `inimigos aparecem no mundo aberto (${game2.enemies.length} ativos)`);
ok(game2.enemies.length <= 26, `população de inimigos tem limite (${game2.enemies.length})`);
// IA persegue
if (game2.enemies.length) {
  const en = game2.enemies.find((x) => !x.dead) || game2.enemies[0];
  const far = game2.spawnEnemy('goblin', game2.player.x + 120, game2.player.y);
  const d0 = Math.hypot(far.x - game2.player.x, far.y - game2.player.y);
  for (let i = 0; i < 120; i++) game2.frame(1 / 60);
  const d1 = Math.hypot(far.x - game2.player.x, far.y - game2.player.y);
  ok(d1 < d0, `goblin persegue o jogador (${d0.toFixed(0)} → ${d1.toFixed(0)})`);
  ok(far.state === 'chase' || far.state === 'windup' || far.state === 'attack', `goblin entra em estado de combate (${far.state})`);
  void en;
}
// arqueiro inimigo atira
const arch = game2.spawnEnemy('soldier_archer', game2.player.x + 150, game2.player.y);
let projSeen = 0;
for (let i = 0; i < 240; i++) {
  game2.frame(1 / 60);
  projSeen = Math.max(projSeen, game2.projectiles.filter((p) => p.hostile).length);
}
ok(projSeen > 0, 'soldado arqueiro dispara projéteis');
// lobo dá investida
const wolf = game2.spawnEnemy('wolf', game2.player.x + 120, game2.player.y);
let dashed = false;
for (let i = 0; i < 300; i++) { game2.frame(1 / 60); if (wolf.state === 'dash') dashed = true; }
ok(dashed, 'lobo executa a investida');

// ===========================================================================
section('12. Interação (E) e progressão de nível');
game2.startRun('knight');
const chest3 = game2.chests[0];
game2.player.x = chest3.x; game2.player.y = chest3.y + 8;
chest3.update(1 / 60, game2);
Input.pressed.KeyE = true;
game2.frame(1 / 60);
ok(chest3.opened, 'tecla E abre o baú próximo');
const lvlBefore = game2.player.level;
game2.player.gainXp(xpForLevel(1) + 10, game2);
ok(game2.player.level > lvlBefore, 'jogador sobe de nível com XP');
ok(game2.player.maxHp > 0 && game2.player.hp === game2.player.maxHp, 'subir de nível restaura a vida');

// ===========================================================================
section('13. Modos de jogo: Aventura, Clássico (vidas) e Hardcore (1 chance)');
const { Game: GameCls } = await import('../src/game/game.js');
const act = (a, extra = {}) => ui.onAction({ dataset: { act: a, ...extra }, classList: { contains: () => false }, disabled: false });
game2.wipeSave();

// --- Aventura: vidas infinitas, perde parte do ouro
game2.startRun('knight', 'normal');
eq(game2.player.maxLives, 0, 'Aventura: vidas ilimitadas');
game2.player.gold = 1000; game2.player.iframe = 0;
game2.hitPlayer(999999, {});
ok(game2.player.dead && game2.state === 'playing', 'Aventura: morrer mostra tela de morte (não é fim de jogo)');
act('respawn');
ok(!game2.player.dead, 'Aventura: botão "renascer" funciona');
ok(game2.player.gold < 1000 && game2.player.gold >= 800, `Aventura: perde só parte do ouro (${game2.player.gold})`);

// --- Clássico: 3 vidas
game2.startRun('mage', 'classic');
eq(game2.player.lives, 3, 'Clássico: começa com 3 vidas');
game2.player.iframe = 0; game2.hitPlayer(999999, {});
eq(game2.player.lives, 2, 'Clássico: morrer custa 1 vida');
ok(game2.state === 'playing', 'Clássico: ainda há vidas, jogo continua');
ok(GameCls.hasSave(), 'Clássico: progresso salvo ao morrer (sem "save scumming" de vidas)');
act('respawn');
eq(game2.player.lives, 2, 'Clássico: renascer não devolve vida');
// Pena da Fênix só no Clássico
const feather = consumable('phoenix_feather');
ok(!!feather && feather.id === 'phoenix_feather', 'Pena da Fênix existe');
game2.player.addItem(feather);
game2.player.useItem(feather.uid, game2);
eq(game2.player.lives, 3, 'Clássico: Pena da Fênix devolve 1 vida');
game2.player.lives = 5;
const f2 = consumable('phoenix_feather'); game2.player.addItem(f2);
game2.player.useItem(f2.uid, game2);
ok(game2.player.inventory.some((i) => i.uid === f2.uid), 'Pena da Fênix não é gasta com vidas no máximo');
game2.player.lives = 1;
game2.player.iframe = 0; game2.hitPlayer(999999, {});
eq(game2.state, 'gameover', 'Clássico: sem vidas = fim de jogo');
ok(!GameCls.hasSave(), 'Fim de jogo apaga o save');
ok(!ui.el.death.classList.contains('hidden'), 'tela de fim de jogo é exibida');
game2.save();
ok(!GameCls.hasSave(), 'não é possível salvar durante o fim de jogo');
act('to-title');
eq(game2.state, 'title', 'fim de jogo volta ao título');

// --- Hardcore: 1 chance, inimigos mais fortes
game2.startRun('archer', 'hardcore');
eq(game2.player.lives, 1, 'Hardcore: uma única vida');
const hcGob = game2.spawnEnemy('goblin', game2.player.x + 200, game2.player.y);
game2.startRun('archer', 'normal');
const nGob = game2.spawnEnemy('goblin', game2.player.x + 200, game2.player.y);
ok(hcGob.maxHp > nGob.maxHp * 1.2, `Hardcore: inimigos têm mais vida (${hcGob.maxHp} vs ${nGob.maxHp})`);
game2.startRun('archer', 'hardcore');
const featherH = consumable('phoenix_feather'); game2.player.addItem(featherH);
game2.player.useItem(featherH.uid, game2);
eq(game2.player.lives, 1, 'Hardcore: Pena da Fênix não funciona');
game2.player.iframe = 0; game2.hitPlayer(999999, {});
eq(game2.state, 'gameover', 'Hardcore: morreu uma vez = fim de jogo');
act('to-title');

// --- Vitória + troféus
game2.startRun('assassin', 'classic');
game2.onVictory();
ok(!ui.el.victory.classList.contains('hidden'), 'vitória mostra a tela de vitória');
const tr = GameCls.trophies();
eq(tr.clears.classic, 1, 'troféu do modo Clássico registrado');
game2.onVictory();
eq(GameCls.trophies().clears.classic, 1, 'vitória não é contada duas vezes');
act('victory-continue');
ok(ui.el.victory.classList.contains('hidden'), 'é possível continuar explorando após a vitória');
ui.buildTitle();
ok(ui.el['title'] !== undefined, 'título reconstrói com troféus');

// ===========================================================================
section('14. Save v2: modo, vidas, baús abertos e chefes derrotados persistem');
game2.wipeSave();
game2.startRun('knight', 'classic');
game2.player.level = 6; game2.player.recompute();
game2.player.lives = 2;
game2.player.addBuff(game2, { id: 'song_valor', name: 'Canção do Valente', time: 60, mods: { atk: 0.25 }, color: '#ff8a5a' });
game2.loadMap('dungeon', { x: game2.maps.dungeon.spawn.x, y: game2.maps.dungeon.spawn.y });
const dChest = game2.chests[0];
dChest.open(game2);
const dChestKey = dChest.key;
const dBoss = game2.enemies.find((e) => e.isBoss);
game2.hitEnemy(dBoss, 9999999, { from: game2.player });
game2.save();
const snapSave = localStorage.getItem('eldoria_save_v1');
game2.startRun('mage', 'normal'); // estado diferente antes de carregar
localStorage.setItem('eldoria_save_v1', snapSave);
ok(game2.loadSave(), 'save carrega');
eq(game2.mode, 'classic', 'modo restaurado');
eq(game2.player.lives, 2, 'vidas restauradas');
eq(game2.player.cls.id, 'knight', 'classe restaurada');
ok(game2.player.buffs.length === 1, 'bônus temporário restaurado');
eq(game2.map.id, 'dungeon', 'mapa restaurado');
ok(game2.chests.find((c) => c.key === dChestKey).opened, 'baú aberto continua aberto após recarregar');
ok(!game2.enemies.some((e) => e.isBoss && !e.dead), 'chefe derrotado não renasce após recarregar');
game2.loadMap('overworld', game2.maps.overworld.spawn);
game2.loadMap('dungeon', game2.maps.dungeon.spawn);
ok(game2.chests.find((c) => c.key === dChestKey).opened, 'baú continua aberto ao revisitar o mapa');
ok(!game2.enemies.some((e) => e.isBoss && !e.dead), 'chefe continua morto ao revisitar o mapa');

// ===========================================================================
section('15. Baú com mochila cheia e itens de outras fontes');
game2.startRun('knight', 'normal');
game2.loadMap('overworld', game2.maps.overworld.spawn);
const fillBag = () => { while (game2.player.addItem(consumable('ration'))) { /* enche */ } };
fillBag();
const bagN = game2.player.inventory.length;
const chestF = game2.chests.find((c) => !c.opened);
const gF = game2.player.gold;
chestF.open(game2);
ok(!chestF.opened, 'mochila cheia: baú NÃO abre (nada se perde)');
eq(game2.player.inventory.length, bagN, 'mochila cheia: inventário inalterado');
eq(game2.player.gold, gF, 'mochila cheia: ouro do baú não é consumido');
const sellItem = consumable('potion_hp_big');
game2.giveItem(sellItem, null, null);
ok(game2.player.gold > gF, 'mochila cheia: item recebido de outra fonte é vendido automaticamente');
game2.player.removeItem(game2.player.inventory[0].uid);
chestF.open(game2);
ok(chestF.opened, 'com espaço na mochila o baú abre normalmente');

// ===========================================================================
section('16. Novos chefes: Vyrka, Maldrak e Grommash');
for (const [type, kind] of [['spider_queen', 'spider'], ['lich', 'lich'], ['titan', 'titan']]) {
  game2.startRun('knight', 'normal');
  const ow = game2.maps.overworld;
  const sd = ow.entities.find((e) => e.type === 'enemy' && e.enemy === type);
  ok(!!sd, `${type}: chefe existe no mundo aberto`);
  ow.computeReach();
  ok(ow.isReachable(sd.tx, sd.ty), `${type}: covil é alcançável a pé`);
  ok(!!game2.maps.overworld.zones.find((z) => z.lair && z.id === 'lair_' + (type === 'spider_queen' ? 'spider' : type)), `${type}: covil marcado (sem spawn aleatório)`);
  const spot = toField(game2);
  game2.player.level = 25; game2.player.recompute();
  const b = game2.spawnEnemy(type, game2.player.x + 80, game2.player.y);
  eq(b.bossKind, kind, `${type}: tipo de chefe`);
  b.maxHp = b.hp = 100000;
  game2.player.hp = game2.player.maxHp = 1e9;
  let sawHostile = false, maxEn = 0;
  for (let phase = 1; phase <= 3; phase++) {
    b.hp = b.maxHp * (phase === 1 ? 0.9 : phase === 2 ? 0.5 : 0.2);
    for (let f = 0; f < 60 * 14; f++) {
      game2.player.iframe = 0; game2.player.hp = 1e9;
      if (f % 30 === 0) { game2.player.x = spot.x; game2.player.y = spot.y; } // knockback não arrasta o jogador para fora do covil
      game2.frame(1 / 60);
      if (game2.projectiles.some((p) => p.hostile)) sawHostile = true;
      maxEn = Math.max(maxEn, game2.enemies.length);
    }
    eq(b.phase, phase, `${type}: fase ${phase} alcançada`);
  }
  ok(sawHostile || maxEn > 1, `${type}: usa ataques à distância ou invoca reforços`);
  ok(!game2.player.dead, `${type}: jogador intacto no teste`);
  game2.hitEnemy(b, 1e9, { from: game2.player });
  ok(b.dead, `${type}: pode ser derrotado`);
  ok(game2.player.gold > 0, `${type}: recompensa em ouro`);
}
// chefe volta ao estado inicial se o jogador morre / foge
{
  game2.startRun('knight', 'normal');
  toField(game2);
  const b = game2.spawnEnemy('titan', game2.player.x + 60, game2.player.y);
  b.hp = b.maxHp * 0.3;
  b.resetFight();
  eq(b.phase, 1, 'chefe reinicia a luta (fase 1)');
}

// ===========================================================================
section('17. NPCs novos, alquimista, bardo, mascotes e missões encadeadas');
game2.startRun('mage', 'classic');
game2.player.gold = 5000;
game2.loadMap('overworld', game2.maps.overworld.spawn);
const roles = new Set(game2.npcs.map((n) => n.def.role));
for (const r of ['alchemist', 'bard', 'pet']) ok(roles.has(r), `cidade tem NPC com papel "${r}"`);
ok(game2.npcs.length >= 20, `cidade tem muitos NPCs (${game2.npcs.length})`);
const alch = game2.npcs.find((n) => n.def.role === 'alchemist');
ui.openNpc(alch);
for (let i = 0; i < 8; i++) ui.advanceDialog();
ok(!ui.el.shop.classList.contains('hidden'), 'alquimista abre a loja');
ok(ui.potionList().some((i) => i.id === 'phoenix_feather'), 'alquimista vende Pena da Fênix no modo Clássico');
ok(ui.potionList().some((i) => i.id === 'scroll_thunder'), 'alquimista vende Pergaminho do Trovão');
game2.mode = 'normal';
ok(!ui.potionList().some((i) => i.id === 'phoenix_feather'), 'Pena da Fênix não é vendida fora do modo Clássico');
game2.mode = 'classic';
const bard = game2.npcs.find((n) => n.def.role === 'bard');
ui.openNpc(bard);
for (let i = 0; i < 8; i++) ui.advanceDialog();
const g0 = game2.player.gold;
act('bard-buy', { id: 'song_valor' });
ok(game2.player.gold < g0 && game2.player.buffs.some((b) => b.id === 'song_valor'), 'bardo vende canção que dá bônus temporário');
const atkB = game2.player.stats.atk;
game2.player.buffs = []; game2.player.recompute();
ok(game2.player.stats.atk < atkB, 'canção aumenta o dano enquanto dura');
ui.closeAll();
const pet = game2.npcs.find((n) => n.def.role === 'pet');
const p0 = { x: pet.x, y: pet.y };
game2.player.x = pet.x + 400; // longe: o pet passeia
let moved = false;
for (let i = 0; i < 600; i++) { game2.frame(1 / 60); if (Math.hypot(pet.x - p0.x, pet.y - p0.y) > 4) moved = true; }
ok(moved, 'mascote passeia pela cidade');
for (const n of game2.npcs) ok(!game2.map.isBlockedTile(Math.floor(n.x / 16), Math.floor((n.y - 2) / 16)), `NPC ${n.npcId} nunca fica preso em obstáculo`);
// missões encadeadas
const locked = QUESTS.filter((q) => q.requires && q.requires.length);
ok(locked.length >= 2, `há missões que exigem outras (${locked.length})`);
const { questUnlocked } = await import('../src/data/quests.js');
const lq = locked[0];
ok(!questUnlocked(lq, { [lq.requires[0]]: { state: 'active' } }), 'missão bloqueada enquanto a anterior não foi concluída');
ok(questUnlocked(lq, Object.fromEntries(lq.requires.map((r) => [r, { state: 'complete' }]))), 'missão liberada após concluir a anterior');

// ===========================================================================
section('18. Itens e habilidades novos');
for (const id of ['potion_hp_super', 'potion_mana_big', 'elixir_guard', 'elixir_fortune', 'elixir_regen', 'scroll_thunder', 'scroll_return', 'ration', 'phoenix_feather']) {
  const it = consumable(id);
  ok(it && it.id === id && it.name && it.desc, `consumível ${id} definido`);
}
game2.startRun('knight', 'normal');
toField(game2);
game2.player.level = 10; game2.player.recompute();
const gobs = [0, 1, 2].map((i) => game2.spawnEnemy('goblin', game2.player.x + 40 + i * 12, game2.player.y));
const thunder = consumable('scroll_thunder');
game2.player.addItem(thunder);
const hpT = gobs.reduce((a, g) => a + g.hp, 0);
game2.player.useItem(thunder.uid, game2);
for (let i = 0; i < 40; i++) game2.frame(1 / 60);
ok(gobs.reduce((a, g) => a + Math.max(0, g.hp), 0) < hpT, 'Pergaminho do Trovão fere inimigos próximos');
ok(!game2.player.inventory.some((i) => i.uid === thunder.uid), 'pergaminho é consumido');
// pergaminho de retorno
const ret = consumable('scroll_return');
game2.player.addItem(ret);
toField(game2);
game2.player.useItem(ret.uid, game2);
for (let i = 0; i < 200; i++) game2.frame(1 / 60);
ok(game2.map.isSafeAt(game2.player.x, game2.player.y), 'Pergaminho de Retorno leva à cidade');
// esquiva (rolamento)
toField(game2);
const rx = game2.player.x;
Input.keys.KeyD = true;
Input.pressed.Space = true;
game2.frame(1 / 60);
for (let i = 0; i < 20; i++) game2.frame(1 / 60);
Input.keys.KeyD = false;
ok(game2.player.x > rx + 30, 'esquiva (Espaço) desloca o jogador');
ok(game2.player.rollCd > 0, 'esquiva entra em recarga');
// vender item não equipado e equipamentos de todas as classes ainda válidos
for (const cls of CLASS_IDS) {
  const eqs = ITEMS.filter ? ITEMS.filter((i) => i.cls === cls) : [];
  void eqs;
}

// ===========================================================================
section('19. Controles de toque (celular)');
{
  const { TouchControls } = await import('../src/ui/touch.js');
  game2.startRun('archer', 'normal');
  toField(game2);
  const tc = new TouchControls(game2, ui);
  tc.root = document.createElement('div');
  ok(Input.touch.enabled === false, 'toque desligado por padrão no desktop');
  tc.enable();
  ok(Input.touch.enabled && tc.built, 'controles de toque ativam e constroem a interface');
  ok(tc.btns.filter((b) => b.kind === 'skill').length === game2.player.cls.skills.length, 'um botão de toque para cada habilidade da classe');
  // joystick move o personagem
  const jx = game2.player.x;
  tc.joy.ox = 100; tc.joy.oy = 300;
  tc.moveKnob(160, 300);
  ok(Input.touch.mx > 0.8 && Math.abs(Input.touch.my) < 0.01, `joystick direita → eixo X (${Input.touch.mx.toFixed(2)})`);
  for (let i = 0; i < 40; i++) game2.frame(1 / 60);
  ok(game2.player.x > jx + 15, 'joystick virtual move o jogador');
  tc.moveKnob(102, 301);
  eq(Input.touch.mx, 0, 'zona morta do joystick');
  Input.touch.mx = Input.touch.my = 0;
  // botão de atirar com mira automática
  const tgt = game2.spawnEnemy('goblin', game2.player.x + 110, game2.player.y);
  const hpTg = tgt.hp;
  tc.fireEl.listeners.pointerdown[0]({ pointerId: 1, preventDefault() {}, });
  ok(Input.touch.fire, 'botão de atirar pressionado');
  for (let i = 0; i < 90; i++) game2.frame(1 / 60);
  tc.fireEl.listeners.pointerup[0]({ pointerId: 1 });
  ok(!Input.touch.fire, 'botão de atirar solto');
  ok(tgt.hp < hpTg || tgt.dead, 'atirar por toque mira sozinho no inimigo mais próximo');
  // botões de habilidade
  game2.player.level = 12; game2.player.recompute(); game2.player.mana = game2.player.maxMana;
  tc.btns.find((b) => b.kind === 'skill' && b.i === 1).el.listeners.pointerdown[0]({ preventDefault() {} });
  ok(Input.pressed.Digit2, 'botão 2 aciona a habilidade 2');
  game2.frame(1 / 60);
  ok(game2.player.skillCd[1] > 0, 'habilidade acionada por toque entra em recarga');
  tc.update();
  ok(tc.root.classList.contains('hidden') === false, 'controles visíveis durante o jogo');
  game2.ui.togglePanel('inventory');
  tc.update();
  ok(tc.root.classList.contains('hidden'), 'controles somem com painel aberto');
  game2.ui.closeAll();
  // HUD e renderização completa no modo toque
  for (let i = 0; i < 5; i++) game2.frame(1 / 60);
  tc.disable();
  ok(!Input.touch.enabled, 'toque pode ser desligado');
}

// ===========================================================================
section('20. Mapa: sem baús/inimigos/NPCs presos e sem terreno bloqueando');
{
  game2.startRun('knight', 'normal');
  for (const id of ['overworld', 'dungeon', 'throne']) {
    const m = game2.maps[id];
    m.computeReach();
    const sp = m.spawn;
    ok(m.isReachable(Math.floor(sp.x / 16), Math.floor(sp.y / 16)), `${id}: ponto inicial é alcançável`);
    let stuckC = 0, stuckE = 0;
    for (const c of m.entities) if (c.type === 'chest' && !m.isReachable(c.tx, c.ty)) stuckC++;
    for (const e of m.entities) if (e.type === 'enemy' && !m.isReachable(e.tx, e.ty)) stuckE++;
    eq(stuckC, 0, `${id}: todos os baús são alcançáveis`);
    eq(stuckE, 0, `${id}: nenhum inimigo nasce preso`);
    for (const ex of m.exits) ok(m.isReachable(Math.floor(ex.x / 16), Math.floor(ex.y / 16)) || m.isReachable(Math.floor(ex.x / 16), Math.floor((ex.y + 16) / 16)) || m.isReachable(Math.floor(ex.x / 16), Math.floor((ex.y - 16) / 16)), `${id}: saída "${ex.label}" é alcançável`);
  }
  // água bloqueia o jogador
  const ow = game2.maps.overworld;
  let water = null;
  for (let ty = 0; ty < ow.h && !water; ty++) for (let tx = 0; tx < ow.w; tx++) if (ow.tile(tx, ty) === TILE.WATER) { water = { tx, ty }; break; }
  ok(!!water && ow.isBlockedTile(water.tx, water.ty), 'água bloqueia o movimento');
  ok(!ow.isSolidTile(water.tx, water.ty), 'mas projéteis passam sobre a água');
}

// ===========================================================================
section('21. v2.1 — raridades, drops, comportamentos novos, morte e save');
{
  const items = await import('../src/data/items.js');
  const { RARITY, RARITY_ORDER, rarityWeights, rollMobLoot, rollMobDrop, pickEquipmentOfRarity, describeStats, ITEMS: ITEM_LIST } = items;
  eq(RARITY_ORDER.join(','), 'common,rare,epic,legendary,mythic', '5 raridades na ordem certa');
  ok(RARITY.mythic && RARITY.mythic.order === 4 && RARITY.mythic.color, 'raridade Mítica existe com cor própria');
  eq(rarityWeights(1).mythic || 0, 0, 'sem míticos em áreas baixas (t1)');
  ok(rarityWeights(4).mythic > 0, 'mítico possível só em áreas de alto risco');

  // distribuição: maioria sem drop; lendário/mítico raros mas possíveis
  let none = 0, leg = 0, myth = 0;
  for (let i = 0; i < 20000; i++) {
    const r = rollMobLoot(Math.random, 2, 'mob');
    if (!r) none++; else if (r === 'legendary') leg++; else if (r === 'mythic') myth++;
  }
  ok(none / 200 > 60, `maioria dos mobs sem drop de equipamento (${(none / 200).toFixed(0)}%)`);
  ok(leg > 0 && myth > 0 && myth < leg, 'lendário e mítico: raros, possíveis, e o mítico mais raro');
  ok(myth / 20000 < 0.01, 'mítico de mob comum abaixo de 1%');
  let bossLeg = 0, mobLeg = 0;
  for (let i = 0; i < 4000; i++) {
    if (rollMobLoot(Math.random, 4, 'boss') === 'legendary') bossLeg++;
    if (rollMobLoot(Math.random, 4, 'mob') === 'legendary') mobLeg++;
  }
  ok(bossLeg > mobLeg * 4, `chances de chefe são muito melhores (${bossLeg} vs ${mobLeg})`);
  ok(rollMobLoot(() => 0.999, 4, 'boss') !== null && rollMobLoot(() => 0.001, 4, 'boss') !== null, 'tabela de chefe nunca devolve "nada" (drop garantido)');

  // cada raridade gera item válido para cada classe
  for (const cls of CLASS_IDS) {
    for (const rk of RARITY_ORDER) {
      const it = pickEquipmentOfRarity(Math.random, cls, rk, 3);
      ok(it && it.cls === cls && it.rarity === rk, `${cls}: item ${rk} gerado corretamente`);
    }
  }
  ok(ITEM_LIST.some((i) => i.rarity === 'mythic'), 'catálogo tem itens míticos');
  ok(!ITEM_LIST.some((i) => i.rarity === 'mythic' && i.price < 4000), 'míticos têm preço à altura');

  // sorteio não é determinístico por mob
  const seen = new Set();
  for (let i = 0; i < 500; i++) { const d = rollMobDrop(Math.random, 'mage', 2, 'mob'); if (d) seen.add(d.name); }
  ok(seen.size > 1, 'o mesmo tipo de mob solta itens diferentes (aleatório, não lista fixa)');

  // stats negativos: sem "+-4"
  ok(!describeStats({ speed: -4, atk: 3 }).join(' ').includes('+-'), 'sinal correto em stats negativos');

  // inimigos novos: comportamentos distintos de verdade
  const kinds = new Set(Object.values(ENEMIES).map((d) => d.ai));
  for (const kind of ['hitrun', 'supporter', 'burrower', 'harpy', 'kamikaze', 'sentry']) ok(kinds.has(kind), `IA de comportamento "${kind}" existe`);
  ok(!!ENEMIES.imp.drops && !!ENEMIES.plague_rat.attack.dot, 'rato da peste envenena e imp tem drops configurados');
  eq(ENEMIES.skalla.bossKind, 'frost', 'Skalla é chefe de gelo');
  eq(ENEMIES.ashkaru.bossKind, 'ember', 'Ashkaru é chefe de fogo');
  ok(ENEMIES.ashkaru.hp > ENEMIES.titan.hp && ENEMIES.skalla.hp > ENEMIES.lich.hp, 'novos chefes escalam com a progressão');
  const bossEnts = ow.entities.filter((e) => e.type === 'enemy' && e.boss);
  eq(bossEnts.length, 5, 'mundo tem 5 chefes de mapa');
  const lairZones = ow.zones.filter((z) => z.lair);
  eq(lairZones.length, 5, 'as 5 arenas existem no mapa');

  // 5ª habilidade em todas as classes, nível 8
  for (const clsId of CLASS_IDS) {
    const s5 = CLASSES[clsId].skills[4];
    ok(s5 && s5.level === 8 && s5.params, `${CLASSES[clsId].name}: 5ª habilidade no nível 8 com params`);
  }

  // --- jogador: veneno, juramento, cooldowns dinâmicos ----------------------
  game2.startRun('knight', 'normal');
  toField(game2);
  const pg = game2.player;
  eq(pg.skillCd.length, pg.cls.skills.length, 'cooldowns do tamanho das habilidades da classe');
  pg.applyDot(game2, { t: 3, dps: 10 });
  ok(pg.dotT === 3 && pg.dotDps === 10, 'DoT aplicado ao jogador');
  pg.hp = pg.maxHp;
  const before = pg.hp;
  for (let i = 0; i < 64; i++) game2.frame(1 / 60);
  ok(pg.hp < before, 'veneno tira vida sozinho (tick por segundo)');
  pg.dotT = 0; pg.dotDps = 0;
  // juramento reduz o dano
  const h0 = pg.hp;
  pg.iframe = 0; pg.vowT = 0;
  game2.hitPlayer(120, { angle: 0, knock: 0 });
  const plain = h0 - pg.hp;
  pg.hp = h0; pg.iframe = 0;
  pg.vowT = 5; pg.vowReduce = 0.4; pg.vowReflect = 0;
  game2.hitPlayer(120, { angle: 0, knock: 0 });
  const vowed = h0 - pg.hp;
  ok(vowed < plain * 0.75, `Juramento de Ferro reduz dano (${plain.toFixed(0)} → ${vowed.toFixed(0)})`);
  pg.vowT = 0; pg.vowReduce = 0; pg.vowReflect = 0;

  // --- execução: sem alvo não gasta nada ------------------------------------
  game2.startRun('assassin', 'normal');
  toField(game2);
  const pa = game2.player;
  pa.level = 9; pa.recompute();
  pa.skillCd = pa.skillCd.map(() => 0);
  pa.mana = pa.maxMana;
  game2.enemies.length = 0;
  const manaBefore = pa.mana;
  pa.cast(game2, 4);
  ok(pa.skillCd[4] === 0 && pa.mana === manaBefore, 'Execução sem alvo: nenhum custo gasto');
  const e0 = game2.spawnEnemy('slime', pa.x + 120, pa.y, {});
  e0.spawnT = 0; e0.hp = 1;
  pa.cast(game2, 4);
  ok(pa.skillCd[4] > 0 || e0.dead, 'Execução com alvo gasta cooldown/mata o ferido');

  // --- marca do falcão amplifica dano ----------------------------------------
  const e1 = game2.spawnEnemy('slime', pa.x + 60, pa.y, {});
  e1.spawnT = 0;
  let noMark = 0;
  for (let i = 0; i < 300; i++) { e1.hp = e1.maxHp; noMark += game2.hitEnemy(e1, 20, {}) || 0; }
  e1.applyMark(0.5, 8);
  let marked = 0;
  for (let i = 0; i < 300; i++) { e1.hp = e1.maxHp; marked += game2.hitEnemy(e1, 20, {}) || 0; }
  ok(marked > noMark * 1.3 && marked < noMark * 1.7, 'alvo marcado recebe ~+50% de dano');
  e1.markT = 0; e1.markAmt = 0;

  // --- soterrado é intocável ---------------------------------------------------
  const e2 = game2.spawnEnemy('burrower', pa.x + 40, pa.y, {});
  e2.untargetable = true;
  const hp2 = e2.hp;
  ok(game2.hitEnemy(e2, 50, {}) === 0 && e2.hp === hp2, 'mob soterrado não recebe dano');
  ok(game2.nearestEnemy(e2.x, e2.y, 220) !== e2, 'mob soterrado não é mirado pelo auto-aim');
  e2.untargetable = false;

  // --- shaman: sprites 4-dir resolvem ------------------------------------------
  const sh = game2.spawnEnemy('shaman', pa.x + 80, pa.y, {});
  sh.facing = 1;
  ok(!!getSprite(sh.spriteKey()), 'xamã tem sprites nas 4 direções');

  // --- morte: penalidade aplicada na hora, save sadio ----------------------------
  game2.startRun('knight', 'normal');
  const pk = game2.player;
  toField(game2);
  pk.gold = 200;
  pk.hp = 1; pk.iframe = 0;
  pk.takeDamage(game2, 9999, {});
  ok(pk.dead, 'jogador morre');
  eq(pk.gold, 170, 'penalidade de ouro aplicada NA MORTE (não no respawn)');
  const saveData = JSON.parse(localStorage.getItem('eldoria_save_v1') || 'null');
  ok(saveData, 'save gravado no momento da morte');
  eq(saveData.map, 'overworld', 'save do morto aponta para a cidade');
  eq(Math.round(saveData.pos.x), Math.round(game2.maps.overworld.spawn.x), 'posição salva = spawn da cidade');
  ok(Math.round(saveData.hp) >= Math.round(pk.maxHp) - 1, 'save do morto já curado');
  const gAfter = pk.gold;
  game2.respawnPlayer();
  eq(pk.gold, gAfter, 'respawn NÃO cobra a penalidade duas vezes');
  ok(!pk.dead && pk.hp === pk.maxHp, 'respawn levanta o herói intacto');
  // clássico: morrer gasta vida, save mantém a contagem
  game2.startRun('knight', 'classic');
  const pc = game2.player;
  toField(game2);
  eq(pc.lives, 3, 'clássico começa com 3 vidas');
  pc.hp = 1; pc.iframe = 0;
  pc.takeDamage(game2, 9999, {});
  eq(pc.lives, 2, 'morte consome 1 vida imediatamente');
  const cs = JSON.parse(localStorage.getItem('eldoria_save_v1') || 'null');
  eq(cs.lives, 2, 'o save guarda a vida perdida (sem exploit de recarregar aba)');
  game2.respawnPlayer();
  eq(pc.lives, 2, 'vida não é gasta de novo no respawn');
  // hardcore: 1 vida = game over direto
  game2.startRun('knight', 'hardcore');
  const ph = game2.player;
  toField(game2);
  ph.hp = 1; ph.iframe = 0;
  ph.takeDamage(game2, 9999, {});
  eq(game2.state, 'gameover', 'hardcore: morrer encerra a partida');
  eq(localStorage.getItem('eldoria_save_v1'), null, 'hardcore: save apagado de verdade');

  // --- modos: buff do hardcore perceptível mas contido --------------------------
  const { MODES } = await import('../src/data/modes.js');
  const HC = MODES.hardcore;
  ok(HC.lives === 1 && HC.hp > 1.1 && HC.hp <= 1.3 && HC.dmg > 1.1 && HC.dmg <= 1.25 && HC.regen < 1, `hardcore calibrado (hp×${HC.hp} dmg×${HC.dmg} regen×${HC.regen})`);

  // --- missões novas amarradas na cadeia ------------------------------------------
  const { QUESTS, questById } = await import('../src/data/quests.js');
  ok(questById('q_frost').requires.includes('q_lich'), 'q_frost exige q_lich');
  ok(questById('q_ember').requires.includes('q_titan'), 'q_ember exige q_titan');
  eq(questById('q_frost').goal.tag, 'skalla', 'q_frost caça Skalla');
  eq(questById('q_ember').goal.tag, 'ashkaru', 'q_ember caça Ashkaru');
  const { NPC_DEFS } = await import('../src/data/npcs.js');
  ok(NPC_DEFS.king.quests.includes('q_frost') && NPC_DEFS.king.quests.includes('q_ember'), 'o Rei oferece as duas missões novas');
  ok(QUESTS.every((q) => !q.requires || q.requires.every((r) => questById(r))), 'nenhuma dependência de missão quebrada');
}

// ===========================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTADO: ${pass} passaram, ${fail} falharam`);
if (fail) {
  console.log('\nFalhas:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
} else {
  console.log('TODOS OS TESTES PASSARAM');
}
process.exit(fail ? 1 : 0);
