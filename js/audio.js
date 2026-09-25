// audio.js — everything you hear is synthesised live with WebAudio:
// paper taps and rustles, a lamp switch, soft pads, plucked threads, a music box.

const IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function freq(n) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  const midi = 12 * (parseInt(m[2], 10) + 1) + IDX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const MOODS = {
  title: { notes: ['D3', 'A3', 'C#4', 'F#4'], gain: 0.03, cut: 900 },
  dark: { notes: [], gain: 0, cut: 400 },
  lamp: { notes: ['B2', 'F#3', 'A3', 'C#4', 'D4'], gain: 0.028, cut: 800 },
  threads: { notes: ['G2', 'D3', 'F#3', 'B3', 'D4'], gain: 0.028, cut: 950 },
  world: { notes: ['D3', 'A3', 'B3', 'E4', 'F#4'], gain: 0.03, cut: 1300, sea: true },
  reply: { notes: ['E3', 'B3', 'D4', 'F#4', 'G4'], gain: 0.028, cut: 1000 },
  night: { notes: ['B2', 'F#3', 'A3', 'D4', 'E4'], gain: 0.028, cut: 750 },
  crane: { notes: ['G2', 'D3', 'B3', 'F#4'], gain: 0.028, cut: 900 },
  hush: { notes: ['D3', 'A3'], gain: 0.02, cut: 500 },
  coda: { notes: ['D3', 'A3', 'C#4', 'E4', 'F#4'], gain: 0.032, cut: 1400, sea: true },
};

export const A = {
  ctx: null,
  on: true,
  voices: [],
  moodName: null,
  seaNode: null,
  ks: new Map(),

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.master.connect(comp).connect(ctx.destination);
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.verb.connect(wet).connect(this.master);
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    this.send = ctx.createGain();
    this.send.gain.value = 0.9;
    this.send.connect(this.verb);
    this.padBus = ctx.createGain();
    this.padBus.connect(this.master);
    const padSend = ctx.createGain();
    padSend.gain.value = 0.6;
    this.padBus.connect(padSend).connect(this.verb);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  impulse(sec) {
    const ctx = this.ctx, sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    return b;
  },

  get live() { return !!this.ctx && this.on && this.ctx.state === 'running'; },

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  setOn(v) {
    this.on = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.05);
  },

  mood(name) {
    if (!this.ctx || name === this.moodName) return;
    this.moodName = name;
    const ctx = this.ctx, t = ctx.currentTime;
    const m = MOODS[name] || MOODS.dark;
    for (const v of this.voices) {
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0, t, 0.9);
      v.oscs.forEach((o) => { try { o.stop(t + 6); } catch (e) { /* already stopped */ } });
    }
    this.voices = [];
    this.setSea(!!m.sea);
    if (!m.notes.length) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = m.cut;
    lp.Q.value = 0.3;
    lp.connect(this.padBus);
    for (const n of m.notes) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(lp);
      const f0 = freq(n);
      const oscs = [-5, 5].map((det) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f0;
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        return o;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + Math.random() * 0.09;
      const lg = ctx.createGain();
      lg.gain.value = m.gain * 0.3;
      lfo.connect(lg).connect(g.gain);
      lfo.start(t);
      oscs.push(lfo);
      g.gain.setTargetAtTime(m.gain, t + 0.05, 1.4);
      this.voices.push({ g, oscs });
    }
  },

  setSea(on) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (on && !this.seaNode) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lg = ctx.createGain();
      lg.gain.value = 0.018;
      lfo.connect(lg).connect(g.gain);
      src.connect(lp).connect(g).connect(this.bus);
      src.start(t);
      lfo.start(t);
      g.gain.setTargetAtTime(0.026, t, 1.2);
      this.seaNode = { src, g, lfo };
    } else if (!on && this.seaNode) {
      const s = this.seaNode;
      s.g.gain.cancelScheduledValues(t);
      s.g.gain.setTargetAtTime(0, t, 0.5);
      s.src.stop(t + 3);
      s.lfo.stop(t + 3);
      this.seaNode = null;
    }
  },

  // --- one-shots -------------------------------------------------------------
  tap(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400 + Math.random() * 1600;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.075);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.8, 0.1);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.1 * v, t);
    og.gain.exponentialRampToValueAtTime(0.0006, t + 0.09);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.12);
  },

  rustle(dur = 0.4, v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 0.5;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    for (let s = 0; s < dur; s += 0.028) {
      const env = Math.sin(Math.PI * Math.min(1, s / dur));
      g.gain.setValueAtTime(0.12 * v * env * (0.25 + Math.random() * 0.75), t + s);
    }
    g.gain.setValueAtTime(0, t + dur);
    src.connect(bp).connect(hp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  },

  click() {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.018);
    src.connect(hp).connect(g).connect(this.bus);
    src.start(t, Math.random(), 0.03);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1900;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.03, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.02);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.03);
  },

  // A small music-box / celesta note.
  bell(note, v = 0.1, delay = 0) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime + delay, f = freq(note);
    const out = ctx.createGain();
    out.gain.value = v;
    out.connect(this.bus);
    out.connect(this.send);
    [[1, 1, 2.2], [2, 0.22, 1.2], [2.76, 0.12, 0.7], [5.4, 0.05, 0.35]].forEach(([mul, a, dec]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dec + 0.05);
    });
  },

  // A plucked thread (Karplus-Strong, rendered once per pitch).
  pluck(note, v = 0.25) {
    if (!this.live) return;
    const ctx = this.ctx;
    let buf = this.ks.get(note);
    if (!buf) {
      const sr = ctx.sampleRate, f = freq(note), N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 2.2);
      buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      const ring = new Float32Array(N);
      let prev = 0;
      for (let i = 0; i < N; i++) { prev = prev * 0.5 + (Math.random() * 2 - 1) * 0.5; ring[i] = prev; }
      let idx = 0;
      for (let i = 0; i < len; i++) {
        const a = ring[idx], b = ring[(idx + 1) % N];
        d[i] = a;
        ring[idx] = (a + b) * 0.5 * 0.9965;
        idx = (idx + 1) % N;
      }
      this.ks.set(note, buf);
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.value = v;
    src.connect(lp).connect(g);
    g.connect(this.bus);
    g.connect(this.send);
    src.start(t);
  },

  flap(v = 1) {
    if (!this.live) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 300;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * v, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.16);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.5, 0.2);
  },

  chime(notes, v = 0.08, spacing = 0.09) {
    notes.forEach((n, i) => this.bell(n, v, i * spacing));
  },
};
