// Vibe Coded Breakout 2.0
// Copyright (c) 2025-2026 SALA CO FOR COMPUTER CONSULTING AND FACILITIES MANAGEMENT (sala.company), Kuwait
// Released under the MIT License. See the LICENSE file for the full text.

// Browser test runner for Breakout 2.0. Open v2/tests.html to run it.
import { LEVELS, COLS, LEVELS_PER_WORLD } from './levels.js';
import { createGame, update, action, applyPow, botInput, breakableLeft, PAD_Y } from './game.js';

const results = { pass: 0, fail: 0, failures: [], sim: [] };
const list = document.getElementById('checks');
function check(name, ok, detail = '') {
  results[ok ? 'pass' : 'fail']++;
  if (!ok) results.failures.push(name + (detail ? ': ' + detail : ''));
  const li = document.createElement('li');
  li.className = ok ? 'ok' : 'bad';
  li.textContent = (ok ? '✓ ' : '✗ ') + name + (detail && !ok ? ' — ' + detail : '');
  list.appendChild(li);
}
const step = (G, frames, inp = {}) => { for (let i = 0; i < frames && G.status === 'play'; i++) update(G, 16.667, inp); };

// ---------- Level data ----------
check('There are 76 levels', LEVELS.length === 76, `found ${LEVELS.length}`);
const bad = [];
for (const L of LEVELS) {
  const where = `${L.n} ${L.name}`;
  if (L.map.length > 13) bad.push(`${where}: ${L.map.length} rows (max 13)`);
  L.map.forEach((row, r) => {
    if (row.length !== COLS) bad.push(`${where}: row ${r} has ${row.length} cells`);
    if (/[^.123MXG?PQK]/.test(row)) bad.push(`${where}: row ${r} has an unknown brick`);
  });
  const cells = L.map.join('');
  for (const p of 'PQ') { const c = cells.split(p).length - 1; if (c && c !== 2) bad.push(`${where}: portal ${p} appears ${c} times`); }
  if (!/[123XG?K]/.test(cells)) bad.push(`${where}: nothing to break`);
  const boss = (cells.match(/K/g) || []).length;
  const shouldBoss = L.n % LEVELS_PER_WORLD === 0;
  if (shouldBoss !== (boss === 1 && L.boss > 0)) bad.push(`${where}: boss setup is wrong`);
  if (boss) {
    const r = L.map.findIndex(row => row.includes('K')), c = L.map[r].indexOf('K');
    if (c > COLS - 3) bad.push(`${where}: boss does not fit`);
    for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 3; dc++) if ((dr || dc) && L.map[r + dr] && L.map[r + dr][c + dc] !== '.') bad.push(`${where}: boss overlaps a brick`);
  }
  const G = createGame({ level: L.n });
  if (G.slides.length !== L.slide.length) bad.push(`${where}: a sliding row has no room to move`);
}
check('Every level map is valid', bad.length === 0, bad.join('; '));

// ---------- Power-ups ----------
{
  const G = createGame({ level: 1 });
  action(G); step(G, 30);
  applyPow(G, 'M');
  check('Multi-Ball turns 1 ball into 3', G.balls.length === 3, `${G.balls.length} balls`);
}
{
  const G = createGame({ level: 1 });
  action(G);
  applyPow(G, 'C');
  const b = G.balls[0]; b.x = G.pad.x; b.y = PAD_Y - 40; b.dx = 0; b.dy = 1;
  step(G, 20);
  check('Catch holds the ball on the bat', b.stuck === true);
  step(G, 200);
  check('A caught ball releases itself after a moment', b.stuck === false);
}
{
  const G = createGame({ level: 1 });
  action(G);
  applyPow(G, 'F');
  const b = G.balls[0]; b.x = 400; b.y = 200; b.dx = 0; b.dy = -1;
  const before = breakableLeft(G);
  step(G, 25);
  check('Fireball smashes through a column of bricks', before - breakableLeft(G) >= 3 && b.dy < 0, `${before - breakableLeft(G)} broken, moving ${b.dy < 0 ? 'up' : 'down'}`);
}
{
  const G = createGame({ level: 1 });
  action(G);
  applyPow(G, 'B');
  const b = G.balls[0]; b.x = 400; b.y = 220; b.dx = 0; b.dy = -1;
  const before = breakableLeft(G);
  step(G, 30);
  check('Super Bomb clears a big area', before - breakableLeft(G) >= 15, `${before - breakableLeft(G)} broken`);
}
{
  const G = createGame({ level: 1 });
  action(G); applyPow(G, 'R');
  G.balls[0].x = 20; G.balls[0].y = 400; G.balls[0].dx = .3; G.balls[0].dy = .95;
  action(G);
  check('Rockets fire on tap', G.shots.filter(s => s.kind === 'R').length === 2);
  action(G);
  check('Rockets have a cool-down', G.shots.filter(s => s.kind === 'R').length === 2);
}
{
  const G = createGame({ level: 1 });
  applyPow(G, 'V');
  update(G, 16.667, { abs: 600 });
  check('Reverse flips mouse steering', Math.abs(G.pad.x - 200) < 1, `bat at ${G.pad.x}`);
}
{
  const G = createGame({ level: 1 });
  applyPow(G, 'W');
  step(G, 60);
  const wide = G.pad.w;
  applyPow(G, 'N');
  step(G, 60);
  check('Big Bat and Shrink cancel each other', wide > 150 && G.pad.w < 80, `${wide} then ${G.pad.w}`);
}
{
  const G = createGame({ level: 39 });
  action(G);
  const [a, b] = G.portals;
  const ball = G.balls[0]; ball.x = b.x; ball.y = b.y + 30; ball.dx = 0; ball.dy = -1;
  step(G, 10);
  check('Portals teleport the ball to their twin', Math.abs(ball.x - a.x) < 40 && ball.y < b.y - 100, `ball at ${ball.x | 0},${ball.y | 0}`);
}
{
  const G = createGame({ level: 12 });
  const row = G.bricks.filter(b => b.row === 1);
  const x0 = row[0].x;
  step(G, 120);
  check('Sliding rows move', Math.abs(row[0].x - x0) > 5);
}
{
  const G = createGame({ level: 1 });
  G.bricks = G.bricks.slice(0, 2); G.lastBreak = -10000; G.time = 0;
  action(G);
  step(G, 5);
  check('Homing switches on when a few bricks are left', G.homing === true);
}

// ---------- Scoring, stars and runs ----------
{
  const G = createGame({ level: 1, score: 5000, lives: 2, mode: 'run' });
  G.bricks.forEach(b => b.dead = true);
  update(G, 16.667, {});
  check('Clearing a level ends it', G.status === 'clear');
  check('Run score carries over', G.score > 5000 && G.levelScore === G.score - 5000);
  check('No lives lost and fast earns 3 stars', G.result.stars === 3, `${G.result.stars} stars`);
}
{
  const G = createGame({ level: 1 });
  action(G);
  G.balls[0].y = 700; G.balls[0].dy = 1;
  step(G, 30);
  G.bricks.forEach(b => b.dead = true);
  step(G, 30);
  check('Losing a life caps the level at 1 star', G.livesLost === 1 && G.result && G.result.stars === 1, `lives lost ${G.livesLost}`);
}
{
  const G = createGame({ level: 1, lives: 1 });
  action(G);
  G.balls[0].y = 700; G.balls[0].dy = 1;
  step(G, 60);
  check('Losing the last life ends the game', G.status === 'over');
}
{
  const G = createGame({ level: 19 });
  check('Boss levels have a boss', !!G.boss && G.boss.b.hp === 25);
  G.boss.b.hp = 1;
  action(G);
  for (let i = 0; i < 30 && !G.boss.b.dead; i++) {
    // Keep the ball just under the moving boss until it connects
    const ball = G.balls[0], boss = G.boss.b;
    ball.x = boss.x + boss.w / 2; ball.y = boss.y + boss.h + 12; ball.dx = 0; ball.dy = -1;
    step(G, 3);
  }
  step(G, 30);
  check('Defeating a boss scores 5,000+', G.boss.b.dead && G.score >= 5000, `score ${G.score}`);
}

// ---------- Bot plays every level ----------
const tbody = document.querySelector('#sim tbody');
const summary = document.getElementById('summary');
const LIMIT = 15 * 60 * 1000;
let n = 1;
function simNext() {
  if (n > LEVELS.length) return finish();
  const G = createGame({ level: n, lives: 9 });
  while (G.status === 'play' && G.time < LIMIT) {
    const inp = botInput(G);
    if (inp.launch) action(G);
    update(G, 16.667, inp);
  }
  const row = { n, name: G.L.name, status: G.status, secs: Math.round(G.time / 1000), par: G.par, lost: G.livesLost, stars: G.result ? G.result.stars : 0 };
  results.sim.push(row);
  const tr = document.createElement('tr');
  const cls = row.status === 'clear' ? 'ok' : 'bad';
  tr.innerHTML = `<td>${n}</td><td>${row.name}</td><td class="${cls}">${row.status === 'clear' ? 'cleared' : row.status === 'over' ? 'game over' : 'timed out'}</td>` +
    `<td class="${row.secs > row.par * 3 ? 'warn' : ''}">${row.secs}s</td><td>${row.par}s</td><td>${row.lost}</td><td>${'★'.repeat(row.stars)}</td>`;
  tbody.appendChild(tr);
  summary.textContent = `Bot playing level ${n} of ${LEVELS.length}…`;
  n++;
  setTimeout(simNext, 0);
}
function finish() {
  const failed = results.sim.filter(r => r.status !== 'clear');
  check('The bot can finish all 76 levels', failed.length === 0, failed.map(r => `${r.n} ${r.name} (${r.status})`).join(', '));
  const slow = results.sim.filter(r => r.secs > r.par * 3);
  results.slow = slow.map(r => r.n);
  summary.className = results.fail ? 'bad' : 'ok';
  summary.textContent = `${results.pass} passed, ${results.fail} failed` + (slow.length ? ` · ${slow.length} levels took the bot over 3x the target time` : '');
  window.testResults = results;
}
setTimeout(simNext, 50);
