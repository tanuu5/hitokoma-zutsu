// Scene 2 — the words lift off the page and get tied together with thread.
import { withCam, lamp, thread, threadPts, vlang } from '../render.js';
import { desk, note, noteTiles, drawNoteTile } from '../common.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, hand, boil, hash, hs } from '../util.js';

const NOTE0 = { x: 790, y: 430, r: -0.04 }; // where scene 1 left the note
const PENTA = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5'];
const lift0 = (i) => 3 + i * 2;

const cache = {};
function layout(lang) {
  if (cache[lang]) return cache[lang];
  const { tiles } = noteTiles(lang);
  const n = tiles.length;
  const key = Math.max(0, tiles.findIndex((t) => t.key));
  const pos = tiles.map((t, i) => {
    const a = -Math.PI * 0.64 + (i / n) * Math.PI * 2 + hs('ca', i) * 0.14;
    const rr = (i % 2 ? 0.8 : 1.0) + hs('cr', i) * 0.07;
    return [800 + Math.cos(a) * 480 * rr, 405 + Math.sin(a) * 232 * rr];
  });
  const cs = Math.cos(NOTE0.r), sn = Math.sin(NOTE0.r);
  const from = tiles.map((t) => [NOTE0.x + t.cx * cs - t.cy * sn, NOTE0.y + t.cx * sn + t.cy * cs]);
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let w = hash('w', i, j, lang) * 0.7;
    if (i === key || j === key) w += 0.6;
    if (j === i + 1) w += 0.3;
    pairs.push({ i, j, w });
  }
  pairs.sort((a, b) => a.w - b.w);
  const chosen = pairs.slice(Math.max(0, pairs.length - 21));
  chosen.forEach((p, k) => {
    p.start = 30 + k * 4;
    p.seed = 1000 + p.i * 31 + p.j;
  });
  return (cache[lang] = { tiles, pos, from, pairs: chosen, key });
}

function tileState(L, i, f) {
  const start = lift0(i);
  if (f < start) return null;
  const [fx, fy] = L.from[i];
  const [px, py] = L.pos[i];
  const t = f - start;
  const p = ease.inOut(hand(seg(f, start + 2, start + 14), 'tp' + i, f));
  let x = lerp(fx, px, p), y = lerp(fy, py, p);
  let lift = t < 2 ? [7, 15][t] : p < 1 ? 18 : 4;
  let r = lerp(NOTE0.r, hs('tr', i) * 0.1, p);
  let s = 1;
  let moving = t < 16;
  if (i === L.key) {
    const q = ease.inOut(hand(seg(f, 140, 164), 'key', f));
    if (q > 0) {
      x = lerp(x, 800, q);
      y = lerp(y, 420, q);
      lift = lerp(lift, 50, q);
      r = lerp(r, 0.02, q);
      s = 1 + q * 0.95;
      moving = moving || q < 1;
    }
  }
  const b = moving ? boil('tile' + i, f, 1.1) : [0, 0, 0];
  return { x: x + b[0], y: y + b[1], r: r + b[2], lift, s };
}

export default {
  id: 's2',
  len: 168,
  mood: 'threads',
  caps: [
    { a: 30, b: 82, ...CAPS.s2[0] },
    { a: 86, b: 150, ...CAPS.s2[1] },
  ],
  draw(f) {
    const L = layout(vlang());
    const states = L.tiles.map((t, i) => tileState(L, i, f));
    const kz = ease.inOut(seg(f, 142, 168));
    withCam(lerp(800, 800, kz), lerp(440, 425, kz), 1 + kz * 0.14, () => {
      desk();
      // the note slides away beneath the lifting words
      const nd = ease.in(hand(seg(f, 6, 24), 'nd', f));
      if (nd < 1) {
        const hide = new Set(states.map((s, i) => (s ? i : -1)).filter((i) => i >= 0));
        const b = nd > 0 ? boil('nd', f, 1) : [0, 0, 0];
        note({ x: NOTE0.x + b[0] - nd * 120, y: NOTE0.y + nd * 720 + b[1], r: NOTE0.r - nd * 0.25 + b[2], stage: 3, lift: nd > 0 ? 6 : 2, hide });
      }
      // threads (under the tiles)
      for (const p of L.pairs) {
        if (f < p.start) continue;
        const a = states[p.i], b = states[p.j];
        if (!a || !b) continue;
        const prog = ease.out(seg(f, p.start, p.start + 7));
        const keyish = p.i === L.key || p.j === L.key;
        const pts = threadPts(a.x, a.y, b.x, b.y, p.seed, 0.16);
        const fade = f > 150 && !keyish ? 1 - seg(f, 150, 164) * 0.6 : 1;
        thread(pts, prog, { width: 1.3 + p.w * 1.9 + (keyish ? 0.6 : 0), lift: 3, alpha: fade });
      }
      // tiles, key last
      const order = L.tiles.map((_, i) => i).filter((i) => i !== L.key).concat([L.key]);
      for (const i of order) {
        const s = states[i];
        if (!s) continue;
        const glowOn = i === L.key && f >= 112;
        const glowA = glowOn ? 0.12 + (Math.floor(f / 3) % 2) * 0.08 + seg(f, 140, 160) * 0.1 : 0;
        drawNoteTile(L.tiles[i], { ...s, glowA });
      }
      // the light narrows onto the one word
      const ks = states[L.key];
      const q = ease.inOut(seg(f, 128, 164));
      lamp(1, { x: lerp(800, ks ? ks.x : 800, q), y: lerp(420, ks ? ks.y : 420, q), r: lerp(700, 300, q) });
    });
  },
  sfx(f, A) {
    const L = layout(vlang());
    L.tiles.forEach((_, i) => { if (f === lift0(i)) A.tap(0.5); });
    if (f === 6) A.rustle(1.2, 0.5);
    L.pairs.forEach((p, k) => { if (f === p.start) A.pluck(PENTA[(k * 3) % PENTA.length], 0.22); });
    if (f === 112) A.chime(['D5', 'F#5', 'A5'], 0.07, 0.12);
    if (f === 140) A.rustle(0.6, 0.6);
  },
};
