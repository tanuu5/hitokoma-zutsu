// render.js — the camera, the lights and the hands that place paper.
import { W, H, hash, hs, clamp, mix, canvas, boil, strHash } from './util.js';
import { TEX, TS, GRAIN, VIGNETTE } from './textures.js';
import { F } from './fonts.js';

export const R = {
  canvas: null,
  ctx: null,
  k: 1, // device pixels per virtual unit (no camera)
  px: 1, // device pixels per world unit under the current camera
  lang: 'ja', // caption language: ja | en | both
  reduced: false,
  frame: 0,
  pats: new Map(),
  dbg: {},
  stats: { bakes: 0 },
};
export const vlang = () => (R.lang === 'en' ? 'en' : 'ja');

export function setup(cv) {
  R.canvas = cv;
  R.ctx = cv.getContext('2d', { alpha: false });
}

export function resize(cssW, cssH, dpr) {
  const bw = Math.min(Math.round(cssW * dpr), 1920);
  const bh = Math.round((bw * H) / W);
  if (R.canvas.width !== bw || R.canvas.height !== bh) {
    R.canvas.width = bw;
    R.canvas.height = bh;
  }
  R.k = bw / W;
}

const PATS = new WeakMap();
function pat(name) {
  let m = PATS.get(R.ctx);
  if (!m) { m = new Map(); PATS.set(R.ctx, m); }
  let p = m.get(name);
  if (!p) {
    p = R.ctx.createPattern(TEX[name], 'repeat');
    m.set(name, p);
  }
  return p;
}
function setPat(p, tx, ty, ts, tr) {
  try {
    let m = new DOMMatrix().translateSelf(tx, ty);
    if (tr) m = m.rotateSelf(tr);
    if (ts !== 1) m = m.scaleSelf(ts, ts);
    p.setTransform(m);
  } catch (e) { /* very old browsers: texture simply stays unaligned */ }
}

// ---------------------------------------------------------------------------
// Frame & camera

export function beginFrame(g) {
  const ctx = R.ctx;
  R.frame = g;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a090c';
  ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
  // Gate weave: the whole picture shifts by a hair each frame.
  const wx = R.reduced ? 0 : hs(g, 'weave-x') * 0.55;
  const wy = R.reduced ? 0 : hs(g, 'weave-y') * 0.55;
  ctx.setTransform(R.k, 0, 0, R.k, wx * R.k, wy * R.k);
  R.px = R.k;
}

// Camera looks at world point (cx, cy) with zoom z. Everything drawn inside fn
// is in world units.
export function withCam(cx, cy, z, fn) {
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
  const px = R.px;
  R.px = px * z;
  fn();
  R.px = px;
  ctx.restore();
}

// Nested local transform that also scales shadows (for scenes shown inside scenes).
export function withLocal(x, y, s, fn) {
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const px = R.px;
  R.px = px * s;
  fn();
  R.px = px;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Shadows — the key light hangs above, a little to the upper left.

const LX = 0.5, LY = 0.86;

function shadow(ctx, lift, strength = 1) {
  const px = R.px;
  ctx.shadowColor = `rgba(20,12,8,${clamp(0.52 - lift * 0.0035, 0.2, 0.52) * strength})`;
  ctx.shadowBlur = Math.min(90, (1.4 + lift * 0.85) * px);
  ctx.shadowOffsetX = Math.min(200, lift * LX * px);
  ctx.shadowOffsetY = Math.min(260, lift * LY * px);
}
// A crisp, unblurred sliver of shadow right at the paper's edge (cheap: no blur).
function contact(ctx, strength = 1) {
  const px = R.px;
  ctx.shadowColor = `rgba(18,10,6,${0.34 * strength})`;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0.7 * px;
  ctx.shadowOffsetY = 1.1 * px;
}
function noShadow(ctx) {
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ---------------------------------------------------------------------------
// A paper piece.
//   sh: { path } from cut.js (local coordinates)
//   o:  x, y, r, s, sx, sy, lift, color, tex, ts, tx, ty, tr, alpha,
//       edge (highlight strength), shade (0..1 darkening), print(ctx) callback

export function piece(sh, o = {}) {
  const ctx = R.ctx;
  const {
    x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, lift = 2, color = '#efe6d3', tex = 'plain',
    ts = 1, tx = 0, ty = 0, tr = 0, alpha = 1, edge = 0.32, shade = 0, print = null, shadowK = 1, texA = 1,
  } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (s !== 1 || sx !== 1 || sy !== 1) ctx.scale(s * sx, s * sy);
  if (alpha < 1) ctx.globalAlpha = alpha;

  ctx.fillStyle = color;
  if (lift > 0 && shadowK > 0 && !R.dbg.noShadow) {
    if (lift < 30) { contact(ctx, shadowK); ctx.fill(sh.path); }
    shadow(ctx, lift, shadowK);
  }
  ctx.fill(sh.path);
  noShadow(ctx);

  if (tex && !R.dbg.noTex) {
    const p = pat(tex);
    setPat(p, tx, ty, ts, tr);
    ctx.globalCompositeOperation = 'multiply';
    if (texA < 1) ctx.globalAlpha = alpha * texA;
    ctx.fillStyle = p;
    ctx.fill(sh.path);
    ctx.globalAlpha = alpha;
  }
  if (shade > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(70,60,80,${shade})`;
    ctx.fill(sh.path);
  }
  ctx.globalCompositeOperation = 'source-over';
  if (print) {
    ctx.save();
    ctx.clip(sh.path);
    print(ctx);
    ctx.restore();
  }
  if (edge > 0 && !R.dbg.noEdge) {
    // Paper thickness catching the light on the upper-left edges.
    ctx.save();
    ctx.clip(sh.path);
    const sc = Math.max(0.2, s * Math.max(sx, sy));
    ctx.translate(0.9 / sc, 1.2 / sc);
    ctx.lineWidth = 2.2 / sc;
    ctx.strokeStyle = `rgba(255,251,240,${edge})`;
    ctx.stroke(sh.path);
    ctx.restore();
  }
  ctx.restore();
}

// Print text onto a piece (inside a print callback). Ink multiplies with paper.
export function ink(ctx, text, x, y, font, color = 'rgba(40,32,28,0.92)', align = 'center') {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Sprites: pre-cut pieces that are too fussy to cut every frame (letters).

export function letterSprite(ch, o = {}) {
  const { font = `900 150px ${F.mincho}`, color = '#efe3c8', tex = 'book', ts = 0.7, seed = 1, grow = 2.5 } = o;
  const m = canvas(4, 4).getContext('2d');
  m.font = font;
  const met = m.measureText(ch);
  const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  const pad = Math.ceil(size * 0.12);
  const w = Math.ceil(met.width + pad * 2), h = Math.ceil(size * 1.3 + pad * 2);
  const SS = 2;
  const mask = canvas(w * SS, h * SS), mg = mask.getContext('2d');
  mg.scale(SS, SS);
  mg.font = font;
  mg.textAlign = 'center';
  mg.textBaseline = 'middle';
  mg.fillStyle = '#000';
  mg.strokeStyle = '#000';
  mg.lineJoin = 'round';
  mg.lineWidth = grow;
  mg.fillText(ch, w / 2, h / 2 + size * 0.04);
  mg.strokeText(ch, w / 2, h / 2 + size * 0.04);
  return { img: cutFromMask(mask, color, tex, w, h, SS, seed, ts), w, h };
}

// Colour + texture inside a mask, plus a light rim on the upper-left edges.
export function cutFromMask(mask, color, tex, w, h, SS, seed, ts) {
  const c = canvas(w * SS, h * SS), g = c.getContext('2d');
  g.save();
  g.scale(SS, SS);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const p = g.createPattern(TEX[tex], 'repeat');
  setPat(p, -hash(seed, 1) * TS, -hash(seed, 2) * TS, ts, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = p;
  g.fillRect(0, 0, w, h);
  g.restore();
  // rim light: mask minus mask shifted toward lower-right
  const rim = canvas(w * SS, h * SS), rg = rim.getContext('2d');
  rg.drawImage(mask, 0, 0);
  rg.globalCompositeOperation = 'destination-out';
  rg.drawImage(mask, 1.6 * SS, 2.2 * SS);
  rg.globalCompositeOperation = 'source-in';
  rg.fillStyle = 'rgba(255,250,238,0.55)';
  rg.fillRect(0, 0, w * SS, h * SS);
  g.drawImage(rim, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);
  return c;
}

export function sprite(sp, o = {}) {
  const ctx = R.ctx;
  const { x = 0, y = 0, r = 0, s = 1, lift = 3, alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (s !== 1) ctx.scale(s, s);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (lift > 0) {
    if (lift < 30) { contact(ctx); ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h); }
    shadow(ctx, lift);
  }
  ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  noShadow(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The paper that stays put. A still piece is cut, printed and shadowed once,
// kept as an image, and simply set back down on later frames — which is also
// how a stop-motion set works. Only the pieces being moved are re-cut.

const SPR = new Map();
let sprPx = 0;
const SPR_BUDGET = 34e6; // device pixels kept (at most ~130 MB on a 1920px canvas, far less on phones)
export const REGION = [-170, -170, 1770, 1070]; // the part of the table the camera can see

export const spriteStats = () => ({ n: SPR.size, px: sprPx });
function evict() {
  if (sprPx <= SPR_BUDGET) return;
  const list = [...SPR.entries()].sort((a, b) => a[1].used - b[1].used);
  for (const [k, sp] of list) {
    if (sprPx <= SPR_BUDGET * 0.8) break;
    SPR.delete(k);
    sprPx -= sp.px;
  }
}

function bake(bounds, fn, q) {
  const x0 = Math.max(bounds[0], REGION[0]), y0 = Math.max(bounds[1], REGION[1]);
  const x1 = Math.min(bounds[2], REGION[2]), y1 = Math.min(bounds[3], REGION[3]);
  if (x1 <= x0 || y1 <= y0) return { empty: true, px: 0, q, used: 0 };
  q = Math.min(q, 4096 / (x1 - x0), 4096 / (y1 - y0));
  const cw = Math.ceil((x1 - x0) * q), ch = Math.ceil((y1 - y0) * q);
  const cv = canvas(cw, ch), g = cv.getContext('2d');
  g.setTransform(q, 0, 0, q, -x0 * q, -y0 * q);
  const sc = R.ctx, sp = R.px;
  R.ctx = g;
  R.px = q;
  try { fn(); } finally { R.ctx = sc; R.px = sp; }
  R.stats.bakes++;
  return { img: cv, x0, y0, w: cw / q, h: ch / q, q, px: cw * ch, used: 0 };
}

// Draw whatever fn() draws (world coordinates, inside bounds) from a cached image.
// o: dx, dy (nudge), rot + ax, ay (turn around a point), shadowLift (cast a live shadow)
export function layer(key, bounds, fn, o = {}) {
  if (R.dbg.noCache) { fn(); return; }
  const need = R.px;
  let sp = SPR.get(key);
  const res = o.res || 1.12; // backdrops with no fine detail keep a lower resolution
  if (!sp || sp.q < need * res * 0.8) {
    if (sp) { SPR.delete(key); sprPx -= sp.px; }
    sp = bake(bounds, fn, Math.min(need * res, 3.2));
    SPR.set(key, sp);
    sprPx += sp.px;
    evict();
  }
  sp.used = R.frame;
  if (sp.empty) return;
  const ctx = R.ctx;
  const { dx = 0, dy = 0, rot = 0, ax = 0, ay = 0, shadowLift = 0, alpha = 1 } = o;
  if (rot || shadowLift || alpha < 1) {
    ctx.save();
    ctx.translate(ax + dx, ay + dy);
    if (rot) ctx.rotate(rot);
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (shadowLift) shadow(ctx, shadowLift);
    ctx.drawImage(sp.img, sp.x0 - ax, sp.y0 - ay, sp.w, sp.h);
    ctx.restore();
  } else {
    ctx.drawImage(sp.img, sp.x0 + dx, sp.y0 + dy, sp.w, sp.h);
  }
}

function pieceBounds(sh, o) {
  const b = sh.b;
  if (!b) return REGION;
  const { x = 0, y = 0, r = 0, s = 1, sx = 1, sy = 1, lift = 2 } = o;
  const c = Math.cos(r), sn = Math.sin(r);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]) {
    const X = px * s * sx, Y = py * s * sy;
    const wx = x + X * c - Y * sn, wy = y + X * sn + Y * c;
    x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); x1 = Math.max(x1, wx); y1 = Math.max(y1, wy);
  }
  const m = 3 + (1.4 + lift * 0.85) * 1.4;
  return [x0 - m, y0 - m, x1 + m + lift * LX, y1 + m + lift * LY];
}

// A piece that is not being moved right now. dx/dy/rot nudge the finished piece.
// liveShadow: bake the paper alone and cast its shadow each frame (for pieces that turn).
export function stillPiece(key, sh, o = {}) {
  const { dx = 0, dy = 0, rot = 0, liveShadow = false, alpha = 1 } = o;
  const bakeO = liveShadow ? { ...o, lift: 0, alpha: 1 } : { ...o, alpha: 1 };
  layer(key, pieceBounds(sh, o), () => piece(sh, bakeO), {
    dx, dy, rot, ax: o.x || 0, ay: o.y || 0, shadowLift: liveShadow ? o.lift || 0 : 0, alpha,
  });
}

// ---------------------------------------------------------------------------
// Backdrop: a big sheet on the table.

export function backdrop(color, tex = 'plain', ts = 1.2, o = {}) {
  const ctx = R.ctx;
  const { x0 = -2400, y0 = -2400, w = 6400, h = 5700, tx = 0, ty = 0, texA = 1 } = o;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, w, h);
  if (tex) {
    const p = pat(tex);
    setPat(p, tx, ty, ts, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = texA;
    ctx.fillStyle = p;
    ctx.fillRect(x0, y0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------------------------------------------------------------------------
// Thread (red yarn) between two points, partly laid down (progress 0..1).

export function threadPts(x0, y0, x1, y1, seed, sag = 0.18) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bow = hs(seed, 'bow') * sag * len;
  const cx = (x0 + x1) / 2 + nx * bow, cy = (y0 + y1) / 2 + ny * bow;
  const n = Math.max(8, Math.round(len / 14));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const wob = i === 0 || i === n ? 0 : hs(seed, i) * 1.6;
    pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1 + nx * wob, u * u * y0 + 2 * u * t * cy + t * t * y1 + ny * wob]);
  }
  return pts;
}

export function thread(pts, progress = 1, o = {}) {
  if (progress <= 0) return;
  const ctx = R.ctx;
  const { width = 2.4, color = '#b3342b', lift = 3, alpha = 1 } = o;
  const n = pts.length - 1;
  const upto = progress * n;
  const k = Math.floor(upto);
  const path = new Path2D();
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= k; i++) path.lineTo(pts[i][0], pts[i][1]);
  if (k < n) {
    const t = upto - k;
    path.lineTo(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t);
  }
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // a hard, offset shadow (a blurred one over a long diagonal is costly)
  ctx.save();
  ctx.translate(lift * LX * 0.8, lift * LY * 0.8);
  ctx.strokeStyle = 'rgba(20,10,8,0.28)';
  ctx.lineWidth = width * 1.3;
  ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(path);
  // twist of the yarn
  ctx.setLineDash([1.6, 2.6]);
  ctx.lineWidth = width * 0.55;
  ctx.strokeStyle = 'rgba(255,200,180,0.35)';
  ctx.stroke(path);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Light.

// Multiply the frame by a pool of lamp light (world coordinates).
export function lamp(on, o = {}) {
  const ctx = R.ctx;
  const { x = 800, y = 430, r = 700, dark = '#0b0a0e', mid = '#9a8274', edge = '#1c161e', core = '#fff6e8', bloom = 0.15 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  if (on <= 0.001) {
    ctx.fillStyle = dark;
    ctx.fillRect(-4000, -4000, 9600, 8900);
  } else {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, mix(dark, core, on));
    g.addColorStop(0.5, mix(dark, '#f6e2c4', on));
    g.addColorStop(0.72, mix(dark, mid, on));
    g.addColorStop(0.9, mix(dark, '#3c3038', on));
    g.addColorStop(1, mix(dark, edge, on));
    ctx.fillStyle = g;
    ctx.fillRect(-4000, -4000, 9600, 8900);
    if (bloom > 0) {
      ctx.globalCompositeOperation = 'screen';
      const b = ctx.createRadialGradient(x, y, 0, x, y, r * 0.75);
      b.addColorStop(0, `rgba(255,178,105,${bloom * on})`);
      b.addColorStop(1, 'rgba(255,178,105,0)');
      ctx.fillStyle = b;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}

// Soft daylight wash for the paper landscape (screen coordinates).
export function daylight(o = {}) {
  const ctx = R.ctx;
  const { top = '#fffaf0', bottom = '#e9dccb', warm = 0, dim = 0 } = o;
  ctx.save();
  ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (warm > 0) {
    const g2 = ctx.createLinearGradient(0, 0, 0, H);
    g2.addColorStop(0, mix('#ffffff', '#ffb77a', warm));
    g2.addColorStop(1, mix('#ffffff', '#b36a6a', warm));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }
  if (dim > 0) {
    ctx.fillStyle = mix('#ffffff', '#2a2440', dim);
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// Evening light: blue-violet above, warm at the horizon, cool over the sea.
export function duskLight(k, dim = 0, sun = null) {
  const ctx = R.ctx;
  ctx.save();
  ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#fffaf0', '#8a90c6', k));
  g.addColorStop(0.24, mix('#fffaf0', '#d9a3aa', k));
  g.addColorStop(0.42, mix('#fffaf0', '#ffc389', k));
  g.addColorStop(0.68, mix('#f3e6d8', '#c08f8c', k));
  g.addColorStop(1, mix('#eadccc', '#5b5e8e', k));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (dim > 0) {
    ctx.fillStyle = mix('#ffffff', '#3b3658', dim);
    ctx.fillRect(0, 0, W, H);
  }
  if (sun) {
    ctx.globalCompositeOperation = 'screen';
    const s = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 520);
    s.addColorStop(0, `rgba(255,150,80,${0.22 * k})`);
    s.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// Glow of something self-lit (window, star) drawn after the light pass.
// A small pre-drawn halo per colour, added on top (additive blending is cheap).
const GLOWS = new Map();
function halo(color) {
  let c = GLOWS.get(color);
  if (!c) {
    c = canvas(96, 96);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, `rgba(${color},1)`);
    gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 96, 96);
    GLOWS.set(color, c);
  }
  return c;
}
export function glow(x, y, r, color = '255,196,110', a = 0.5) {
  const ctx = R.ctx;
  const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a * 0.75);
  ctx.drawImage(halo(color), x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = prevOp;
  ctx.globalAlpha = prevA;
}

// ---------------------------------------------------------------------------
// Post: exposure flicker, vignette, film grain.

export function post(g, o = {}) {
  const ctx = R.ctx;
  const { flicker = 1, vignette = 1, grain = 0.085 } = o;
  ctx.save();
  ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
  if (!R.reduced && flicker > 0) {
    let a = 0.012 + hash(g, 'exp') * 0.032;
    if (hash(g, 'exp2') > 0.94) a += 0.035;
    ctx.fillStyle = `rgba(12,8,6,${a * flicker})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (vignette > 0 && VIGNETTE) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = vignette;
    ctx.drawImage(VIGNETTE, -6, -4, W + 12, H + 8);
    ctx.globalAlpha = 1;
  }
  if (grain > 0 && GRAIN.length) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grain;
    const gi = ((g % GRAIN.length) + GRAIN.length) % GRAIN.length;
    const key = 'grain' + gi;
    let p = R.pats.get(key);
    if (!p) { p = ctx.createPattern(GRAIN[gi], 'repeat'); R.pats.set(key, p); }
    setPat(p, hash(g, 'gx') * 256, hash(g, 'gy') * 256, 1, 0);
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Captions: a strip of paper with words typed onto it, one per frame.

const capShapes = new Map();

function wrapCap(text) { return text ? text.split('\n') : []; }

export function caption(cap, lf, onShow) {
  const t = lf - cap.a;
  if (t < 0 || lf > cap.b + 2 || R.lang === 'off') return;
  const ctx = R.ctx;
  const showJa = R.lang === 'ja' || R.lang === 'both';
  const showEn = R.lang === 'en' || R.lang === 'both';
  const ja = showJa ? wrapCap(cap.ja) : [];
  const en = showEn ? wrapCap(cap.en) : [];
  const jaFont = `600 ${ja.some((l) => l.length > 30) ? 28 : 31}px ${F.hand}`;
  const enFont = showJa ? `italic 400 23px ${F.garamond}` : `italic 400 33px ${F.garamond}`;
  const jaLH = 46, enLH = showJa ? 30 : 42;

  ctx.save();
  ctx.setTransform(R.k, 0, 0, R.k, 0, 0);
  ctx.font = jaFont;
  let wMax = 0;
  for (const l of ja) wMax = Math.max(wMax, ctx.measureText(l).width);
  ctx.font = enFont;
  for (const l of en) wMax = Math.max(wMax, ctx.measureText(l).width);
  const padX = 46, padY = 24;
  const sw = Math.min(W - 60, wMax + padX * 2);
  const sh = ja.length * jaLH + en.length * enLH + padY * 2 - (en.length && ja.length ? 4 : 10);

  const key = `${R.lang}|${cap.ja}|${Math.round(sw)}|${Math.round(sh)}`;
  let shape = capShapes.get(key);
  if (!shape) {
    const seed = strHash(key) & 0xffff;
    const hw = sw / 2, hh = sh / 2;
    const p = new Path2D();
    const pts = [];
    // a torn strip: straight-ish top and bottom, ragged ends
    const n = 18;
    for (let i = 0; i <= n; i++) pts.push([-hw + (sw * i) / n, -hh + hs(seed, i) * 1.2]);
    for (let i = 0; i <= 6; i++) pts.push([hw + hs(seed, 'r', i) * 4, -hh + (sh * i) / 6]);
    for (let i = n; i >= 0; i--) pts.push([-hw + (sw * i) / n, hh + hs(seed, 'b', i) * 1.2]);
    for (let i = 6; i >= 0; i--) pts.push([-hw + hs(seed, 'l', i) * 4, -hh + (sh * i) / 6]);
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    shape = { path: p, b: { x0: -hw - 6, y0: -hh - 3, x1: hw + 6, y1: hh + 3 } };
    capShapes.set(key, shape);
  }

  // Typed text: one character per frame (Japanese), about two per frame (English).
  const typeText = (c) => {
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    let y = -sh / 2 + padY + jaLH / 2 - 2;
    let budget = Math.max(0, t - 1);
    c.font = jaFont;
    c.fillStyle = '#2b221c';
    for (const l of ja) {
      const chars = [...l];
      const shown = chars.slice(0, Math.max(0, Math.min(chars.length, budget))).join('');
      budget -= chars.length;
      // left edge of the finished line, so the text does not slide while typing
      if (shown) c.fillText(shown, -c.measureText(l).width / 2, y);
      y += jaLH;
    }
    let enBudget = Math.max(0, (t - 1) * (showJa ? 2.2 : 2));
    c.font = enFont;
    c.fillStyle = showJa ? '#4a3f37' : '#2b221c';
    if (ja.length) y += (enLH - jaLH) / 2;
    else y = -sh / 2 + padY + enLH / 2 - 2;
    for (const l of en) {
      const shown = l.slice(0, Math.max(0, Math.min(l.length, Math.floor(enBudget))));
      enBudget -= l.length;
      if (shown) c.fillText(shown, -c.measureText(l).width / 2, y);
      y += enLH;
    }
  };

  // enter / exit
  let dy = 0, lift = 3, s = 1;
  const out = lf - cap.b;
  const moving = t < 3 || out > 0;
  if (t < 3) { dy = [22, 8, 2][t]; lift = [26, 12, 5][t]; s = [1.04, 1.015, 1][t]; }
  if (out > 0) { dy = [-10, -26][out - 1]; lift = [18, 40][out - 1]; s = [1.02, 1.05][out - 1]; }
  const [bx, by, br] = boil('cap' + cap.a, lf, 0.35);
  const tilt = hs(cap.a, 'tilt') * 0.006;
  const cx = W / 2, cy = H - 30 - sh / 2;
  R.px = R.k;
  const paper = { color: '#f4ebd9', tex: 'plain', tx: hash(cap.a) * 900, ty: 40, edge: 0.25 };
  if (moving) {
    piece(shape, { ...paper, x: cx + bx, y: cy + dy + by, r: br + tilt, s, lift, print: typeText });
  } else {
    stillPiece('cap|' + key, shape, { ...paper, x: cx, y: cy, r: tilt, lift: 3, dx: bx, dy: by, rot: br });
    ctx.translate(cx + bx, cy + by);
    ctx.rotate(br + tilt);
    typeText(ctx);
  }
  ctx.restore();
  if (t === 0 && onShow) onShow(cap);
}
