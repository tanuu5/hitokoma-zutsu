// fonts.js — font stacks and loading.
export const F = {
  hand: '"Klee One", "Hiragino Maru Gothic ProN", "Yu Gothic", "Hiragino Sans", sans-serif',
  mincho: '"Zen Old Mincho", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  garamond: '"EB Garamond", "Iowan Old Style", Georgia, serif',
  mono: '"IBM Plex Mono", Menlo, Consolas, monospace',
};

function stylesheetReady() {
  const link = document.querySelector('link[data-fonts]');
  if (!link || link.sheet) return Promise.resolve();
  return new Promise((res) => {
    link.addEventListener('load', res, { once: true });
    link.addEventListener('error', res, { once: true });
    setTimeout(res, 4000);
  });
}

export async function loadFonts(sample) {
  if (!document.fonts || !document.fonts.load) return;
  await stylesheetReady();
  const faces = [
    '400 24px "Klee One"', '600 24px "Klee One"',
    '400 24px "Zen Old Mincho"', '700 24px "Zen Old Mincho"', '900 24px "Zen Old Mincho"',
    '400 24px "EB Garamond"', 'italic 400 24px "EB Garamond"', '500 24px "EB Garamond"',
    '400 24px "IBM Plex Mono"',
  ];
  const jobs = faces.map((f) => document.fonts.load(f, sample).catch(() => null));
  // Never let a slow font network hold the film hostage.
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 7000))]);
}
