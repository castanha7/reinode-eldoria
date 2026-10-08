// ---------------------------------------------------------------------------
// harness.mjs — stubs de DOM/Canvas para executar o jogo em Node (sem browser)
// O objetivo é rodar o código REAL do jogo (sprites, mapa, entidades, combate,
// UI) e não uma reimplementação.
// ---------------------------------------------------------------------------

class FakeImageData {
  constructor(w, h) {
    this.width = w; this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
}

function makeGradient() {
  return { addColorStop() {} };
}

class FakeCtx {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.font = '10px monospace';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.imageSmoothingEnabled = false;
    this.filter = 'none';
    this.calls = 0;
  }
  fillRect() { this.calls++; }
  clearRect() {}
  strokeRect() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  setTransform() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arcTo() {}
  arc() {}
  ellipse() {}
  rect() {}
  fill() { this.calls++; }
  stroke() { this.calls++; }
  clip() {}
  setLineDash() {}
  fillText() { this.calls++; }
  strokeText() {}
  measureText(t) { return { width: String(t).length * 6 }; }
  createLinearGradient() { return makeGradient(); }
  createRadialGradient() { return makeGradient(); }
  createImageData(w, h) { return new FakeImageData(w, h); }
  getImageData(x, y, w, h) { return new FakeImageData(w, h); }
  putImageData() {}
  drawImage(img) {
    this.calls++;
    if (!img) throw new Error('drawImage recebeu sprite nulo');
    if (img.width === undefined) throw new Error('drawImage recebeu objeto inválido');
  }
}

class FakeCanvas {
  constructor() {
    this.width = 300; this.height = 150;
    this.style = {};
    this._ctx = null;
    this.listeners = {};
  }
  getContext() {
    if (!this._ctx) this._ctx = new FakeCtx(this);
    return this._ctx;
  }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; }
  focus() {}
}

class FakeElement {
  constructor(sel) {
    this.selector = sel;
    this._classes = new Set();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.listeners = {};
    this._html = '';
    this._text = '';
    this.disabled = false;
  }
  get classList() {
    const self = this;
    return {
      add: (...c) => c.forEach((x) => self._classes.add(x)),
      remove: (...c) => c.forEach((x) => self._classes.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !self._classes.has(c); f ? self._classes.add(c) : self._classes.delete(c); return f; },
      contains: (c) => self._classes.has(c),
    };
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  get firstChild() { return this.children[0] || null; }
  appendChild(c) { c._parent = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); }
  remove() { if (this._parent) this._parent.removeChild(this); }
  querySelector(sel) {
    if (String(sel).indexOf('canvas') >= 0) return new FakeCanvas();
    return new FakeElement('sub');
  }
  querySelectorAll() { return []; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  closest(sel) { return this.dataset.act ? this : null; }
  setPointerCapture() {}
  releasePointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 50, height: 50 }; }
  click() { (this.listeners.click || []).forEach((f) => f({ target: this, preventDefault() {} })); }
}

const elements = new Map();
export function getEl(sel) {
  if (!elements.has(sel)) elements.set(sel, new FakeElement(sel));
  return elements.get(sel);
}

const store = new Map();
const rafQueue = [];

export function installDom() {
  const fakeDocument = {
    createElement(tag) {
      if (tag === 'canvas') return new FakeCanvas();
      return new FakeElement(tag);
    },
    querySelector: getEl,
    getElementById: (id) => getEl('#' + id),
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    body: new FakeElement('body'),
  };
  const fakeWindow = {
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    performance: { now: () => Date.now() },
    setTimeout: (fn, t) => setTimeout(fn, 0),
    clearTimeout: (h) => clearTimeout(h),
  };
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  globalThis.localStorage = fakeWindow.localStorage;
  globalThis.performance = fakeWindow.performance;
  globalThis.requestAnimationFrame = fakeWindow.requestAnimationFrame;
  globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } };
  globalThis.location = { reload() {} };
  return { fakeWindow, fakeDocument };
}

export const _store = store;
