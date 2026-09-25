// label.js — small paper labels with text typed onto them (title cards etc.)
import { R, piece } from './render.js';
import { hs, boil, strHash, canvas } from './util.js';

const cache = new Map();

// lines: [{ text, font, color, lh }]; t: frames since the label appeared;
// cps: characters revealed per frame (Infinity = all at once)
export function label(o) {
  const { x, y, lines, t, cps = 1, color = '#f2e9d6', lift = 3, pad = [36, 20], r = 0, alpha = 1 } = o;
  if (t < 0) return;
  const m = canvas(4, 4).getContext('2d');
  let wMax = 0, hSum = 0;
  for (const l of lines) {
    m.font = l.font;
    wMax = Math.max(wMax, m.measureText(l.text).width);
    hSum += l.lh;
  }
  const w = wMax + pad[0] * 2, h = hSum + pad[1] * 2;
  const key = lines.map((l) => l.text).join('|') + Math.round(w);
  let sh = cache.get(key);
  if (!sh) {
    const seed = strHash(key) & 0xffff;
    const p = new Path2D();
    const pts = [];
    const n = 12;
    for (let i = 0; i <= n; i++) pts.push([-w / 2 + (w * i) / n, -h / 2 + hs(seed, i) * 1.1]);
    for (let i = 1; i <= 4; i++) pts.push([w / 2 + hs(seed, 'r', i) * 2.5, -h / 2 + (h * i) / 4]);
    for (let i = n - 1; i >= 0; i--) pts.push([-w / 2 + (w * i) / n, h / 2 + hs(seed, 'b', i) * 1.1]);
    for (let i = 3; i >= 1; i--) pts.push([-w / 2 + hs(seed, 'l', i) * 2.5, -h / 2 + (h * i) / 4]);
    pts.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py)));
    p.closePath();
    sh = { path: p };
    cache.set(key, sh);
  }
  let dy = 0, lf = lift, s = 1;
  if (t < 3) { dy = [18, 6, 1][t]; lf = [24, 11, lift + 1][t]; s = [1.04, 1.015, 1][t]; }
  const b = t < 3 ? boil(key, R.frame, 1) : [0, 0, 0];
  piece(sh, {
    x: x + b[0], y: y + dy + b[1], r: r + b[2], s, lift: lf, color, tex: 'plain', tx: 200, ty: 90, edge: 0.3, alpha,
    print: (c) => {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      let yy = -h / 2 + pad[1];
      let budget = (t - 1) * cps;
      for (const l of lines) {
        c.font = l.font;
        c.fillStyle = l.color || '#2b221c';
        const chars = [...l.text];
        const n = Math.max(0, Math.min(chars.length, Math.floor(budget)));
        budget -= chars.length;
        const full = c.measureText(l.text).width;
        if (n > 0) c.fillText(chars.slice(0, n).join(''), -full / 2, yy + l.lh / 2);
        yy += l.lh;
      }
      c.restore();
    },
  });
}
