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
    quests: ['q_slimes', 'q_forest', 'q_traitors', 'q_boss', 'q_spider', 'q_lich', 'q_titan'],
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
    sprite: 'guard', name: 'Capitão Dorn', title: 'Capitão da Guarda', role: 'quest', quests: ['q_bandits', 'q_golems'],
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
    sprite: 'huntress', name: 'Caçadora Yara', title: 'Caçadora', role: 'quest', quests: ['q_spiders'],
    dialog: [
      'Shhh. Lobos. Eles preparam o bote antes de atacar — se você vir o agachamento, saia da frente.',
      'Na Floresta Profunda tem lobos sombrios. Esses não agacham, eles simplesmente aparecem.',
      'Leve poções. Todo mundo diz isso. Ninguém leva.',
    ],
  },
  alchemist: {
    sprite: 'alchemist', name: 'Mestra Lyra', title: 'Alquimista', role: 'alchemist',
    dialog: [
      'Cuidado com o frasco verde. Não, o outro verde. Esse também.',
      'Elixires, poções, pergaminhos... tudo testado. Em mim, na maioria dos casos.',
      'Um elixir bem usado vale mais que uma armadura nova. Guarde os fortes para os chefes.',
    ],
  },
  bard: {
    sprite: 'bard', name: 'Fino, o Trovador', title: 'Bardo Errante', role: 'bard', wander: 40,
    dialog: [
      'Ah, um herói! Posso fazer uma canção sobre você? Só preciso de uma coisinha: ouro.',
      'Minhas canções dão coragem de verdade. Pergunte a quem sobreviveu a elas.',
    ],
  },
  fisher: {
    sprite: 'fisher', name: 'Pescador Bento', title: 'Pescador', role: 'talk',
    dialog: [
      'Pesco aqui há trinta anos. Nunca peguei nada. Mas o silêncio é bom.',
      'O rio corta o reino ao meio. Só atravesse pelas pontes — a água é funda e fria.',
      'Dizem que há um esconderijo escondido bem pertinho do rio, ao norte da cidade.',
    ],
  },
  miner: {
    sprite: 'miner', name: 'Durgan, o Mineiro', title: 'Mineiro', role: 'talk',
    dialog: [
      'Eu cavava ali embaixo até o chão tremer. Agora fico aqui, olhando a entrada e tremendo também.',
      'A Caverna Esquecida tem salas com baús e esqueletos. E, no fundo, algo que ruge.',
      'Golems de pedra andam por aí. Duros demais para facas finas. Arma pesada neles.',
    ],
  },
  hermit: {
    sprite: 'hermit', name: 'Eremita Zephyr', title: 'Mago Recluso', role: 'talk',
    dialog: [
      'Shhh. Estou escutando as pedras. Elas falam. Pouco, mas falam.',
      'A Clareira Esquecida esconde uma entrada atrás dos arbustos. Mas você não ouviu isso de mim.',
      'Há três senhores nas terras: uma aranha, um rei morto e uma montanha. Todos têm tesouros.',
    ],
  },
  traveler: {
    sprite: 'traveler', name: 'Viajante Kael', title: 'Viajante', role: 'talk', wander: 36,
    dialog: [
      'Vim de longe. Longe de verdade. Nunca vi tanto monstro por metro quadrado.',
      'Se encontrar um bandido, não deixe ele te tocar: ele rouba ouro e foge.',
      'Pergaminhos de Retorno salvam vidas. Compre um antes de entrar em qualquer buraco.',
    ],
  },
  dog: {
    sprite: 'dog', name: 'Cachorro Caramelo', title: 'Vira-lata', role: 'pet', wander: 48,
    dialog: ['Au! Au!', '*abana o rabo animadamente*'],
  },
  cat: {
    sprite: 'cat', name: 'Gato Mingau', title: 'Gato da Praça', role: 'pet', wander: 30,
    dialog: ['Miau.', '*olha para você com desdém e volta a lamber a pata*'],
  },
  villager_5: {
    sprite: 'villager_f', name: 'Tia Beatriz', title: 'Padeira', role: 'talk', wander: 30,
    dialog: [
      'Pão quentinho! Ou quase quente. Ou pão.',
      'Meu marido foi caçar lobos. Voltou com um javali. Não perguntem.',
    ],
  },
  villager_6: {
    sprite: 'villager_m', name: 'Dedo', title: 'Aprendiz de Ferreiro', role: 'talk', wander: 28,
    dialog: [
      'Bram me deixa bater no ferro frio. É uma honra. Dizem.',
      'Se reforjar a arma várias vezes, ela fica monstruosa. Ouro bem gasto.',
    ],
  },
};

export function npcDef(id) {
  return NPC_DEFS[id] || { sprite: 'villager_m', name: 'Aldeão', title: '', role: 'talk', dialog: ['...'] };
}
