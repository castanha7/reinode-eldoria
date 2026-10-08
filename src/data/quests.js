// ---------------------------------------------------------------------------
// quests.js — missões dadas pelo rei
// ---------------------------------------------------------------------------

/**
 * goal: { type:'kill', tag:'monster'|'soldier'|<id do inimigo>|'any', count:n, zones?:[ids de zona] }
 * requires: ids de missões que precisam estar completas | giver: id do NPC que dá/recebe a missão
 */
export const QUESTS = [
  {
    id: 'q_slimes',
    name: 'Praga nos Campos',
    giver: 'king',
    order: 1,
    goal: { type: 'kill', tag: 'monster', count: 10, zones: ['fields', 'farmroad'] },
    text: 'Os campos ao leste da cidade estão infestados de slimes e goblins. Limpe a região.',
    hint: 'Mate 10 monstros nos Campos de Eldoria (leste da cidade).',
    reward: { gold: 90, xp: 120, item: 'rare' },
    dialog: [
      'Os campos alimentam a cidade. Sem campos, sem cidade.',
      'Slimes, goblins, o que estiver lá. Dez deles a menos e eu já durmo melhor.',
    ],
    done: ['Excelente. Os fazendeiros mandaram um cesto de pão. Ficou com você, mereceu.'],
  },
  {
    id: 'q_forest',
    name: 'A Floresta Sombria',
    giver: 'king',
    order: 2,
    goal: { type: 'kill', tag: 'monster', count: 16, zones: ['forest', 'deepforest', 'lake'] },
    text: 'A Floresta Sombria, a oeste, virou ninho de criaturas. Os lenhadores não voltam mais.',
    hint: 'Mate 16 criaturas na Floresta Sombria (oeste da cidade).',
    reward: { gold: 180, xp: 320, item: 'rare' },
    dialog: [
      'Agora algo mais sério. A floresta a oeste engoliu três lenhadores este mês.',
      'Lobos, goblins, coisas piores. Dezesseis baixas do lado deles, e a estrada da madeira volta a funcionar.',
    ],
    done: ['Dezesseis. Você é bom nisso. Bom demais para continuar sem equipamento decente.'],
  },
  {
    id: 'q_traitors',
    name: 'Os Traidores de Varkas',
    giver: 'king',
    order: 3,
    requires: ['q_forest'],
    goal: { type: 'kill', tag: 'soldier', count: 14 },
    text: 'Os soldados do general Varkas patrulham as estradas e as ruínas. Acabe com a patrulha.',
    hint: 'Derrote 14 soldados traidores.',
    reward: { gold: 320, xp: 640, item: 'epic' },
    dialog: [
      'Chegou a hora de olhar nos olhos da traição.',
      'As patrulhas de Varkas dominam as estradas e as Ruínas Antigas. Quatorze a menos e ele perde o controle da região.',
      'Eles foram meus soldados um dia. Não hesite — eles não vão.',
    ],
    done: ['Varkas vai sentir essa. E quando sentir, vai saber que Eldoria ainda tem dentes.'],
  },
  {
    id: 'q_boss',
    name: 'O Guardião das Profundezas',
    giver: 'king',
    order: 4,
    goal: { type: 'kill', tag: 'boss', count: 1 },
    requires: ['q_traitors'],
    text: 'Sob a Caverna Esquecida, ao norte, algo antigo despertou. Destrua-o.',
    hint: 'Desça à caverna e derrote o Guardião das Profundezas.',
    reward: { gold: 1200, xp: 1800, item: 'legendary' },
    dialog: [
      'Resta o mal verdadeiro.',
      'Sob a Caverna Esquecida dorme o Guardião das Profundezas. Meu bisavô o selou. O selo quebrou.',
      'Vasculhe a caverna antes: há tesouros que podem decidir a luta. Depois, desça e termine isso.',
      'Se você cair, Eldoria cai junto. Sem pressão.',
    ],
    done: [
      '... Você voltou. E está de pé.',
      'Eldoria lhe deve mais do que ouro pode pagar. Mas ouro é o que eu tenho, então leve ouro.',
      'As portas do reino estarão sempre abertas para você, herói.',
    ],
  },
  {
    id: 'q_spider',
    name: 'A Rainha da Floresta',
    giver: 'king',
    order: 5,
    requires: ['q_forest'],
    goal: { type: 'kill', tag: 'spider_queen', count: 1 },
    text: 'Teias gigantes cobrem o coração da Floresta Profunda. Uma rainha aranha comanda as crias.',
    hint: 'Derrote Vyrka, a Rainha Aranha, na Floresta Profunda (noroeste).',
    reward: { gold: 520, xp: 900, item: 'epic' },
    dialog: [
      'Os lenhadores que sobreviveram falam de uma teia do tamanho de uma casa.',
      'Vyrka, a Rainha Aranha, fez ninho na Floresta Profunda, a noroeste. Livre-nos dela.',
    ],
    done: ['Vyrka caída! Os lenhadores vão chorar de alegria. E de alívio.'],
  },
  {
    id: 'q_lich',
    name: 'O Rei sem Coroa',
    giver: 'king',
    order: 6,
    requires: ['q_traitors'],
    goal: { type: 'kill', tag: 'lich', count: 1 },
    text: 'Nas Ruínas Antigas, os mortos marcham sob as ordens de Maldrak, o Rei Esquelético.',
    hint: 'Derrote Maldrak nas Ruínas Antigas (nordeste).',
    reward: { gold: 780, xp: 1300, item: 'epic' },
    dialog: [
      'Os esqueletos das ruínas nunca foram tantos. Alguém — ou algo — os comanda.',
      'É Maldrak, o antigo rei daquelas terras. Ele me deve um imposto de uns quinhentos anos.',
    ],
    done: ['O rei dos mortos está morto outra vez. Bem... mais morto.'],
  },
  {
    id: 'q_titan',
    name: 'A Montanha que Anda',
    giver: 'king',
    order: 7,
    requires: ['q_lich'],
    goal: { type: 'kill', tag: 'titan', count: 1 },
    text: 'No Vale Sombrio, um colosso de pedra desperta e esmaga tudo em seu caminho.',
    hint: 'Derrote Grommash, o Colosso de Pedra, no Vale Sombrio (sudeste).',
    reward: { gold: 1000, xp: 1700, item: 'legendary' },
    dialog: [
      'O Vale Sombrio treme a cada passo. Dizem que uma montanha aprendeu a andar.',
      'Grommash, o Colosso de Pedra. Nenhuma lâmina comum o arranha. Leve o melhor que tiver.',
    ],
    done: ['Grommash em pedaços. Pelo menos agora temos pedra para reconstruir a muralha.'],
  },
  {
    id: 'q_bandits',
    name: 'Ladrões de Estrada',
    giver: 'guard_east',
    order: 8,
    goal: { type: 'kill', tag: 'bandit', count: 8 },
    text: 'Bandidos têm roubado comerciantes nas estradas e nos campos. O Capitão Dorn quer eles fora de lá.',
    hint: 'Derrote 8 bandidos nas estradas, campos e floresta.',
    reward: { gold: 160, xp: 260, item: 'rare' },
    dialog: [
      'Mercadores sumindo, carroças vazias. É coisa de bandido.',
      'Oito deles a menos e a estrada volta a respirar. Eles roubam ouro a cada golpe — não deixe acertarem.',
    ],
    done: ['Oito bandidos e nenhum arranhão? Mentira. Mas obrigado.'],
  },
  {
    id: 'q_golems',
    name: 'Pedras que Andam',
    giver: 'guard_east',
    order: 9,
    requires: ['q_bandits'],
    goal: { type: 'kill', tag: 'golem', count: 4 },
    text: 'Golems de pedra surgiram nas ruínas e no vale. Os mineiros precisam de passagem.',
    hint: 'Destrua 4 golems de pedra (ruínas, vale ou caverna).',
    reward: { gold: 420, xp: 700, item: 'epic' },
    dialog: [
      'Golems. De pedra. Que andam. Eu juro que não bebi nada.',
      'Quatro destruídos e os mineiros voltam às minas. Leve uma arma pesada — a pele deles é dura.',
    ],
    done: ['Quatro golems! Os mineiros lhe devem uma rodada. Eu também.'],
  },
  {
    id: 'q_spiders',
    name: 'Veneno e Teias',
    giver: 'hunter',
    order: 10,
    goal: { type: 'kill', tag: 'spider', count: 8 },
    text: 'A Caçadora Yara precisa de glândulas de aranha para suas armadilhas.',
    hint: 'Derrote 8 aranhas venenosas na floresta.',
    reward: { gold: 140, xp: 280, item: 'rare' },
    dialog: [
      'As aranhas estão se espalhando. Cospem teia e te deixam lento — o pior que há contra lobos.',
      'Oito aranhas. Venha forte e chegue perto rápido, elas são frágeis de perto.',
    ],
    done: ['Oito! Agora minhas armadilhas ficam completas. Pegue, é seu.'],
  },
];

export function questById(id) {
  return QUESTS.find((q) => q.id === id) || null;
}

/** Qual inimigo conta para qual tag. */
export function enemyTags(def) {
  const tags = ['any', def.id];
  if (def.boss) tags.push('monster');
  else if (def.id.startsWith('soldier')) tags.push('soldier');
  else tags.push('monster');
  return tags;
}

/** Missão liberada? (todas as dependências concluídas e a anterior da cadeia principal) */
export function questUnlocked(q, quests) {
  const req = q.requires || [];
  if (req.length) return req.every((id) => quests[id] && quests[id].state === 'complete');
  if (q.order === 1) return true;
  if (q.order <= 4) {
    const prev = QUESTS.find((x) => x.order === q.order - 1);
    return !!(prev && quests[prev.id] && quests[prev.id].state === 'complete');
  }
  return true;
}
