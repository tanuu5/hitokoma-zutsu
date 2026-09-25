// Scene 4 — the reply is set down one token at a time, like frames.
import { withCam, lamp, thread, threadPts, vlang } from '../render.js';
import { desk, note, reply, replyData } from '../common.js';
import { CAPS } from '../text.js';
import { ease, seg, hash } from '../util.js';

export const NOTE_POS = { x: 330, y: 250, r: -0.1, s: 0.56 };
export const CARD = { x: 880, y: 578 };
export const placeAt = (i) => 18 + i * 7;
// Each token rings one note: the finished reply is also a small melody.
const MELODY = ['A4', 'B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'F#4', 'A4', 'B4', 'A4', 'F#4', 'E4', 'D4'];

const noteAnchor = () => [NOTE_POS.x + 30, NOTE_POS.y + 10];
function attnTargets(i) {
  if (i === 0) return [-1];
  const t = [i - 1];
  if (hash('att', i) < 0.6) t.push(-1);
  if (i > 2) t.push(Math.floor(hash('att2', i) * (i - 1)));
  return [...new Set(t)];
}

export function deskWithReply(f, o = {}) {
  const D = replyData(vlang());
  desk();
  note({ ...NOTE_POS, stage: 3, lift: 2, still: true });
  const placed = o.placed ? D.tiles.map((t) => o.placed(t.i)) : null;
  return reply({ ...CARD, f, placedAt: placed, lift: 3 });
}

export default {
  id: 's4',
  len: 180,
  mood: 'reply',
  caps: [
    { a: 12, b: 88, ...CAPS.s4[0] },
    { a: 116, b: 176, ...CAPS.s4[1] },
  ],
  draw(f) {
    const D = replyData(vlang());
    const z = 1 + ease.inOut(seg(f, 0, 175)) * 0.05;
    withCam(850, 470, z, () => {
      const pos = deskWithReply(f, { placed: placeAt });
      // threads of attention reach out to each new token, then are taken away
      D.tiles.forEach((t) => {
        const i = t.i;
        const t0 = placeAt(i) + 1;
        if (f < t0 || f > t0 + 5 || !pos[i]) return;
        const prog = ease.out(seg(f, t0, t0 + 2));
        for (const j of attnTargets(i)) {
          const from = j === -1 ? noteAnchor() : pos[j];
          if (!from) continue;
          const pts = threadPts(from[0], from[1], pos[i][0], pos[i][1], 7000 + i * 13 + j, 0.22);
          thread(pts, prog, { width: j === -1 ? 1.9 : 1.4, lift: 6 });
        }
      });
      lamp(1, { x: 830, y: 480, r: 780 });
    });
  },
  sfx(f, A) {
    const D = replyData(vlang());
    D.tiles.forEach((t) => {
      if (f === placeAt(t.i) + 2) { A.tap(0.7); A.bell(MELODY[t.i % MELODY.length], 0.1); }
    });
  },
};
