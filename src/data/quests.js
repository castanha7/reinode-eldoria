// ---------------------------------------------------------------------------
// quests.js — missões dadas pelo rei
// ---------------------------------------------------------------------------

/**
 * goal: { type:'kill', tag:'monster'|'soldier'|'boss'|'any', count:n }
 */
export const QUESTS = [
  {
    id: 'q_slimes',
    name: 'Praga nos Campos',
    giver: 'king',
    order: 1,
    goal: { type: 'kill', tag: 'monster', count: 10 },
    text: 'Os campos ao leste da cidade estão infestados de slimes e goblins. Limpe a região.',
    hint: 'Mate 10 monstros nos Campos de Eldoria.',
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
    goal: { type: 'kill', tag: 'monster', count: 16 },
    text: 'A Floresta Sombria, a oeste, virou ninho de criaturas. Os lenhadores não voltam mais.',
    hint: 'Mate 16 criaturas na Floresta Sombria.',
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
];

export function questById(id) {
  return QUESTS.find((q) => q.id === id) || null;
}

/** Qual inimigo conta para qual tag. */
export function enemyTags(def) {
  const tags = ['any'];
  if (def.boss) tags.push('boss', 'monster');
  else if (def.id.startsWith('soldier')) tags.push('soldier');
  else tags.push('monster');
  return tags;
}
