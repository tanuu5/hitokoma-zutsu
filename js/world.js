// world.js — the world, cut from printed pages and set up like a diorama.
import { R, piece, backdrop, withCam, glow, stillPiece, layer as cacheLayer, REGION } from './render.js';
import { crane } from './common.js';
import { ease, hand, hash, clamp, wave } from './util.js';
import {
  ridge, hillShape, waveStrip, cloudShape, sunRays, houseShapes, treeShapes, boatShapes, lighthouseShapes, birdShape, disc,
} from './shapes.js';
import { cutShape } from './cut.js';

let WD = null;
const TEXS = ['book', 'letter', 'news', 'tate', 'code', 'multi'];

export const SEA = [
  { y: 650, amp: 14, period: 110, color: '#a4c2cd', tex: 'multi', lift: 12, depth: 1.0 },
  { y: 700, amp: 16, period: 130, color: '#88abbd', tex: 'code', lift: 14, depth: 1.04 },
  { y: 760, amp: 18, period: 150, color: '#7097ae', tex: 'news', lift: 16, depth: 1.08 },
  { y: 832, amp: 20, period: 170, color: '#5d849b', tex: 'book', lift: 18, depth: 1.12 },
];
export const seaBob = (i, f) => [Math.round(wave(f, 26 + 5 * i, i * 0.17) * (6 + 2 * i)), Math.round(wave(f, 16 + 4 * i, i * 0.3) * (3 + i))];

const HOUSES = [
  [160, 612, 58, 64, 'gable', '#efe5d0', '#c65a3a'],
  [228, 606, 46, 88, 'flat', '#e5cfa6', '#8a6a55'],
  [292, 612, 64, 56, 'hip', '#dcc7b4', '#5f6f86'],
  [372, 608, 50, 72, 'gable', '#cfdad6', '#b8894f'],
  [1000, 606, 60, 70, 'gable', '#efe5d0', '#5f6f86'],
  [1068, 612, 44, 98, 'flat', '#e0c7a2', '#c65a3a'],
  [1130, 608, 66, 58, 'hip', '#d7e0d9', '#8a5a45'],
  [1206, 612, 52, 76, 'gable', '#ead3c2', '#b8894f'],
];
const TREES_BACK = [
  [110, 618, 'round', 76, '#8aa377'], [262, 612, 'pine', 90, '#6f8f6a'], [338, 616, 'round', 64, '#9bb183'],
  [430, 614, 'pine', 100, '#7d9a70'], [540, 608, 'round', 84, '#86a075'], [640, 604, 'round', 60, '#a2b68a'],
  [712, 606, 'pine', 80, '#6c8a66'], [880, 602, 'round', 70, '#95ad80'], [940, 606, 'pine', 96, '#78956d'],
  [1100, 610, 'round', 60, '#9ab282'], [1275, 612, 'round', 80, '#83a073'], [1340, 614, 'pine', 88, '#6d8c68'],
];
const TREES_FRONT = [[196, 632, 'round', 52, '#7f9a6e'], [1036, 632, 'round', 48, '#8ea77a'], [1170, 634, 'pine', 64, '#6f8a64']];
export const CRANES = [
  [470, 604, 0.2, '#e8b75a', false], [596, 600, 0.18, '#f3ede0', true], [1232, 524, 0.16, '#d46d45', false],
  [1310, 608, 0.2, '#9fc0cc', true], [1494, 634, 0.18, '#e6c7d0', false], [640, 424, 0.15, '#c8d6a8', true],
  [292, 540, 0.15, '#f3ede0', true], [860, 606, 0.16, '#d9a3b5', false],
];

// Draw live while the piece is being moved into place, from the cache once it has settled.
const put = (key, sh, o, a) => (a.live ? piece(sh, o) : stillPiece(key, sh, o));

function build() {
  const items = [];
  const add = (it) => { items.push(it); return it; };

  const rays = sunRays(96, 148, 14, 22);
  const sunD = disc(86, 21);
  add({ id: 'rays', depth: 0.35, enter: 24, kind: 'drop', dur: 5, draw: (a, f, o) => {
    const base = o.sunBase ?? o.sun.y;
    const spin = Math.floor(f / 3) * 0.02;
    const ro = { x: o.sun.x, y: base, lift: 9 + a.lift, color: '#eaa24e', tex: 'book', tx: 300, ty: 200, ts: 0.7 };
    if (a.live) piece(rays, { ...ro, y: o.sun.y + a.dy, s: a.s, r: spin });
    else stillPiece(`rays|${base}`, rays, { ...ro, dy: o.sun.y - base, rot: spin, liveShadow: true });
  } });
  add({ id: 'sun', depth: 0.35, enter: 22, kind: 'drop', dur: 5, draw: (a, f, o) => {
    const base = o.sunBase ?? o.sun.y;
    const color = o.sunColor || '#dc673a';
    const so = { x: o.sun.x, y: base, lift: 12 + a.lift, color, tex: 'news', tx: 80, ty: 40, edge: 0.35 };
    if (a.live) piece(sunD, { ...so, y: o.sun.y + a.dy, s: a.s });
    else stillPiece(`sun|${base}|${color}`, sunD, { ...so, dy: o.sun.y - base });
  } });

  const far = ridge([[-120, 360], [110, 292], [330, 352], [560, 262], [790, 338], [1010, 278], [1240, 336], [1470, 284], [1720, 350]], 31);
  const mid = ridge([[-120, 462], [200, 404], [470, 454], [720, 394], [980, 450], [1250, 400], [1520, 448], [1720, 424]], 32);
  add({ id: 'far', depth: 0.55, enter: 4, kind: 'rise', dur: 8, draw: (a) =>
    put('far', far, { x: a.dx, y: a.dy, lift: 4 + a.lift, color: '#aab5c0', tex: 'tate', tx: 10, ty: 0, ts: 0.72, texA: 0.5, edge: 0.3 }, a) });

  const clouds = [[360, 176, 280, 92, 'slideL', 30], [826, 124, 190, 62, 'slideR', 34], [1500, 250, 230, 74, 'slideL', 38]];
  clouds.forEach(([x, y, w, h, kind, enter], i) => {
    const sh = cloudShape(w, h, 60 + i);
    add({ id: 'cloud' + i, depth: 0.5, enter, kind, dur: 10, draw: (a, f) => {
      const drift = Math.floor(f / 4) * 1.0 * (i % 2 ? -1 : 1);
      const co = { x, y, lift: 24 + a.lift, color: '#f8f2e7', tex: 'letter', tx: 200 * i, ty: 90 * i, ts: 0.8, texA: 0.75, edge: 0.3 };
      if (a.live) piece(sh, { ...co, x: x + a.dx + drift });
      else stillPiece('cloud' + i, sh, { ...co, dx: drift });
    } });
  });

  add({ id: 'mid', depth: 0.7, enter: 10, kind: 'rise', dur: 8, draw: (a) =>
    put('mid', mid, { x: a.dx, y: a.dy, lift: 7 + a.lift, color: '#c8b797', tex: 'book', tx: 400, ty: 100, ts: 0.68, texA: 0.55 }, a) });
  const hills = hillShape(590, 33, 22);
  add({ id: 'hills', depth: 0.85, enter: 16, kind: 'rise', dur: 8, draw: (a) =>
    put('hills', hills, { x: a.dx, y: a.dy, lift: 10 + a.lift, color: '#a9ba90', tex: 'letter', tx: 50, ty: 300, ts: 0.62, texA: 0.6 }, a) });

  const tree = ([x, y, kind, size, color], i, enter) => {
    const T = treeShapes(kind, size, 80 + i * 3);
    add({ id: 'tree' + x, depth: 0.9, enter, kind: 'pop', dur: 4, draw: (a) => {
      put(`trunk${x}`, T.trunk, { x, y, sy: a.sy, lift: 11 + a.lift, color: '#8d6c50', tex: 'plain', tx: x, ty: 0, ts: 0.6 }, a);
      put(`crown${x}`, T.crown, { x, y, sy: a.sy, lift: 12 + a.lift, color, tex: TEXS[i % TEXS.length], tx: x * 3, ty: y, ts: 0.6, edge: 0.3 }, a);
    } });
  };
  TREES_BACK.forEach((t, i) => tree(t, i, 42 + i * 2));

  const houses = HOUSES.map(([x, y, w, h, roof, wall, roofC], i) => {
    const S = houseShapes(w, h, roof, 120 + i * 5);
    const hs0 = { x, y, S, wall, roofC, i };
    add({ id: 'house' + i, depth: 0.9, enter: 44 + i * 3, kind: 'pop', dur: 4, draw: (a) => {
      put(`wall${i}`, S.wall, { x, y, sy: a.sy, lift: 12 + a.lift, color: wall, tex: TEXS[(i + 2) % TEXS.length], tx: x * 2, ty: 50 * i, ts: 0.6, edge: 0.35,
        print: (c) => {
          c.save();
          c.globalCompositeOperation = 'multiply';
          for (const [wx, wy, ww, wh] of S.wins) {
            c.fillStyle = 'rgba(64,58,72,0.62)';
            c.fillRect(wx - ww / 2, wy, ww, wh);
            c.fillStyle = 'rgba(255,255,255,0.35)';
            c.fillRect(wx - 0.6, wy, 1.2, wh);
          }
          c.fillStyle = 'rgba(70,52,44,0.55)';
          c.fillRect(-6, -18, 12, 18);
          c.restore();
        } }, a);
      put(`roof${i}`, S.roof, { x, y, sy: a.sy, lift: 13 + a.lift, color: roofC, tex: TEXS[(i + 4) % TEXS.length], tx: x, ty: 30, ts: 0.6, edge: 0.35 }, a);
    } });
    return hs0;
  });

  const rock = cutShape([[-86, 12], [-64, -22], [-14, -40], [40, -30], [80, -8], [90, 14]], 150, { jag: 0.6, wander: 2 });
  const LH = lighthouseShapes(151);
  add({ id: 'rock', depth: 1.0, enter: 64, kind: 'drop', dur: 5, draw: (a) =>
    put('rock', rock, { x: 1450, y: 662 + a.dy, s: a.s, lift: 12 + a.lift, color: '#948373', tex: 'news', tx: 100, ty: 100, ts: 0.7 }, a) });
  add({ id: 'lighthouse', depth: 1.0, enter: 68, kind: 'pop', dur: 4, draw: (a) => {
    const b = { x: 1452, y: 640, sy: a.sy, lift: 13 + a.lift };
    put('lh-tower', LH.tower, { ...b, color: '#f2ece1', tex: 'book', tx: 30, ty: 60, ts: 0.6 }, a);
    put('lh-s1', LH.stripe1, { ...b, color: '#c95b3b', tex: 'news', lift: b.lift + 0.5 }, a);
    put('lh-s2', LH.stripe2, { ...b, color: '#c95b3b', tex: 'news', lift: b.lift + 0.5 }, a);
    put('lh-lamp', LH.lamp, { ...b, color: '#f2c65a', tex: 'plain' }, a);
    put('lh-cap', LH.cap, { ...b, color: '#5f6f86', tex: 'code', lift: b.lift + 1 }, a);
  } });

  TREES_FRONT.forEach((t, i) => tree(t, i + 20, 72 + i * 2));

  CRANES.forEach(([x, y, s, color, flip], i) => {
    add({ id: 'crane' + i, depth: i === 4 ? 1.0 : 0.95, enter: i === 4 ? 104 : 92 + i * 3, kind: 'drop', dur: 4, draw: (a, f) => {
      const flapK = hash('cf', i, Math.floor(f / 3)) > 0.93;
      crane({
        x, y: y - 30 * s + a.dy, s: s * a.s, pose: flapK ? 'up' : 'rest', color, tex: i === 4 ? 'letter' : TEXS[i % TEXS.length],
        lift: 4 + a.lift, flip, tx: i * 90, ty: i * 40, still: a.live ? null : 'wc' + i,
      });
    } });
  });

  // The sea: strips of blue printed paper, pushed back and forth by hand.
  const boat = boatShapes(170);
  SEA.forEach((sp, i) => {
    const sh = waveStrip(sp.y, 41 + i, { amp: sp.amp, period: sp.period });
    add({ id: 'sea' + i, depth: sp.depth, enter: 62 + i * 6, kind: i % 2 ? 'slideR' : 'slideL', dur: 9, draw: (a, f) => {
      const [bx, by] = seaBob(i, f);
      const so = { lift: sp.lift + a.lift, color: sp.color, tex: 'sea', tx: 100 * i + 37, ty: 61 * i, ts: 0.78 + i * 0.1, edge: 0.4 };
      if (a.live) piece(sh, { ...so, x: a.dx + bx, y: a.dy + by });
      else stillPiece('sea' + i, sh, { ...so, dx: bx, dy: by });
    } });
    if (i === 1) {
      add({ id: 'boat', depth: 1.05, enter: 88, kind: 'drop', dur: 6, draw: (a, f) => {
        const [, by] = seaBob(1, f);
        const rock2 = wave(f, 18, 0.1) * 0.05;
        const sail = { color: '#efe7d6', tex: 'news', tx: 20, ty: 20, ts: 0.85, print: (c) => {
          c.save();
          c.globalCompositeOperation = 'multiply';
          c.strokeStyle = 'rgba(90,80,70,0.35)';
          c.lineWidth = 1.3;
          c.beginPath(); c.moveTo(0, -90); c.lineTo(0, -4); c.stroke();
          c.restore();
        } };
        const hull = { color: '#e3d9c4', tex: 'news', tx: 200, ty: 60, ts: 0.85 };
        if (a.live) {
          const b = { x: 560, y: 716 + by + a.dy, s: a.s, r: rock2, lift: 15 + a.lift };
          piece(boat.sail, { ...b, ...sail });
          piece(boat.hull, { ...b, ...hull });
          crane({ x: b.x + 26, y: b.y - 8 - 30 * 0.15, s: 0.15 * a.s, r: rock2, pose: 'rest', color: '#f3ede0', tex: 'book', lift: b.lift + 2 });
        } else {
          const b = { x: 560, y: 716, lift: 15, dy: by, rot: rock2 };
          stillPiece('boat-sail', boat.sail, { ...b, ...sail });
          stillPiece('boat-hull', boat.hull, { ...b, ...hull });
          crane({ x: 586, y: 716 - 8 - 30 * 0.15, s: 0.15, pose: 'rest', color: '#f3ede0', tex: 'book', lift: 17, still: 'boatcrane', dy: by, rot: rock2 });
        }
      } });
    }
  });

  // Birds made of letter paper.
  const birdPoses = { up: birdShape('up', 180), mid: birdShape('mid', 181), down: birdShape('down', 182) };
  add({ id: 'birds', depth: 0.6, enter: 0, kind: 'none', dur: 0, draw: (a, f, o) => {
    if (!o.birds) return;
    const t0 = o.birdStart ?? 96;
    [[196, 0, 4.4, 1.0], [236, 10, 4.0, 0.8], [158, 22, 4.9, 0.72]].forEach(([y, delay, v, sc], i) => {
      const t = f - t0 - delay;
      if (t < 0) return;
      const x = -120 + t * v;
      if (x > 1750) return;
      const pose = ['up', 'mid', 'down', 'mid'][(Math.floor(f / 2) + i) % 4];
      const bob = pose === 'down' ? -3 : pose === 'up' ? 2 : 0;
      stillPiece(`bird${i}|${pose}`, birdPoses[pose], {
        x: 0, y, s: sc * 1.9, lift: 26, color: '#585d7a', tex: 'news', ts: 0.6, tx: i * 100, ty: 0, edge: 0.35,
        dx: x, dy: bob + Math.round(wave(f, 30, i * 0.3) * 6),
      });
    });
  } });

  WD = { items, houses };
}

function enterAnim(kind, t, dur, id, f) {
  if (kind === 'none' || t >= dur) return { dx: 0, dy: 0, s: 1, sy: 1, lift: 0, live: false };
  const u = clamp(t / dur);
  const p = ease.out(hand(u, id, f, 0.03));
  switch (kind) {
    case 'rise': return { dx: 0, dy: (1 - p) * 540, s: 1, sy: 1, lift: 8 * (1 - p), live: true };
    case 'drop': return { dx: 0, dy: -(1 - p) * 26, s: 1 + (1 - p) * 0.35, sy: 1, lift: 55 * (1 - p), live: true };
    case 'slideL': return { dx: -(1 - p) * 1900, dy: 0, s: 1, sy: 1, lift: 7 * (1 - p), live: true };
    case 'slideR': return { dx: (1 - p) * 1900, dy: 0, s: 1, sy: 1, lift: 7 * (1 - p), live: true };
    case 'pop': {
      const seq = [0.3, 0.86, 1.1, 1.0];
      const k = Math.min(seq.length - 1, Math.floor(u * seq.length));
      return { dx: 0, dy: 0, s: 1, sy: seq[k], lift: [14, 9, 4, 0][k], live: true };
    }
  }
  return { dx: 0, dy: 0, s: 1, sy: 1, lift: 0, live: false };
}

// o: { assemble, cam:{x,y,z}, sun:{x,y}, sunColor, sky, skyTex, birds, birdStart, after(fn) }
export function drawWorld(f, o = {}) {
  if (!WD) build();
  const opt = { cam: { x: 800, y: 450, z: 1 }, sun: { x: 1245, y: 190 }, sky: '#ede3ce', birds: true, ...o };
  const c = opt.cam;
  const layer = (d, fn) => withCam(800 + (c.x - 800) * d, 450 + (c.y - 450) * d, 1 + (c.z - 1) * d, fn);
  layer(0.3, () => cacheLayer('sky|' + opt.sky, REGION, () => backdrop(opt.sky, 'sky', 0.9, { texA: 0.13, tx: 40, ty: 10 }), { res: 0.62 }));
  for (const it of WD.items) {
    const t = opt.assemble ? f - it.enter : 999;
    if (t < 0) continue;
    const a = enterAnim(it.kind, t, it.dur, it.id, f);
    layer(it.depth, () => it.draw(a, f, opt));
  }
  if (opt.after) layer(1, () => opt.after());
  return layer;
}

// Items that entered on this frame (for sound cues).
export function worldCues(f) {
  if (!WD) build();
  return WD.items.filter((it) => it.enter === f && it.kind !== 'none').map((it) => it.kind);
}

// Windows that light up at dusk (drawn after the light pass).
export function worldLights(f, start, layer) {
  if (!WD) build();
  layer(0.9, () => {
    WD.houses.forEach((h, i) => {
      h.S.wins.forEach(([wx, wy, ww, wh], k) => {
        const on = start + Math.floor(hash('wl', i, k) * 70);
        if (f < on) return;
        const flick = f - on < 2 ? 0.5 : 1;
        const x = h.x + wx, y = h.y + wy;
        R.ctx.fillStyle = `rgba(255,${196 + Math.floor(hash('wc', i, k) * 30)},120,${0.9 * flick})`;
        R.ctx.fillRect(x - ww / 2, y, ww, wh);
        glow(x, y + wh / 2, 26, '255,190,110', 0.28 * flick);
      });
    });
  });
  layer(1.0, () => {
    if (f >= start + 10) {
      R.ctx.fillStyle = 'rgba(255,220,140,0.95)';
      R.ctx.fillRect(1442, -164 + 640, 20, 16);
      glow(1452, 484, 70, '255,210,130', 0.4);
    }
  });
}
