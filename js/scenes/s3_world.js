// Scene 3 — the world is assembled from pages people wrote.
import { daylight } from '../render.js';
import { drawWorld, worldCues } from '../world.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp } from '../util.js';

const MELODY = ['F#5', 'A5', 'B5', 'A5', 'F#5', 'E5', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6'];
const POP = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6'];

export default {
  id: 's3',
  len: 240,
  mood: 'world',
  post: { vignette: 0.8 },
  caps: [
    { a: 34, b: 114, ...CAPS.s3[0] },
    { a: 122, b: 236, ...CAPS.s3[1] },
  ],
  draw(f) {
    const e = ease.inOut(seg(f, 126, 232));
    drawWorld(f, { assemble: true, cam: { x: lerp(800, 780, e), y: lerp(450, 560, e), z: lerp(1, 1.17, e) } });
    daylight({ top: '#fffaf0', bottom: '#eadccc' });
  },
  sfx(f, A) {
    let pops = 0;
    for (const kind of worldCues(f)) {
      if (kind === 'rise' || kind === 'slideL' || kind === 'slideR') A.rustle(0.55, 0.55);
      else if (kind === 'drop') A.tap(0.8);
      else if (kind === 'pop') { A.tap(0.55); if (pops++ === 0) A.bell(POP[f % POP.length], 0.06); }
    }
    if (f >= 120 && (f - 120) % 10 === 0) {
      const k = (f - 120) / 10;
      if (k < MELODY.length) A.bell(MELODY[k], 0.075);
    }
  },
};
