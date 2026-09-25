// util.js — math, easing and deterministic randomness.
// Every frame must look the same each time it is rendered (like a photograph),
// so all "randomness" is derived from hashes of ids and frame numbers.

export const FPS = 12;
export const W = 1600;
export const H = 900;

export function strHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

// hash(...ints|floats|strings) -> [0, 1)
export function hash(...args) {
  let h = 0x2545f491 ^ args.length;
  for (const a of args) {
    const v = typeof a === 'string' ? strHash(a) : Number.isInteger(a) ? a : Math.floor(a * 8192);
    h = Math.imul(h ^ (v | 0), 0x5bd1e995);
    h ^= h >>> 15;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const hs = (...a) => hash(...a) * 2 - 1;

export function rng(seed) {
  let a = (typeof seed === 'string' ? strHash(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (f, a, b) => clamp((f - a) / (b - a));

export const ease = {
  lin: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// A hand-moved progress value: slightly uneven spacing between frames,
// the way a real animator nudges a piece a little more or less each time.
export function hand(p, id, f, amt = 0.018) {
  if (p <= 0 || p >= 1) return p;
  return clamp(p + hs(id, f, 7) * amt);
}

// Per-frame "boil": the tiny misplacement of a piece each time it is touched.
export function boil(id, f, amp = 1) {
  return [hs(id, f, 11) * 0.9 * amp, hs(id, f, 12) * 0.9 * amp, hs(id, f, 13) * 0.006 * amp];
}

// Stepped sine for idle motion (waves, bobbing) — quantised to the frame grid.
export function wave(f, period, phase = 0) {
  return Math.sin(((f / period) + phase) * Math.PI * 2);
}

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(c1, c2, t) {
  const a = hexRgb(c1), b = hexRgb(c2);
  const r = a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
export function mixHex(c1, c2, t) {
  const a = hexRgb(c1), b = hexRgb(c2);
  const r = a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))));
  return '#' + r.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Pick an item from an array with a hash-based index.
export const pick = (arr, ...seed) => arr[Math.floor(hash(...seed) * arr.length) % arr.length];
