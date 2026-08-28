// ---------------------------------------------------------------------------
// main.js — bootstrap do jogo
// ---------------------------------------------------------------------------
import { registerAllSprites } from './sprites.js';
import { Game } from './game/game.js';
import { UI } from './ui/panels.js';
import { Input } from './core/input.js';
import { initAudio, resumeAudio, setMusic, setSfx, isMusicOn, isSfxOn } from './core/audio.js';

registerAllSprites();

const canvas = document.getElementById('game');
const ui = new UI();
const game = new Game(canvas, ui);
game.init();
Input.init(canvas);

// áudio só pode começar após um gesto do usuário
let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  initAudio();
  resumeAudio();
  setMusic(true);
  setSfx(true);
}
window.addEventListener('pointerdown', ensureAudio, { once: false });
window.addEventListener('keydown', ensureAudio, { once: false });

// teclas globais de interface
function globalKeys(dt) {
  if (game.state === 'title') {
    if (Input.hit('Enter') || Input.hit('Space')) {
      const btn = document.getElementById('btn-start');
      const id = btn && btn.dataset.cls;
      if (id && !btn.classList.contains('disabled')) {
        ensureAudio();
        game.startRun(id);
        ui.hideTitle();
      }
    }
    return;
  }
  if (ui.guard > 0) return;
  if (Input.hit('KeyI')) { ui.togglePanel('inventory'); }
  else if (Input.hit('KeyQ')) { ui.togglePanel('quests'); }
  else if (Input.hit('KeyH')) { ui.togglePanel('help'); }
  else if (Input.hit('KeyM')) {
    ensureAudio();
    setMusic(!isMusicOn());
    game.notify(isMusicOn() ? 'Música ligada.' : 'Música desligada.', '#9a93b8');
  } else if (Input.hit('KeyN')) {
    ensureAudio();
    setSfx(!isSfxOn());
    game.notify(isSfxOn() ? 'Efeitos sonoros ligados.' : 'Efeitos sonoros desligados.', '#9a93b8');
  }
  // avançar diálogo com espaço/enter
  if (!ui.el.dialog.classList.contains('hidden') && (Input.hit('Space') || Input.hit('Enter'))) {
    ui.advanceDialog();
  }
}

let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  ui.tick(dt);
  globalKeys(dt);
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// expõe para depuração no console
window.__eldoria = { game, ui };
