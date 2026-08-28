// ---------------------------------------------------------------------------
// classes.js — as quatro classes jogáveis, atributos e habilidades
// ---------------------------------------------------------------------------

/**
 * kinds de habilidade implementados em game/abilities.js
 *  projectile   — projétil que voa e explode
 *  beam         — raio instantâneo em linha reta (perfura)
 *  nova         — explosão ao redor de um ponto
 *  melee_arc    — golpe em cone à frente
 *  dash_strike  — avança e causa dano no trajeto
 *  spin         — giro completo (vários pulsos)
 *  arrow_rain   — flechas caindo numa área
 *  blink        — deslocamento curto sem dano
 */

export const CLASSES = {
  mage: {
    id: 'mage',
    name: 'Mago',
    tagline: 'Mestre das artes arcanas',
    weaponName: 'Cajado',
    resource: 'Mana',
    color: '#5c6ee0',
    desc: 'Frágil no corpo, devastador na magia. Controla o campo de batalha com fogo, gelo e raios arcanos à longa distância.',
    stats: {
      hp: 62, mana: 110, atk: 13, def: 2, speed: 104, range: 235,
      atkSpeed: 1.5, manaRegen: 9, crit: 0.06, critDmg: 1.75, projSpeed: 300,
    },
    growth: { hp: 9, mana: 15, atk: 3.5, def: 0.8, speed: 1.1, range: 2 },
    attack: { kind: 'projectile', dmgMul: 1.0, speed: 340, sprite: 'fx:bolt', size: 10, sound: 'shoot' },
    skills: [
      {
        id: 'fireball', name: 'Bola de Fogo', kind: 'projectile', level: 1, cost: 14, cd: 3.0,
        desc: 'Dispara uma esfera flamejante que explode ao atingir o alvo.',
        params: { dmgMul: 2.3, speed: 270, radius: 46, size: 15, sprite: 'fx:fireball', sound: 'fire', scale: 0.11 },
      },
      {
        id: 'arcane_ray', name: 'Raio Arcano', kind: 'beam', level: 2, cost: 12, cd: 2.2,
        desc: 'Um raio veloz em linha reta que perfura todos os inimigos no caminho.',
        params: { dmgMul: 1.9, length: 300, width: 9, pierce: 99, sound: 'shoot', scale: 0.10 },
      },
      {
        id: 'ice_burst', name: 'Explosão de Gelo', kind: 'nova', level: 3, cost: 22, cd: 6.5,
        desc: 'Explode gelo no ponto mirado, causando dano e lentidão por 3s.',
        params: { dmgMul: 2.1, radius: 78, slow: 0.45, slowTime: 3.0, sound: 'ice', scale: 0.11 },
      },
    ],
  },

  knight: {
    id: 'knight',
    name: 'Cavaleiro',
    tagline: 'Muralha de aço do reino',
    weaponName: 'Espada',
    resource: 'Vigor',
    color: '#c2ccd9',
    desc: 'Lento e pesado, mas quase indestrutível. Sua espada esmaga tudo que chega perto e sua armadura aguenta o que ninguém aguenta.',
    stats: {
      hp: 138, mana: 60, atk: 16, def: 9, speed: 80, range: 36,
      atkSpeed: 1.15, manaRegen: 7, crit: 0.05, critDmg: 1.8, projSpeed: 0,
    },
    growth: { hp: 19, mana: 5, atk: 3.9, def: 2.2, speed: 0.6, range: 0.5 },
    attack: { kind: 'melee', dmgMul: 1.0, arc: 1.5, sound: 'swing' },
    skills: [
      {
        id: 'power_strike', name: 'Golpe Poderoso', kind: 'melee_arc', level: 1, cost: 12, cd: 2.6,
        desc: 'Um corte devastador que arremessa o inimigo para longe.',
        params: { dmgMul: 2.6, arc: 1.3, rangeMul: 1.25, knock: 260, sound: 'crit', scale: 0.11 },
      },
      {
        id: 'charge', name: 'Investida', kind: 'dash_strike', level: 2, cost: 14, cd: 4.5,
        desc: 'Avança rapidamente atropelando e ferindo todos no caminho.',
        params: { dmgMul: 2.0, distance: 190, speed: 620, width: 26, sound: 'dash', scale: 0.10 },
      },
      {
        id: 'sword_whirl', name: 'Giro da Espada', kind: 'spin', level: 3, cost: 20, cd: 7.0,
        desc: 'Gira a espada atingindo tudo ao redor em três pulsos.',
        params: { dmgMul: 1.5, radius: 66, pulses: 3, pulseGap: 0.16, sound: 'swing', scale: 0.10 },
      },
    ],
  },

  archer: {
    id: 'archer',
    name: 'Arqueiro',
    tagline: 'Olho de falcão, mão firme',
    weaponName: 'Arco',
    resource: 'Fôlego',
    color: '#4fa844',
    desc: 'Equilibrado e ágil. Mantém distância e derruba inimigos antes que eles cheguem perto, com rajadas e chuva de flechas.',
    stats: {
      hp: 88, mana: 75, atk: 13, def: 4, speed: 108, range: 275,
      atkSpeed: 1.85, manaRegen: 7, crit: 0.12, critDmg: 1.9, projSpeed: 420,
    },
    growth: { hp: 12, mana: 7, atk: 3.3, def: 1.1, speed: 1.2, range: 3 },
    attack: { kind: 'projectile', dmgMul: 0.82, speed: 470, sprite: 'fx:arrow', size: 9, sound: 'shoot' },
    skills: [
      {
        id: 'piercing', name: 'Flecha Perfurante', kind: 'projectile', level: 1, cost: 10, cd: 2.4,
        desc: 'Flecha veloz que atravessa vários inimigos em linha reta.',
        params: { dmgMul: 1.7, speed: 620, pierce: 4, size: 11, sprite: 'fx:arrow', sound: 'shoot', scale: 0.10 },
      },
      {
        id: 'arrow_rain', name: 'Chuva de Flechas', kind: 'arrow_rain', level: 2, cost: 20, cd: 7.5,
        desc: 'Flechas caem do céu sobre uma grande área durante 1,5s.',
        params: { dmgMul: 0.85, radius: 74, count: 16, duration: 1.5, sound: 'shoot', scale: 0.09 },
      },
      {
        id: 'explosive_arrow', name: 'Flecha Explosiva', kind: 'projectile', level: 3, cost: 18, cd: 5.0,
        desc: 'Flecha que detona ao impactar, ferindo todos em volta.',
        params: { dmgMul: 1.8, speed: 400, radius: 54, size: 12, sprite: 'fx:arrow_fire', sound: 'fire', scale: 0.11 },
      },
    ],
  },

  assassin: {
    id: 'assassin',
    name: 'Assassino',
    tagline: 'A sombra que corta',
    weaponName: 'Adagas',
    resource: 'Essência',
    color: '#b02a3a',
    desc: 'O mais rápido do reino. Bate forte, bate muitas vezes e some antes de ser atingido — mas não sobrevive a erros.',
    stats: {
      hp: 74, mana: 85, atk: 15, def: 3, speed: 134, range: 32,
      atkSpeed: 2.35, manaRegen: 9, crit: 0.2, critDmg: 2.1, projSpeed: 0,
    },
    growth: { hp: 10, mana: 8, atk: 4.0, def: 0.9, speed: 1.6, range: 0.5 },
    attack: { kind: 'melee', dmgMul: 0.72, arc: 1.1, sound: 'swing' },
    skills: [
      {
        id: 'shadow_strike', name: 'Ataque Sombrio', kind: 'dash_strike', level: 1, cost: 12, cd: 3.0,
        desc: 'Avança até o alvo desferindo um golpe brutal. Crítico garantido.',
        params: { dmgMul: 2.9, distance: 175, speed: 900, width: 22, guaranteedCrit: true, sound: 'dash', scale: 0.12 },
      },
      {
        id: 'twin_blades', name: 'Lâminas Duplas', kind: 'melee_burst', level: 2, cost: 16, cd: 5.0,
        desc: 'Sequência de 5 cortes rápidos com as duas adagas.',
        params: { dmgMul: 0.78, hits: 5, gap: 0.09, arc: 1.4, rangeMul: 1.1, sound: 'swing', scale: 0.10 },
      },
      {
        id: 'shadow_step', name: 'Passo das Sombras', kind: 'blink', level: 3, cost: 10, cd: 4.0,
        desc: 'Some entre as sombras por uma curta distância, ficando intocável.',
        params: { distance: 130, iframes: 0.55, sound: 'dash', scale: 0 },
      },
    ],
  },
};

export const CLASS_IDS = Object.keys(CLASSES);

export function classById(id) {
  return CLASSES[id] || CLASSES.mage;
}

/** Atributos totais de uma classe no nível dado (sem equipamentos). */
export function baseStatsAt(cls, level) {
  const c = classById(cls);
  const l = Math.max(1, level) - 1;
  const g = c.growth, s = c.stats;
  return {
    hp: Math.round(s.hp + g.hp * l),
    mana: Math.round(s.mana + g.mana * l),
    atk: +(s.atk + g.atk * l).toFixed(1),
    def: +(s.def + g.def * l).toFixed(1),
    speed: +(s.speed + g.speed * l).toFixed(1),
    range: Math.round(s.range + g.range * l),
    atkSpeed: +s.atkSpeed.toFixed(2),
    manaRegen: +s.manaRegen.toFixed(1),
    crit: s.crit,
    critDmg: s.critDmg,
    projSpeed: s.projSpeed,
  };
}

/** XP necessário para passar do nível n para n+1. */
export function xpForLevel(n) {
  return Math.round(28 * Math.pow(n, 1.52) + 22 * n);
}

export function skillsUnlocked(cls, level) {
  return classById(cls).skills.filter((s) => level >= s.level);
}
