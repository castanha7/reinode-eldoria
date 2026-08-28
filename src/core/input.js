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
    // toque simples (mobile): toca = anda até o ponto
    canvas.addEventListener('touchstart', (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      this.mouse.x = (t.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (t.clientY - r.top) * (canvas.height / r.height);
      this.mouse.down = true;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      this.mouse.x = (t.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (t.clientY - r.top) * (canvas.height / r.height);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { this.mouse.down = false; });
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
  endFrame() {
    this.pressed = Object.create(null);
    this.clicks.length = 0;
    this.anyKey = null;
  },
};

const BLOCKED = new Set([
  'Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyI', 'KeyQ', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'KeyM', 'Escape',
]);

function normalize(code) {
  return code;
}
