// Vibe Coded Breakout 2.0
// Copyright (c) 2025-2026 SALA CO FOR COMPUTER CONSULTING AND FACILITIES MANAGEMENT (sala.company), Kuwait
// Released under the MIT License. See the LICENSE file for the full text.

// Breakout 2.0 game logic. No DOM access here, so the test page can run it headless.
import { LEVELS, WORLDS, COLS } from './levels.js';

export const W = 800, H = 600, HUD = 44;
export const BW = 56, BH = 22, GAP = 4, OX = (W - (COLS * (BW + GAP) - GAP)) / 2, OY = 80;
export const PAD_Y = 560, PAD_H = 14, PAD_W = 110, PAD_WIDE = 175, PAD_SMALL = 70;
export const BALL_R = 8;
const BOSS_W = 3 * BW + 2 * GAP, BOSS_H = 2 * BH + GAP;

// Power-ups. good: false marks the ones to avoid.
export const POW = {
  M: { name: 'MULTI-BALL', color: '#38f9d7', label: 'M', weight: 16, good: true },
  R: { name: 'ROCKETS', color: '#ff6b3d', label: 'R', weight: 9, good: true, time: 12000 },
  Z: { name: 'LASERS', color: '#ff3df0', label: 'Z', weight: 9, good: true, time: 12000 },
  B: { name: 'SUPER BOMB', color: '#ff2e63', label: 'B', weight: 7, good: true },
  $: { name: 'BONUS', color: '#ffd23f', label: '$', weight: 17, good: true },
  W: { name: 'BIG BAT', color: '#4f8bff', label: 'W', weight: 12, good: true, time: 15000 },
  S: { name: 'SLOW BALL', color: '#b36bff', label: 'S', weight: 7, good: true, time: 10000 },
  C: { name: 'CATCH', color: '#7dffb0', label: 'C', weight: 9, good: true, time: 15000 },
  F: { name: 'FIREBALL', color: '#ff9d2e', label: 'F', weight: 6, good: true, time: 8000 },
  L: { name: '+1 LIFE', color: '#7dff6b', label: '+', weight: 3, good: true },
  N: { name: 'SHRINK', color: '#8b8fa8', label: '–', weight: 5, good: false, time: 10000 },
  Q: { name: 'FAST BALL', color: '#ff5a5a', label: '»', weight: 5, good: false, time: 8000 },
  V: { name: 'REVERSE', color: '#c7c7c7', label: '⇄', weight: 4, good: false, time: 6000 },
};
const TIMED = Object.keys(POW).filter(k => POW[k].time);

function pickPow(goodOnly) {
  const keys = Object.keys(POW).filter(k => !goodOnly || POW[k].good);
  let x = Math.random() * keys.reduce((s, k) => s + POW[k].weight, 0);
  for (const k of keys) { x -= POW[k].weight; if (x < 0) return k; }
  return '$';
}

const noop = () => {};

// ---------- Setup ----------
export function createGame({ level = 1, score = 0, lives = 3, mode = 'run', hooks = {} } = {}) {
  const L = LEVELS[level - 1];
  const G = {
    level, L, world: L.world, mode, score, lives,
    levelScore: 0, livesLost: 0, time: 0, status: 'play',
    hooks: { sfx: noop, shake: noop, vibrate: noop, flash: noop, ...hooks },
    bricks: [], portals: [], balls: [], caps: [], shots: [], orbs: [], parts: [], texts: [],
    pad: { x: W / 2, w: PAD_W, tw: PAD_W, squash: 0 },
    pow: {}, combo: 0, bestCombo: 0, shake: 0, freeze: 0, flash: 0,
    rocketCd: 0, laserCd: 0, lastBreak: 0, homing: false, boss: null, result: null,
  };
  TIMED.forEach(k => G.pow[k] = 0);
  const pal = WORLDS[L.world].palette;
  const portalCells = {};
  L.map.forEach((row, r) => [...row].forEach((ch, c) => {
    const x = OX + c * (BW + GAP), y = OY + r * (BH + GAP);
    if (ch === '.') return;
    if (ch === 'P' || ch === 'Q') { (portalCells[ch] = portalCells[ch] || []).push({ x: x + BW / 2, y: y + BH / 2, key: ch }); return; }
    if (ch === 'K') {
      const b = { kind: 'K', x, y, bx: x, w: BOSS_W, h: BOSS_H, hp: L.boss, max: L.boss, row: r, flash: 0, dead: false, color: WORLDS[L.world].accent };
      G.bricks.push(b); G.boss = { b, attackCd: 3000, dropCd: 0, phase: Math.random() * 6 };
      return;
    }
    const kind = '123'.includes(ch) ? 'n' : ch;
    const hp = kind === 'n' ? +ch : kind === 'G' ? 2 : kind === 'M' ? Infinity : 1;
    G.bricks.push({ kind, x, y, bx: x, w: BW, h: BH, hp, max: hp, row: r, flash: 0, dead: false, color: pal[r % pal.length] });
  }));
  for (const k in portalCells) {
    const [a, b] = portalCells[k];
    if (a && b) { a.to = b; b.to = a; G.portals.push(a, b); }
  }
  // Sliding rows glide as far as their empty edge cells allow
  G.slides = L.slide.map((row, i) => {
    const cols = G.bricks.filter(b => b.row === row && b.kind !== 'K').map(b => Math.round((b.bx - OX) / (BW + GAP)));
    if (!cols.length) return null;
    const room = Math.min(Math.min(...cols), COLS - 1 - Math.max(...cols));
    return room > 0 ? { row, amp: room * (BW + GAP) - 2, phase: i % 2 ? Math.PI : 0, speed: .0011 + (G.world * .00015) } : null;
  }).filter(Boolean);

  const totalHp = G.bricks.filter(b => b.kind !== 'M').reduce((s, b) => s + b.hp, 0);
  const metal = G.bricks.filter(b => b.kind === 'M').length;
  G.par = Math.round(30 + totalHp * 1.1 + metal * 1.5 + G.portals.length * 10 + (L.boss ? L.boss * 1.5 : 0));
  G.baseSpeed = 4.9 + G.world * .4 + (L.stage - 1) * .025;
  G.speed = G.baseSpeed; G.maxSpeed = G.baseSpeed * 1.4;
  spawnBall(G);
  return G;
}

function spawnBall(G) {
  G.balls.push({ x: G.pad.x, y: PAD_Y - BALL_R - 1, dx: 0, dy: -1, r: BALL_R, stuck: true, off: 0, catchT: 0, bomb: false, trail: [], portalCd: 0 });
}

export function breakableLeft(G) { return G.bricks.reduce((n, b) => n + (!b.dead && b.kind !== 'M' ? 1 : 0), 0); }

function norm(b) {
  const m = Math.hypot(b.dx, b.dy) || 1; b.dx /= m; b.dy /= m;
  if (Math.abs(b.dy) < .26) { b.dy = .26 * (b.dy < 0 ? -1 : 1); b.dx = Math.sign(b.dx || 1) * Math.sqrt(1 - .26 * .26); }
}

// ---------- Effects ----------
function text(G, x, y, s, color = '#fff', size = 18, life = 60) { if (G.texts.length < 40) G.texts.push({ x, y, s, color, size, life, max: life }); }
function burst(G, x, y, color, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * sp + .5;
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, decay: .025 + Math.random() * .03, color, s: 2 + Math.random() * 3 });
  }
}
function crumble(G, b) {
  // The brick splits into chunks that tumble away
  const cw = b.w / 3, ch = b.h / 2;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    G.parts.push({ chunk: true, x: b.x + cw * (i + .5), y: b.y + ch * (j + .5), w: cw - 2, h: ch - 2, vx: (i - 1) * 1.6 + (Math.random() - .5) * 2, vy: -2 - Math.random() * 2 + j,
                   rot: 0, vr: (Math.random() - .5) * .3, life: 1, decay: .022, color: b.kind === 'G' ? '#ffd23f' : b.kind === 'X' ? '#ff8a3d' : b.kind === '?' ? '#ffffff' : b.color });
  }
  burst(G, b.x + b.w / 2, b.y + b.h / 2, '#ffffff', 4, 2);
}
function ring(G, x, y, R, color) { G.parts.push({ ring: true, x, y, R, r: 4, life: 1, color }); }
function shake(G, n) { G.shake = Math.max(G.shake, n); G.hooks.shake(n); }
function addScore(G, p) { G.score += p; G.levelScore += p; }

// ---------- Bricks ----------
function hitBrick(G, b, dmg = 1, force = false) {
  if (b.dead) return;
  b.flash = 1;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (b.kind === 'K') return hitBoss(G, b, dmg);
  if (b.kind === 'M' && !force) { G.hooks.sfx('metal'); return; }
  b.hp -= dmg;
  if (b.hp > 0) { G.hooks.sfx('tough'); burst(G, cx, cy, b.color, 4, 2); return; }
  b.dead = true;
  G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.lastBreak = G.time;
  const mult = Math.min(5, 1 + Math.floor(G.combo / 4));
  const base = b.kind === 'G' ? 1000 : b.kind === 'M' ? 500 : 50 * (b.max || 1);
  const pts = base * mult;
  addScore(G, pts);
  text(G, cx, cy, '+' + pts.toLocaleString(), mult > 1 || b.kind === 'G' ? '#ffd23f' : '#fff', b.kind === 'G' ? 18 : 13, 40);
  if (mult > 1 && G.combo % 4 === 0) text(G, cx, cy - 22, 'COMBO x' + mult, '#ffd23f', 20, 55);
  crumble(G, b);
  G.hooks.sfx('brick', G.combo);
  const left = breakableLeft(G);
  if (b.kind === 'G') drop(G, cx, cy, '$');
  else if (b.kind === '?') drop(G, cx, cy, pickPow(true));
  else if (Math.random() < (b.kind === 'X' ? .3 : left <= 8 ? .35 : .15)) drop(G, cx, cy, pickPow(false));
  if (b.kind === 'X') explode(G, cx, cy, 72, false);
}
function drop(G, x, y, k) { if (G.caps.length < 12) G.caps.push({ x, y, k, vy: 2.1, spin: Math.random() * 6 }); }

function hitBoss(G, b, dmg) {
  b.hp -= dmg; G.freeze = Math.max(G.freeze, 45); G.hooks.sfx('bossHit');
  burst(G, b.x + b.w / 2, b.y + b.h, b.color, 8, 3);
  if (G.boss.dropCd <= 0 && Math.random() < .3) { drop(G, b.x + b.w / 2, b.y + b.h, pickPow(true)); G.boss.dropCd = 2500; }
  if (b.hp > 0) return;
  b.dead = true;
  const pts = 5000 * (G.world + 1);
  addScore(G, pts);
  G.freeze = 350; shake(G, 22); G.flash = 1; G.hooks.flash(1); G.hooks.vibrate(300);
  for (let i = 0; i < 5; i++) ring(G, b.x + b.w / 2, b.y + b.h / 2, 90 + i * 40, i % 2 ? '#ffd23f' : b.color);
  burst(G, b.x + b.w / 2, b.y + b.h / 2, b.color, 60, 9); burst(G, b.x + b.w / 2, b.y + b.h / 2, '#ffd23f', 40, 7);
  text(G, W / 2, 300, 'BOSS DEFEATED!', '#ffd23f', 36, 110);
  text(G, W / 2, 340, '+' + pts.toLocaleString(), '#fff', 24, 110);
  G.hooks.sfx('boom', true);
  G.orbs = [];
}

function explode(G, x, y, R, superBomb) {
  shake(G, superBomb ? 16 : 6);
  G.freeze = Math.max(G.freeze, superBomb ? 130 : 35);
  ring(G, x, y, R, superBomb ? '#ff2e63' : '#ff8a3d');
  burst(G, x, y, superBomb ? '#ff2e63' : '#ff8a3d', superBomb ? 45 : 16, superBomb ? 9 : 5);
  burst(G, x, y, '#ffd23f', superBomb ? 25 : 8, superBomb ? 7 : 4);
  if (superBomb) { G.flash = Math.max(G.flash, .8); G.hooks.flash(.8); G.hooks.vibrate(120); }
  G.hooks.sfx('boom', superBomb);
  for (const b of G.bricks) {
    if (b.dead) continue;
    const dx = Math.max(Math.abs(x - (b.x + b.w / 2)) - b.w / 2, 0), dy = Math.max(Math.abs(y - (b.y + b.h / 2)) - b.h / 2, 0);
    if (dx * dx + dy * dy > R * R) continue;
    if (b.kind === 'K') hitBoss(G, b, superBomb ? 10 : 3);
    else hitBrick(G, b, 99, superBomb);
  }
}

// ---------- Power-ups ----------
export function applyPow(G, k, x = G.pad.x) {
  const p = POW[k];
  text(G, x, PAD_Y - 30, p.name + '!', p.color, 20, 70);
  burst(G, x, PAD_Y, p.color, 14, 4);
  G.hooks.sfx(p.good ? 'power' : 'bad');
  if (k === '$') {
    const prizes = [250, 500, 500, 1000, 1000, 2500, 5000];
    const v = prizes[Math.floor(Math.random() * prizes.length)];
    addScore(G, v); text(G, x, PAD_Y - 56, '+' + v.toLocaleString(), '#ffd23f', 28, 80); G.hooks.sfx('coin');
    return;
  }
  if (k === 'M') {
    const add = [];
    for (const b of G.balls) {
      if (b.stuck) { b.stuck = false; aimFromPaddle(G, b); }
      for (const da of [-.45, .45]) {
        if (G.balls.length + add.length >= 15) break;
        const a = Math.atan2(b.dy, b.dx) + da;
        const nb = { ...b, dx: Math.cos(a), dy: Math.sin(a), trail: [], stuck: false };
        norm(nb); add.push(nb);
      }
    }
    G.balls.push(...add);
  }
  if (k === 'B') G.balls.forEach(b => b.bomb = true);
  if (k === 'L') G.lives = Math.min(9, G.lives + 1);
  if (k === 'W') G.pow.N = 0;
  if (k === 'N') G.pow.W = 0;
  if (k === 'S') G.pow.Q = 0;
  if (k === 'Q') G.pow.S = 0;
  if (p.time) G.pow[k] = p.time;
}

function aimFromPaddle(G, b) {
  const rel = Math.max(-1, Math.min(1, (b.x - G.pad.x) / (G.pad.w / 2)));
  const a = rel * 1.0 + (rel === 0 ? (Math.random() - .5) * .3 : 0);
  b.dx = Math.sin(a); b.dy = -Math.cos(a); norm(b);
}

// Click, tap or Space: launch a waiting ball, otherwise fire weapons
export function action(G) {
  const stuck = G.balls.filter(b => b.stuck);
  if (stuck.length) {
    stuck.forEach(b => { b.stuck = false; b.catchT = 0; aimFromPaddle(G, b); });
    G.hooks.sfx('launch');
    return;
  }
  fire(G);
}
function fire(G) {
  const p = G.pad, l = p.x - p.w / 2 + 8, r = p.x + p.w / 2 - 8;
  if (G.pow.R > 0 && G.rocketCd <= 0) {
    G.rocketCd = 450; G.hooks.sfx('rocket');
    G.shots.push({ kind: 'R', x: l, y: PAD_Y - 6, v: 9 }, { kind: 'R', x: r, y: PAD_Y - 6, v: 9 });
  }
  if (G.pow.Z > 0 && G.laserCd <= 0) {
    G.laserCd = 170; G.hooks.sfx('laser');
    G.shots.push({ kind: 'Z', x: l, y: PAD_Y - 4, v: 15 }, { kind: 'Z', x: r, y: PAD_Y - 4, v: 15 });
  }
}

// ---------- Update ----------
// input: { abs: x|null (mouse position), rel: dx (touch drag), left, right, fireHeld }
export function update(G, dt, input = {}) {
  if (G.status !== 'play') return;
  if (G.freeze > 0) { G.freeze -= dt; return; }
  const k = dt / 16.667;
  G.time += dt;
  const pad = G.pad, pow = G.pow;

  for (const key of TIMED) if (pow[key] > 0) pow[key] = Math.max(0, pow[key] - dt);
  pad.tw = pow.N > 0 ? PAD_SMALL : pow.W > 0 ? PAD_WIDE : PAD_W;
  pad.w += (pad.tw - pad.w) * Math.min(1, .2 * k);
  G.speed = Math.min(G.maxSpeed, G.speed + .00035 * k);
  const speed = G.speed * (pow.S > 0 ? .65 : 1) * (pow.Q > 0 ? 1.35 : 1);
  G.rocketCd -= dt; G.laserCd -= dt;
  if (G.boss) G.boss.dropCd -= dt;

  // Paddle
  const rev = pow.V > 0 ? -1 : 1;
  if (input.abs != null) pad.x = rev > 0 ? input.abs : W - input.abs;
  if (input.rel) pad.x += input.rel * rev;
  if (input.left) pad.x -= 11 * k * rev;
  if (input.right) pad.x += 11 * k * rev;
  pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, pad.x));
  pad.squash = Math.max(0, pad.squash - .08 * k);
  if (input.fireHeld && !G.balls.some(b => b.stuck)) fire(G);

  // Sliding rows
  for (const s of G.slides) {
    const off = Math.sin(G.time * s.speed + s.phase) * s.amp;
    for (const b of G.bricks) if (b.row === s.row && b.kind !== 'K') b.x = b.bx + off;
  }

  updateBoss(G, dt, k);
  updateShots(G, k);
  updateBalls(G, dt, k, speed);
  updateHoming(G, k);

  // Capsules
  for (const c of G.caps) {
    c.y += c.vy * k; c.spin += .08 * k;
    if (c.y + 9 >= PAD_Y && c.y - 9 <= PAD_Y + PAD_H && Math.abs(c.x - pad.x) < pad.w / 2 + 18) { c.dead = true; applyPow(G, c.k, c.x); }
    if (c.y > H + 20) c.dead = true;
  }
  G.caps = G.caps.filter(c => !c.dead);

  // Particles and floating text
  for (const p of G.parts) {
    if (p.ring) { p.r += (p.R - p.r) * .18 * k; p.life -= .035 * k; continue; }
    p.x += p.vx * k; p.y += p.vy * k; p.vy += .18 * k; p.life -= p.decay * k;
    if (p.chunk) p.rot += p.vr * k;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
  for (const t of G.texts) { t.y -= .6 * k; t.life -= k; }
  G.texts = G.texts.filter(t => t.life > 0);
  for (const b of G.bricks) if (b.flash > 0) b.flash = Math.max(0, b.flash - .08 * k);
  G.shake *= Math.pow(.88, k);
  G.flash = Math.max(0, G.flash - .05 * k);
  G.bricks = G.bricks.filter(b => !b.dead);

  // Lost every ball
  if (!G.balls.length) {
    G.lives--; G.livesLost++; G.combo = 0;
    G.hooks.sfx('lose'); G.hooks.vibrate(200); shake(G, 10); G.freeze = 250;
    TIMED.forEach(key => pow[key] = 0);
    G.caps = []; G.shots = []; G.orbs = [];
    G.speed = G.baseSpeed;
    if (G.lives <= 0) { G.status = 'over'; return; }
    text(G, W / 2, 380, 'BALL LOST', '#ff2e63', 28, 70);
    spawnBall(G);
  }

  if (breakableLeft(G) === 0) finishLevel(G);
}

function updateBoss(G, dt, k) {
  const B = G.boss;
  if (!B || B.b.dead) return;
  const b = B.b, rage = 1 + (1 - b.hp / b.max) * 1.2;
  B.phase += .0009 * dt * rage;
  b.x = OX + (W - 2 * OX - b.w) / 2 * (1 + Math.sin(B.phase));
  B.attackCd -= dt * rage;
  if (B.attackCd <= 0) {
    B.attackCd = 3400;
    G.orbs.push({ x: b.x + b.w / 2, y: b.y + b.h, vy: 2.6 + G.world * .3 });
    G.hooks.sfx('orb');
  }
  for (const o of G.orbs) {
    o.y += o.vy * k;
    if (o.y + 8 >= PAD_Y && o.y - 8 <= PAD_Y + PAD_H && Math.abs(o.x - G.pad.x) < G.pad.w / 2 + 6) {
      o.dead = true; G.pow.N = 4000; G.pow.W = 0; G.combo = 0;
      text(G, o.x, PAD_Y - 30, 'ZAPPED!', '#ff2e63', 22, 60); burst(G, o.x, PAD_Y, '#ff2e63', 16, 4);
      G.hooks.sfx('bad'); G.hooks.vibrate(120); shake(G, 6);
    }
    if (o.y > H + 20) o.dead = true;
  }
  G.orbs = G.orbs.filter(o => !o.dead);
}

function updateShots(G, k) {
  for (const s of G.shots) {
    s.y -= s.v * k;
    if (s.kind === 'R' && Math.random() < .6) G.parts.push({ x: s.x, y: s.y + 12, vx: Math.random() - .5, vy: 2, life: .8, decay: .06, color: '#ffb13d', s: 3 });
    for (const b of G.bricks) {
      if (b.dead || s.x < b.x - 2 || s.x > b.x + b.w + 2 || s.y > b.y + b.h || s.y < b.y - 4) continue;
      s.dead = true;
      if (s.kind === 'R') { hitBrick(G, b, 2); if (b.kind !== 'M') explode(G, s.x, b.y + b.h / 2, 34, false); else burst(G, s.x, s.y, '#ffb13d', 6, 3); }
      else { hitBrick(G, b, 1); burst(G, s.x, s.y, '#ff3df0', 4, 2); }
      break;
    }
    if (s.y < HUD) s.dead = true;
  }
  G.shots = G.shots.filter(s => !s.dead);
}

function updateBalls(G, dt, k, speed) {
  const pad = G.pad, fireball = G.pow.F > 0, catching = G.pow.C > 0;
  const dist = speed * k;
  for (const b of G.balls) {
    if (b.stuck) {
      b.off = Math.max(-pad.w / 2 + 6, Math.min(pad.w / 2 - 6, b.off || 0));
      b.x = pad.x + b.off; b.y = PAD_Y - b.r - 1;
      if (b.catchT > 0 && (b.catchT -= dt) <= 0) { b.stuck = false; aimFromPaddle(G, b); }
      continue;
    }
    b.trail.push(b.x, b.y); if (b.trail.length > 16) b.trail.splice(0, 2);
    if (b.portalCd > 0) b.portalCd -= dt;
    const steps = Math.ceil(dist / 3);
    for (let s = 0; s < steps && !b.dead && !b.stuck; s++) {
      b.x += b.dx * dist / steps; b.y += b.dy * dist / steps;
      if (b.x < b.r) { b.x = b.r; b.dx = Math.abs(b.dx); G.hooks.sfx('wall'); }
      if (b.x > W - b.r) { b.x = W - b.r; b.dx = -Math.abs(b.dx); G.hooks.sfx('wall'); }
      if (b.y < HUD + b.r) { b.y = HUD + b.r; b.dy = Math.abs(b.dy); G.hooks.sfx('wall'); }
      if (b.y > H + 30) { b.dead = true; break; }

      // Portals
      if (b.portalCd <= 0) for (const p of G.portals) {
        if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 15 * 15) {
          // A small random turn on exit stops balls cycling through portals forever
          const a = Math.atan2(b.dy, b.dx) + (Math.random() - .5) * .35;
          b.dx = Math.cos(a); b.dy = Math.sin(a); norm(b);
          b.x = p.to.x + b.dx * 20; b.y = p.to.y + b.dy * 20; b.portalCd = 450; b.trail = [];
          ring(G, p.x, p.y, 26, '#8be9ff'); ring(G, p.to.x, p.to.y, 26, '#8be9ff');
          G.hooks.sfx('portal');
          break;
        }
      }

      // Paddle
      if (b.dy > 0 && b.y + b.r >= PAD_Y && b.y - b.r <= PAD_Y + PAD_H && b.x >= pad.x - pad.w / 2 - b.r && b.x <= pad.x + pad.w / 2 + b.r) {
        b.y = PAD_Y - b.r; pad.squash = 1; G.combo = 0;
        burst(G, b.x, PAD_Y, '#38f9d7', 4, 2);
        if (catching) { b.stuck = true; b.off = b.x - pad.x; b.catchT = 2500; G.hooks.sfx('catch'); break; }
        aimFromPaddle(G, b);
        G.hooks.sfx('paddle');
        continue;
      }

      // Bricks
      for (const br of G.bricks) {
        if (br.dead) continue;
        const cx = Math.max(br.x, Math.min(b.x, br.x + br.w)), cy = Math.max(br.y, Math.min(b.y, br.y + br.h));
        const ox = b.x - cx, oy = b.y - cy;
        if (ox * ox + oy * oy >= b.r * b.r) continue;
        if (b.bomb) {
          b.bomb = false;
          text(G, b.x, b.y - 10, 'SUPER BOMB!', '#ff2e63', 26, 70);
          explode(G, b.x, b.y, 150, true);
        } else if (fireball && br.kind !== 'M' && br.kind !== 'K') {
          hitBrick(G, br, 99);
          continue; // smash straight through
        }
        if (ox === 0 && oy === 0) b.dy = -b.dy;
        else if (Math.abs(ox) > Math.abs(oy)) { b.dx = Math.sign(ox) * Math.abs(b.dx); b.x = cx + Math.sign(ox) * b.r; }
        else { b.dy = Math.sign(oy) * Math.abs(b.dy); b.y = cy + Math.sign(oy) * b.r; }
        if (br.kind === 'M') {
          // A small random nudge off unbreakable bricks stops endless repeating bounces
          const a = Math.atan2(b.dy, b.dx) + (Math.random() - .5) * .25;
          b.dx = Math.cos(a); b.dy = Math.sin(a);
          if (Math.abs(b.dx) < .15) b.dx = .15 * (Math.random() < .5 ? -1 : 1);
        }
        norm(b);
        if (!br.dead) hitBrick(G, br, fireball ? 2 : 1);
        break;
      }
    }
  }
  G.balls = G.balls.filter(b => !b.dead);
}

// When only a few bricks are left and nothing has broken for a while, balls curve toward them
function updateHoming(G, k) {
  const left = G.bricks.filter(b => !b.dead && b.kind !== 'M');
  const since = G.time - G.lastBreak;
  G.homing = left.length > 0 && !(G.boss && !G.boss.b.dead) && ((left.length <= 6 && since > 5000) || since > 15000);
  if (!G.homing) return;
  const metal = G.bricks.filter(b => !b.dead && b.kind === 'M');
  for (const b of G.balls) {
    if (b.stuck) continue;
    // Aim at the nearest brick the ball can actually see past the metal
    let best = null, bd = Infinity;
    for (const br of left) {
      const tx = br.x + br.w / 2, ty = br.y + br.h / 2, d = (tx - b.x) ** 2 + (ty - b.y) ** 2;
      if (d < bd && !metal.some(m => segmentHitsRect(b.x, b.y, tx, ty, m))) { bd = d; best = br; }
    }
    if (!best) continue;
    // Only bend balls heading toward the bricks, never ones dropping to the bat
    if (b.dy > 0 && best.y + best.h / 2 < b.y) continue;
    const want = Math.atan2(best.y + best.h / 2 - b.y, best.x + best.w / 2 - b.x), cur = Math.atan2(b.dy, b.dx);
    // A brick almost level with the ball can't be homed on without flattening it into a loop
    if (Math.abs(Math.sin(want)) < .3) continue;
    let diff = want - cur; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    const a = cur + Math.max(-.04 * k, Math.min(.04 * k, diff));
    b.dx = Math.cos(a); b.dy = Math.sin(a);
    norm(b); // never let homing flatten the ball into an endless sideways skim
  }
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Liang-Barsky clip of the segment against the rectangle
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const edges = [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]];
  for (const [p, q] of edges) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

function finishLevel(G) {
  const secs = G.time / 1000;
  const timeBonus = Math.max(0, Math.round((G.par - secs) * 25));
  const bonus = 1000 + G.lives * 250 + timeBonus;
  addScore(G, bonus);
  let stars = 1;
  if (G.livesLost === 0) stars = 2;
  if (G.livesLost === 0 && secs <= G.par) stars = 3;
  G.result = { stars, bonus, timeBonus, secs, par: G.par, levelScore: G.levelScore, bestCombo: G.bestCombo };
  G.status = 'clear';
  G.hooks.sfx('clear');
}

// ---------- Bot (used by the demo on the start page and by the tests) ----------
export function botInput(G) {
  const pad = G.pad;
  if (G.balls.some(b => b.stuck)) return { launch: true };
  let target = null, soonest = Infinity;
  for (const b of G.balls) {
    if (b.dy <= 0) continue;
    const t = (PAD_Y - b.r - b.y) / (b.dy || 1e-6);
    if (t < soonest) { soonest = t; target = b; }
  }
  let x;
  if (target) {
    // Predict where the ball meets the bat, bouncing off the side walls
    const span = W - 2 * target.r;
    let px = target.x - target.r + target.dx * soonest;
    px = ((px % (2 * span)) + 2 * span) % (2 * span);
    if (px > span) px = 2 * span - px;
    x = px + target.r - Math.sin(G.time / 700) * pad.w * .3;
  } else {
    const cap = G.caps.find(c => POW[c.k].good);
    x = cap ? cap.x : G.balls[0] ? G.balls[0].x : W / 2;
  }
  const orb = G.orbs.find(o => o.y > PAD_Y - 120 && Math.abs(o.x - x) < pad.w / 2 + 10);
  if (orb && !target) x = orb.x + (orb.x < W / 2 ? 1 : -1) * (pad.w + 20);
  const want = pad.x + Math.max(-14, Math.min(14, x - pad.x));
  return { abs: G.pow.V > 0 ? W - want : want, fireHeld: G.pow.R > 0 || G.pow.Z > 0 };
}
