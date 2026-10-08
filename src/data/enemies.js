// ---------------------------------------------------------------------------
// enemies.js — bestiário: monstros, soldados do reino, elites e chefe
// ---------------------------------------------------------------------------

/**
 * ai:
 *  chaser  — corre atrás e bate de perto
 *  ranged  — mantém distância e atira
 *  charger — prepara o bote e avança em disparada (lobo)
 *  brute   — lento, muito tanque, golpe pesado com preparação longa
 *  boss    — várias fases e padrões de ataque
 */
export const ENEMIES = {
  slime: {
    id: 'slime', name: 'Slime', hp: 26, dmg: 6, def: 0, speed: 42, xp: 9, gold: [2, 5],
    radius: 8, sprite: 'slime', frames: 4, ai: 'chaser', tier: 1, color: '#4fbf6a',
    attack: { range: 16, cd: 1.2, windup: 0.4 }, drops: [{ id: 'potion_hp', chance: 0.12 }],
    blurb: 'Gelatina viva. Lenta, mas nunca para de pular.',
  },
  goblin: {
    id: 'goblin', name: 'Goblin', hp: 34, dmg: 9, def: 1, speed: 78, xp: 15, gold: [4, 9],
    radius: 7, sprite: 'goblin', frames: 4, ai: 'chaser', tier: 1, color: '#a8c93a',
    attack: { range: 15, cd: 0.95, windup: 0.28 }, drops: [{ id: 'potion_hp', chance: 0.1 }],
    blurb: 'Pequeno, rápido e covarde quando está sozinho.',
  },
  wolf: {
    id: 'wolf', name: 'Lobo', hp: 46, dmg: 12, def: 1, speed: 104, xp: 22, gold: [3, 8],
    radius: 9, sprite: 'wolf', frames: 4, ai: 'charger', tier: 2, color: '#b0a89a',
    attack: { range: 18, cd: 1.6, windup: 0.5, dashSpeed: 300, dashTime: 0.42 },
    drops: [{ id: 'potion_hp', chance: 0.12 }],
    blurb: 'Prepara o bote e avança em linha reta.',
  },
  skeleton: {
    id: 'skeleton', name: 'Esqueleto', hp: 50, dmg: 11, def: 2, speed: 62, xp: 27, gold: [6, 14],
    radius: 8, sprite: 'skeleton', frames: 4, ai: 'ranged', tier: 2, color: '#e6e2d0',
    attack: { range: 210, cd: 1.8, windup: 0.5, projSpeed: 240, minRange: 70 },
    drops: [{ id: 'potion_mana', chance: 0.1 }],
    blurb: 'Arremessa ossos à distância. Quebra fácil de perto.',
  },
  soldier_sword: {
    id: 'soldier_sword', name: 'Soldado Real', hp: 66, dmg: 14, def: 4, speed: 82, xp: 34, gold: [10, 22],
    radius: 8, sprite: 'soldier_sword', frames: 4, ai: 'chaser', tier: 2, color: '#a8b2c0',
    attack: { range: 26, cd: 1.1, windup: 0.34 }, drops: [{ id: 'potion_hp', chance: 0.15 }],
    blurb: 'Traidor a serviço do usurpador. Bem treinado.',
  },
  soldier_archer: {
    id: 'soldier_archer', name: 'Arqueiro Real', hp: 52, dmg: 13, def: 2, speed: 76, xp: 36, gold: [10, 20],
    radius: 8, sprite: 'soldier_archer', frames: 4, ai: 'ranged', tier: 2, color: '#5a8ad0',
    attack: { range: 260, cd: 1.7, windup: 0.55, projSpeed: 300, minRange: 90 },
    drops: [{ id: 'potion_hp', chance: 0.12 }],
    blurb: 'Atira de longe. Feche a distância rápido.',
  },
  orc: {
    id: 'orc', name: 'Orc', hp: 105, dmg: 20, def: 4, speed: 58, xp: 52, gold: [14, 30],
    radius: 11, sprite: 'orc', frames: 4, ai: 'brute', tier: 3, color: '#8fbf5a',
    attack: { range: 32, cd: 1.7, windup: 0.6, knock: 140 }, drops: [{ id: 'potion_hp_big', chance: 0.12 }],
    blurb: 'Lento no passo, brutal no machado.',
  },
  soldier_heavy: {
    id: 'soldier_heavy', name: 'Soldado Pesado', hp: 150, dmg: 24, def: 9, speed: 48, xp: 66, gold: [20, 40],
    radius: 11, sprite: 'soldier_heavy', frames: 4, ai: 'brute', tier: 3, color: '#8b97a8',
    attack: { range: 34, cd: 1.9, windup: 0.65, knock: 180 }, drops: [{ id: 'potion_hp', chance: 0.2 }],
    blurb: 'Escudo grosso e paciência de pedra.',
  },
  direwolf: {
    id: 'direwolf', name: 'Lobo Sombrio', hp: 118, dmg: 24, def: 3, speed: 126, xp: 74, gold: [16, 34],
    radius: 10, sprite: 'direwolf', frames: 4, ai: 'charger', tier: 3, color: '#6a6a80',
    attack: { range: 20, cd: 1.4, windup: 0.42, dashSpeed: 400, dashTime: 0.4 },
    drops: [{ id: 'potion_hp_big', chance: 0.15 }],
    blurb: 'Mais rápido que você. Não corra em linha reta.',
  },
  bat: {
    id: 'bat', name: 'Morcego das Sombras', hp: 22, dmg: 7, def: 0, speed: 118, xp: 14, gold: [2, 6],
    radius: 6, sprite: 'bat', frames: 4, ai: 'chaser', tier: 1, color: '#7a5ab8', flyer: true, erratic: true,
    attack: { range: 14, cd: 0.9, windup: 0.2 }, drops: [{ id: 'ration', chance: 0.1 }],
    blurb: 'Rápido e imprevisível. Voa em zigue-zague.',
  },
  boar: {
    id: 'boar', name: 'Javali Selvagem', hp: 64, dmg: 14, def: 3, speed: 96, xp: 26, gold: [4, 10],
    radius: 9, sprite: 'boar', frames: 4, ai: 'charger', tier: 2, color: '#8a5a3a',
    attack: { range: 18, cd: 1.9, windup: 0.55, dashSpeed: 330, dashTime: 0.45 },
    drops: [{ id: 'ration', chance: 0.25 }],
    blurb: 'Abaixa a cabeça e investe. Desvie no último segundo.',
  },
  bandit: {
    id: 'bandit', name: 'Bandido', hp: 58, dmg: 12, def: 2, speed: 92, xp: 30, gold: [14, 32],
    radius: 8, sprite: 'bandit', frames: 4, ai: 'chaser', tier: 2, color: '#9a4a3a', thief: true,
    attack: { range: 18, cd: 1.0, windup: 0.26 }, drops: [{ id: 'potion_hp', chance: 0.18 }, { id: 'scroll_return', chance: 0.06 }],
    blurb: 'Rouba ouro a cada golpe que acerta. Mate-o para recuperar.',
  },
  spider: {
    id: 'spider', name: 'Aranha Venenosa', hp: 44, dmg: 10, def: 1, speed: 74, xp: 28, gold: [5, 12],
    radius: 8, sprite: 'spider', frames: 4, ai: 'ranged', tier: 2, color: '#6a3a8a', webs: true,
    attack: { range: 190, cd: 2.0, windup: 0.5, projSpeed: 210, minRange: 60 },
    drops: [{ id: 'potion_mana', chance: 0.12 }, { id: 'elixir_swift', chance: 0.04 }],
    blurb: 'Cospe teia que deixa você lento. Aproxime-se rápido.',
  },
  cultist: {
    id: 'cultist', name: 'Cultista Sombrio', hp: 72, dmg: 17, def: 3, speed: 70, xp: 48, gold: [16, 34],
    radius: 8, sprite: 'cultist', frames: 4, ai: 'ranged', tier: 3, color: '#8a3ab8', caster: true,
    attack: { range: 240, cd: 2.2, windup: 0.6, projSpeed: 200, minRange: 100 },
    drops: [{ id: 'potion_mana_big', chance: 0.15 }, { id: 'scroll_thunder', chance: 0.08 }],
    blurb: 'Lança orbes de energia sombria. Frágil de perto.',
  },
  wraith: {
    id: 'wraith', name: 'Espectro', hp: 88, dmg: 19, def: 2, speed: 100, xp: 58, gold: [12, 28],
    radius: 8, sprite: 'wraith', frames: 4, ai: 'chaser', tier: 3, color: '#7ad6c8', ghost: true, drain: true,
    attack: { range: 20, cd: 1.1, windup: 0.3 }, drops: [{ id: 'elixir_fortune', chance: 0.05 }, { id: 'potion_mana', chance: 0.15 }],
    blurb: 'Sopra a vida dos vivos. Atravessa árvores e pedras.',
  },
  golem: {
    id: 'golem', name: 'Golem de Pedra', hp: 210, dmg: 28, def: 14, speed: 40, xp: 96, gold: [24, 48],
    radius: 12, sprite: 'golem', frames: 4, ai: 'brute', tier: 4, color: '#8a8a7a',
    attack: { range: 36, cd: 2.2, windup: 0.8, knock: 220 }, drops: [{ id: 'elixir_guard', chance: 0.12 }, { id: 'potion_hp_big', chance: 0.15 }],
    blurb: 'Pesado e quase imune a golpes leves. Bata forte.',
  },
  // ---- novos comportamentos (v2.1) ---------------------------------------
  imp: {
    id: 'imp', name: 'Diabrete Saltador', hp: 40, dmg: 11, def: 1, speed: 126, xp: 26, gold: [5, 12],
    radius: 7, sprite: 'imp', frames: 4, ai: 'hitrun', tier: 2, color: '#e05a3a',
    attack: { range: 16, cd: 1.7, windup: 0.22, dot: { t: 2.6, dps: 2.2 } },
    drops: [{ id: 'ration', chance: 0.08 }],
    blurb: 'Rápido e frágil: bate, ri e foge para voltar daqui a pouco. Queima.',
  },
  plague_rat: {
    id: 'plague_rat', name: 'Rato da Peste', hp: 36, dmg: 9, def: 1, speed: 94, xp: 20, gold: [4, 10],
    radius: 7, sprite: 'plague_rat', frames: 4, ai: 'chaser', tier: 1, color: '#7a8a4a', flee: true,
    attack: { range: 14, cd: 1.1, windup: 0.3, dot: { t: 4, dps: 2 } },
    drops: [{ id: 'ration', chance: 0.12 }],
    blurb: 'A mordida envenena aos poucos. Ferido, foge — encurralado, morde mais forte.',
  },
  shaman: {
    id: 'shaman', name: 'Xamã Tribal', hp: 86, dmg: 14, def: 3, speed: 70, xp: 56, gold: [16, 30],
    radius: 8, sprite: 'shaman', frames: 4, ai: 'supporter', tier: 3, color: '#3aa06a',
    attack: { range: 230, cd: 2.4, windup: 0.55, projSpeed: 210, minRange: 110, healAmt: 0.14, healCd: 5.5 },
    drops: [{ id: 'potion_mana', chance: 0.14 }, { id: 'elixir_regen', chance: 0.05 }],
    blurb: 'Cura os aliados feridos à sua volta. Prioridade absoluta: mate-o primeiro.',
  },
  burrower: {
    id: 'burrower', name: 'Soterrador', hp: 150, dmg: 26, def: 6, speed: 84, xp: 78, gold: [18, 36],
    radius: 10, sprite: 'burrower', frames: 4, ai: 'burrower', tier: 3, color: '#9a6a42',
    attack: { range: 30, cd: 1.8, windup: 0.35, knock: 190 },
    drops: [{ id: 'potion_hp_big', chance: 0.12 }],
    blurb: 'Mergulha na terra e nada sob ela — intocável. Salta dos destroços quando menos espera.',
  },
  harpy: {
    id: 'harpy', name: 'Harpia da Névoa', hp: 96, dmg: 20, def: 2, speed: 112, xp: 64, gold: [14, 28],
    radius: 9, sprite: 'harpy', frames: 4, ai: 'harpy', tier: 3, color: '#c8a0e8', flyer: true,
    attack: { range: 26, cd: 2.6, windup: 0.5, dashSpeed: 540, dashTime: 0.5, screechCd: 9 },
    drops: [{ id: 'elixir_swift', chance: 0.05 }],
    blurb: 'Circula, grasna e mergulha. O grito deixa você lento — e a garra não perdoa.',
  },
  sporeling: {
    id: 'sporeling', name: 'Esporo Ígneo', hp: 28, dmg: 26, def: 0, speed: 106, xp: 22, gold: [3, 9],
    radius: 7, sprite: 'sporeling', frames: 4, ai: 'kamikaze', tier: 2, color: '#a0e04a',
    attack: { fuse: 0.65, blast: 54 },
    drops: [{ id: 'potion_hp', chance: 0.06 }],
    blurb: 'Corre até você e infla. Explode. Acabe com ele ANTES do abraço.',
  },
  stonesentry: {
    id: 'stonesentry', name: 'Sentinela Rúnica', hp: 185, dmg: 24, def: 12, speed: 0, xp: 88, gold: [20, 40],
    radius: 10, sprite: 'stonesentry', frames: 4, ai: 'sentry', tier: 4, color: '#9aa2b8',
    attack: { range: 300, cd: 2.3, windup: 0.75, projSpeed: 270, minRange: 0 },
    drops: [{ id: 'elixir_guard', chance: 0.1 }],
    blurb: 'Guardiã de pedra que nunca persegue. Bombardeia de longe — aproxime-se ou sofra.',
  },
  spider_queen: {
    id: 'spider_queen', name: 'Vyrka, a Rainha Aranha', hp: 1050, dmg: 30, def: 8, speed: 72, xp: 700, gold: [260, 380],
    radius: 20, sprite: 'spider_queen', frames: 4, ai: 'boss', bossKind: 'spider', tier: 5, color: '#b04ac8', boss: true,
    attack: { range: 52, cd: 1.5, windup: 0.55, knock: 240 },
    drops: [{ id: 'potion_hp_super', chance: 1 }, { id: 'elixir_regen', chance: 0.6 }],
    blurb: 'Tece teias na Floresta Profunda. Suas crias nunca param.',
    phaseNames: ['Vyrka rosna!', 'Vyrka se enfurece!'],
  },
  lich: {
    id: 'lich', name: 'Maldrak, o Rei Esquelético', hp: 1400, dmg: 36, def: 10, speed: 58, xp: 900, gold: [320, 480],
    radius: 18, sprite: 'lich', frames: 4, ai: 'boss', bossKind: 'lich', tier: 5, color: '#5ad8c0', boss: true,
    attack: { range: 56, cd: 1.7, windup: 0.6, knock: 260 },
    drops: [{ id: 'potion_hp_super', chance: 1 }, { id: 'scroll_thunder', chance: 0.8 }],
    blurb: 'Reinava nas Ruínas antes do reino existir. Ainda reina.',
    phaseNames: ['Maldrak invoca os mortos!', 'Maldrak libera seu poder final!'],
  },
  titan: {
    id: 'titan', name: 'Grommash, o Colosso de Pedra', hp: 1900, dmg: 46, def: 18, speed: 50, xp: 1200, gold: [450, 650],
    radius: 24, sprite: 'titan', frames: 4, ai: 'boss', bossKind: 'titan', tier: 5, color: '#d8a24a', boss: true,
    attack: { range: 66, cd: 1.9, windup: 0.85, knock: 340 },
    drops: [{ id: 'potion_hp_super', chance: 1 }, { id: 'elixir_guard', chance: 0.8 }],
    blurb: 'Uma montanha que aprendeu a andar. Pisa forte, cai devagar.',
    phaseNames: ['Grommash racha ao meio!', 'Grommash desperta o núcleo de lava!'],
  },
  skalla: {
    id: 'skalla', name: 'Skalla, a Rainha do Inverno', hp: 1550, dmg: 38, def: 10, speed: 68, xp: 1050, gold: [340, 520],
    radius: 17, sprite: 'skalla', frames: 4, ai: 'boss', bossKind: 'frost', tier: 5, color: '#6ad8ff', boss: true,
    attack: { range: 54, cd: 1.7, windup: 0.6, knock: 260 },
    drops: [{ id: 'potion_hp_super', chance: 1 }, { id: 'elixir_guard', chance: 0.6 }],
    blurb: 'Governa a Cova Gélida desde antes dos homens lembrarem do frio.',
    phaseNames: ['Skalla conjura a nevasca!', 'Skalla desperta a tempestade eterna!'],
  },
  ashkaru: {
    id: 'ashkaru', name: 'Ashkaru, o Arauto de Cinzas', hp: 1980, dmg: 46, def: 16, speed: 58, xp: 1350, gold: [430, 640],
    radius: 20, sprite: 'ashkaru', frames: 4, ai: 'boss', bossKind: 'ember', tier: 5, color: '#ff6a2a', boss: true,
    attack: { range: 60, cd: 1.8, windup: 0.8, knock: 320 },
    drops: [{ id: 'potion_hp_super', chance: 1 }, { id: 'scroll_thunder', chance: 0.7 }],
    blurb: 'O Arauto guarda o Altar de Cinzas. Onde ele pisa, a terra vira brasa.',
    phaseNames: ['Ashkaru incendeia o ar!', 'Ashkaru abre a garganta de fogo!'],
  },
  elite: {
    id: 'elite', name: 'Chefe Orc Ghorruk', hp: 340, dmg: 32, def: 8, speed: 66, xp: 220, gold: [80, 140],
    radius: 13, sprite: 'elite', frames: 4, ai: 'brute', tier: 4, color: '#c94a4a', elite: true,
    attack: { range: 42, cd: 1.5, windup: 0.55, knock: 260 }, drops: [{ id: 'potion_hp_big', chance: 0.6 }],
    blurb: 'Elite do Vale Sombrio. Derruba heróis por esporte.',
  },
  boss: {
    id: 'boss', name: 'Guardião das Profundezas', hp: 1250, dmg: 40, def: 12, speed: 62, xp: 1100, gold: [400, 600],
    radius: 22, sprite: 'boss', frames: 4, ai: 'boss', tier: 5, color: '#b875f0', boss: true,
    attack: { range: 62, cd: 1.6, windup: 0.7, knock: 320 },
    drops: [{ id: 'potion_hp_big', chance: 1 }],
    blurb: 'Selado sob a caverna desde a fundação do reino.',
  },
};

export function enemyDef(id) {
  return ENEMIES[id] || ENEMIES.slime;
}

/** Inimigos que aparecem em cada região (id, peso). */
export const REGION_SPAWNS = {
  fields: [
    ['slime', 6], ['slime', 4], ['goblin', 3], ['boar', 3], ['bat', 2], ['bandit', 1], ['plague_rat', 2],
  ],
  forest: [
    ['goblin', 5], ['wolf', 4], ['slime', 3], ['skeleton', 2], ['bat', 3], ['spider', 3], ['boar', 2], ['bandit', 2], ['plague_rat', 2], ['imp', 1],
  ],
  deepforest: [
    ['wolf', 5], ['goblin', 4], ['direwolf', 3], ['skeleton', 3], ['spider', 5], ['bat', 3], ['cultist', 1], ['sporeling', 3], ['harpy', 2], ['plague_rat', 2],
  ],
  ruins: [
    ['skeleton', 6], ['skeleton', 3], ['soldier_sword', 3], ['orc', 2], ['wraith', 3], ['cultist', 2], ['golem', 1], ['burrower', 3], ['shaman', 2], ['stonesentry', 1],
  ],
  road: [
    ['soldier_sword', 5], ['soldier_archer', 4], ['soldier_heavy', 2], ['bandit', 4], ['boar', 1], ['plague_rat', 1],
  ],
  valley: [
    ['orc', 5], ['direwolf', 4], ['soldier_heavy', 3], ['soldier_archer', 3], ['golem', 2], ['cultist', 3], ['wraith', 2], ['spider', 2], ['imp', 4], ['shaman', 2], ['burrower', 2], ['stonesentry', 2], ['harpy', 2], ['sporeling', 2],
  ],
  dungeon: [
    ['skeleton', 4], ['orc', 4], ['slime', 2], ['soldier_heavy', 2], ['bat', 3], ['wraith', 2], ['golem', 1], ['cultist', 2], ['imp', 2], ['burrower', 2], ['stonesentry', 1], ['shaman', 1],
  ],
  bossroom: [],
};

export function pickSpawn(rand, region) {
  const list = REGION_SPAWNS[region] || REGION_SPAWNS.fields;
  let total = 0;
  for (const [, w] of list) total += w;
  let r = rand() * total;
  for (const [id, w] of list) {
    r -= w;
    if (r <= 0) return id;
  }
  return list[0][0];
}
