// main.js — the projector: loads paper, runs the frames, handles the controls.
import { R, setup, resize, beginFrame, post, caption, spriteStats } from './render.js';
import { buildTextures } from './textures.js';
import { loadFonts } from './fonts.js';
import { allText } from './text.js';
import { SCENES, TOTAL, locate } from './timeline.js';
import { A } from './audio.js';
import { FPS } from './util.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const cv = $('#film');
const ui = {
  start: $('#start'), end: $('#end'), loading: $('#loading'), controls: $('#controls'),
  pp: $('#pp'), scrub: $('#scrub'), counter: $('#counter'), lang: $('#lang'), snd: $('#snd'),
  fs: $('#fs'), live: $('#live'), play: $('#play'), replay: $('#replay'), loadbar: $('#loadbar'),
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
const params = new URLSearchParams(location.search);

setup(cv);
const LANGS = ['ja', 'en', 'both'];
R.lang = LANGS.includes(params.get('lang')) ? params.get('lang')
  : LANGS.includes(store.get('hk-lang')) ? store.get('hk-lang')
  : (navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en';
R.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
A.on = store.get('hk-sound') !== 'off';

const P = { g: 0, playing: false, t0: 0, g0: 0, ready: false, scene: -1, ended: false };
const STATS = { shown: 0, skipped: 0 }; // playback health (frames shown / frames the projector had to skip)
const POSTER = () => SCENES[SCENES.length - 1].start + 146;

// --- UI text ------------------------------------------------------------------
const T = {
  ja: { play: '再生', pause: '一時停止', frame: 'コマ', sound: ['音 OFF', '音 ON'], lang: { ja: '字幕 日本語', en: '字幕 English', both: '字幕 日本語+EN' }, fs: '全画面' },
  en: { play: 'Play', pause: 'Pause', frame: 'frame', sound: ['Sound off', 'Sound on'], lang: { ja: 'Subtitles 日本語', en: 'Subtitles English', both: 'Subtitles JA+EN' }, fs: 'Fullscreen' },
};
const tx = () => T[R.lang === 'en' ? 'en' : 'ja'];

function syncUI() {
  const t = tx();
  ui.pp.textContent = P.playing ? '❚❚' : '▶';
  ui.pp.setAttribute('aria-label', P.playing ? t.pause : t.play);
  ui.lang.textContent = t.lang[R.lang];
  ui.snd.textContent = t.sound[A.on ? 1 : 0];
  ui.snd.setAttribute('aria-pressed', String(A.on));
  ui.fs.setAttribute('aria-label', t.fs);
  ui.scrub.max = String(TOTAL - 1);
  ui.scrub.value = String(P.g);
  ui.counter.textContent = `${t.frame} ${String(P.g + 1).padStart(4, '0')} / ${TOTAL}`;
  document.documentElement.lang = R.lang === 'en' ? 'en' : 'ja';
}

// --- rendering -----------------------------------------------------------------
function announce(cap) {
  const text = R.lang === 'en' ? cap.en : cap.ja;
  ui.live.textContent = (text || '').replace(/\n/g, ' ');
}

function render(g) {
  const { sc, f } = locate(g);
  try {
    beginFrame(g);
    sc.draw(f, g);
    for (const c of sc.caps) caption(c, f, P.playing ? announce : null);
    post(g, sc.post);
  } catch (e) {
    console.error(`frame ${g} (${sc.id}:${f})`, e);
  }
  ui.scrub.value = String(g);
  ui.counter.textContent = `${tx().frame} ${String(g + 1).padStart(4, '0')} / ${TOTAL}`;
}

function sfx(g) {
  const { sc, f, i } = locate(g);
  if (i !== P.scene) {
    P.scene = i;
    if (sc.mood) A.mood(sc.mood);
  }
  try { sc.sfx && sc.sfx(f, A); } catch (e) { console.error(e); }
}

function fit() {
  const w = stage.clientWidth, h = stage.clientHeight;
  let cw = w, ch = (w * 9) / 16;
  if (ch > h) { ch = h; cw = (h * 16) / 9; }
  cv.style.width = `${Math.floor(cw)}px`;
  cv.style.height = `${Math.floor(ch)}px`;
  resize(cw, ch, window.devicePixelRatio || 1);
  if (P.ready) render(P.g);
}

// --- transport -------------------------------------------------------------------
function play() {
  if (!P.ready) return;
  if (P.g >= TOTAL - 1) P.g = 0;
  A.init();
  A.resume();
  P.scene = -1;
  P.playing = true;
  P.ended = false;
  P.g0 = P.g;
  P.t0 = performance.now();
  ui.start.hidden = true;
  ui.end.hidden = true;
  sfx(P.g);
  render(P.g);
  syncUI();
  poke();
}
function pause() {
  P.playing = false;
  A.suspend();
  syncUI();
  poke();
}
function seek(g, keepPlaying = P.playing) {
  P.g = Math.max(0, Math.min(TOTAL - 1, g));
  if (keepPlaying) {
    P.g0 = P.g;
    P.t0 = performance.now();
    P.scene = -1;
    sfx(P.g);
  }
  ui.end.hidden = true;
  render(P.g);
  syncUI();
}
function step(d) {
  if (P.playing) pause();
  ui.start.hidden = true;
  seek(P.g + d, false);
}

function tick(now) {
  requestAnimationFrame(tick);
  if (!P.playing) return;
  const g = P.g0 + Math.floor((Math.max(0, now - P.t0) / 1000) * FPS);
  if (g <= P.g) return;
  if (g >= TOTAL) {
    P.g = TOTAL - 1;
    P.playing = false;
    P.ended = true;
    render(P.g);
    A.mood('hush');
    setTimeout(() => A.suspend(), 4000);
    ui.end.hidden = false;
    syncUI();
    poke();
    return;
  }
  // fire sounds for frames we pass (skip stale ones after a hiccup)
  for (let k = P.g + 1; k <= g; k++) if (g - k < 3) sfx(k);
  STATS.shown++;
  STATS.skipped += g - P.g - 1;
  P.g = g;
  render(g);
}

// --- controls ----------------------------------------------------------------------
let hideTimer = 0;
function poke() {
  stage.classList.remove('idle');
  clearTimeout(hideTimer);
  if (P.playing) hideTimer = setTimeout(() => stage.classList.add('idle'), 2600);
}

function toggleFs() {
  const el = stage;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el);
  }
}

function cycleLang() {
  R.lang = LANGS[(LANGS.indexOf(R.lang) + 1) % LANGS.length];
  store.set('hk-lang', R.lang);
  if (P.ready) render(P.g);
  syncUI();
}
function toggleSound() {
  A.setOn(!A.on);
  store.set('hk-sound', A.on ? 'on' : 'off');
  syncUI();
}

ui.play.addEventListener('click', play);
ui.replay.addEventListener('click', () => { P.g = 0; play(); });
ui.pp.addEventListener('click', () => (P.playing ? pause() : play()));
ui.lang.addEventListener('click', cycleLang);
ui.snd.addEventListener('click', toggleSound);
ui.fs.addEventListener('click', toggleFs);
ui.scrub.addEventListener('input', () => { ui.start.hidden = true; seek(parseInt(ui.scrub.value, 10)); });
cv.addEventListener('click', () => { if (!P.ready || !ui.start.hidden) return; P.playing ? pause() : play(); });
stage.addEventListener('pointermove', poke);
stage.addEventListener('touchstart', poke, { passive: true });

window.addEventListener('keydown', (e) => {
  if (!P.ready || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'TEXTAREA' || (tag === 'INPUT' && t !== ui.scrub)) return;
  const k = e.key;
  if ((k === ' ' || k === 'Enter') && tag === 'BUTTON') return; // the button handles it
  if (t === ui.scrub && k.startsWith('Arrow')) { if (P.playing) pause(); return; } // the slider steps itself
  if (k === ' ' || k === 'k') { e.preventDefault(); P.playing ? pause() : play(); }
  else if (k === 'ArrowRight') { e.preventDefault(); step(e.shiftKey ? FPS : 1); }
  else if (k === 'ArrowLeft') { e.preventDefault(); step(e.shiftKey ? -FPS : -1); }
  else if (k === 'Home') { e.preventDefault(); seek(0); }
  else if (k === 'c') cycleLang();
  else if (k === 'm') toggleSound();
  else if (k === 'f') toggleFs();
  poke();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && P.playing) pause(); });

new ResizeObserver(fit).observe(stage);

// --- boot ---------------------------------------------------------------------------
async function boot() {
  syncUI();
  fit();
  await loadFonts(allText());
  ui.loadbar.style.width = '40%';
  await new Promise((r) => setTimeout(r, 30));
  buildTextures((p) => { ui.loadbar.style.width = `${40 + p * 40}%`; });
  // Cut every scene's pieces once now (behind the loading veil), so playback never stalls.
  const WARM = { s0: [20], s1: [170], s2: [60], s3: [150], s4: [150], s5: [10, 100], s6: [30, 80], s7: [200] };
  for (const [i, sc] of SCENES.entries()) {
    for (const f of WARM[sc.id] || [0]) render(sc.start + f);
    ui.loadbar.style.width = `${80 + ((i + 1) / SCENES.length) * 20}%`;
    await new Promise((r) => setTimeout(r, 0));
  }
  P.ready = true;
  ui.loading.hidden = true;

  const f = params.get('f');
  if (f !== null) {
    ui.start.hidden = true;
    if (params.get('ui') === '0') document.body.classList.add('clean');
    seek(parseInt(f, 10) || 0, false);
  } else {
    P.g = POSTER();
    render(P.g);
    ui.start.hidden = false;
    P.g = 0;
  }
  syncUI();
  requestAnimationFrame(tick);
}

window.film = { render, seek, play, pause, TOTAL, SCENES, locate, R, A, spriteStats, stats: STATS };
boot();
