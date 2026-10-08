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
  if (['soldier_sword', 'soldier_archer', 'soldier_heavy', 'bandit', 'cultist'].includes(k)) {
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
  eq(c.skills.length, 4, `${c.name}: 4 habilidades`);
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
eq(rarities.size, 4, 'todas as 4 raridades aparecem nos baús');
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
