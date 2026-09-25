// cut.js — turning ideal outlines into things cut by hand.
import { rng } from './util.js';

export function toPath(pts, path = new Path2D()) {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

// Scissor-cut irregularity: every edge wanders a little and every
// corner is placed a little off.
export function rough(pts, seed, o = {}) {
  const { jag = 0.45, wander = 1.2, step = 10, corner = 0.6, closed = true } = o;
  const r = rng(seed);
  const out = [];
  const n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const k = Math.max(1, Math.round(len / step));
    const amp = (r() * 2 - 1) * wander * Math.min(1, len / 80);
    for (let j = 0; j < k; j++) {
      const t = j / k;
      if (j === 0) {
        out.push([x0 + (r() * 2 - 1) * corner, y0 + (r() * 2 - 1) * corner]);
      } else {
        const off = amp * Math.sin(Math.PI * t) + (r() * 2 - 1) * jag;
        out.push([x0 + dx * t + nx * off, y0 + dy * t + ny * off]);
      }
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// Catmull-Rom spline through points -> dense polyline.
export function smooth(pts, closed = true, per = 8) {
  const out = [];
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

export function rectPts(w, h, cx = 0, cy = 0) {
  return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
}

export function ellipsePts(rx, ry, n = 48, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function bounds(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

// A cut shape: rough outline + Path2D. Several outlines can be merged into
// one piece (e.g. fingers glued to a palm).
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

export function cutShape(outlines, seed, o = {}) {
  const list = Array.isArray(outlines[0][0]) ? outlines : [outlines];
  const path = new Path2D();
  const all = [];
  list.forEach((pts, i) => {
    // same winding for every outline, so overlapping parts glue together
    // instead of cancelling into holes
    const src = signedArea(pts) < 0 ? [...pts].reverse() : pts;
    const p = o.raw ? src : rough(src, seed * 31 + i, o);
    toPath(p, path);
    all.push(...p);
  });
  return { path, pts: all, b: bounds(all) };
}

// Circle-ish cut (knife around a jar lid).
export function disc(r, seed, o = {}) {
  const n = Math.max(28, Math.round(r * 0.7));
  return cutShape(ellipsePts(r, o.ry || r, n), seed, { jag: 0, wander: 0, step: 999, corner: o.corner ?? Math.min(1.2, r * 0.02) });
}

export function rect(w, h, seed, o = {}) {
  return cutShape(rectPts(w, h, o.cx || 0, o.cy || 0), seed, { jag: 0.4, wander: 1, step: 12, corner: 0.7, ...o });
}
