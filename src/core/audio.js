// ---------------------------------------------------------------------------
// audio.js — SFX sintetizados (WebAudio) + trilha procedural simples
// ---------------------------------------------------------------------------

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let noiseBuf = null;
let musicTimer = null;
let musicOn = false;
let sfxOn = true;
let started = false;

export function initAudio() {
  if (started) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch (e) {
    return;
  }
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.7;
  sfxGain.connect(master);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.0;
  musicGain.connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  started = true;
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
  if (!ctx || !sfxOn) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.25, filterFreq = 1200, type = 'bandpass', delay = 0) {
  if (!ctx || !sfxOn) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

const SFX = {
  swing: () => noise(0.12, 0.18, 2400, 'bandpass'),
  shoot: () => { tone(760, 0.07, 'square', 0.16, 320); },
  hit: () => { noise(0.09, 0.28, 900, 'lowpass'); tone(150, 0.08, 'square', 0.14, -70); },
  crit: () => { noise(0.12, 0.32, 1600, 'lowpass'); tone(420, 0.14, 'sawtooth', 0.18, -220); },
  hurt: () => { tone(220, 0.18, 'sawtooth', 0.24, -120); noise(0.12, 0.2, 700, 'lowpass'); },
  die: () => { tone(300, 0.4, 'sawtooth', 0.2, -230); noise(0.3, 0.16, 500, 'lowpass'); },
  kill: () => { tone(520, 0.1, 'triangle', 0.16, -260); noise(0.16, 0.2, 1100, 'lowpass'); },
  coin: () => { tone(1180, 0.06, 'square', 0.14); tone(1560, 0.09, 'square', 0.12, 0, 0.05); },
  chest: () => { noise(0.14, 0.22, 800, 'lowpass'); tone(520, 0.1, 'triangle', 0.16, 200, 0.06); },
  levelup: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, 0, i * 0.09)); },
  fire: () => { noise(0.28, 0.3, 700, 'lowpass'); tone(180, 0.3, 'sawtooth', 0.16, -90); },
  ice: () => { tone(1400, 0.2, 'triangle', 0.16, -900); noise(0.2, 0.14, 4000, 'highpass'); },
  dash: () => noise(0.14, 0.2, 1800, 'bandpass'),
  heal: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.16, 'sine', 0.16, 0, i * 0.07)); },
  ui: () => tone(880, 0.05, 'square', 0.1),
  deny: () => tone(160, 0.14, 'square', 0.16, -60),
  quest: () => { [784, 988, 1318].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, 0, i * 0.08)); },
  boss: () => { tone(90, 0.9, 'sawtooth', 0.24, -40); noise(0.8, 0.2, 300, 'lowpass'); },
  step: () => noise(0.04, 0.05, 400, 'lowpass'),
};

export function sfx(name) {
  if (!ctx) return;
  const f = SFX[name];
  if (f) f();
}

// --- trilha ----------------------------------------------------------------

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
let step = 0;

function playMusicStep() {
  if (!ctx || !musicOn) return;
  const root = 174.61; // F3
  const t = ctx.currentTime;
  const s = step % 32;
  if (s % 4 === 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    const deg = [0, 5, 3, 4][Math.floor(s / 8) % 4];
    o.frequency.value = root * Math.pow(2, SCALE[deg] / 12) / 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.6);
  }
  if (s % 2 === 0) {
    const deg = SCALE[(s * 3 + Math.floor(s / 4)) % SCALE.length];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = root * 2 * Math.pow(2, deg / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.34);
  }
  step++;
}

export function setMusic(on) {
  musicOn = on;
  if (!ctx) return;
  if (on) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
    if (!musicTimer) musicTimer = setInterval(playMusicStep, 180);
  } else {
    musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
}
export function isMusicOn() { return musicOn; }

export function setSfx(on) {
  sfxOn = on;
  if (ctx && sfxGain) sfxGain.gain.value = on ? 0.7 : 0;
}
export function isSfxOn() { return sfxOn; }
