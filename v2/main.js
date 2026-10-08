// Breakout 2.0 page controller: menus, saving, input, music and the start-page demo.
import { LEVELS, WORLDS, LEVELS_PER_WORLD } from './levels.js';
import { W, createGame, update, action, botInput } from './game.js';
import { createRenderer } from './render.js';
import * as audio from './audio.js';

const DEMO = new URLSearchParams(location.search).has('demo');
const MAX = LEVELS.length;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
const renderer = createRenderer(ctx);

// ---------- Canvas size ----------
function fit() {
  const r = cv.getBoundingClientRect();
  const px = Math.max(W, Math.round(r.width * Math.min(window.devicePixelRatio || 1, 2)));
  cv.width = px; cv.height = Math.round(px * 3 / 4);
  const s = px / W;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  renderer.setScale(s);
}
new ResizeObserver(fit).observe(cv);
fit();

// ---------- Saved data ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('bo2v2_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { if (DEMO) return; try { localStorage.setItem('bo2v2_' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { if (DEMO) return; try { localStorage.removeItem('bo2v2_' + k); } catch (e) {} },
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = { sound: true, music: true, shake: !reduced, flashes: !reduced, motion: !reduced, vibrate: true, ...store.get('settings', {}) };
const progress = { levels: {}, unlocked: 1, bestRun: 0, seenTips: [], ...store.get('progress', {}) };
let run = store.get('run', null);
const saveProgress = () => store.set('progress', progress);
const saveRun = () => run ? store.set('run', run) : store.del('run');
audio.setSound(settings.sound && !DEMO);
audio.setMusic(settings.music && !DEMO);

const totalStars = () => Object.values(progress.levels).reduce((s, l) => s + (l.stars || 0), 0);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const label = n => `${LEVELS[n - 1].world + 1}-${LEVELS[n - 1].stage}`;
const starStr = n => '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>';

// ---------- Game state ----------
let G = null, state = 'menu', last = performance.now(), settingsReturn = 'menu', levelTab = 0;
const input = { abs: null, rel: 0, left: false, right: false, fireHeld: false };
const hooks = {
  sfx: (n, a) => audio.sfx(n, a),
  vibrate: ms => { if (settings.vibrate && !DEMO && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} },
};

const panels = ['menu', 'levels', 'help', 'settings', 'pause', 'intro', 'msg'];
function show(id) {
  panels.forEach(p => $(p).classList.toggle('show', p === id));
  document.body.classList.toggle('playing', !id && state === 'play');
  const first = id && $(id).querySelector('button.primary, button');
  if (first && matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
}

function startLevel(level, mode, score = 0, lives = 3) {
  G = createGame({ level, mode, score, lives, hooks });
  const L = G.L;
  if (mode === 'run') { run = { level, score, lives }; saveRun(); }
  G.texts.push({ x: W / 2, y: 330, s: `${label(level)}  ${L.name}`, color: '#fff', size: 30, life: 100, max: 100 });
  input.fireHeld = false; input.rel = 0;
  const needIntro = L.stage === 1 || L.boss || (L.tip && !progress.seenTips.includes(level));
  if (!needIntro) return play();
  const wd = WORLDS[L.world];
  $('introWorld').textContent = `World ${L.world + 1} · ${wd.name}`;
  $('introWorld').style.color = wd.accent;
  $('introTitle').textContent = `${label(level)}  ${L.name}`;
  $('introTip').textContent = L.tip || (L.boss ? 'A boss guards the end of this world. Hit it until its health bar runs out, and dodge its red orbs.' : WORLD_BLURB[L.world]);
  $('introGoal').textContent = `★★★ target: no lives lost, under ${fmtTime(G.par)}`;
  if (L.tip && !progress.seenTips.includes(level)) { progress.seenTips.push(level); saveProgress(); }
  state = 'intro'; show('intro');
}
const WORLD_BLURB = [
  'Welcome to Neon City. Break every brick to clear a level.',
  'The desert hides metal walls you cannot break. Find a way around them.',
  'Deep under the sea, portals link one part of the level to another.',
  'The final world. Everything you have learned, all at once.',
];

function play() {
  state = 'play'; show(null);
  last = performance.now();
  audio.startMusic(G.world);
}
function pause() {
  if (state !== 'play') return;
  state = 'paused'; input.fireHeld = false; audio.stopMusic(); show('pause');
}
function resume() { if (state === 'paused') play(); }

function toMenu() {
  state = 'menu'; audio.stopMusic();
  G = createGame({ level: run ? run.level : Math.min(progress.unlocked, MAX), hooks: {} });
  G.texts = [];
  const c = $('bCont');
  if (run) {
    c.style.display = '';
    c.textContent = `Continue · Level ${label(run.level)} · ${run.score.toLocaleString()} pts`;
    $('bNew').className = '';
    $('bNew').textContent = 'New Game (restarts run)';
  } else {
    c.style.display = 'none';
    $('bNew').className = 'primary';
    $('bNew').textContent = 'New Game';
  }
  $('menuInfo').textContent = `Best run ${progress.bestRun.toLocaleString()} · ★ ${totalStars()} / ${MAX * 3}`;
  show('menu');
}

// ---------- Level select ----------
function openLevels() {
  state = 'menu';
  $('starTotal').textContent = `★ ${totalStars()} of ${MAX * 3} stars`;
  const tabs = $('worldTabs'); tabs.innerHTML = '';
  WORLDS.forEach((w, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1} · ${w.name}`; b.className = i === levelTab ? 'on' : '';
    b.disabled = progress.unlocked < i * LEVELS_PER_WORLD + 1;
    b.onclick = () => { levelTab = i; openLevels(); };
    tabs.appendChild(b);
  });
  const grid = $('lvGrid'); grid.innerHTML = '';
  for (let n = levelTab * LEVELS_PER_WORLD + 1; n <= (levelTab + 1) * LEVELS_PER_WORLD; n++) {
    const b = document.createElement('button'), rec = progress.levels[n];
    b.innerHTML = `<span>${label(n)}</span><span class="st">${n <= progress.unlocked ? starStr(rec ? rec.stars : 0) : '🔒'}</span>`;
    b.title = LEVELS[n - 1].name + (rec ? ` · best ${rec.best.toLocaleString()}` : '');
    if (LEVELS[n - 1].boss) b.className = 'boss';
    b.disabled = n > progress.unlocked;
    b.onclick = () => { audio.unlockAudio(); startLevel(n, 'practice'); };
    grid.appendChild(b);
  }
  show('levels');
}

// ---------- End of level ----------
function onClear() {
  const r = G.result, n = G.level;
  audio.stopMusic();
  const rec = progress.levels[n] || { stars: 0, best: 0 };
  const newBest = r.levelScore > rec.best, moreStars = r.stars > rec.stars;
  rec.stars = Math.max(rec.stars, r.stars); rec.best = Math.max(rec.best, r.levelScore);
  progress.levels[n] = rec;
  progress.unlocked = Math.min(MAX, Math.max(progress.unlocked, n + 1));
  let finished = false, runBest = false;
  if (G.mode === 'run') {
    if (n === MAX) {
      finished = true; run = null;
      if (G.score > progress.bestRun) { progress.bestRun = G.score; runBest = true; }
    } else run = { level: n + 1, score: G.score, lives: G.lives };
    saveRun();
  }
  saveProgress();
  state = 'msg';
  const wd = WORLDS[G.world];
  $('msgTag').textContent = `${label(n)} · ${G.L.name}`; $('msgTag').style.color = wd.accent;
  $('msgTitle').textContent = finished ? 'YOU BEAT ALL 76 LEVELS!' : G.L.boss ? 'BOSS DEFEATED!' : 'LEVEL CLEAR!';
  stats([
    ['Level score', r.levelScore.toLocaleString()],
    ['Time', `${fmtTime(r.secs)}  (target ${fmtTime(r.par)})`],
    ['Lives lost', G.livesLost],
    ['Best combo', r.bestCombo],
    ['Clear bonus', '+' + r.bonus.toLocaleString()],
    [G.mode === 'run' ? 'Run score' : 'Score', G.score.toLocaleString()],
  ]);
  $('msgBest').textContent = runBest ? 'NEW BEST RUN!' : newBest ? 'NEW LEVEL BEST!' : moreStars && rec.stars > 1 ? 'NEW STAR RECORD!' : '';
  animateStars(r.stars);
  const next = n < MAX ? n + 1 : null;
  if (finished) buttons([['Play Again', () => newRun(1), true], ['Menu', toMenu]]);
  else if (G.mode === 'run') buttons([['Next Level', () => startLevel(next, 'run', run.score, run.lives), true], ['Save & Quit', toMenu]]);
  else buttons([
    ...(next ? [['Next Level', () => startLevel(next, 'practice'), true]] : []),
    ['Retry', () => startLevel(n, 'practice'), !next],
    ['Level Select', openLevels],
  ]);
  show('msg');
}

function onOver() {
  audio.stopMusic();
  state = 'msg';
  let runBest = false;
  if (G.mode === 'run') {
    if (G.score > progress.bestRun) { progress.bestRun = G.score; runBest = true; saveProgress(); }
    run = null; saveRun();
  }
  $('msgTag').textContent = `${label(G.level)} · ${G.L.name}`; $('msgTag').style.color = '#ff2e63';
  $('msgTitle').textContent = 'GAME OVER';
  $('msgStars').innerHTML = '';
  stats(G.mode === 'run'
    ? [['Final score', G.score.toLocaleString()], ['Reached level', label(G.level)], ['Best run', progress.bestRun.toLocaleString()]]
    : [['Level score', G.levelScore.toLocaleString()], ['Time', fmtTime(G.time / 1000)]]);
  $('msgBest').textContent = runBest ? 'NEW BEST RUN!' : '';
  const worldStart = G.world * LEVELS_PER_WORLD + 1;
  if (G.mode === 'run') buttons([
    [`Restart World ${G.world + 1}`, () => newRun(worldStart), true],
    ['New Game', () => newRun(1)],
    ['Menu', toMenu],
  ]);
  else buttons([['Retry', () => startLevel(G.level, 'practice'), true], ['Level Select', openLevels]]);
  show('msg');
}

function stats(rows) { $('msgStats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''); }
function buttons(list) {
  const box = $('msgBtns'); box.innerHTML = '';
  list.forEach(([text, fn, primary]) => {
    const b = document.createElement('button'); b.textContent = text; if (primary) b.className = 'primary';
    b.onclick = fn; box.appendChild(b);
  });
}
function animateStars(n) {
  const box = $('msgStars');
  box.innerHTML = '<span>★</span><span>★</span><span>★</span>';
  [...box.children].forEach((s, i) => setTimeout(() => {
    s.classList.add('in');
    if (i < n) { s.classList.add('won'); audio.sfx('star', i); }
  }, 350 + i * 320));
}
function newRun(level) { audio.unlockAudio(); startLevel(level, 'run', 0, 3); }

// ---------- Buttons ----------
$('bCont').onclick = () => { audio.unlockAudio(); startLevel(run.level, 'run', run.score, run.lives); };
$('bNew').onclick = () => newRun(1);
$('bSel').onclick = () => { levelTab = Math.min(WORLDS.length - 1, Math.floor((progress.unlocked - 1) / LEVELS_PER_WORLD)); openLevels(); };
$('bLvBack').onclick = toMenu;
$('bHelp').onclick = () => show('help');
$('bHelpBack').onclick = toMenu;
$('bSet').onclick = () => { settingsReturn = 'menu'; show('settings'); };
$('bPauseSet').onclick = () => { settingsReturn = 'pause'; show('settings'); };
$('bSetBack').onclick = () => settingsReturn === 'pause' ? show('pause') : toMenu();
$('bResume').onclick = resume;
$('bRestart').onclick = () => G.mode === 'run' && run ? startLevel(run.level, 'run', run.score, run.lives) : startLevel(G.level, 'practice');
$('bQuit').onclick = toMenu;
$('bGo').onclick = () => { audio.unlockAudio(); play(); };

document.querySelectorAll('[data-set]').forEach(el => {
  const key = el.dataset.set;
  el.checked = settings[key];
  el.onchange = () => {
    settings[key] = el.checked; store.set('settings', settings);
    audio.setSound(settings.sound); audio.setMusic(settings.music);
    if (key === 'sound' && el.checked) audio.sfx('click');
  };
});

// ---------- Input ----------
// Browsers only allow sound after the player interacts, so switch it on at the first tap, click or key
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, () => { if (!DEMO) audio.unlockAudio(); }, { capture: true, passive: true });
addEventListener('click', e => { if (!DEMO && e.target.closest('button, a.b')) audio.sfx('click'); });

let touchX = null;
const toX = clientX => { const r = cv.getBoundingClientRect(); return (clientX - r.left) / r.width * W; };
addEventListener('pointerdown', e => {
  if (state !== 'play' || e.target.closest('.ov')) return;
  audio.unlockAudio();
  if (e.pointerType === 'mouse') { input.abs = toX(e.clientX); input.fireHeld = true; }
  else { touchX = e.clientX; input.abs = null; }
  action(G);
});
addEventListener('pointermove', e => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse') input.abs = toX(e.clientX);
  else if (touchX != null) {
    // Drag anywhere: the bat follows your finger's movement, so your finger never hides it
    const r = cv.getBoundingClientRect();
    input.rel += (e.clientX - touchX) / r.width * W * 1.3;
    touchX = e.clientX;
  }
});
const release = e => { if (e.pointerType === 'mouse') input.fireHeld = false; else touchX = null; };
addEventListener('pointerup', release);
addEventListener('pointercancel', release);

addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { input.left = true; input.abs = null; }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { input.right = true; input.abs = null; }
  else if (k === ' ') {
    if (state !== 'play') return;
    e.preventDefault();
    if (!e.repeat) { audio.unlockAudio(); action(G); }
    input.fireHeld = true;
  }
  else if (k === 'p' || k === 'P' || k === 'Escape') { if (state === 'play') pause(); else if (state === 'paused') resume(); }
  else if (k === 'Enter' && state === 'intro') { audio.unlockAudio(); play(); }
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') input.left = false;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') input.right = false;
  if (k === ' ') input.fireHeld = false;
});
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- Demo mode (runs on the start page) ----------
const DEMO_LEVELS = [7, 12, 14, 22, 25, 29, 40, 42, 47, 53, 60, 62, 68, 72];
function startDemo() {
  const n = DEMO_LEVELS[Math.floor(Math.random() * DEMO_LEVELS.length)];
  G = createGame({ level: n, mode: 'practice', hooks: {} });
  G.texts.push({ x: W / 2, y: 330, s: `${label(n)}  ${G.L.name}`, color: '#fff', size: 30, life: 90, max: 90 });
  state = 'demo';
}

// ---------- Main loop ----------
function frame(now) {
  const dt = Math.min(40, now - last); last = now;
  if (state === 'play' || state === 'demo') {
    const inp = state === 'demo' ? botInput(G) : input;
    if (state === 'demo' && inp.launch) action(G);
    update(G, dt, inp);
    input.rel = 0;
    if (state === 'demo') {
      if (G.status !== 'play') { state = 'demo-wait'; setTimeout(startDemo, 1500); }
    } else if (G.status === 'clear') onClear();
    else if (G.status === 'over') onOver();
  }
  if (G) renderer.draw(G, now, { shake: settings.shake, flashes: settings.flashes, motion: settings.motion, hint: state === 'play' });
  requestAnimationFrame(frame);
}

if (DEMO) { document.body.classList.add('demo'); startDemo(); }
else toMenu();
requestAnimationFrame(frame);
