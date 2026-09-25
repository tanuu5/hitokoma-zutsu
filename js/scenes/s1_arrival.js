// Scene 1 — darkness, then a note slides in and the light comes on.
import { withCam, lamp, R } from '../render.js';
import { desk, note } from '../common.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, hand, boil } from '../util.js';

export function lampArrival(f) {
  if (f < 100) return 0;
  if (R.reduced) return 1;
  return [1, 0.18, 0.85][f - 100] ?? 1;
}

export function noteState(f) {
  const p = ease.out(hand(seg(f, 72, 98), 'n1', f));
  const moving = f >= 72 && f <= 98;
  const b = moving ? boil('n1', f, 1) : [0, 0, 0];
  const stage = f < 152 ? 0 : f < 158 ? 1 : f < 164 ? 2 : 3;
  const unfolding = f >= 150 && f < 166;
  const ub = unfolding ? boil('n2', f, 0.8) : [0, 0, 0];
  return {
    x: lerp(1980, 790, p) + b[0] + ub[0],
    y: lerp(540, 430, p) + b[1] + ub[1],
    r: lerp(0.38, -0.04, p) + b[2] + ub[2],
    stage,
    lift: moving ? 6 : unfolding ? 4 : 2,
  };
}

export default {
  id: 's1',
  len: 252,
  mood: 'dark',
  caps: [
    { a: 8, b: 66, ...CAPS.s1[0] },
    { a: 104, b: 152, ...CAPS.s1[1] },
    { a: 168, b: 248, ...CAPS.s1[2] },
  ],
  draw(f) {
    const z = 1 + ease.inOut(seg(f, 160, 252)) * 0.06;
    withCam(800, 440 + seg(f, 160, 252) * 6, z, () => {
      desk();
      if (f >= 72) note({ ...noteState(f), still: f >= 168 });
      const on = lampArrival(f);
      lamp(on, { x: 800, y: 420, r: 700, dark: '#121017' });
    });
  },
  sfx(f, A) {
    if (f === 72) A.rustle(1.9, 0.7);
    if (f === 100) { A.click(); A.mood('lamp'); }
    if (f === 150 || f === 157 || f === 163) A.rustle(0.3, 0.8);
    if (f === 166) A.tap(0.6);
  },
};
