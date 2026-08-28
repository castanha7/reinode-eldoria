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
    ['slime', 6], ['slime', 4], ['goblin', 3],
  ],
  forest: [
    ['goblin', 5], ['wolf', 4], ['slime', 3], ['skeleton', 2],
  ],
  deepforest: [
    ['wolf', 5], ['goblin', 4], ['direwolf', 3], ['skeleton', 3],
  ],
  ruins: [
    ['skeleton', 6], ['skeleton', 3], ['soldier_sword', 3], ['orc', 2],
  ],
  road: [
    ['soldier_sword', 5], ['soldier_archer', 4], ['soldier_heavy', 2],
  ],
  valley: [
    ['orc', 5], ['direwolf', 4], ['soldier_heavy', 3], ['soldier_archer', 3],
  ],
  dungeon: [
    ['skeleton', 4], ['orc', 4], ['slime', 2], ['soldier_heavy', 2],
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
