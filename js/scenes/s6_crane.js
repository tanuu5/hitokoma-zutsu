// Scene 6 — hands fold the reply into a crane; it flies off; the light goes out.
import { withCam, lamp, piece, R } from '../render.js';
import { desk, note, reply, crane } from '../common.js';
import { NOTE_POS, CARD } from './s4_reply.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, hand, boil } from '../util.js';
import { handShape, foldStages } from '../shapes.js';

let SH = null;
function build() {
  SH = {
    stages: foldStages(5),
    hands: {
      R: { open: handShape('open', false, 11), pinch: handShape('pinch', false, 12), point: handShape('point', false, 13) },
      L: { open: handShape('open', true, 14), pinch: handShape('pinch', true, 15), point: handShape('point', true, 16) },
    },
  };
}

// [frame, x, y, rotation, pose]
const KEYS = {
  R: [
    [0, 1560, 1320, -0.5, 'open'], [12, 1430, 820, -0.42, 'open'], [18, 1420, 800, -0.42, 'pinch'],
    [23, 1080, 790, -0.3, 'pinch'], [28, 1000, 780, -0.26, 'pinch'], [31, 1050, 790, -0.34, 'open'],
    [36, 1030, 760, -0.3, 'pinch'], [44, 1010, 740, -0.26, 'pinch'], [51, 1000, 725, -0.24, 'point'],
    [58, 1010, 715, -0.28, 'pinch'], [66, 1020, 715, -0.3, 'pinch'], [72, 1110, 830, -0.4, 'open'],
    [86, 1560, 1320, -0.5, 'open'],
  ],
  L: [
    [2, 240, 1320, 0.5, 'open'], [14, 340, 820, 0.44, 'open'], [18, 350, 805, 0.44, 'pinch'],
    [26, 500, 800, 0.4, 'pinch'], [33, 610, 775, 0.34, 'pinch'], [40, 680, 750, 0.3, 'open'],
    [47, 700, 738, 0.3, 'pinch'], [55, 716, 726, 0.3, 'pinch'], [63, 736, 716, 0.3, 'pinch'],
    [70, 690, 820, 0.42, 'open'], [84, 240, 1320, 0.5, 'open'],
  ],
};
function handAt(side, f) {
  const K = KEYS[side];
  if (f < K[0][0] || f > K[K.length - 1][0]) return null;
  let i = 0;
  while (i < K.length - 1 && K[i + 1][0] <= f) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const p = b === a ? 1 : ease.inOut(hand(seg(f, a[0], b[0]), side, f, 0.04));
  const bo = boil('hand' + side, f, 1.3);
  return { x: lerp(a[1], b[1], p) + bo[0], y: lerp(a[2], b[2], p) + bo[1], r: lerp(a[3], b[3], p) + bo[2], pose: a[4] };
}

const STAGES = [
  [20, 690, 590, -0.04], [30, 800, 575, 0.06], [38, 850, 560, 0], [46, 870, 545, 0.02], [54, 880, 532, 0],
];
const CREASES = [
  (c) => { c.moveTo(-225, 0); c.lineTo(225, 0); },
  (c) => { c.moveTo(-125, -125); c.lineTo(125, 125); },
  (c) => { c.moveTo(0, -176); c.lineTo(0, 176); c.moveTo(-176, 0); c.lineTo(176, 0); },
  (c) => { c.moveTo(0, -190); c.lineTo(0, 120); c.moveTo(-96, -12); c.lineTo(96, -12); },
  (c) => { c.moveTo(0, -210); c.lineTo(0, 140); },
];

function flight(f) {
  // crane after folding: rest, wake, flutter, fly away to the upper left
  if (f < 62) return null;
  const base = { x: 880, y: 520, s: 1.3, r: 0, lift: 6, pose: 'rest' };
  if (f < 70) return base;
  if (f < 96) {
    const t = f - 70;
    const poses = ['up', 'mid', 'down', 'mid'];
    const pose = t < 4 ? 'up' : poses[Math.floor(t / 2) % 4];
    const hop = t < 4 ? 0 : [0, 8, 14, 8][Math.floor(t / 2) % 4];
    const b = boil('cr', f, 1.2);
    return { ...base, x: base.x + b[0], y: base.y - hop + b[1], r: b[2], lift: 6 + hop, pose };
  }
  const p = ease.in(hand(seg(f, 96, 130), 'fly', f, 0.02));
  if (p >= 1) return null;
  const pose = ['up', 'mid', 'down', 'mid'][Math.floor(f / 2) % 4];
  return {
    x: lerp(880, -260, p) + Math.sin(p * 3) * 60,
    y: lerp(500, -300, p) - Math.sin(p * Math.PI) * 60,
    s: lerp(1.3, 2.3, p),
    r: -0.12 - p * 0.2,
    lift: lerp(20, 150, p),
    pose,
  };
}

export function lampCrane(f) {
  if (f < 170) return 1;
  if (R.reduced) return 0;
  return [0.45, 0.95, 0.12][f - 170] ?? 0;
}

export default {
  id: 's6',
  len: 264,
  mood: 'crane',
  caps: [
    { a: 130, b: 198, ...CAPS.s6[0] },
    { a: 202, b: 260, ...CAPS.s6[1] },
  ],
  draw(f) {
    if (!SH) build();
    const z = 1.05 - ease.inOut(seg(f, 0, 60)) * 0.03;
    withCam(850, 470, z, () => {
      desk();
      note({ ...NOTE_POS, stage: 3, lift: 2, still: true });
      // the paper: card with tokens, then fold stages
      if (f < 20) {
        const grab = f >= 18 ? 6 : 3;
        const b = f >= 18 ? boil('card', f, 1) : [0, 0, 0];
        reply({ x: CARD.x + b[0], y: CARD.y + b[1], r: b[2], f: 999, lift: grab });
      } else if (f < 62) {
        let k = STAGES.length - 1;
        while (k > 0 && f < STAGES[k][0]) k--;
        const [, x, y, r] = STAGES[k];
        const b = boil('fold', f, 1.4);
        piece(SH.stages[k], {
          x: x + b[0], y: y + b[1], r: r + b[2], lift: 8, color: '#f1e9d8', tex: 'book', tx: 200 + k * 90, ty: 60, ts: 0.8, edge: 0.45,
          print: (c) => {
            c.save();
            c.globalCompositeOperation = 'multiply';
            c.strokeStyle = 'rgba(110,90,78,0.45)';
            c.lineWidth = 1.4;
            c.beginPath();
            CREASES[k](c);
            c.stroke();
            c.restore();
          },
        });
      }
      const cr = flight(f);
      // hands above the paper
      for (const side of ['L', 'R']) {
        const h = handAt(side, f);
        if (!h) continue;
        piece(SH.hands[side][h.pose], { x: h.x, y: h.y, r: h.r, lift: 26, color: '#dcb690', tex: 'letter', tx: side === 'L' ? 120 : 520, ty: 300, ts: 0.9, edge: 0.4 });
      }
      if (cr) crane({ ...cr, color: '#f1e9d8', tex: 'book', tx: 200, ty: 60 });
      lamp(lampCrane(f), { x: 830, y: 480, r: 780, dark: '#0f0d13' });
    });
  },
  sfx(f, A) {
    if (f === 0 || f === 4) A.rustle(0.6, 0.4);
    if (f === 18) A.tap(0.6);
    STAGES.forEach(([s]) => { if (f === s) A.rustle(0.32, 0.9); });
    if (f === 62) { A.tap(0.6); A.chime(['A4', 'D5', 'F#5', 'A5'], 0.07, 0.07); }
    if (f >= 74 && f < 130 && f % 4 === 0) A.flap(f < 96 ? 0.6 : 1 - (f - 96) / 40);
    if (f === 170 || f === 172) A.click();
    if (f === 172) A.mood('hush');
  },
};
