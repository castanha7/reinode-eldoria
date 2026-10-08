// ---------------------------------------------------------------------------
// touch.js — controles para celular/tablet: joystick virtual, botão de atirar
// (mira automática; arraste para mirar), habilidades, esquiva, interagir etc.
// ---------------------------------------------------------------------------
import { Input } from '../core/input.js';
import { S } from '../sprites.js';
import { interactionPrompt } from './hud.js';

const JOY_R = 52; // raio do joystick em px

export class TouchControls {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.root = document.getElementById('touch');
    this.built = false;
    this.joy = { id: null, ox: 0, oy: 0 };
    this.fireId = null;
    this.btns = [];
    this.lastCls = null;
    this.promptOn = false;
  }

  /** Detecta se o aparelho é "de toque" (ou se o usuário forçou com ?touch=1). */
  static detect() {
    try {
      const q = new URLSearchParams(location.search).get('touch');
      if (q === '1') return true;
      if (q === '0') return false;
      const mm = (s) => window.matchMedia && window.matchMedia(s).matches;
      if (mm('(pointer: coarse)')) return true;
      if ((navigator.maxTouchPoints || 0) > 0 && !mm('(any-hover: hover)')) return true;
    } catch (e) { /* ignora */ }
    return false;
  }

  enable() {
    if (Input.touch.enabled) return;
    Input.touch.enabled = true;
    document.body.classList.add('touch');
    if (!this.built) this.build();
    this.game.resize();
  }

  disable() {
    Input.touch.enabled = false;
    Input.touch.mx = Input.touch.my = 0;
    Input.touch.fire = false;
    document.body.classList.remove('touch');
    if (this.root) this.root.classList.add('hidden');
    this.game.resize();
  }

  init() {
    if (!this.root) return;
    if (TouchControls.detect()) this.enable();
    // aparelho híbrido: o primeiro toque real ativa os controles
    window.addEventListener('touchstart', () => this.enable(), { once: true, passive: true });
    // evita zoom/rolagem acidental
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => { if (Input.touch.enabled) e.preventDefault(); });
  }

  // ---------------------------------------------------------------------
  build() {
    this.built = true;
    const r = this.root;
    r.innerHTML = `
      <div id="tc-joy-zone"></div>
      <div id="tc-joy" class="tc-joy"><div class="tc-knob"></div></div>
      <div id="tc-top">
        <button class="tc-mini" data-tc="inv" aria-label="Inventário">🎒</button>
        <button class="tc-mini" data-tc="quests" aria-label="Missões">📜</button>
        <button class="tc-mini" data-tc="potion" aria-label="Poção">🧪</button>
        <button class="tc-mini" data-tc="menu" aria-label="Menu">☰</button>
      </div>
      <div id="tc-actions"></div>`;
    this.joyEl = r.querySelector('#tc-joy');
    this.knob = r.querySelector('.tc-knob');
    this.zone = r.querySelector('#tc-joy-zone');
    this.actions = r.querySelector('#tc-actions');

    // --- joystick (flutuante dentro da zona esquerda) ---
    const z = this.zone;
    z.addEventListener('pointerdown', (e) => {
      if (this.joy.id !== null) return;
      this.joy.id = e.pointerId;
      z.setPointerCapture(e.pointerId);
      this.joy.ox = e.clientX; this.joy.oy = e.clientY;
      this.joyEl.style.left = e.clientX + 'px';
      this.joyEl.style.top = e.clientY + 'px';
      this.joyEl.classList.add('active');
      this.moveKnob(e.clientX, e.clientY);
      e.preventDefault();
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.moveKnob(e.clientX, e.clientY);
      e.preventDefault();
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null;
      Input.touch.mx = Input.touch.my = 0;
      this.joyEl.classList.remove('active');
      this.knob.style.transform = 'translate(0px,0px)';
      this.resetJoyEl();
    };
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
    this.resetJoyEl();

    this.buildActions();
    // minis
    r.querySelectorAll('[data-tc]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const k = b.dataset.tc;
        if (k === 'inv') this.ui.togglePanel('inventory');
        else if (k === 'quests') this.ui.togglePanel('quests');
        else if (k === 'potion') Input.press('KeyR');
        else if (k === 'menu') this.ui.togglePause();
      });
    });
  }

  resetJoyEl() {
    // posição de descanso do joystick (canto inferior esquerdo)
    const s = this.scale();
    this.joyEl.style.left = Math.round(26 * s + JOY_R * s) + 'px';
    this.joyEl.style.top = (window.innerHeight - Math.round(30 * s + JOY_R * s)) + 'px';
  }

  scale() {
    return Math.max(0.78, Math.min(1.25, Math.min(window.innerWidth, window.innerHeight) / 430));
  }

  moveKnob(x, y) {
    let dx = x - this.joy.ox, dy = y - this.joy.oy;
    const d = Math.hypot(dx, dy);
    const s = this.scale();
    const R = JOY_R * s;
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(1, d / R);
    const dead = 0.14;
    if (m < dead) { Input.touch.mx = Input.touch.my = 0; return; }
    const k = (m - dead) / (1 - dead);
    Input.touch.mx = (dx / (d || 1)) * k;
    Input.touch.my = (dy / (d || 1)) * k;
  }

  // --- botões de ação (dependem da classe: ícones das habilidades) ---------
  buildActions() {
    const p = this.game.player;
    const a = this.actions;
    a.innerHTML = '';
    this.btns = [];
    const s = this.scale();
    const mk = (cls, size, right, bottom, html) => {
      const b = document.createElement('button');
      b.className = 'tc-btn ' + cls;
      b.style.width = b.style.height = Math.round(size * s) + 'px';
      b.style.right = Math.round(right * s) + 'px';
      b.style.bottom = Math.round(bottom * s) + 'px';
      b.innerHTML = html;
      a.appendChild(b);
      return b;
    };
    const FIRE = 78;
    const fr = 22, fb = 24; // posição do botão de ataque
    const fcx = fr + FIRE / 2, fcy = fb + FIRE / 2;

    // atacar (segurar; arraste para mirar)
    const fire = mk('tc-fire', FIRE, fr, fb, '<span>⚔</span>');
    this.fireEl = fire;
    fire.addEventListener('pointerdown', (e) => {
      if (this.fireId !== null) return;
      this.fireId = e.pointerId;
      fire.setPointerCapture(e.pointerId);
      fire.classList.add('down');
      Input.touch.fire = true;
      e.preventDefault();
    });
    fire.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.fireId) return;
      const r = fire.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      Input.touch.aim = Math.hypot(dx, dy) > 20 * s ? Math.atan2(dy, dx) : null;
      e.preventDefault();
    });
    const fend = (e) => {
      if (e.pointerId !== this.fireId) return;
      this.fireId = null;
      Input.touch.fire = false;
      Input.touch.aim = null;
      fire.classList.remove('down');
    };
    fire.addEventListener('pointerup', fend);
    fire.addEventListener('pointercancel', fend);

    // posições em arco ao redor do botão de ataque (0° = esquerda, 90° = acima)
    const ring = 100;
    const place = (deg, size) => {
      const rad = (deg * Math.PI) / 180;
      const cx = fcx + Math.cos(rad) * ring;
      const cy = fcy + Math.sin(rad) * ring;
      return [cx - size / 2, cy - size / 2];
    };
    const nsk = p.cls.skills.length;
    const SK = 50;
    const degs = nsk === 4 ? [3, 33, 63, 93] : [5, 40, 75];
    for (let i = 0; i < nsk; i++) {
      const sk = p.cls.skills[i];
      const [rr, bb] = place(degs[i], SK);
      const b = mk('tc-skill', SK, rr, bb, `<canvas width="22" height="22"></canvas><i>${i + 1}</i><em></em>`);
      const cv = b.querySelector('canvas');
      const spr = S(`skill:${sk.id}`);
      if (spr) { const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(spr, 0, 0); }
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); Input.press('Digit' + (i + 1)); });
      this.btns.push({ el: b, kind: 'skill', i });
    }
    // esquiva
    {
      const [rr, bb] = place(-30, 46);
      const b = mk('tc-roll', 46, rr, bb, '<canvas width="22" height="22"></canvas><em></em>');
      const spr = S('skill:roll');
      if (spr) { const c = b.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(spr, 0, 0); }
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); Input.press('Space'); });
      this.btns.push({ el: b, kind: 'roll' });
    }
    // interagir
    {
      const b = mk('tc-interact', 56, 0, 0, '<span>✋</span>');
      b.style.right = 'auto';
      b.style.left = Math.round(22 * s) + 'px';
      b.style.bottom = Math.round(168 * s) + 'px';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); Input.press('KeyE'); });
      this.btns.push({ el: b, kind: 'interact' });
    }
    this.lastCls = p.cls.id;
    this.layout();
  }

  layout() {
    // posições calculadas em px; reposiciona se a orientação mudar
    if (this.actions.style.setProperty) this.actions.style.setProperty('--tcs', String(this.scale()));
  }

  /** Chamado todo frame: mostra/esconde e atualiza recarga das habilidades. */
  update() {
    if (!this.built) return;
    const g = this.game;
    const show = Input.touch.enabled && g.state === 'playing' && !this.ui.blocking && g.player && !g.player.dead;
    this.root.classList.toggle('hidden', !show);
    if (!show) {
      if (this.fireId !== null || this.joy.id !== null) {
        // painel abriu enquanto segurava: solta tudo
        Input.touch.fire = false; Input.touch.aim = null; Input.touch.mx = Input.touch.my = 0;
        this.fireId = null; this.joy.id = null;
        this.joyEl.classList.remove('active');
      }
      return;
    }
    if (g.player.cls.id !== this.lastCls) this.buildActions();
    const p = g.player;
    for (const b of this.btns) {
      if (b.kind === 'skill') {
        const unlocked = p.skillUnlocked(b.i);
        const cd = p.skillCd[b.i];
        const sk = p.cls.skills[b.i];
        const frac = unlocked && cd > 0 ? cd / p.skillCooldown(b.i) : 0;
        b.el.classList.toggle('locked', !unlocked);
        b.el.classList.toggle('nomana', unlocked && p.mana < sk.cost);
        const em = b.el.querySelector('em');
        em.style.height = Math.round(frac * 100) + '%';
        b.el.dataset.lv = unlocked ? '' : 'Nv' + sk.level;
      } else if (b.kind === 'roll') {
        const em = b.el.querySelector('em');
        em.style.height = Math.round(Math.min(1, p.rollCd / 1.4) * 100) + '%';
      } else if (b.kind === 'interact') {
        const on = !!interactionPrompt(g);
        b.el.classList.toggle('ready', on);
      }
    }
  }
}
