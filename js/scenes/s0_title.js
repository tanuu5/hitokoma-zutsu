// Scene 0 — title card: letters cut from printed pages, set down one by one.
import { withCam, lamp, sprite, letterSprite, R } from '../render.js';
import { desk } from '../common.js';
import { label } from '../label.js';
import { TITLE } from '../text.js';
import { F } from '../fonts.js';
import { hs, boil } from '../util.js';

let L = null;
function build() {
  L = [...TITLE.ja].map((ch, i) =>
    letterSprite(ch, { font: `900 160px ${F.mincho}`, color: '#f1e4c8', tex: i % 2 ? 'book' : 'tate', seed: 10 + i, ts: 0.75, grow: 3 }),
  );
}

const LAND = [
  { lift: 50, s: 1.16, dy: -30 },
  { lift: 22, s: 1.06, dy: -11 },
  { lift: 7, s: 1.015, dy: -3 },
];
export const letterStart = (i) => 8 + i * 5;

export function lampTitle(f) {
  if (R.reduced) return f >= 2 && f < 86 ? 1 : 0; // no flicker for reduced motion
  if (f < 2) return 0;
  if (f === 2) return 0.6;
  if (f === 3) return 0.12;
  if (f < 86) return 1;
  return [0.35, 0.9, 0.08][f - 86] ?? 0;
}

export function titleLetters(f, o = {}) {
  if (!L) build();
  const { cx = 800, cy = 372, start = letterStart, scale = 1 } = o;
  const widths = L.map((l) => l.w * 0.8 * scale);
  const gap = 6 * scale;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (L.length - 1);
  let x = cx - total / 2;
  L.forEach((sp, i) => {
    const px = x + widths[i] / 2;
    x += widths[i] + gap;
    const t = f - start(i);
    if (t < 0) return;
    const l = LAND[t] || { lift: 3, s: 1, dy: 0 };
    const b = t < 3 ? boil('tl' + i, f, 1.2) : [0, 0, 0];
    sprite(sp, {
      x: px + hs('tlx', i) * 6 * scale + b[0],
      y: cy + hs('tly', i) * 9 * scale + l.dy + b[1],
      r: hs('tlr', i) * 0.06 + b[2],
      s: l.s * scale,
      lift: l.lift,
    });
  });
}

export default {
  id: 's0',
  len: 98,
  mood: 'title',
  caps: [],
  draw(f) {
    withCam(800, 450, 1, () => {
      desk();
      titleLetters(f);
      const ja = R.lang !== 'en';
      const lines = [{ text: TITLE.en, font: `italic 400 40px ${F.garamond}`, lh: 50, color: '#2b221c' }];
      lines.push(ja
        ? { text: TITLE.tagJa, font: `600 24px ${F.hand}`, lh: 36, color: '#5a4a3e' }
        : { text: TITLE.tagEn, font: `italic 400 24px ${F.garamond}`, lh: 34, color: '#5a4a3e' });
      label({ x: 800, y: 598, lines, t: f - 42, cps: 1.6, r: -0.012 });
      lamp(lampTitle(f), { x: 800, y: 430, r: 760 });
    });
  },
  sfx(f, A) {
    if (f === 2) A.click();
    for (let i = 0; i < 6; i++) if (f === letterStart(i)) { A.tap(0.9); A.bell(['D5', 'A4', 'F#5', 'E5', 'D5', 'A5'][i], 0.1); }
    if (f === 42) A.rustle(0.25, 0.6);
    if (f === 86) A.click();
  },
};
