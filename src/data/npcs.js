// ---------------------------------------------------------------------------
// npcs.js — personagens não jogáveis: falas, papéis e lojas
// ---------------------------------------------------------------------------

export const NPC_DEFS = {
  king: {
    sprite: 'king', name: 'Rei Aldric III', title: 'Rei de Eldoria', role: 'quest',
    dialog: [
      'Aventureiro! Eldoria sangra enquanto conversamos.',
      'Meu próprio general, Varkas, virou-se contra a coroa. Os soldados que você vê lá fora não me obedecem mais.',
      'E, como se não bastasse, algo despertou sob a Caverna Esquecida, ao norte.',
      'Preciso de alguém que não deva nada a ninguém. Preciso de você.',
    ],
    quests: ['q_slimes', 'q_forest', 'q_traitors', 'q_boss'],
  },
  advisor: {
    sprite: 'elder', name: 'Conselheiro Otho', title: 'Conselheiro Real', role: 'talk',
    dialog: [
      'O rei confia em você. Eu, confesso, ainda estou decidindo.',
      'Um conselho gratuito: baús escondem-se onde ninguém olha. Atrás das pedras, por exemplo.',
      'E nunca enfrente o Guardião sem antes vasculhar a caverna. Há tesouros lá embaixo.',
    ],
  },
  blacksmith: {
    sprite: 'blacksmith', name: 'Bram, o Ferreiro', title: 'Mestre Ferreiro', role: 'smith',
    dialog: [
      'Hmph. Mais um que quer morrer com estilo.',
      'Traga ouro e eu reforjo sua arma. Fica mais afiada, mais longe e mais bruta.',
      'Cada reforjo custa mais que o anterior. Ferreiro também come.',
    ],
  },
  merchant: {
    sprite: 'merchant', name: 'Selmo Viajante', title: 'Comerciante', role: 'shop',
    dialog: [
      'Ah, um cliente vivo! Que alegria, juro que não é ironia.',
      'Tenho armas, armaduras, relíquias... e poções, muitas poções.',
      'Compro o que você não usa. Vendo o que você vai precisar. Negócio justo!',
    ],
  },
  healer: {
    sprite: 'healer', name: 'Irmã Elowen', title: 'Curandeira da Capela', role: 'healer',
    dialog: [
      'Entre, entre. A capela está aberta a todos que ainda respiram.',
      'Posso fechar suas feridas por algumas moedas — ou de graça, se você estiver quase morrendo.',
      'A luz protege os corajosos. Os imprudentes ela apenas remenda.',
    ],
  },
  elder: {
    sprite: 'elder', name: 'Ancião Cedric', title: 'Ancião da Vila', role: 'talk',
    dialog: [
      'Eu vi este reino nascer. E, se nada mudar, verei ele morrer.',
      'Dizem que há três lugares neste reino que não constam em mapa algum.',
      'Procure onde as pedras formam círculo. E onde os arbustos escondem o que não deveria estar escondido.',
    ],
  },
  guard_gate_1: {
    sprite: 'guard', name: 'Guarda Breno', title: 'Guarda do Portão', role: 'talk',
    dialog: [
      'Alto aí! ... Ah, você não é um deles. Pode passar.',
      'Cuidado ao norte: a estrada está cheia de desertores do general Varkas.',
      'Se ouvir uivos, suba em alguma coisa. Sério.',
    ],
  },
  guard_gate_2: {
    sprite: 'guard', name: 'Guarda Mira', title: 'Guarda do Portão', role: 'talk',
    dialog: [
      'Não recebo salário há três meses, mas continuo aqui. Alguém precisa.',
      'O ferreiro reforja armas. A curandeira remenda gente. O mercante vende o que achar.',
      'E o rei? O rei precisa de alguém que resolva o que exército nenhum resolve.',
    ],
  },
  guard_east: {
    sprite: 'guard', name: 'Capitão Dorn', title: 'Capitão da Guarda', role: 'talk',
    dialog: [
      'O portão leste dá para os campos e, mais adiante, para as Ruínas Antigas.',
      'Nas ruínas tem esqueleto. Muito esqueleto. Leve algo que bata forte.',
      'Volte inteiro. Estou sem efetivo para enviar resgate.',
    ],
  },
  guard_plaza: {
    sprite: 'guard', name: 'Guarda Alda', title: 'Guarda da Praça', role: 'talk',
    dialog: [
      'A praça é o coração da cidade. Repare na estátua: é o fundador.',
      'Dizem que ele matou o primeiro Guardião. Dizem também que ele mentia muito.',
    ],
  },
  guard_throne_l: {
    sprite: 'guard', name: 'Guarda Real', title: 'Guarda do Salão', role: 'talk',
    dialog: ['Fique onde posso vê-lo, por favor.', 'O rei está recebendo. Fale com respeito.'],
  },
  guard_throne_r: {
    sprite: 'guard', name: 'Guarda Real', title: 'Guarda do Salão', role: 'talk',
    dialog: ['Nenhum de nós sobrou para ir à caverna. Sobra você.', 'Boa sorte. Vai precisar.'],
  },
  villager_1: {
    sprite: 'villager_f', name: 'Marta', title: 'Aldeã', role: 'talk',
    dialog: [
      'Você é aventureiro? De verdade? Com arma e tudo?',
      'Os slimes comeram minha horta. Se você der um jeito neles, o rei agradece. Eu também.',
    ],
  },
  villager_2: {
    sprite: 'villager_m', name: 'Otto', title: 'Aldeão', role: 'talk',
    dialog: [
      'Dica de quem já apanhou muito: fique de olho na barra colorida sobre a cabeça dos inimigos.',
      'Se a barra for vermelha e enorme, corra. Se for pequena, bata.',
      'Se for roxa e ocupar a tela inteira... reze.',
    ],
  },
  villager_3: {
    sprite: 'villager_f', name: 'Rosa', title: 'Feirante', role: 'talk',
    dialog: [
      'Maçãs! Pães! Meias! ... Ninguém compra meias num reino em guerra, mas eu insisto.',
      'O Selmo ali do lado compra itens que você não usa. Bom rapaz, péssimo senso de moda.',
    ],
  },
  villager_4: {
    sprite: 'villager_m', name: 'Gil', title: 'Aldeão', role: 'talk',
    dialog: [
      'Ouvi dizer que há um baú escondido atrás das pedras, a leste das ruínas.',
      'E outro numa clareira no meio da floresta profunda. Ninguém entra lá. Eu não entro lá.',
    ],
  },
  child_1: {
    sprite: 'child', name: 'Pipa', title: 'Criança', role: 'talk',
    dialog: [
      'Quando eu crescer vou ser como você! E vou ter uma espada enorme!',
      'Ou um cajado. Cajados fazem luz. Espadas não fazem luz.',
    ],
  },
  farmer: {
    sprite: 'villager_m', name: 'Fazendeiro Tob', title: 'Fazendeiro', role: 'talk',
    dialog: [
      'Os slimes estão comendo minha plantação. SLIMES. Em pleno reino medieval.',
      'Limpe os campos e eu conto onde meu avô escondeu um baú: perto do rio, ao sul.',
      'Obrigado. De verdade. A família agradece.',
    ],
  },
  hunter: {
    sprite: 'villager_f', name: 'Caçadora Yara', title: 'Caçadora', role: 'talk',
    dialog: [
      'Shhh. Lobos. Eles preparam o bote antes de atacar — se você vir o agachamento, saia da frente.',
      'Na Floresta Profunda tem lobos sombrios. Esses não agacham, eles simplesmente aparecem.',
      'Leve poções. Todo mundo diz isso. Ninguém leva.',
    ],
  },
};

export function npcDef(id) {
  return NPC_DEFS[id] || { sprite: 'villager_m', name: 'Aldeão', title: '', role: 'talk', dialog: ['...'] };
}
