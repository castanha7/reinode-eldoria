// ---------------------------------------------------------------------------
// items.js — equipamentos, consumíveis e tabelas de loot
// ---------------------------------------------------------------------------

export const RARITY = {
  common: { id: 'common', name: 'Comum', color: '#c9c9d4', order: 0, gem: '●' },
  rare: { id: 'rare', name: 'Raro', color: '#4fa8f0', order: 1, gem: '◆' },
  epic: { id: 'epic', name: 'Épico', color: '#b875f0', order: 2, gem: '❖' },
  legendary: { id: 'legendary', name: 'Lendário', color: '#ffa32a', order: 3, gem: '★' },
  mythic: { id: 'mythic', name: 'Mítico', color: '#ff5470', order: 4, gem: '✵' },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const SLOT_INFO = {
  weapon: { name: 'Arma', icon: '⚔' },
  armor: { name: 'Armadura', icon: '🛡' },
  trinket: { name: 'Relíquia', icon: '✦' },
};

// formatador com sinal correto (corrige o bug de stats negativos "+-4")
const sgn = (v, f) => `${v >= 0 ? '+' : '−'}${f(Math.abs(v))}`;
const r0 = (v) => String(Math.round(v));
const r1 = (v) => String(Math.round(v * 10) / 10);
const p0 = (v) => `${Math.round(v * 100)}%`;

export const STAT_INFO = {
  hp: { name: 'Vida', fmt: (v) => sgn(v, r0) },
  mana: { name: 'Mana', fmt: (v) => sgn(v, r0) },
  atk: { name: 'Dano', fmt: (v) => sgn(v, r1) },
  def: { name: 'Defesa', fmt: (v) => sgn(v, r1) },
  speed: { name: 'Velocidade', fmt: (v) => sgn(v, r0) },
  atkSpeed: { name: 'Vel. de Ataque', fmt: (v) => `${(Math.round(v * 100) / 100).toFixed(2)}/s` },
  range: { name: 'Alcance', fmt: (v) => sgn(v, r0) },
  crit: { name: 'Chance Crítica', fmt: (v) => sgn(v, p0) },
  critDmg: { name: 'Dano Crítico', fmt: (v) => sgn(v, p0) },
  cdRed: { name: 'Red. Cooldown', fmt: (v) => sgn(v, p0) },
  manaRegen: { name: 'Regeneração', fmt: (v) => sgn(v, r1) + '/s' },
  lifesteal: { name: 'Roubo de Vida', fmt: (v) => `${Math.round(v * 100)}%` },
  projSpeed: { name: 'Vel. do Projétil', fmt: (v) => sgn(v, r0) },
  aoe: { name: 'Área de Efeito', fmt: (v) => sgn(v, p0) },
  dodge: { name: 'Esquiva', fmt: (v) => sgn(v, p0) },
  hpRegen: { name: 'Regen. de Vida', fmt: (v) => sgn(v, r1) + '/s' },
  goldFind: { name: 'Ouro Extra', fmt: (v) => sgn(v, p0) },
};

// [nome, raridade, stats, preço, descrição]
const TABLE = {
  mage: {
    weapon: [
      ['Cajado de Aprendiz', 'common', { atk: 4, range: 12 }, 45, 'Madeira simples com um cristal rachado na ponta.'],
      ['Cajado de Carvalho Antigo', 'common', { atk: 7, range: 18, mana: 10 }, 110, 'Entalhado pelos druidas da Floresta Sombria.'],
      ['Cajado Rúnico de Aldrath', 'rare', { atk: 13, range: 26, manaRegen: 2.5 }, 320, 'Runas azuis pulsam quando o mana flui.'],
      ['Cetro da Chama Eterna', 'rare', { atk: 17, crit: 0.05, aoe: 0.15 }, 520, 'A ponta queima sem consumir lenha alguma.'],
      ['Cajado do Vazio', 'epic', { atk: 26, range: 38, cdRed: 0.12, mana: 25 }, 980, 'Absorve a luz ao redor e devolve em destruição.'],
      ['Báculo do Arquimago', 'epic', { atk: 33, crit: 0.08, critDmg: 0.3, manaRegen: 4 }, 1450, 'Pertenceu ao último Arquimago de Eldoria.'],
      ['Cajado Estelar de Eldoria', 'legendary', { atk: 46, range: 52, cdRed: 0.2, crit: 0.12, aoe: 0.25, mana: 40 }, 3200, 'Forjado no coração de uma estrela caída.'],
      ['Varinha de Cristal Vivo', 'rare', { atk: 14, mana: 20, hpRegen: 0.8 }, 400, 'O cristal cresce devagar, alimentando-se de mana.'],
      ['Cajado da Tempestade', 'epic', { atk: 29, projSpeed: 90, crit: 0.07, aoe: 0.12 }, 1250, 'Relâmpagos dançam entre os dentes da ponta.'],
      ['Olho do Cometa', 'legendary', { atk: 52, range: 40, cdRed: 0.25, aoe: 0.3, critDmg: 0.35, mana: 50 }, 3600, 'Dizem que foi arrancado de um meteoro ainda em chamas.'],
      ['Cetro do Firmamento', 'mythic', { atk: 61, range: 55, cdRed: 0.3, crit: 0.15, critDmg: 0.45, aoe: 0.35, mana: 70, manaRegen: 6 }, 7400, 'As estrelas respondem a quem o ergue — e obedecem.'],
    ],
    armor: [
      ['Manto de Tecido Gasto', 'common', { hp: 12, def: 1 }, 40, 'Mais remendo que tecido.'],
      ['Manto de Seda Arcana', 'common', { hp: 24, def: 2, mana: 15 }, 130, 'Tecido banhado em pó de cristal.'],
      ['Túnica do Erudito', 'rare', { hp: 42, def: 4, mana: 30, manaRegen: 2 }, 360, 'Usada pelos escribas da torre real.'],
      ['Manto Gélido', 'rare', { hp: 55, def: 6, cdRed: 0.08 }, 600, 'Nunca esquenta, nunca derrete.'],
      ['Veste do Vidente', 'epic', { hp: 82, def: 8, mana: 50, dodge: 0.08 }, 1100, 'Mostra o que ainda não aconteceu.'],
      ['Manto do Arquimago', 'legendary', { hp: 120, def: 12, mana: 80, manaRegen: 5, cdRed: 0.15 }, 2800, 'Bordado com as constelações do norte.'],
      ['Robe do Feiticeiro Errante', 'rare', { hp: 50, def: 5, speed: 6, mana: 25 }, 480, 'Gasto nas barras, firme nas runas.'],
      ['Veste da Aurora', 'epic', { hp: 90, def: 9, mana: 60, hpRegen: 1.2, cdRed: 0.08 }, 1300, 'Brilha em tons de rosa e dourado ao amanhecer.'],
      ['Manto do Eclipse', 'mythic', { hp: 150, def: 15, mana: 100, manaRegen: 7, cdRed: 0.2, dodge: 0.1 }, 6800, 'Costurado com a hora exata em que o sol morre.'],
    ],
    trinket: [
      ['Anel de Foco', 'common', { mana: 25, manaRegen: 1.5 }, 90, 'Ajuda a manter a mente firme.'],
      ['Amuleto de Gelo', 'rare', { cdRed: 0.12, def: 3 }, 420, 'Sempre frio ao toque.'],
      ['Orbe do Vazio', 'epic', { atk: 14, lifesteal: 0.06 }, 1250, 'Sussurra segredos que você preferia não ouvir.'],
      ['Tiara do Sábio', 'legendary', { hp: 60, mana: 60, atk: 18, cdRed: 0.15 }, 2600, 'Coroa dos que trocaram o sono por conhecimento.'],
      ['Grimório Miniatura', 'rare', { atk: 7, mana: 30, cdRed: 0.06 }, 450, 'Cabe no bolso, pesa na consciência.'],
      ['Pingente de Safira', 'epic', { mana: 55, manaRegen: 3.5, aoe: 0.15, goldFind: 0.1 }, 1150, 'A pedra sussurra feitiços esquecidos.'],
      ['Lágrima de Selene', 'mythic', { atk: 24, mana: 90, cdRed: 0.28, crit: 0.12, hpRegen: 1.5 }, 6200, 'Uma lágrima da lua que escolheu um feiticeiro como herdeiro.'],
    ],
  },
  knight: {
    weapon: [
      ['Espada Curta da Milícia', 'common', { atk: 5, range: 3 }, 45, 'Padrão dos recrutas de Eldoria.'],
      ['Espada Longa de Ferro', 'common', { atk: 9, hp: 8 }, 120, 'Pesada, honesta, afiada o suficiente.'],
      ['Lâmina de Aço Real', 'rare', { atk: 15, def: 3, range: 5 }, 340, 'Forjada na forja do castelo.'],
      ['Espada do Juramento', 'rare', { atk: 19, hp: 22, lifesteal: 0.04 }, 560, 'Abençoada pelo rei no dia da posse.'],
      ['Martelo-Espada do Guardião', 'epic', { atk: 28, def: 6, hp: 40, range: 8 }, 1050, 'Não corta: amassa.'],
      ['Lâmina do Paladino', 'epic', { atk: 34, crit: 0.08, critDmg: 0.25 }, 1500, 'Brilha quando inimigos se aproximam.'],
      ['Excaldrin, Espada do Reino', 'legendary', { atk: 50, hp: 70, def: 10, crit: 0.12, lifesteal: 0.08 }, 3300, 'A lâmina que fundou Eldoria.'],
      ['Machado de Guerra Anão', 'rare', { atk: 17, def: 2, hp: 18, critDmg: 0.15 }, 520, 'Feito por mãos que sabem o peso do aço.'],
      ['Espada Flamejante', 'epic', { atk: 31, aoe: 0.1, crit: 0.06, range: 6 }, 1280, 'Deixa um rastro de brasas no ar.'],
      ['Lâmina do Alvorecer', 'legendary', { atk: 55, hp: 90, def: 12, range: 10, lifesteal: 0.09, hpRegen: 1.5 }, 3700, 'Cada golpe lembra a luz de um novo dia.'],
      ['Espada dos Reis Caídos', 'mythic', { atk: 64, hp: 120, def: 16, crit: 0.14, critDmg: 0.4, lifesteal: 0.1, range: 12 }, 7600, 'Empunhada por todos os reis de Eldoria. Lembra-se de cada um.'],
    ],
    armor: [
      ['Armadura de Couro Batido', 'common', { hp: 22, def: 3 }, 50, 'Cheira a estábulo.'],
      ['Cota de Malha', 'common', { hp: 40, def: 6 }, 150, 'Anéis de ferro entrelaçados à mão.'],
      ['Peitoral de Placas', 'rare', { hp: 70, def: 10 }, 400, 'Aguenta uma flechada de frente.'],
      ['Armadura da Guarda Real', 'rare', { hp: 88, def: 13, speed: -4 }, 640, 'Azul e prata, inconfundível.'],
      ['Armadura do Baluarte', 'epic', { hp: 130, def: 18, dodge: -0.02 }, 1200, 'Pesa como um muro — e para como um muro.'],
      ['Armadura do Paladino', 'legendary', { hp: 190, def: 26, lifesteal: 0.05 }, 3000, 'Nenhum cavaleiro que a vestiu caiu em batalha.'],
      ['Placas do Leão', 'epic', { hp: 150, def: 20, hpRegen: 1.4 }, 1400, 'O leão dourado no peito jamais recuou.'],
      ['Couraça do Colosso', 'legendary', { hp: 230, def: 30, atk: 8, hpRegen: 2 }, 3400, 'Arrancada do corpo de um titã de pedra.'],
      ['Égide do Alvorecer', 'mythic', { hp: 285, def: 36, atk: 10, hpRegen: 2.6 }, 7100, 'A última muralha de Eldoria cabe num peito.'],
    ],
    trinket: [
      ['Anel de Vigor', 'common', { hp: 30 }, 95, 'Sangue quente, coração firme.'],
      ['Emblema da Guarda', 'rare', { def: 8, hp: 25 }, 430, 'Marca dos soldados de confiança do rei.'],
      ['Botas de Aço Leve', 'rare', { speed: 14, def: 4 }, 470, 'Menos barulho, mais passos.'],
      ['Coração de Dragão', 'epic', { hp: 90, atk: 10, lifesteal: 0.07 }, 1300, 'Ainda bate, de vez em quando.'],
      ['Medalha do Paladino', 'legendary', { atk: 20, hp: 80, def: 10, crit: 0.08 }, 2700, 'Concedida apenas aos imortais.'],
      ['Escudo Menor de Ferro', 'common', { def: 4, hp: 15 }, 110, 'Pequeno, mas já salvou muitas costelas.'],
      ['Brasão do Cruzado', 'epic', { hp: 70, def: 12, atk: 8, goldFind: 0.12 }, 1180, 'Brasão de uma ordem que ninguém lembra mais.'],
      ['Coração do Baluarte', 'mythic', { hp: 140, def: 22, atk: 14, lifesteal: 0.09, hpRegen: 1.8 }, 6500, 'Bate no ritmo dos que nunca recuaram.'],
    ],
  },
  archer: {
    weapon: [
      ['Arco de Caça', 'common', { atk: 4, range: 15 }, 45, 'Bom para coelhos. E goblins.'],
      ['Arco Longo de Teixo', 'common', { atk: 8, range: 24 }, 115, 'Alcance de torre de vigia.'],
      ['Arco Composto', 'rare', { atk: 14, atkSpeed: 0.2, range: 20 }, 330, 'Chifre e tendão, tensão perfeita.'],
      ['Arco do Vento Norte', 'rare', { atk: 17, projSpeed: 90, crit: 0.05 }, 540, 'As flechas voam mais rápido que o som.'],
      ['Arco da Tempestade', 'epic', { atk: 25, atkSpeed: 0.35, crit: 0.08 }, 1000, 'Estala como trovão a cada disparo.'],
      ['Arco do Falcão Dourado', 'epic', { atk: 31, range: 55, crit: 0.1, critDmg: 0.3 }, 1480, 'Nunca erra duas vezes o mesmo alvo.'],
      ['Arco Celeste de Eldoria', 'legendary', { atk: 45, atkSpeed: 0.5, range: 65, crit: 0.15, projSpeed: 150 }, 3250, 'Flechas de luz pura.'],
      ['Arco de Osso de Dragão', 'rare', { atk: 16, range: 30, critDmg: 0.2 }, 520, 'Curvado em osso que ainda guarda calor.'],
      ['Arco Gêmeo do Crepúsculo', 'epic', { atk: 27, atkSpeed: 0.3, aoe: 0.1, crit: 0.07 }, 1280, 'Duas cordas, duas flechas, nenhum remorso.'],
      ['Arco do Último Suspiro', 'legendary', { atk: 50, range: 80, crit: 0.18, critDmg: 0.45, projSpeed: 120 }, 3700, 'Quem o empunhou nunca falhou o primeiro tiro.'],
      ['Arco da Estrela Cadente', 'mythic', { atk: 59, range: 95, atkSpeed: 0.55, crit: 0.22, critDmg: 0.55, projSpeed: 190 }, 7500, 'A flecha chega antes do som, sempre.'],
    ],
    armor: [
      ['Couro Leve', 'common', { hp: 14, def: 2, speed: 3 }, 45, 'Silencioso como a floresta.'],
      ['Gibão de Caçador', 'common', { hp: 26, def: 3 }, 120, 'Verde-musgo, feito para se esconder.'],
      ['Armadura de Escamas', 'rare', { hp: 46, def: 6 }, 350, 'Escamas de wyvern costuradas.'],
      ['Manto do Patrulheiro', 'rare', { hp: 58, def: 7, speed: 8 }, 580, 'Não molha, não rasga, não faz barulho.'],
      ['Veste do Vento', 'epic', { hp: 86, def: 10, speed: 14, dodge: 0.1 }, 1120, 'Quase some quando você corre.'],
      ['Couraça do Falcão', 'legendary', { hp: 130, def: 16, speed: 18, crit: 0.1 }, 2850, 'Penas de ouro que param espadas.'],
      ['Capa de Folhas Vivas', 'rare', { hp: 52, def: 6, hpRegen: 1, speed: 6 }, 500, 'As folhas se regeneram quando você está ferido.'],
      ['Gibão da Caça Selvagem', 'epic', { hp: 90, def: 11, speed: 12, crit: 0.06, goldFind: 0.1 }, 1250, 'Peles dos animais mais difíceis da floresta.'],
      ['Manto do Vento Antigo', 'mythic', { hp: 160, def: 19, speed: 24, dodge: 0.14, hpRegen: 1.6 }, 6900, 'O vento que existia antes das montanhas ainda o veste.'],
    ],
    trinket: [
      ['Aljava Rápida', 'common', { atkSpeed: 0.22 }, 100, 'Flechas sempre à mão.'],
      ['Pena de Falcão', 'rare', { speed: 16, dodge: 0.05 }, 420, 'Leve como o voo.'],
      ['Ponta Perfurante', 'epic', { crit: 0.15, critDmg: 0.4 }, 1200, 'Atravessa cota de malha como papel.'],
      ['Olho de Águia', 'legendary', { range: 70, crit: 0.15, atk: 15, atkSpeed: 0.3 }, 2700, 'Enxerga a presa a um quilômetro.'],
      ['Aljava Sem Fundo', 'rare', { atkSpeed: 0.3, atk: 4, projSpeed: 40 }, 460, 'Nunca esvazia. Ninguém sabe por quê.'],
      ['Totem do Caçador', 'epic', { atk: 12, crit: 0.1, hpRegen: 1, speed: 10 }, 1180, 'Entalhado com os rostos das presas mais valiosas.'],
      ['Olho do Sol Nascente', 'mythic', { atk: 22, range: 90, crit: 0.18, atkSpeed: 0.4, goldFind: 0.18 }, 6400, 'Enxerga o amanhã — e acerta ontem.'],
    ],
  },
  assassin: {
    weapon: [
      ['Adaga Enferrujada', 'common', { atk: 5, atkSpeed: 0.1 }, 45, 'Já matou alguém. Provavelmente por acidente.'],
      ['Adagas Gêmeas', 'common', { atk: 9, atkSpeed: 0.18 }, 120, 'Uma em cada mão, como manda a tradição.'],
      ['Lâminas Sombrias', 'rare', { atk: 15, crit: 0.06, atkSpeed: 0.2 }, 340, 'Não refletem a luz das tochas.'],
      ['Punhais do Sussurro', 'rare', { atk: 18, crit: 0.09, critDmg: 0.2 }, 560, 'A vítima só ouve o vento.'],
      ['Garras da Meia-Noite', 'epic', { atk: 27, atkSpeed: 0.35, crit: 0.1 }, 1020, 'Curvas, finas, sedentas.'],
      ['Presas da Noite', 'epic', { atk: 33, crit: 0.14, lifesteal: 0.06 }, 1520, 'Bebe um pouco de cada ferida.'],
      ['Ceifadoras de Eldoria', 'legendary', { atk: 48, atkSpeed: 0.5, crit: 0.2, critDmg: 0.4 }, 3300, 'Duas irmãs que nunca perdem um alvo.'],
      ['Facas de Arremesso Gêmeas', 'rare', { atk: 16, atkSpeed: 0.28, speed: 6 }, 520, 'Leves demais para o peso do que fazem.'],
      ['Lâminas do Eclipse', 'epic', { atk: 30, crit: 0.12, atkSpeed: 0.25, critDmg: 0.2 }, 1300, 'Sombra e luz brigam em cada corte.'],
      ['Sussurro Final', 'legendary', { atk: 54, crit: 0.22, critDmg: 0.5, lifesteal: 0.08, atkSpeed: 0.4 }, 3700, 'É a última coisa que você ouve.'],
      ['Adagas do Crepúsculo Eterno', 'mythic', { atk: 63, atkSpeed: 0.6, crit: 0.28, critDmg: 0.6, lifesteal: 0.12, speed: 16 }, 7700, 'Forjadas no intervalo entre dois suspiros.'],
    ],
    armor: [
      ['Trajes Rasgados', 'common', { hp: 12, speed: 4 }, 45, 'Melhor do que nada.'],
      ['Couro Sombrio', 'common', { hp: 24, def: 3, speed: 6 }, 120, 'Preto fosco, sem fivelas brilhantes.'],
      ['Vestes do Espectro', 'rare', { hp: 44, def: 5, speed: 10 }, 350, 'Costuradas com fio de teia.'],
      ['Manto do Corvo', 'rare', { hp: 56, def: 6, dodge: 0.08 }, 590, 'Penas negras que se abrem ao correr.'],
      ['Véu da Névoa', 'epic', { hp: 84, def: 9, speed: 16, dodge: 0.14 }, 1150, 'Você some na névoa — literalmente.'],
      ['Manto do Ceifador', 'legendary', { hp: 125, def: 14, speed: 22, dodge: 0.18, lifesteal: 0.06 }, 2900, 'A última coisa que muitos veem.'],
      ['Couro de Víbora', 'rare', { hp: 48, def: 5, speed: 12, crit: 0.04 }, 520, 'Escamas verde-escuras, silenciosas ao toque.'],
      ['Manto da Lua Nova', 'epic', { hp: 88, def: 8, speed: 18, dodge: 0.12, goldFind: 0.1 }, 1260, 'Invisível em noites sem lua.'],
      ['Véu da Meia-Noite', 'mythic', { hp: 145, def: 16, speed: 26, dodge: 0.2, lifesteal: 0.07 }, 7000, 'A noite inteira coube num tecido.'],
    ],
    trinket: [
      ['Luvas Letais', 'common', { atkSpeed: 0.25 }, 100, 'Cortes mais rápidos, menos pensados.'],
      ['Botas do Vento', 'rare', { speed: 20, dodge: 0.06 }, 430, 'Passos que não deixam pegada.'],
      ['Anel do Veneno', 'epic', { crit: 0.14, atk: 12, lifesteal: 0.05 }, 1220, 'Uma gota no chá e pronto.'],
      ['Capa Espectral', 'legendary', { cdRed: 0.22, speed: 18, atk: 18, crit: 0.12 }, 2750, 'Atravessa paredes de vez em quando.'],
      ['Máscara de Porcelana', 'rare', { crit: 0.08, dodge: 0.05, goldFind: 0.08 }, 440, 'Sorri mesmo quando você não está.'],
      ['Colar de Dentes', 'epic', { atk: 14, crit: 0.1, lifesteal: 0.05, hpRegen: 0.8 }, 1210, 'Cada dente conta uma história que você preferia não ouvir.'],
      ['Selo da Primeira Sombra', 'mythic', { atk: 22, cdRed: 0.3, speed: 20, crit: 0.16, dodge: 0.1 }, 6600, 'Antes das sombras existirem, alguém as assinou.'],
    ],
  },
};

export const CONSUMABLES = [
  { id: 'potion_hp', name: 'Poção de Vida', kind: 'consumable', heal: 45, price: 30, color: '#e04a5a', desc: 'Restaura 45 de vida.' },
  { id: 'potion_hp_big', name: 'Poção de Vida Grande', kind: 'consumable', heal: 120, price: 90, color: '#ff6a7a', desc: 'Restaura 120 de vida.' },
  { id: 'potion_mana', name: 'Poção de Mana', kind: 'consumable', mana: 70, price: 40, color: '#4a8ae0', desc: 'Restaura 70 de mana.' },
  { id: 'elixir_power', name: 'Elixir de Fúria', kind: 'consumable', buff: { atk: 0.35, time: 30 }, price: 140, color: '#ffa32a', desc: '+35% de dano por 30s.' },
  { id: 'potion_hp_super', name: 'Poção de Vida Suprema', kind: 'consumable', heal: 260, price: 220, color: '#ff8aa0', desc: 'Restaura 260 de vida.' },
  { id: 'potion_mana_big', name: 'Poção de Mana Grande', kind: 'consumable', mana: 160, price: 110, color: '#6aa8ff', desc: 'Restaura 160 de mana.' },
  { id: 'ration', name: 'Ração de Viajante', kind: 'consumable', heal: 30, mana: 30, price: 35, color: '#d8a868', desc: 'Restaura 30 de vida e 30 de mana.' },
  { id: 'elixir_guard', name: 'Elixir de Pedra', kind: 'consumable', buff: { def: 0.45, time: 35 }, price: 130, color: '#9ab0c8', desc: '+45% de defesa por 35s.' },
  { id: 'elixir_fortune', name: 'Elixir da Sorte', kind: 'consumable', buffFlat: { crit: 0.18, time: 30 }, price: 160, color: '#ffe066', desc: '+18% de chance crítica por 30s.' },
  { id: 'elixir_regen', name: 'Elixir da Floresta', kind: 'consumable', buffFlat: { hpRegen: 6, time: 25 }, price: 150, color: '#6aff9a', desc: 'Regenera 6 de vida por segundo por 25s.' },
  { id: 'scroll_thunder', name: 'Pergaminho do Trovão', kind: 'consumable', effect: 'thunder', price: 120, color: '#ffe36a', desc: 'Um raio atinge todos os inimigos próximos.' },
  { id: 'scroll_return', name: 'Pergaminho de Retorno', kind: 'consumable', effect: 'town', price: 75, color: '#b8a0ff', desc: 'Teletransporta você de volta à praça da cidade.' },
  { id: 'phoenix_feather', name: 'Pena da Fênix', kind: 'consumable', effect: 'life', price: 600, color: '#ff8a3a', desc: 'Modo Clássico: concede +1 vida (máx. 5). Brilha em chamas.' },
  { id: 'elixir_swift', name: 'Elixir do Vento', kind: 'consumable', buff: { speed: 0.35, time: 30 }, price: 120, color: '#7ae88a', desc: '+35% de velocidade por 30s.' },
];

export const ITEMS = [];
export const ITEM_INDEX = new Map();

(function build() {
  for (const [cls, slots] of Object.entries(TABLE)) {
    for (const [slot, list] of Object.entries(slots)) {
      for (const [name, rarity, stats, price, desc] of list) {
        const id = `${cls}_${slot}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        const item = {
          id, name, cls, slot, rarity,
          stats: { ...stats },
          price,
          desc,
          power: Object.values(stats).reduce((a, b) => a + (typeof b === 'number' ? Math.abs(b) : 0), 0),
        };
        ITEMS.push(item);
        ITEM_INDEX.set(item.id, item);
      }
    }
  }
  for (const c of CONSUMABLES) {
    ITEMS.push(c);
    ITEM_INDEX.set(c.id, c);
  }
})();

export function getItem(id) {
  return ITEM_INDEX.get(id) || null;
}

/** Peso de cada raridade conforme a "riqueza" da área (0..4). */
export function rarityWeights(regionTier) {
  const t = Math.max(0, Math.min(4, regionTier));
  return {
    common: Math.max(6, 100 - t * 20),
    rare: 26 + t * 9,
    epic: 6 + t * 7,
    legendary: 0.6 + t * 2.4,
    mythic: t >= 3 ? 0.03 + (t - 2) * 0.09 : 0, // só em áreas de alto risco; raríssimo
  };
}

export function rollRarity(rand, regionTier) {
  const w = rarityWeights(regionTier);
  const entries = Object.entries(w).filter(([, v]) => v > 0);
  let total = 0;
  for (const [, v] of entries) total += v;
  let r = rand() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return 'common';
}

/** Escolhe um equipamento adequado à classe do jogador. */
export function rollEquipment(rand, cls, regionTier) {
  const rarity = rollRarity(rand, regionTier);
  return pickEquipmentOfRarity(rand, cls, rarity, regionTier);
}

/**
 * Escolhe um equipamento de uma raridade específica, com fallback para a
 * mais alta disponível se a raridade pedida não tiver itens para a classe.
 */
export function pickEquipmentOfRarity(rand, cls, rarity, regionTier = 1) {
  let order = RARITY[rarity] ? RARITY[rarity].order : 0;
  let pool = [];
  while (order >= 0 && !pool.length) {
    const key = RARITY_ORDER[order];
    pool = ITEMS.filter((i) => i.cls === cls && i.slot && i.rarity === key);
    if (pool.length) rarity = key;
    order--;
  }
  if (!pool.length) pool = ITEMS.filter((i) => i.cls === cls && i.slot);
  if (!pool.length) pool = ITEMS.filter((i) => i.cls === cls);
  const base = pool[Math.floor(rand() * pool.length)];
  return instantiate(base, regionTier);
}

// ---------------------------------------------------------------------------
// Sistema de drop dos mobs — pesos por 100 na ordem
// [nada, comum, raro, épico, lendário, mítico].
// Qualquer mob pode dropar qualquer item (da classe do jogador): o que muda é
// a RIQUEZA DA ÁREA (tier 1..4), nunca um item específico por mob — assim o
// resultado permanece aleatório e imprevisível.
// ---------------------------------------------------------------------------
export const MOB_LOOT = {
  mob: [
    [80, 14.5, 4.0, 1.1, 0.32, 0.08], // tier 1
    [74, 18, 5.2, 1.9, 0.7, 0.15],    // tier 2
    [67, 21, 7.0, 3.3, 1.3, 0.3],     // tier 3
    [60, 23, 9.0, 4.6, 2.4, 0.6],     // tier 4
  ],
  elite: [30, 28, 25, 12, 3.8, 1.2],
  boss: [0, 16, 36, 31, 14, 3],
};

/** Sorteia a raridade do drop de um mob (null = sem item). */
export function rollMobLoot(rand, tier = 1, kind = 'mob') {
  let w;
  if (kind === 'boss') w = MOB_LOOT.boss;
  else if (kind === 'elite') w = MOB_LOOT.elite;
  else {
    const t = Math.max(1, Math.min(4, Math.round(tier) || 1));
    w = MOB_LOOT.mob[t - 1];
  }
  let total = 0;
  for (const v of w) total += v;
  let r = rand() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i === 0 ? null : RARITY_ORDER[i - 1];
  }
  return null;
}

/** Rolagem completa de drop: raridade + equipamento adequado à classe. */
export function rollMobDrop(rand, cls, tier, kind = 'mob') {
  const rarity = rollMobLoot(rand, tier, kind);
  if (!rarity) return null;
  const effTier = kind === 'mob' ? Math.max(1, Math.min(4, Math.round(tier) || 1)) : 4;
  return pickEquipmentOfRarity(rand, cls, rarity, effTier);
}

/** Cria uma instância do item, escalando levemente com o nível da área. */
export function instantiate(base, regionTier = 1) {
  if (base.kind === 'consumable') return { ...base, uid: uid() };
  const scale = 1 + Math.max(0, regionTier - 1) * 0.12;
  const stats = {};
  for (const [k, v] of Object.entries(base.stats)) {
    stats[k] = Math.round(v * scale * 10) / 10;
  }
  return {
    uid: uid(),
    id: base.id,
    name: base.name,
    cls: base.cls,
    slot: base.slot,
    rarity: base.rarity,
    stats,
    price: Math.round(base.price * scale),
    desc: base.desc,
    power: Math.round(base.power * scale),
  };
}

export function consumable(id) {
  const base = CONSUMABLES.find((c) => c.id === id);
  if (!base) throw new Error(`Consumível desconhecido: ${id}`);
  return { ...base, uid: uid() };
}

let _uid = 1;
export function uid() {
  return 'i' + (_uid++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

export function rarityInfo(r) {
  return RARITY[r] || RARITY.common;
}

export function describeStats(stats) {
  return Object.entries(stats)
    .filter(([k, v]) => STAT_INFO[k] && v !== 0)
    .map(([k, v]) => `${STAT_INFO[k].name} ${STAT_INFO[k].fmt(v)}`);
}

/** Loja: itens à venda para a classe. */
export function shopStock(rand, cls) {
  const out = [];
  const pool = ITEMS.filter((i) => i.cls === cls && i.slot);
  const byRarity = { common: [], rare: [], epic: [] };
  for (const it of pool) if (byRarity[it.rarity]) byRarity[it.rarity].push(it);
  for (const r of ['common', 'rare', 'epic']) {
    const list = byRarity[r];
    if (!list.length) continue;
    const n = r === 'common' ? 3 : r === 'rare' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const it = list[Math.floor(rand() * list.length)];
      if (!out.find((o) => o.id === it.id)) out.push(instantiate(it, 1));
    }
  }
  return out;
}
