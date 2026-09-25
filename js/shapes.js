// shapes.js — the cast: pieces cut once and reused.
import { rng } from './util.js';
import { cutShape, rectPts, smooth, disc, rect } from './cut.js';

// --- hands (seen from above, reaching in from the bottom edge) --------------
// Right hand: thumb on the left, fingers pointing up. Wrist at (0,0).
function roundedBar(x0, y0, x1, y1, w) {
  // a finger: bar from (x0,y0) to (x1,y1), rounded tip at (x1,y1)
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const pts = [[x0 + nx * w / 2, y0 + ny * w / 2]];
  const tipX = x1 - ux * w / 2, tipY = y1 - uy * w / 2;
  pts.push([tipX + nx * w / 2, tipY + ny * w / 2]);
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push([tipX + nx * (w / 2) * c + ux * (w / 2) * s, tipY + ny * (w / 2) * c + uy * (w / 2) * s]);
  }
  pts.push([tipX - nx * w / 2, tipY - ny * w / 2]);
  pts.push([x0 - nx * w / 2, y0 - ny * w / 2]);
  return pts;
}

export function handShape(pose = 'open', mirror = false, seed = 1) {
  const m = mirror ? -1 : 1;
  const P = (pts) => pts.map(([x, y]) => [x * m, y]);
  const parts = [];
  // forearm (sleeve-less paper arm reaching off the bottom)
  parts.push(P([[-40, -10], [40, -10], [46, 620], [-46, 620]]));
  // palm
  parts.push(P(smooth([[-50, -20], [-46, -104], [0, -118], [48, -104], [50, -20], [0, 4]], true, 5)));
  const curl = pose === 'pinch' ? 0.52 : pose === 'point' ? 0.6 : 1;
  const fingers = [
    [-34, -100, -46, -196, 23],
    [-10, -110, -12, -214, 23],
    [13, -106, 20, -202, 22],
    [34, -96, 50, -172, 19],
  ];
  fingers.forEach(([x0, y0, x1, y1, w], i) => {
    let c = curl;
    if (pose === 'point' && i === 0) c = 1.05;
    parts.push(P(roundedBar(x0, y0, x0 + (x1 - x0) * c, y0 + (y1 - y0) * c, w)));
  });
  // thumb
  const th = pose === 'pinch' ? [-44, -40, -52, -150] : [-44, -40, -110, -118];
  parts.push(P(roundedBar(th[0], th[1], th[2], th[3], 27)));
  return cutShape(parts, seed, { jag: 0.3, wander: 0.6, step: 14, corner: 0.5 });
}

// --- origami crane (side view, facing left) ----------------------------------
const CRANE = {
  body: [[-56, 2], [0, -26], [58, 2], [0, 30]],
  neck: [[-50, 0], [-26, -16], [-116, -112], [-106, -118]],
  head: [[-116, -112], [-106, -118], [-150, -96]],
  tail: [[52, 0], [26, -16], [128, -104]],
};
const WINGS = {
  rest: [[[-30, -16], [34, -14], [66, -54]], [[-20, -18], [30, -16], [44, -62]]],
  up: [[[-28, -18], [30, -18], [22, -186], [-8, -166]], [[-14, -20], [24, -20], [-26, -150]]],
  mid: [[[-28, -16], [32, -16], [150, -86], [120, -96]], [[-14, -18], [24, -18], [84, -110]]],
  down: [[[-28, -10], [32, -10], [96, 108], [70, 116]], [[-14, -12], [24, -12], [30, 96]]],
};
export function craneShape(wings = 'rest', seed = 3) {
  const near = [CRANE.body, CRANE.neck, CRANE.head, CRANE.tail, WINGS[wings][0]];
  return {
    near: cutShape(near, seed, { jag: 0.25, wander: 0.4, step: 16, corner: 0.5 }),
    far: cutShape([WINGS[wings][1]], seed + 7, { jag: 0.25, wander: 0.4, step: 16, corner: 0.5 }),
  };
}

// Stages of folding a strip into a crane (replacement animation).
export function foldStages(seed = 5) {
  const o = { jag: 0.3, wander: 0.7, step: 14, corner: 0.8 };
  return [
    cutShape(rectPts(450, 250), seed, o), // folded in half
    cutShape(rectPts(250, 250), seed + 1, o), // square
    cutShape([[0, -176], [176, 0], [0, 176], [-176, 0]], seed + 2, o), // diamond
    cutShape([[0, -190], [96, -12], [0, 120], [-96, -12]], seed + 3, o), // kite
    cutShape([[0, -210], [48, -20], [0, 140], [-48, -20]], seed + 4, o), // bird base
  ];
}

// --- bird (small, side view, flying right) ----------------------------------
export function birdShape(pose, seed) {
  const body = [[-26, 2], [-8, -5], [22, -4], [30, -8], [26, 0], [-4, 7]];
  const wing = {
    up: [[-8, -3], [10, -4], [-6, -34]],
    mid: [[-8, -3], [10, -4], [-24, -14]],
    down: [[-8, 0], [10, 0], [-2, 26]],
  }[pose];
  return cutShape([body, wing], seed, { jag: 0.15, wander: 0.2, step: 20, corner: 0.35 });
}

// --- landscape pieces --------------------------------------------------------
export function ridge(peaks, seed, bottom = 1200, x0 = -300, x1 = 1900) {
  const r = rng(seed);
  const pts = [[x0, bottom], [x0, peaks[0][1] + 40]];
  for (let i = 0; i < peaks.length; i++) {
    const [px, py] = peaks[i];
    pts.push([px, py]);
    if (i < peaks.length - 1) {
      const [nx, ny] = peaks[i + 1];
      const mx = (px + nx) / 2 + (r() - 0.5) * 50;
      const my = Math.max(py, ny) + 30 + r() * 70;
      pts.push([mx, my]);
    }
  }
  pts.push([x1, peaks[peaks.length - 1][1] + 40], [x1, bottom]);
  return cutShape(pts, seed, { jag: 0.8, wander: 3.5, step: 18, corner: 1 });
}

export function hillShape(y, seed, amp = 40, bottom = 1200) {
  const r = rng(seed);
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) pts.push([-300 + (2200 * i) / n, y + (r() - 0.5) * amp * 2]);
  const top = smooth(pts, false, 10);
  return cutShape([...top, [1900, bottom], [-300, bottom]], seed, { jag: 0.3, wander: 0, step: 999, corner: 0.4 });
}

export function waveStrip(y, seed, o = {}) {
  const { amp = 18, period = 120, bottom = 1200, x0 = -300, x1 = 1900 } = o;
  const r = rng(seed);
  const pts = [];
  let x = x0;
  while (x < x1) {
    const w = period * (0.8 + r() * 0.45), a = amp * (0.75 + r() * 0.5);
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      // pointed crest, round trough
      const k = 1 - Math.abs(2 * t - 1);
      pts.push([x + w * t, y - a * Math.pow(k, 0.65)]);
    }
    x += w;
  }
  pts.push([x, y], [x, bottom], [x0, bottom]);
  return cutShape(pts, seed, { jag: 0.25, wander: 0, step: 999, corner: 0.35 });
}

export function cloudShape(w, h, seed) {
  const r = rng(seed);
  // puffs at different heights, so each one shows as its own bump
  const layout = [[-0.33, -0.08, 0.36], [-0.12, -0.34, 0.5], [0.12, -0.24, 0.46], [0.32, -0.06, 0.34]];
  const circles = layout.map(([fx, fy, fr]) => [(fx + (r() - 0.5) * 0.04) * w, fy * h, h * fr * (0.92 + r() * 0.16)]);
  const top = [];
  const steps = 72;
  for (let s = 0; s <= steps; s++) {
    const x = -w / 2 + (w * s) / steps;
    let y = Infinity;
    for (const [cx, cy, cr] of circles) {
      const dx = x - cx;
      if (Math.abs(dx) < cr) y = Math.min(y, cy - Math.sqrt(cr * cr - dx * dx));
    }
    if (y < 0) top.push([x, y]);
  }
  const x0 = top[0][0], x1 = top[top.length - 1][0];
  const pts = [...top, [x1, 4], [x0, 4]];
  return cutShape(pts, seed, { jag: 0.2, wander: 0, step: 999, corner: 0.5 });
}

export function sunRays(r0, r1, n, seed) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const da = (Math.PI / n) * 0.42;
    const l = r1 * (i % 2 ? 0.86 : 1);
    parts.push([
      [Math.cos(a - da) * r0, Math.sin(a - da) * r0],
      [Math.cos(a) * l, Math.sin(a) * l],
      [Math.cos(a + da) * r0, Math.sin(a + da) * r0],
    ]);
  }
  return cutShape(parts, seed, { jag: 0.2, wander: 0.3, step: 30, corner: 0.6 });
}

export function houseShapes(w, h, roof, seed) {
  const wall = cutShape(rectPts(w, h, 0, -h / 2), seed, { jag: 0.3, wander: 0.5, step: 14, corner: 0.5 });
  let roofPts;
  const oh = 8;
  if (roof === 'gable') roofPts = [[-w / 2 - oh, -h + 2], [0, -h - w * 0.55], [w / 2 + oh, -h + 2]];
  else if (roof === 'flat') roofPts = rectPts(w + oh * 1.4, 14, 0, -h - 4);
  else roofPts = [[-w / 2 - oh, -h + 2], [-w / 4, -h - w * 0.42], [w / 4, -h - w * 0.42], [w / 2 + oh, -h + 2]];
  const roofSh = cutShape(roofPts, seed + 1, { jag: 0.3, wander: 0.6, step: 14, corner: 0.5 });
  const r = rng(seed);
  const wins = [];
  const cols = Math.max(1, Math.floor(w / 26)), rows = Math.max(1, Math.floor((h - 18) / 30));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (r() < 0.2) continue;
    const ww = 9 + r() * 3, wh = 11 + r() * 3;
    const x = -w / 2 + (w / cols) * (i + 0.5), y = -h + 16 + j * 30;
    wins.push([x, y, ww, wh]);
  }
  return { wall, roof: roofSh, wins, w, h };
}

export function treeShapes(kind, size, seed) {
  if (kind === 'pine') {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const y = -size * 0.25 - i * size * 0.32, hw = size * (0.42 - i * 0.1);
      parts.push([[-hw, y], [0, y - size * 0.5], [hw, y]]);
    }
    return { crown: cutShape(parts, seed, { jag: 0.3, wander: 0.4, step: 16, corner: 0.6 }), trunk: cutShape(rectPts(size * 0.09, size * 0.28, 0, -size * 0.12), seed + 1) };
  }
  const r = rng(seed);
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = size * 0.42 * (0.85 + r() * 0.3);
    pts.push([Math.cos(a) * rr, -size * 0.6 + Math.sin(a) * rr * 0.92]);
  }
  return {
    crown: cutShape(smooth(pts, true, 6), seed, { jag: 0.2, wander: 0, step: 999, corner: 0.5 }),
    trunk: cutShape(rectPts(size * 0.1, size * 0.4, 0, -size * 0.2), seed + 1),
  };
}

export function boatShapes(seed) {
  return {
    hull: cutShape([[-96, -6], [96, -6], [64, 34], [-64, 34]], seed, { jag: 0.3, wander: 0.8, step: 16 }),
    sail: cutShape([[-60, -4], [0, -92], [60, -4]], seed + 1, { jag: 0.3, wander: 0.8, step: 16 }),
  };
}

export function lighthouseShapes(seed) {
  return {
    tower: cutShape([[-22, 0], [-15, -150], [15, -150], [22, 0]], seed, { jag: 0.2, wander: 0.4 }),
    stripe1: cutShape([[-20.5, -40], [-18.3, -70], [18.3, -70], [20.5, -40]], seed + 1, { jag: 0.2, wander: 0.2 }),
    stripe2: cutShape([[-17.4, -100], [-15.8, -125], [15.8, -125], [17.4, -100]], seed + 2, { jag: 0.2, wander: 0.2 }),
    cap: cutShape([[-24, -148], [0, -178], [24, -148]], seed + 3, { jag: 0.2, wander: 0.3 }),
    lamp: cutShape(rectPts(20, 16, 0, -156), seed + 4),
  };
}

export function starShape(r, seed) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return cutShape(pts, seed, { jag: 0.1, wander: 0.2, step: 99, corner: 0.3 });
}

export { disc, rect };
