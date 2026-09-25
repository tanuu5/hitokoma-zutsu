// timeline.js — the scenes in order.
import s0 from './scenes/s0_title.js';
import s1 from './scenes/s1_arrival.js';
import s2 from './scenes/s2_threads.js';
import s3 from './scenes/s3_world.js';
import s4 from './scenes/s4_reply.js';
import s5 from './scenes/s5_windows.js';
import s6 from './scenes/s6_crane.js';
import s7 from './scenes/s7_coda.js';

export const SCENES = [s0, s1, s2, s3, s4, s5, s6, s7];

let acc = 0;
for (const s of SCENES) {
  s.start = acc;
  acc += s.len;
}
export const TOTAL = acc;

export function locate(g) {
  for (let i = SCENES.length - 1; i >= 0; i--) {
    if (g >= SCENES[i].start) return { sc: SCENES[i], f: g - SCENES[i].start, i };
  }
  return { sc: SCENES[0], f: 0, i: 0 };
}
