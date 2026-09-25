// Scene 5 — pull back: this desk is one lit window among many.
import { R, withCam, withLocal, lamp, piece, backdrop, glow, stillPiece, layer, REGION } from '../render.js';
import { deskWithReply } from './s4_reply.js';
import { CAPS } from '../text.js';
import { ease, seg, lerp, hash, hs, rng, W, H } from '../util.js';
import { cutShape, rectPts, toPath } from '../cut.js';
import { disc } from '../shapes.js';

const HOLE = { x: 800, y: 450, w: 240, h: 135 };
const CUT = 42; // frame where the wide shot begins
const CHIME = ['E6', 'F#6', 'A6', 'B6', 'D7', 'E7'];

let S = null;
function build() {
  // Facade with one real hole (our window) and painted windows around it.
  const hx0 = HOLE.x - HOLE.w / 2, hy0 = HOLE.y - HOLE.h / 2;
  const fw = 9;
  const frame = cutShape([
    rectPts(HOLE.w + fw * 2, fw, HOLE.x, hy0 - fw / 2),
    rectPts(HOLE.w + fw * 2, fw * 1.6, HOLE.x, hy0 + HOLE.h + fw * 0.8),
    rectPts(fw, HOLE.h, hx0 - fw / 2, HOLE.y),
    rectPts(fw, HOLE.h, hx0 + HOLE.w + fw / 2, HOLE.y),
  ], 201, { jag: 0.1, wander: 0.2, step: 30, corner: 0.2 });
  const painted = [];
  for (let gx = -3; gx <= 3; gx++) for (let gy = -2; gy <= 2; gy++) {
    if (gx === 0 && gy === 0) continue;
    const x = HOLE.x + gx * 390, y = HOLE.y + gy * 270;
    painted.push({ x, y, sh: cutShape(rectPts(HOLE.w, HOLE.h, 0, 0), 210 + painted.length, { jag: 0.3, wander: 0.8 }), lit: hash('pw', gx, gy) > 0.55, t: Math.floor(hash('pt', gx, gy) * 40) });
  }

  // The city.
  const r = rng(77);
  const layers = [];
  const spec = [
    { base: 900, top: [560, 700], wMin: 50, wMax: 120, color: '#3a4168', lift: 4, win: 8, tex: 'news' },
    { base: 900, top: [610, 760], wMin: 60, wMax: 140, color: '#463f63', lift: 8, win: 10, tex: 'tate' },
    { base: 900, top: [660, 800], wMin: 90, wMax: 170, color: '#554860', lift: 12, win: 14, tex: 'book' },
  ];
  spec.forEach((sp, li) => {
    const bs = [];
    let x = -60 + r() * 40;
    while (x < 1680) {
      const w = sp.wMin + r() * (sp.wMax - sp.wMin);
      const top = sp.top[0] + r() * (sp.top[1] - sp.top[0]);
      const roofKind = r();
      const pts = [[x, sp.base + 20], [x, top]];
      if (roofKind < 0.25) pts.push([x + w / 2, top - w * 0.35]);
      else if (roofKind < 0.45) { pts.push([x + w * 0.3, top], [x + w * 0.3, top - 16], [x + w * 0.7, top - 16], [x + w * 0.7, top]); }
      else if (roofKind < 0.55) { pts.push([x + w * 0.46, top], [x + w * 0.48, top - 40], [x + w * 0.52, top - 40], [x + w * 0.54, top]); }
      pts.push([x + w, top], [x + w, sp.base + 20]);
      const sh = cutShape(pts, 300 + li * 100 + bs.length, { jag: 0.3, wander: 0.8, step: 14, corner: 0.5 });
      const wins = [];
      const ww = sp.win, wh = sp.win * 1.25, gapx = ww * (li === 0 ? 2.3 : 1.9), gapy = wh * (li === 0 ? 2.1 : 1.8);
      for (let wy = top + gapy * 0.6; wy < sp.base - wh; wy += gapy) {
        for (let wx = x + gapx * 0.55; wx < x + w - ww - 2; wx += gapx) {
          if (r() < 0.12) continue;
          const u = r();
          wins.push({ x: wx, y: wy, w: ww, h: wh, on: CUT + Math.floor(Math.pow(u, 0.9) * 105), d: 18 + Math.floor(r() * 70), g: 6 + Math.floor(r() * 36), warm: r() });
        }
      }
      bs.push({ sh, x, w, top, wins });
      x += w + (li === 2 ? 14 + r() * 40 : 2 + r() * 14);
    }
    layers.push({ ...sp, bs });
  });
  // our window: a warm one near the middle of the nearest row
  const near = layers[2].bs;
  const mine = near.reduce((a, b) => (Math.abs(b.x + b.w / 2 - 800) < Math.abs(a.x + a.w / 2 - 800) ? b : a));
  const target = mine.wins.reduce((a, b) => (Math.abs(b.y - 760) + Math.abs(b.x - 800) < Math.abs(a.y - 760) + Math.abs(a.x - 800) ? b : a), mine.wins[0]);
  if (target) { target.mine = true; target.on = 0; target.d = 9999; }

  const stars = [];
  for (let i = 0; i < 90; i++) stars.push([r() * 1600, r() * 520, 0.6 + r() * 1.6, r()]);
  const moon = disc(46, 400);
  S = { frame, painted, layers, stars, moon };
}

// The wall is only as big as what the camera can see (a huge blurred-shadow
// path is very slow), with our window cut out of it.
function wallAt(z) {
  const hw = 800 / z + 60, hh = 450 / z + 60;
  const p = new Path2D();
  toPath(rectPts(hw * 2, hh * 2, HOLE.x, HOLE.y), p);
  const hx0 = HOLE.x - HOLE.w / 2, hy0 = HOLE.y - HOLE.h / 2;
  toPath([[hx0, hy0], [hx0, hy0 + HOLE.h], [hx0 + HOLE.w, hy0 + HOLE.h], [hx0 + HOLE.w, hy0]], p);
  return { path: p };
}

function winOn(w, f) {
  if (w.mine) return true;
  if (f < w.on) return false;
  return (f - w.on) % (w.d + w.g) < w.d;
}

function partA(f) {
  const p = ease.inOut(seg(f, 2, CUT - 2));
  const z = Math.exp(lerp(Math.log(6.9), Math.log(1.25), p));
  withCam(HOLE.x, HOLE.y, z, () => {
    // inside: the desk, exactly as scene 4 left it
    R.ctx.save();
    R.ctx.beginPath();
    R.ctx.rect(HOLE.x - HOLE.w / 2, HOLE.y - HOLE.h / 2, HOLE.w, HOLE.h);
    R.ctx.clip();
    withLocal(HOLE.x - HOLE.w / 2, HOLE.y - HOLE.h / 2, HOLE.w / W, () => {
      withCam(850, 470, 1.05, () => {
        deskWithReply(999);
        lamp(1, { x: 830, y: 480, r: 780 });
      });
    });
    R.ctx.restore();
    // outside: the wall of the building, lit by the night
    const wall = wallAt(z);
    piece(wall, { lift: 18, color: '#5a4f68', tex: 'news', ts: 0.5, texA: 0.7, tx: 50, ty: 20, edge: 0.25 });
    piece(S.frame, { lift: 20, color: '#3a3346', tex: 'plain', edge: 0.3 });
    // night falls on the wall only (not into the room)
    R.ctx.save();
    R.ctx.clip(wall.path);
    R.ctx.globalCompositeOperation = 'multiply';
    R.ctx.fillStyle = '#6d74a6';
    R.ctx.fillRect(-4000, -3000, 9600, 7000);
    R.ctx.restore();
    // the neighbours' windows (lit ones glow on their own)
    const vw = 800 / z + 200, vh = 450 / z + 200;
    for (const pw of S.painted) {
      if (Math.abs(pw.x - HOLE.x) > vw || Math.abs(pw.y - HOLE.y) > vh) continue;
      const lit = pw.lit && f > pw.t;
      piece(pw.sh, {
        x: pw.x, y: pw.y, lift: 1, color: lit ? '#e9a95c' : '#232033', tex: 'plain', edge: 0.1, shadowK: 0.6,
        print: lit ? (c) => {
          // someone else's lamp, somewhere inside
          const g = c.createRadialGradient(hs('pl', pw.x) * 40, 10, 4, 0, 10, 130);
          g.addColorStop(0, 'rgba(255,236,190,0.95)');
          g.addColorStop(1, 'rgba(255,236,190,0)');
          c.globalCompositeOperation = 'screen';
          c.fillStyle = g;
          c.fillRect(-130, -80, 260, 160);
        } : null,
      });
    }
    // light spilling out of the room
    glow(HOLE.x, HOLE.y, HOLE.w * 0.9, '255,185,110', 0.22);
    for (const pw of S.painted) {
      if (Math.abs(pw.x - HOLE.x) > vw || Math.abs(pw.y - HOLE.y) > vh) continue;
      if (pw.lit && f > pw.t) glow(pw.x, pw.y, HOLE.w * 0.7, '255,190,110', 0.16);
    }
  });
}

function partB(f) {
  const q = ease.out(seg(f, CUT, 172));
  const z = lerp(1.14, 1.0, q);
  withCam(800, lerp(500, 470, q), z, () => {
    layer('nightsky', REGION, () => backdrop('#2b3360', 'tate', 1.4, { texA: 0.35, tx: 20, ty: 0 }));
    stillPiece('moon', S.moon, { x: 1330, y: 150, lift: 18, color: '#f2e9d2', tex: 'book', tx: 300, ty: 100, edge: 0.4 });
    S.layers.forEach((L, li) => {
      L.bs.forEach((b, bi) => stillPiece(`bld${li}.${bi}`, b.sh, { lift: L.lift, color: L.color, tex: L.tex, tx: b.x * 1.3, ty: b.top, edge: 0.18 }));
    });
    // moonlight
    R.ctx.save();
    R.ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
    R.ctx.globalCompositeOperation = 'multiply';
    const g = R.ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#a7b0de');
    g.addColorStop(1, '#4a4a70');
    R.ctx.fillStyle = g;
    R.ctx.fillRect(0, 0, W, H);
    R.ctx.restore();
    // self-lit things: moon glow, pinhole stars, windows
    glow(1330, 150, 150, '240,230,200', 0.2);
    const ctx = R.ctx;
    const starA = [new Path2D(), new Path2D(), new Path2D()];
    for (const [x, y, sz, tw] of S.stars) {
      const k = Math.floor(3 * hash('tw', Math.floor(tw * 1000), Math.floor(f / 2)));
      starA[k].moveTo(x + sz, y);
      starA[k].arc(x, y, sz, 0, Math.PI * 2);
      if (sz > 1.6 && k > 0) glow(x, y, sz * 6, '255,240,210', 0.2);
    }
    starA.forEach((path, k) => { ctx.fillStyle = `rgba(255,248,225,${0.45 + k * 0.27})`; ctx.fill(path); });
    // every lit window, batched by colour (thousands of little rectangles)
    const lit = { warm: new Path2D(), cool: new Path2D(), dim: new Path2D() };
    let mine = null;
    for (const L of S.layers) for (const b of L.bs) for (const w of b.wins) {
      if (!winOn(w, f)) continue;
      if (w.mine) { mine = w; continue; }
      const path = f - w.on < 2 ? lit.dim : w.warm > 0.3 ? lit.warm : lit.cool;
      path.rect(w.x, w.y, w.w, w.h);
    }
    ctx.fillStyle = 'rgba(255,206,122,0.92)';
    ctx.fill(lit.warm);
    ctx.fillStyle = 'rgba(214,226,255,0.9)';
    ctx.fill(lit.cool);
    ctx.fillStyle = 'rgba(255,206,122,0.5)';
    ctx.fill(lit.dim);
    if (mine) {
      ctx.fillStyle = 'rgba(255,170,90,1)';
      ctx.fillRect(mine.x, mine.y, mine.w, mine.h);
      glow(mine.x + mine.w / 2, mine.y + mine.h / 2, 60, '255,170,90', 0.5);
    }
    bloom(lit, mine);
  });
}

// The windows' glow: draw them again into two tiny canvases and stretch those
// back over the picture — the blur comes for free from the enlargement.
const BLOOM = [];
function bloom(lit, mine) {
  const ctx = R.ctx;
  const m = ctx.getTransform();
  for (const [i, div, a] of [[0, 6, 0.45], [1, 18, 0.7]]) {
    let c = BLOOM[i];
    if (!c) c = BLOOM[i] = document.createElement('canvas');
    const w = Math.ceil(R.canvas.width / div), h = Math.ceil(R.canvas.height / div);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(m.a / div, m.b / div, m.c / div, m.d / div, m.e / div, m.f / div);
    g.fillStyle = 'rgb(255,190,110)';
    g.fill(lit.warm);
    g.fillStyle = 'rgb(190,205,255)';
    g.fill(lit.cool);
    if (mine) { g.fillStyle = 'rgb(255,160,80)'; g.fillRect(mine.x - 4, mine.y - 4, mine.w + 8, mine.h + 8); }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.5;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, R.canvas.width, R.canvas.height);
    ctx.restore();
  }
}

export default {
  id: 's5',
  len: 172,
  mood: 'night',
  post: { vignette: 1 },
  caps: [
    { a: 46, b: 108, ...CAPS.s5[0] },
    { a: 112, b: 168, ...CAPS.s5[1] },
  ],
  draw(f) {
    if (!S) build();
    if (f < CUT) partA(f); else partB(f);
  },
  sfx(f, A) {
    if (!S) build();
    if (f === 2) A.rustle(1.2, 0.35);
    if (f === CUT) A.chime(['D6', 'A5'], 0.05, 0.15);
    if (f > CUT) {
      let n = 0;
      for (const L of S.layers) for (const b of L.bs) for (const w of b.wins) {
        if (L.win >= 10 && !w.mine && f >= w.on && (f - w.on) % (w.d + w.g) === 0) n++;
      }
      if (n > 0 && f % 2 === 0) A.bell(CHIME[(f * 7) % CHIME.length], 0.028 + Math.min(3, n) * 0.008);
    }
  },
};
