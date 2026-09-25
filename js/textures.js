// textures.js — the paper everything is cut from.
// Textures are neutral (near-white paper + dark ink). A piece is tinted by
// filling its own colour first and multiplying the texture on top, so one
// printed page can become blue sea, green hills or an orange sun.

import { rng, canvas } from './util.js';
import { F } from './fonts.js';
import { CORPUS } from './text.js';

export const TEX = {};
export const TS = 1024;
export const GRAIN = [];
export let VIGNETTE = null;

// Tileable value noise (size must be a multiple of cell).
function noiseField(size, cell, r) {
  const g = Math.round(size / cell);
  const grid = new Float32Array(g * g);
  for (let i = 0; i < grid.length; i++) grid[i] = r() * 2 - 1;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = y / cell, iy = Math.floor(gy), fy = gy - iy, sy = fy * fy * (3 - 2 * fy);
    const y0 = (iy % g) * g, y1 = ((iy + 1) % g) * g;
    for (let x = 0; x < size; x++) {
      const gx = x / cell, ix = Math.floor(gx), fx = gx - ix, sx = fx * fx * (3 - 2 * fx);
      const x0 = ix % g, x1 = (ix + 1) % g;
      const a = grid[y0 + x0], b = grid[y0 + x1], c = grid[y1 + x0], d = grid[y1 + x1];
      const top = a + (b - a) * sx, bot = c + (d - c) * sx;
      out[y * size + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

function basePaper(seed, fibres = 1, longFibres = false) {
  const r = rng(seed);
  const c = canvas(TS, TS), g = c.getContext('2d');
  const img = g.createImageData(TS, TS), d = img.data;
  const n1 = noiseField(TS, 128, r), n2 = noiseField(TS, 32, r), n3 = noiseField(TS, 8, r);
  const tone = [243, 239, 231];
  for (let i = 0, p = 0; i < TS * TS; i++, p += 4) {
    const v = 1 + n1[i] * 0.025 + n2[i] * 0.017 + n3[i] * 0.02 + (r() - 0.5) * 0.05;
    d[p] = tone[0] * v;
    d[p + 1] = tone[1] * v;
    d[p + 2] = tone[2] * v;
    d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Fibres, wrapped so the tile stays seamless.
  g.lineCap = 'round';
  const n = Math.floor(1500 * fibres);
  for (let i = 0; i < n; i++) {
    const x = r() * TS, y = r() * TS, a = r() * Math.PI * 2;
    const l = (4 + r() * 22) * (longFibres ? 1 + r() * 2.2 : 1);
    const light = r() < 0.6;
    g.strokeStyle = light ? `rgba(255,253,248,${0.3 + r() * 0.45})` : `rgba(110,92,74,${0.05 + r() * 0.09})`;
    g.lineWidth = 0.35 + r() * (longFibres ? 1.1 : 0.8);
    const bend = (r() - 0.5) * 1.4;
    for (const ox of [-TS, 0, TS]) for (const oy of [-TS, 0, TS]) {
      const X = x + ox, Y = y + oy;
      if (X < -80 || X > TS + 80 || Y < -80 || Y > TS + 80) continue;
      g.beginPath();
      g.moveTo(X, Y);
      g.quadraticCurveTo(X + Math.cos(a + bend) * l * 0.5, Y + Math.sin(a + bend) * l * 0.5, X + Math.cos(a) * l, Y + Math.sin(a) * l);
      g.stroke();
    }
  }
  return c;
}

// Copy a base sheet with a flip/rotation so every texture's fibres differ.
function derive(base, variant) {
  const c = canvas(TS, TS), g = c.getContext('2d');
  g.translate(TS / 2, TS / 2);
  g.rotate((variant % 4) * Math.PI / 2);
  if (variant & 4) g.scale(-1, 1);
  g.drawImage(base, -TS / 2, -TS / 2);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

const INK = 0.86;
const ink = (a, c = [58, 47, 40]) => `rgba(${c[0]},${c[1]},${c[2]},${a * INK})`;
const any = (r, arr) => arr[Math.floor(r() * arr.length)];

function fillLine(g, r, src, width, joiner) {
  let s = '';
  while (g.measureText(s).width < width) s += any(r, src) + joiner;
  return s;
}
function trimTo(g, s, width) {
  // binary search on length
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (g.measureText(s.slice(0, mid)).width <= width) lo = mid; else hi = mid - 1;
  }
  return s.slice(0, lo);
}

function printBook(g, r, pool = null) {
  g.globalCompositeOperation = 'multiply';
  let y = 24, indent = 0;
  const jaPool = pool ? pool.filter((s) => /[぀-ヿ一-鿿]/.test(s)) : CORPUS.ja;
  const enPool = pool ? pool.filter((s) => !/[぀-ヿ一-鿿]/.test(s)) : CORPUS.en;
  while (y < TS + 30) {
    const ja = r() < (pool ? 0.55 : 0.72);
    g.font = `400 ${ja ? 18 : 20}px ${ja ? F.mincho : F.garamond}`;
    const s = fillLine(g, r, ja ? jaPool : enPool, TS + 80, ja ? '' : ' ');
    g.fillStyle = ink(0.5 + r() * 0.38);
    g.fillText(s, -24 + indent, y);
    y += 31;
    if (r() < 0.09) { y += 20; indent = 36; } else indent = 0;
  }
}

function printTate(g, r, pool = CORPUS.ja) {
  g.globalCompositeOperation = 'multiply';
  const size = 19, colW = 32;
  g.font = `400 ${size}px ${F.mincho}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let x = TS - 16; x > -colW; x -= colW) {
    let y = 16 + (r() < 0.25 ? size * 2 : 0);
    g.fillStyle = ink(0.48 + r() * 0.38);
    while (y < TS + size) {
      const s = any(r, pool).replace(/[「」]/g, '');
      for (const ch of s) {
        if (y > TS + size) break;
        if ('、。'.includes(ch)) g.fillText(ch, x + size * 0.55, y - size * 0.5);
        else if ('ー〜…：'.includes(ch)) {
          g.save(); g.translate(x, y); g.rotate(Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
        } else g.fillText(ch, x, y);
        y += size * 1.07;
      }
      if (r() < 0.35) y += size;
    }
  }
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
}

function printLetter(g, r) {
  g.globalCompositeOperation = 'multiply';
  const lh = 46;
  for (let y = 40; y < TS; y += lh) { g.fillStyle = 'rgba(110,145,190,0.3)'; g.fillRect(0, y, TS, 1.4); }
  g.fillStyle = 'rgba(205,85,70,0.3)';
  g.fillRect(70, 0, 1.6, TS);
  for (let y = 40 - 9; y < TS + lh; y += lh) {
    if (r() < 0.12) continue;
    const ja = r() < 0.62;
    g.font = `400 ${ja ? 26 : 28}px ${F.hand}`;
    const src = ja ? CORPUS.ja : CORPUS.en;
    let s = any(r, src);
    while (g.measureText(s).width < TS - 160 && r() < 0.75) s += (ja ? '' : ' ') + any(r, src);
    g.fillStyle = ink(0.62 + r() * 0.3, [34, 44, 84]);
    g.save();
    g.translate(84 + r() * 12, y);
    g.rotate((r() - 0.5) * 0.014);
    g.fillText(s, 0, 0);
    g.restore();
  }
}

function printCode(g, r) {
  g.globalCompositeOperation = 'multiply';
  const lh = 23;
  g.font = `400 15px ${F.mono}`;
  let y = 20, ln = 1 + Math.floor(r() * 80);
  while (y < TS + lh) {
    g.fillStyle = ink(0.35, [110, 100, 92]);
    g.fillText(String(ln).padStart(3, ' '), 10, y);
    const s = any(r, CORPUS.code);
    const comment = s.trim().startsWith('//');
    g.fillStyle = comment ? ink(0.7, [70, 110, 80]) : ink(0.62 + r() * 0.3, [42, 38, 36]);
    g.fillText(s, 56, y);
    const m = s.match(/^(\s*)(def|for|if|while|return|import|const|let|fn|SELECT|print)\b/);
    if (m && !comment) {
      const x0 = 56 + g.measureText(m[1]).width;
      g.fillStyle = ink(0.8, [150, 45, 35]);
      g.fillText(m[2], x0, y);
    }
    y += lh;
    ln++;
    if (r() < 0.08) { y += lh; ln++; }
  }
}

function printNews(g, r) {
  g.globalCompositeOperation = 'multiply';
  const cols = 4, gap = 20, cw = (TS - gap * (cols + 1)) / cols;
  for (let c = 0; c < cols; c++) {
    const x = gap + c * (cw + gap);
    if (c > 0) { g.fillStyle = ink(0.35); g.fillRect(x - gap / 2, 0, 1, TS); }
    let y = 18 + r() * 24;
    while (y < TS + 20) {
      if (r() < 0.06) {
        g.font = `700 ${24 + Math.floor(r() * 8)}px ${F.mincho}`;
        g.fillStyle = ink(0.85, [36, 30, 27]);
        g.fillText(trimTo(g, any(r, CORPUS.heads), cw), x, y + 22);
        y += 44;
        continue;
      }
      const ja = r() < 0.6;
      g.font = `400 ${ja ? 13 : 14}px ${ja ? F.mincho : F.garamond}`;
      const s = trimTo(g, fillLine(g, r, ja ? CORPUS.ja : CORPUS.en, cw + 20, ja ? '' : ' '), cw);
      g.fillStyle = ink(0.5 + r() * 0.35, [48, 42, 38]);
      g.fillText(s, x, y);
      y += 19;
    }
  }
}

function printMulti(g, r) {
  g.globalCompositeOperation = 'multiply';
  let y = 28;
  while (y < TS + 30) {
    let x = -10 + r() * 40;
    const size = 18 + Math.floor(r() * 12);
    while (x < TS) {
      const s = any(r, CORPUS.multi);
      g.font = `400 ${size}px ${F.garamond}, ${F.hand}`;
      g.fillStyle = ink(0.48 + r() * 0.38);
      g.fillText(s, x, y);
      x += g.measureText(s).width + 20 + r() * 26;
    }
    y += size + 15;
  }
}

function makeGrainTiles() {
  for (let k = 0; k < 4; k++) {
    const r = rng(900 + k);
    const c = canvas(256, 256), g = c.getContext('2d');
    const img = g.createImageData(256, 256), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + ((r() + r() + r()) / 3 - 0.5) * 150;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    GRAIN.push(c);
  }
}

function makeVignette() {
  const c = canvas(640, 360), g = c.getContext('2d');
  const gr = g.createRadialGradient(320, 175, 60, 320, 180, 390);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.55, '#f7f1ea');
  gr.addColorStop(1, '#6d5c58');
  g.fillStyle = gr;
  g.fillRect(0, 0, 640, 360);
  VIGNETTE = c;
}

export function buildTextures(progress = () => {}) {
  const base = basePaper(7, 1);
  const washi = basePaper(19, 2.6, true);
  TEX.plain = base;
  TEX.washi = washi;
  const printers = {
    book: printBook, tate: printTate, letter: printLetter, code: printCode, news: printNews, multi: printMulti,
    sea: (g, r) => printBook(g, r, CORPUS.sea),
    sky: (g, r) => printTate(g, r, CORPUS.sky),
  };
  const count = Object.keys(printers).length;
  let v = 1;
  for (const [name, fn] of Object.entries(printers)) {
    const c = derive(v % 2 ? base : washi, v);
    const g = c.getContext('2d');
    fn(g, rng(100 + v));
    g.globalCompositeOperation = 'source-over';
    TEX[name] = c;
    progress(v / count);
    v++;
  }
  makeGrainTiles();
  makeVignette();
}
