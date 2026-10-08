// ---------------------------------------------------------------------------
// input.js — teclado + mouse
// ---------------------------------------------------------------------------

export const Input = {
  keys: Object.create(null),
  pressed: Object.create(null),
  mouse: { x: 0, y: 0, wx: 0, wy: 0, down: false, right: false },
  clicks: [],
  enabled: true,
  anyKey: null,
  /** Estado do controle por toque (preenchido por ui/touch.js). */
  touch: { enabled: false, mx: 0, my: 0, fire: false, aim: null },

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      const k = normalize(e.code);
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      this.anyKey = k;
      if (BLOCKED.has(e.code)) e.preventDefault();
      if (e.code === 'F5') this.pressed['__reload'] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[normalize(e.code)] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
      this.mouse.down = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      canvas.focus();
      if (e.button === 0) { this.mouse.down = true; this.clicks.push('left'); }
      if (e.button === 2) { this.mouse.right = true; this.clicks.push('right'); }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // o toque é tratado por ui/touch.js (joystick virtual + botões)
  },

  down(...codes) {
    if (!this.enabled) return false;
    for (const c of codes) if (this.keys[normalize(c)]) return true;
    return false;
  },
  hit(...codes) {
    for (const c of codes) if (this.pressed[normalize(c)]) return true;
    return false;
  },
  /** Eixo de movimento (-1..1): teclado + joystick virtual. */
  axis() {
    let x = 0, y = 0;
    if (this.enabled) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    }
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    return { x: this.touch.mx, y: this.touch.my };
  },
  /** Simula o toque numa tecla (botões da tela de toque). */
  press(code) { this.pressed[code] = true; },
  endFrame() {
    this.pressed = Object.create(null);
    this.clicks.length = 0;
    this.anyKey = null;
  },
};

const BLOCKED = new Set([
  'Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyI', 'KeyQ', 'KeyE', 'KeyR', 'KeyH', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'KeyM', 'Escape',
]);

function normalize(code) {
  return code;
}
