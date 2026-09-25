// common.js — the desk and the things that live on it: the note, the reply.
import { R, piece, backdrop, ink, vlang, layer, stillPiece, REGION } from './render.js';
import { rng, hs, boil, canvas } from './util.js';
import { cutShape, rectPts, rough, toPath, bounds } from './cut.js';
import { F } from './fonts.js';
import { NOTE, REPLY, GLUE, KEY_WORD } from './text.js';
import { craneShape } from './shapes.js';

// ---------------------------------------------------------------------------
// Desk: a sheet of dark paper with offcuts from earlier cutting.

let deskParts = null;
function buildDesk() {
  const r = rng(4242);
  const colors = ['#d4693f', '#dcae5a', '#86a9bb', '#9db087', '#efe6d3', '#b98e5f', '#c9b8d6'];
  const texs = ['book', 'news', 'letter', 'multi', 'tate', 'code'];
  const spots = [
    [70, 90], [210, 40], [1450, 70], [1540, 210], [60, 520], [120, 800], [1520, 640], [360, 860], [1280, 860], [1560, 420], [760, 40], [40, 300],
  ];
  const scraps = spots.map(([x, y], i) => {
    const kind = i % 4;
    let pts;
    if (kind === 0) pts = [[-40, -20], [46, -8], [-10, 34]];
    else if (kind === 1) pts = rectPts(120 + r() * 80, 10 + r() * 8);
    else if (kind === 2) pts = [[-30, -30], [34, -26], [26, 30], [-34, 22], [-20, 0]];
    else pts = [[-50, -12], [50, -18], [44, 14], [-46, 10]];
    return {
      sh: cutShape(pts, 50 + i, { jag: 0.5, wander: 1.5, step: 12, corner: 0.8 }),
      x, y, r: (r() - 0.5) * 2.4, color: colors[i % colors.length], tex: texs[i % texs.length],
      tx: r() * 1000, ty: r() * 1000,
    };
  });
  // a disc offcut: a square with a round hole where a sun was cut out
  const holed = new Path2D();
  toPath(rough(rectPts(150, 150), 77, { jag: 0.4, wander: 1, step: 12 }), holed);
  const circle = [];
  for (let i = 0; i < 40; i++) {
    const a = -(i / 40) * Math.PI * 2;
    circle.push([Math.cos(a) * 52 + 6, Math.sin(a) * 52 + 4]);
  }
  toPath(circle, holed);
  scraps.push({ sh: { path: holed, b: { x0: -80, y0: -80, x1: 80, y1: 80 } }, x: 1460, y: 800, r: 0.3, color: '#d4693f', tex: 'news', tx: 30, ty: 60 });
  // pencil
  const pencil = {
    body: cutShape(rectPts(250, 18, 0, 0), 91, { jag: 0.2, wander: 0.3 }),
    wood: cutShape([[125, -9], [168, 0], [125, 9]], 92, { jag: 0.2, wander: 0.2 }),
    lead: cutShape([[156, -2.6], [170, 0], [156, 2.6]], 93, { jag: 0.1, wander: 0 }),
    band: cutShape(rectPts(14, 19, -130, 0), 94, { jag: 0.1, wander: 0.2 }),
    eraser: cutShape(rectPts(22, 17, -147, 0), 95, { jag: 0.2, wander: 0.3 }),
  };
  deskParts = { scraps, pencil };
}

// The table never moves: every piece on it is cut once and then just put back each frame.
export function desk() {
  if (!deskParts) buildDesk();
  layer('desk', REGION, () => backdrop('#4a4352', 'washi', 1.3, { tx: 120, ty: 40 }), { res: 0.62 });
  deskParts.scraps.forEach((s, i) =>
    stillPiece('scrap' + i, s.sh, { x: s.x, y: s.y, r: s.r, lift: 1.5, color: s.color, tex: s.tex, tx: s.tx, ty: s.ty, edge: 0.25 }));
  const p = deskParts.pencil;
  const base = { x: 1330, y: 740, r: -0.42, lift: 4 };
  stillPiece('pencil-body', p.body, { ...base, color: '#e2a83e', tex: 'plain', edge: 0.4, print: (c) => { c.fillStyle = 'rgba(120,70,20,0.25)'; c.fillRect(-125, -1, 250, 2); } });
  stillPiece('pencil-wood', p.wood, { ...base, color: '#dcbc92', tex: 'plain' });
  stillPiece('pencil-lead', p.lead, { ...base, color: '#3a3632', tex: null, edge: 0.3 });
  stillPiece('pencil-band', p.band, { ...base, color: '#b9b3a4', tex: 'plain', edge: 0.5 });
  stillPiece('pencil-eraser', p.eraser, { ...base, color: '#d98080', tex: 'plain' });
}

// ---------------------------------------------------------------------------
// The note (a page torn from a notebook).

const NW = 600, NH = 420;
const noteCache = {};

function buildNote(lang) {
  const topEdge = [];
  const r = rng(lang === 'ja' ? 7 : 8);
  for (let i = 0; i <= 60; i++) topEdge.push([-NW / 2 + (NW * i) / 60, -NH / 2 + (r() - 0.5) * 5 + Math.sin(i * 0.7) * 1.4]);
  const right = rough([[NW / 2, -NH / 2], [NW / 2, NH / 2]], 3, { closed: false, jag: 0.3, wander: 1 });
  const bottom = rough([[NW / 2, NH / 2], [-NW / 2, NH / 2]], 4, { closed: false, jag: 0.3, wander: 1 });
  const left = rough([[-NW / 2, NH / 2], [-NW / 2, -NH / 2]], 5, { closed: false, jag: 0.3, wander: 1 });
  const fullPts = [...topEdge, ...right.slice(1), ...bottom.slice(1), ...left.slice(1, -1)];
  const full = { path: toPath(fullPts), pts: fullPts, b: bounds(fullPts) };
  const upperPts = [...topEdge, [NW / 2, -NH / 2], [NW / 2 + 0.5, 0], [-NW / 2 - 0.5, 0]];
  const upper = { path: toPath(upperPts) };
  const lowerPts = [[-NW / 2 - 0.5, 0], [NW / 2 + 0.5, 0], ...right.slice(Math.floor(right.length / 2)), ...bottom.slice(1), [-NW / 2, NH / 2 - 2]];
  const lower = { path: toPath(lowerPts) };

  // word layout
  const font = `400 ${lang === 'ja' ? 50 : 46}px ${F.hand}`;
  const m = canvas(4, 4).getContext('2d');
  m.font = font;
  const space = lang === 'ja' ? 0 : m.measureText(' ').width;
  const baselines = [-105, -35, 35];
  const words = [];
  NOTE[lang].forEach((line, li) => {
    let x = -NW / 2 + 92 + li * 6;
    line.forEach((w) => {
      const wd = m.measureText(w).width;
      words.push({ text: w, x, cx: x + wd / 2, y: baselines[li] - 4, cy: baselines[li] - 20, w: wd, line: li, key: w.replace(/[^\p{L}]/gu, '') === KEY_WORD[lang] });
      x += wd + space;
    });
  });
  return { full, upper, lower, words, font };
}
export function noteData(lang = vlang()) {
  return (noteCache[lang] ||= buildNote(lang));
}

function ruled(c, y0, y1) {
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = 'rgba(110,145,190,0.45)';
  for (let y = -NH / 2 + 35; y < NH / 2; y += 70) if (y > y0 && y < y1) c.fillRect(-NW / 2, y, NW, 1.6);
  c.fillStyle = 'rgba(210,90,76,0.5)';
  c.fillRect(-NW / 2 + 62, y0, 1.8, y1 - y0);
  c.restore();
}

function writeWords(c, N, filter, hide) {
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.font = N.font;
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(32,40,78,0.9)';
  N.words.forEach((w, i) => {
    if (!filter(w) || (hide && hide.has(i))) return;
    c.save();
    c.translate(w.x, w.y);
    c.rotate(hs('nw', i) * 0.02);
    c.fillText(w.text, 0, 0);
    c.restore();
  });
  c.restore();
}

// stage: 0 folded, 1 opening (flap up-ish), 2 nearly open, 3 open
export function note(o = {}) {
  if (o.still) {
    const { x = 800, y = 430, s = 1, stage = 3 } = o;
    const m = 30 + 420 * s;
    layer(`note|${vlang()}|${x}|${y}|${o.r}|${s}|${stage}|${o.lift}`, [x - m, y - m, x + m, y + m], () => drawNote({ ...o, still: false }));
    return;
  }
  drawNote(o);
}
function drawNote(o) {
  const { x = 800, y = 430, r = 0, s = 1, stage = 3, lift = 2, hide = null, alpha = 1 } = o;
  const N = noteData();
  const paper = { color: '#f6f0e2', tex: 'plain', tx: 300, ty: 180, alpha };
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.scale(s, s);
  if (stage >= 3) {
    piece(N.full, { ...paper, lift, print: (c) => { ruled(c, -NH / 2, NH / 2); writeWords(c, N, () => true, hide); } });
  } else {
    if (stage >= 1) piece(N.lower, { ...paper, lift, print: (c) => { ruled(c, 0, NH / 2); writeWords(c, N, (w) => w.line === 2, hide); } });
    if (stage === 0) piece(N.upper, { ...paper, sy: -1, lift, ty: 60, edge: 0.2, print: (c) => ruledBack(c) });
    if (stage === 1) piece(N.upper, { ...paper, sy: -0.52, lift: lift + 16, ty: 60, shade: 0.04, print: (c) => ruledBack(c) });
    if (stage === 2) piece(N.upper, { ...paper, sy: 0.5, lift: lift + 16, shade: 0.16, print: (c) => { ruled(c, -NH / 2, 0); writeWords(c, N, (w) => w.line < 2, hide); } });
  }
  ctx.restore();
}
function ruledBack(c) {
  // lines showing through from the other side, faintly
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = 'rgba(110,145,190,0.14)';
  for (let y = -NH / 2 + 35; y < 0; y += 70) c.fillRect(-NW / 2, y, NW, 1.4);
  c.restore();
}

// A word cut out of the note (for the thread scene).
const tileCache = {};
export function noteTiles(lang = vlang()) {
  if (tileCache[lang]) return tileCache[lang];
  const N = noteData(lang);
  const tiles = N.words.map((w, i) => {
    const tw = w.w + 34, th = 80;
    const sh = cutShape(rectPts(tw, th), 300 + i, { jag: 0.7, wander: 1.4, step: 10, corner: 1.2 });
    return { ...w, i, tw, th, sh };
  });
  return (tileCache[lang] = { tiles, font: N.font });
}
export function drawNoteTile(t, o) {
  const { font } = noteTiles();
  piece(t.sh, {
    color: '#f6f0e2', tex: 'plain', tx: 300 - t.cx, ty: 180 - t.cy, edge: 0.4, ...o,
    print: (c) => {
      c.save();
      c.globalCompositeOperation = 'multiply';
      // fragment of the ruled line the word sat on
      c.fillStyle = 'rgba(110,145,190,0.45)';
      c.fillRect(-t.tw / 2, t.y - t.cy + 5, t.tw, 1.6);
      c.font = font;
      c.textBaseline = 'alphabetic';
      c.fillStyle = 'rgba(32,40,78,0.9)';
      c.fillText(t.text, -t.w / 2, t.y - t.cy);
      c.restore();
      if (o.glowA) {
        c.save();
        c.globalCompositeOperation = 'screen';
        c.fillStyle = `rgba(255,170,90,${o.glowA})`;
        c.fill(t.sh.path);
        c.restore();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Origami crane (replacement poses: rest / up / mid / down).

const craneCache = {};
export function crane(o = {}) {
  const {
    x = 0, y = 0, s = 1, r = 0, pose = 'rest', color = '#f3ede0', tex = 'book', lift = 4, flip = false, tx = 0, ty = 0, alpha = 1, shade = 0,
    still = null, dx = 0, dy = 0, rot = 0,
  } = o;
  const C = (craneCache[pose] ||= craneShape(pose, 3));
  const base = { x, y, r, s, sx: flip ? -1 : 1, color, tex, tx, ty, alpha, ts: 0.8 };
  const farO = { ...base, lift: lift + 3, shade: 0.22 + shade, edge: 0.15 };
  const nearO = { ...base, lift, shade, edge: 0.4, print: (c) => {
    // crease lines of the folds
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.strokeStyle = 'rgba(90,70,60,0.35)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(-56, 2); c.lineTo(58, 2);
    c.moveTo(0, -26); c.lineTo(0, 30);
    c.stroke();
    c.restore();
  } };
  if (still) {
    stillPiece(`${still}|${pose}|${color}|far`, C.far, { ...farO, dx, dy, rot });
    stillPiece(`${still}|${pose}|${color}|near`, C.near, { ...nearO, dx, dy, rot });
  } else {
    piece(C.far, farO);
    piece(C.near, nearO);
  }
}

// ---------------------------------------------------------------------------
// The reply: printed tokens set onto a card.

const replyCache = {};
export function replyData(lang = vlang()) {
  if (replyCache[lang]) return replyCache[lang];
  const { tokens, br } = REPLY[lang];
  const font = lang === 'ja' ? `700 40px ${F.mincho}` : `500 44px ${F.garamond}`;
  const m = canvas(4, 4).getContext('2d');
  m.font = font;
  const th = 68, padX = lang === 'ja' ? 13 : 12, gap = 10;
  const lines = [[], []];
  tokens.forEach((t, i) => lines[i <= br ? 0 : 1].push(i));
  const tiles = [];
  const lineW = [];
  lines.forEach((ids, li) => {
    let x = 0;
    const row = [];
    ids.forEach((i, k) => {
      const text = tokens[i];
      const tw = Math.max(lang === 'ja' ? 50 : 34, m.measureText(text).width + padX * 2);
      const glue = k > 0 && GLUE.has(text);
      if (k > 0) x += glue ? 3 : gap;
      row.push({ i, text, tw, x0: x, line: li });
      x += tw;
    });
    lineW.push(x);
    row.forEach((t) => tiles.push(t));
  });
  const W0 = Math.max(...lineW);
  const cardW = W0 + 110, cardH = th * 2 + 90;
  tiles.forEach((t) => {
    t.x = -lineW[t.line] / 2 + t.x0 + t.tw / 2;
    t.y = t.line === 0 ? -th / 2 - 12 : th / 2 + 12;
    t.sh = cutShape(rectPts(t.tw, th), 500 + t.i, { jag: 0.45, wander: 0.9, step: 10, corner: 0.8 });
    t.rot = hs('rt', t.i) * 0.035;
    t.jx = hs('rj', t.i) * 2.5;
    t.jy = hs('rj2', t.i) * 3;
  });
  tiles.sort((a, b) => a.i - b.i);
  const card = cutShape(rectPts(cardW, cardH), 499, { jag: 0.4, wander: 1.2, step: 12, corner: 0.9 });
  return (replyCache[lang] = { tiles, card, cardW, cardH, font, th });
}

// Card + tokens. `placedAt[i]` = local frame at which token i lands (or undefined).
export function reply(o = {}) {
  const { x = 860, y = 560, r = 0, f = 0, placedAt = null, count = 99, lift = 3, s = 1 } = o;
  const D = replyData();
  const ctx = R.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.scale(s, s);
  const still = r === 0 && s === 1;
  const cardO = { color: '#ebe2cf', tex: 'plain', tx: 640, ty: 120, lift, edge: 0.35, print: (c) => {
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = 'rgba(150,120,100,0.18)';
    c.fillRect(-D.cardW / 2 + 30, -1, D.cardW - 60, 1.2);
    c.restore();
  } };
  if (still) {
    ctx.translate(-x, -y);
    stillPiece(`card|${vlang()}|${lift}|${x}|${y}`, D.card, { ...cardO, x, y });
    ctx.translate(x, y);
  } else piece(D.card, cardO);
  const pos = [];
  D.tiles.forEach((t) => {
    if (t.i >= count) return;
    let age = placedAt ? f - placedAt[t.i] : 99;
    if (age < 0) return;
    const land = [
      { lift: 36, s: 1.16, dx: -10, dy: -30 },
      { lift: 15, s: 1.06, dx: -3, dy: -10 },
      { lift: 5, s: 1.01, dx: 0, dy: -2 },
    ][age] || { lift: 2.5, s: 1, dx: 0, dy: 0 };
    const b = age < 3 ? boil('tok' + t.i, f, 1.2) : [0, 0, 0];
    const tx = t.x + t.jx + land.dx + b[0], ty = t.y + t.jy + land.dy + b[1];
    pos[t.i] = [tx, ty];
    const tokO = {
      x: tx, y: ty, r: t.rot + b[2], s: land.s, lift: land.lift, color: '#f7f0df', tex: 'plain', tx: 100 + t.i * 90, ty: 30 * t.i, edge: 0.45,
      print: (c) => ink(c, t.text, 0, 2, D.font, 'rgba(34,27,24,0.93)'),
    };
    if (still && age >= 3) {
      ctx.translate(-x, -y);
      stillPiece(`tok|${vlang()}|${t.i}|${x}|${y}`, t.sh, { ...tokO, x: x + tx, y: y + ty });
      ctx.translate(x, y);
    } else piece(t.sh, tokO);
  });
  ctx.restore();
  // world positions of tiles (for threads)
  const cs = Math.cos(r) * s, sn = Math.sin(r) * s;
  return pos.map((p) => (p ? [x + p[0] * cs - p[1] * sn, y + p[0] * sn + p[1] * cs] : null));
}
