// Scene 7 — the crane joins the world. Dusk. The windows come on.
import { duskLight, sprite, letterSprite, R } from '../render.js';
import { drawWorld, worldLights } from '../world.js';
import { crane } from '../common.js';
import { label } from '../label.js';
import { CAPS, TITLE } from '../text.js';
import { F } from '../fonts.js';
import { ease, seg, lerp, hand, boil, hs } from '../util.js';

const LAND = { x: 806, y: 598, s: 0.27 };
const TITLE_AT = 150;
const letterAt = (i) => TITLE_AT + i * 4;

let L = null;
function letters() {
  return (L ||= [...TITLE.ja].map((ch, i) =>
    letterSprite(ch, { font: `900 104px ${F.mincho}`, color: '#3a3f63', tex: i % 2 ? 'news' : 'book', seed: 40 + i, ts: 0.7, grow: 2.5 })));
}

function ourCrane(f) {
  const p = hand(seg(f, 0, 62), 'land', f, 0.01);
  const e = ease.out(p);
  const pose = f < 58 ? ['up', 'mid', 'down', 'mid'][Math.floor(f / 2) % 4] : f < 62 ? 'mid' : 'rest';
  const settle = f >= 62 && f < 66 ? boil('landed', f, 1) : [0, 0, 0];
  return {
    x: lerp(-160, LAND.x, e) + Math.sin(p * 2.6) * 40 * (1 - p) + settle[0],
    y: lerp(-110, LAND.y - 30 * LAND.s, ease.inOut(p)) + settle[1],
    s: lerp(1.5, LAND.s, e),
    r: lerp(-0.25, 0, e) + settle[2],
    lift: lerp(150, 5, e),
    pose,
  };
}

function endTitle(f) {
  const sp = letters();
  const widths = sp.map((l) => l.w * 0.8);
  const total = widths.reduce((a, b) => a + b, 0) + 4 * (sp.length - 1);
  let x = 800 - total / 2;
  sp.forEach((s, i) => {
    const px = x + widths[i] / 2;
    x += widths[i] + 4;
    const t = f - letterAt(i);
    if (t < 0) return;
    const l = [{ lift: 44, s: 1.15, dy: -24 }, { lift: 20, s: 1.05, dy: -9 }, { lift: 8, s: 1.01, dy: -2 }][t] || { lift: 5, s: 1, dy: 0 };
    const b = t < 3 ? boil('et' + i, f, 1.1) : [0, 0, 0];
    sprite(s, { x: px + hs('etx', i) * 4 + b[0], y: 150 + hs('ety', i) * 6 + l.dy + b[1], r: hs('etr', i) * 0.05 + b[2], s: l.s, lift: l.lift });
  });
}

export default {
  id: 's7',
  len: 252,
  mood: 'coda',
  post: { vignette: 1 },
  caps: [{ a: 68, b: 142, ...CAPS.s7[0] }],
  draw(f) {
    const dusk = seg(f, 90, 210);
    const sun = { x: 1245, y: lerp(330, 372, dusk) };
    const layer = drawWorld(f, {
      sky: '#f1e3cc',
      sun,
      sunColor: '#d9552f',
      birdStart: -210,
      after: () => {
        const c = ourCrane(f);
        crane({ ...c, color: '#f1e9d8', tex: 'book', tx: 200, ty: 60 });
        endTitle(f);
        const ja = R.lang !== 'en';
        label({
          x: 800, y: 262, t: f - 178, cps: 1.6, r: 0.01, lift: 4,
          lines: [
            { text: TITLE.en, font: `italic 400 30px ${F.garamond}`, lh: 38, color: '#2b221c' },
            { text: ja ? '— Claude より' : '— Claude', font: `600 21px ${F.hand}`, lh: 30, color: '#6a4a3a' },
          ],
        });
      },
    });
    duskLight(0.5 + dusk * 0.5, dusk * 0.3, sun);
    worldLights(f, 118, layer);
  },
  sfx(f, A) {
    if (f < 60 && f % 4 === 0) A.flap(0.5 + f / 120);
    if (f === 62) { A.tap(0.5); A.chime(['D5', 'A5'], 0.07, 0.1); }
    for (let i = 0; i < 6; i++) if (f === letterAt(i)) { A.tap(0.8); A.bell(['D5', 'A4', 'F#5', 'E5', 'D5', 'A5'][i], 0.09); }
    if (f === 178) A.rustle(0.3, 0.5);
    if (f === 214) A.chime(['D5', 'F#5', 'A5', 'D6'], 0.06, 0.16);
  },
};
