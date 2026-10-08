// ---------------------------------------------------------------------------
// modes.js — modos de jogo
// ---------------------------------------------------------------------------

/**
 * lives: número de vidas (Infinity = ilimitado, com penalidade de ouro ao morrer)
 * hp/dmg: multiplicadores de vida e dano dos inimigos
 * regen: multiplicador da regeneração passiva de vida fora de combate
 * reward: multiplicador de XP e ouro
 */
export const MODES = {
  normal: {
    id: 'normal', name: 'Aventura', icon: '🛡',
    lives: Infinity, hp: 1, dmg: 1, regen: 1, reward: 1, color: '#7ae88a',
    desc: 'Jogo tradicional. Ao morrer você acorda na cidade e perde parte do ouro.',
  },
  classic: {
    id: 'classic', name: 'Clássico', icon: '❤',
    lives: 3, hp: 1.1, dmg: 1.1, regen: 1, reward: 1.1, color: '#ffd85a',
    desc: 'Você tem 3 vidas para zerar o jogo. Perdeu todas? Fim de jogo e o progresso é apagado. A Pena da Fênix concede uma vida extra.',
  },
  hardcore: {
    id: 'hardcore', name: 'Hardcore', icon: '☠',
    lives: 1, hp: 1.4, dmg: 1.35, regen: 0.5, reward: 1.25, color: '#ff6a6a',
    desc: 'Uma única chance. Inimigos muito mais fortes, pouca regeneração e morte definitiva — o save é apagado. Sem Pena da Fênix.',
  },
};

export const MODE_IDS = ['normal', 'classic', 'hardcore'];
export const MAX_LIVES = 5;

export function modeById(id) {
  return MODES[id] || MODES.normal;
}

/** Quest cujo cumprimento encerra a história principal. */
export const FINAL_QUEST = 'q_boss';
