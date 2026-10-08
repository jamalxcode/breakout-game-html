// Vibe Coded Breakout 2.0
// Copyright (c) 2025-2026 SALA CO FOR COMPUTER CONSULTING AND FACILITIES MANAGEMENT (sala.company), Kuwait
// Released under the MIT License. See the LICENSE file for the full text.

// Breakout 2.0 drawing. Bricks, glows and backgrounds are drawn once into
// offscreen canvases and reused every frame, which keeps cheap phones smooth.
import { W, H, HUD, BW, BH, PAD_Y, PAD_H, POW } from './game.js';
import { WORLDS } from './levels.js';

function makeCanvas(w, h, scale) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const x = c.getContext('2d'); x.scale(scale, scale);
  return [c, x];
}
function rr(x, l, t, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(l, t, w, h, r) : x.rect(l, t, w, h); }
function seeded(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function createRenderer(ctx) {
  let scale = 1;
  const bricks = new Map(), backgrounds = new Map(), glows = new Map();
  const motes = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + .5, p: Math.random() * 6 }));

  function setScale(s) {
    if (s === scale) return;
    scale = s; bricks.clear(); backgrounds.clear(); glows.clear();
  }

  // ---------- Cached sprites ----------
  function brickSprite(b) {
    const key = b.kind + b.color + b.hp + '/' + b.max;
    let s = bricks.get(key);
    if (s) return s;
    const [c, x] = makeCanvas(BW, BH, scale);
    const shade = x.createLinearGradient(0, 0, 0, BH);
    rr(x, 0, 0, BW, BH, 5);
    if (b.kind === 'M') {
      const g = x.createLinearGradient(0, 0, 0, BH);
      g.addColorStop(0, '#e2e6f3'); g.addColorStop(.5, '#8b8fa8'); g.addColorStop(1, '#4e5268');
      x.fillStyle = g; x.fill();
      x.fillStyle = '#3d4052';
      for (const [px, py] of [[5, 5], [BW - 5, 5], [5, BH - 5], [BW - 5, BH - 5]]) { x.beginPath(); x.arc(px, py, 1.8, 0, 7); x.fill(); }
    } else if (b.kind === 'X') {
      x.fillStyle = '#2a2230'; x.fill();
      x.save(); rr(x, 0, 0, BW, BH, 5); x.clip();
      x.fillStyle = '#ff9d2e';
      for (let i = -BH; i < BW; i += 12) { x.beginPath(); x.moveTo(i, BH); x.lineTo(i + 6, BH); x.lineTo(i + 6 + BH, 0); x.lineTo(i + BH, 0); x.fill(); }
      x.restore();
      x.fillStyle = '#2a2230'; x.beginPath(); x.arc(BW / 2, BH / 2, 8, 0, 7); x.fill();
      x.strokeStyle = '#ffe9a8'; x.lineWidth = 2; x.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.moveTo(BW / 2, BH / 2); x.lineTo(BW / 2 + Math.cos(a) * 6, BH / 2 + Math.sin(a) * 6); }
      x.stroke();
    } else if (b.kind === 'G') {
      const g = x.createLinearGradient(0, 0, BW, BH);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(.45, '#ffc93d'); g.addColorStop(1, '#b8860b');
      x.fillStyle = g; x.fill();
      x.fillStyle = 'rgba(120,70,0,.85)'; x.font = '900 14px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', BW / 2, BH / 2 + 1);
    } else if (b.kind === '?') {
      const g = x.createLinearGradient(0, 0, BW, BH);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b9a6ff');
      x.fillStyle = g; x.fill();
      x.fillStyle = '#5a3bb0'; x.font = '900 15px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', BW / 2, BH / 2 + 1);
    } else {
      x.fillStyle = b.color; x.fill();
      if (b.hp < b.max) { x.fillStyle = `rgba(0,0,0,${.18 * (b.max - b.hp)})`; rr(x, 0, 0, BW, BH, 5); x.fill(); }
      if (b.max === 3) { x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; rr(x, 2, 2, BW - 4, BH - 4, 4); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.9)';
      if (b.max > 1) for (let i = 0; i < b.hp; i++) { x.beginPath(); x.arc(BW / 2 + (i - (b.hp - 1) / 2) * 9, BH / 2 + 2, 2.6, 0, 7); x.fill(); }
      if (b.hp < b.max) {
        x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 1.5; x.beginPath();
        x.moveTo(BW * .2, 0); x.lineTo(BW * .32, BH * .5); x.lineTo(BW * .25, BH);
        if (b.max - b.hp > 1) { x.moveTo(BW * .75, 0); x.lineTo(BW * .66, BH * .55); x.lineTo(BW * .8, BH); }
        x.stroke();
      }
    }
    // Shared bevel and top shine
    shade.addColorStop(0, 'rgba(255,255,255,.22)'); shade.addColorStop(.5, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(0,0,0,.28)');
    rr(x, 0, 0, BW, BH, 5); x.fillStyle = shade; x.fill();
    x.fillStyle = 'rgba(255,255,255,.3)'; rr(x, 3, 2, BW - 6, 3, 2); x.fill();
    s = c; bricks.set(key, s);
    return s;
  }

  function glow(color, size) {
    const key = color + size;
    let g = glows.get(key);
    if (g) return g;
    const [c, x] = makeCanvas(size * 2, size * 2, scale);
    const grad = x.createRadialGradient(size, size, 0, size, size, size);
    grad.addColorStop(0, color); grad.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = grad; x.fillRect(0, 0, size * 2, size * 2);
    glows.set(key, c);
    return c;
  }

  function background(world) {
    let bg = backgrounds.get(world);
    if (bg) return bg;
    const wd = WORLDS[world], rnd = seeded(world * 999 + 7);
    const [c, x] = makeCanvas(W, H, scale);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, wd.bg[0]); g.addColorStop(1, wd.bg[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (world === 0) {
      // Neon City: grid floor and a skyline with lit windows
      x.strokeStyle = 'rgba(255,79,216,.12)'; x.lineWidth = 1;
      for (let i = 0; i <= 20; i++) { x.beginPath(); x.moveTo(W / 2, 430); x.lineTo(i * 40 * 2 - W / 2, H); x.stroke(); }
      for (let y = 440; y < H; y += (y - 420) * .35) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
      let bx = 0;
      while (bx < W) {
        const bw = 30 + rnd() * 50, bh = 80 + rnd() * 200;
        x.fillStyle = 'rgba(10,6,30,.85)'; x.fillRect(bx, 430 - bh, bw - 4, bh);
        for (let wy = 430 - bh + 8; wy < 425; wy += 12) for (let wx = bx + 5; wx < bx + bw - 10; wx += 9) {
          if (rnd() < .3) { x.fillStyle = rnd() < .5 ? 'rgba(56,249,215,.35)' : 'rgba(255,79,216,.3)'; x.fillRect(wx, wy, 4, 5); }
        }
        bx += bw;
      }
    } else if (world === 1) {
      // Desert Mirage: setting sun and dunes
      const sun = x.createRadialGradient(560, 300, 10, 560, 300, 200);
      sun.addColorStop(0, 'rgba(255,190,90,.55)'); sun.addColorStop(.35, 'rgba(255,120,60,.25)'); sun.addColorStop(1, 'rgba(255,80,60,0)');
      x.fillStyle = sun; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,170,90,.35)'; x.beginPath(); x.arc(560, 300, 70, 0, 7); x.fill();
      [['rgba(90,30,40,.9)', 420, 40], ['rgba(60,20,32,.95)', 470, 30], ['rgba(35,12,22,1)', 520, 24]].forEach(([col, base, amp], i) => {
        x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
        for (let px = 0; px <= W; px += 10) x.lineTo(px, base + Math.sin(px / 140 + i * 2) * amp + Math.sin(px / 53 + i) * 8);
        x.lineTo(W, H); x.fill();
      });
    } else if (world === 2) {
      // Deep Ocean: light rays and kelp
      for (let i = 0; i < 6; i++) {
        const lx = 60 + i * 140 + rnd() * 40;
        const ray = x.createLinearGradient(0, 0, 0, H);
        ray.addColorStop(0, 'rgba(140,230,255,.12)'); ray.addColorStop(1, 'rgba(140,230,255,0)');
        x.fillStyle = ray; x.beginPath(); x.moveTo(lx, 0); x.lineTo(lx + 50, 0); x.lineTo(lx + 160, H); x.lineTo(lx + 60, H); x.fill();
      }
      x.strokeStyle = 'rgba(20,90,80,.6)'; x.lineWidth = 6; x.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const kx = rnd() * W, kh = 80 + rnd() * 150;
        x.beginPath(); x.moveTo(kx, H);
        for (let y = 0; y < kh; y += 10) x.lineTo(kx + Math.sin(y / 18 + i) * 8, H - y);
        x.stroke();
      }
    } else {
      // Cosmic Core: nebula clouds and stars
      for (let i = 0; i < 7; i++) {
        const nx = rnd() * W, ny = rnd() * H, nr = 120 + rnd() * 200;
        const neb = x.createRadialGradient(nx, ny, 0, nx, ny, nr);
        const col = rnd() < .5 ? '179,107,255' : '255,79,216';
        neb.addColorStop(0, `rgba(${col},.16)`); neb.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = neb; x.fillRect(0, 0, W, H);
      }
      for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${.2 + rnd() * .6})`; const s = rnd() * 1.6; x.fillRect(rnd() * W, rnd() * H, s, s); }
    }
    backgrounds.set(world, c);
    return c;
  }

  // ---------- Frame ----------
  function draw(G, t, opts = {}) {
    const shake = opts.shake !== false;
    ctx.save();
    if (G.shake > .5 && shake) ctx.translate((Math.random() - .5) * G.shake, (Math.random() - .5) * G.shake);
    ctx.drawImage(background(G.world), 0, 0, W, H);
    drawMotes(G.world, t, opts.motion !== false);

    for (const p of G.portals) drawPortal(p, t);
    for (const b of G.bricks) {
      if (b.kind === 'K') { drawBoss(b, t); continue; }
      ctx.drawImage(brickSprite(b), b.x, b.y, BW, BH);
      if (b.kind === 'X') { ctx.globalAlpha = .25 + .2 * Math.sin(t / 150 + b.bx); ctx.drawImage(glow('#ff9d2e', 30), b.x + BW / 2 - 30, b.y + BH / 2 - 30, 60, 60); ctx.globalAlpha = 1; }
      if (b.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${b.flash * .7})`; rr(ctx, b.x, b.y, BW, BH, 5); ctx.fill(); }
    }

    for (const p of G.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = 4 * p.life + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); }
      else if (p.chunk) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
      else { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    }
    ctx.globalAlpha = 1;

    for (const s of G.shots) {
      if (s.kind === 'R') {
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(s.x - 2, s.y, 4, 12);
        ctx.fillStyle = '#ff6b3d'; ctx.beginPath(); ctx.moveTo(s.x - 3, s.y); ctx.lineTo(s.x, s.y - 7); ctx.lineTo(s.x + 3, s.y); ctx.fill();
      } else {
        ctx.drawImage(glow('rgba(255,61,240,.8)', 10), s.x - 10, s.y - 4, 20, 26);
        ctx.fillStyle = '#ffd6fb'; ctx.fillRect(s.x - 1.5, s.y, 3, 16);
      }
    }
    for (const o of G.orbs) {
      ctx.drawImage(glow('rgba(255,46,99,.9)', 20), o.x - 20, o.y - 20, 40, 40);
      ctx.fillStyle = '#ffd1dc'; ctx.beginPath(); ctx.arc(o.x, o.y, 5 + Math.sin(t / 60), 0, 7); ctx.fill();
    }
    for (const c of G.caps) drawCap(c);
    drawPaddle(G, t);
    for (const b of G.balls) drawBall(G, b, t);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const tx of G.texts) {
      ctx.globalAlpha = Math.min(1, tx.life / (tx.max * .4));
      ctx.font = `900 ${tx.size}px system-ui`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeText(tx.s, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.s, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    if (opts.hint && G.status === 'play' && G.balls.some(b => b.stuck)) {
      ctx.font = '600 15px system-ui'; ctx.fillStyle = `rgba(255,255,255,${.55 + .35 * Math.sin(t / 250)})`;
      ctx.fillText(G.pow.C > 0 && G.time > 500 ? 'Caught! Tap or press Space to release' : 'Click, tap or press Space to launch', W / 2, PAD_Y - 46);
    }
    ctx.restore();
    if (G.flash > 0 && opts.flashes !== false) { ctx.fillStyle = `rgba(255,255,255,${G.flash * .55})`; ctx.fillRect(0, 0, W, H); }
    drawHud(G, t);
  }

  function drawMotes(world, t, motion) {
    const tt = motion ? t : 0;
    for (const m of motes) {
      let x = m.x, y = m.y, a = .3, s = m.s;
      if (world === 0) { y = (m.y - tt * .015 * m.s) % H; if (y < 0) y += H; a = .25; ctx.fillStyle = m.p > 3 ? '#ff4fd8' : '#38f9d7'; }
      else if (world === 1) { x = (m.x + tt * .05 * m.s) % W; a = .25; ctx.fillStyle = '#ffd8a0'; s = m.s * 1.4; }
      else if (world === 2) { y = (m.y - tt * .02 * m.s) % H; if (y < 0) y += H; x += Math.sin(tt / 900 + m.p) * 6; a = .35; ctx.fillStyle = '#bff4ff'; }
      else { a = .25 + .5 * Math.max(0, Math.sin(tt / 700 + m.p * 3)); ctx.fillStyle = '#ffffff'; }
      ctx.globalAlpha = a;
      if (world === 2) { ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, 7); ctx.stroke(); }
      else ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawPortal(p, t) {
    const col = p.key === 'P' ? '#8be9ff' : '#ffb13d';
    ctx.drawImage(glow(p.key === 'P' ? 'rgba(139,233,255,.5)' : 'rgba(255,177,61,.5)', 26), p.x - 26, p.y - 26, 52, 52);
    ctx.lineWidth = 3; ctx.strokeStyle = col;
    for (let i = 0; i < 3; i++) {
      const a = t / 300 + i * 2.09;
      ctx.beginPath(); ctx.arc(p.x, p.y, 13 - i * 3.5, a, a + 4); ctx.stroke();
    }
  }

  function drawBoss(b, t) {
    const x = b.x, y = b.y, w = b.w, h = b.h;
    ctx.drawImage(glow(b.color, 70), x + w / 2 - 110, y + h / 2 - 70, 220, 140);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3a2a5a'); g.addColorStop(1, '#140c26');
    rr(ctx, x, y, w, h, 14); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = b.color; ctx.stroke();
    // Eyes that follow the bat a little
    const angry = b.hp / b.max < .4;
    for (const ex of [x + w * .3, x + w * .7]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, y + h * .45, 13, angry ? 7 : 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = angry ? '#ff2e63' : b.color; ctx.beginPath(); ctx.arc(ex + Math.sin(t / 400) * 4, y + h * .47, 5, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 8; i++) ctx.lineTo(x + w * .3 + i * w * .05, y + h * .8 + (i % 2 ? 4 : -2));
    ctx.stroke();
    if (b.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${b.flash * .6})`; rr(ctx, x, y, w, h, 14); ctx.fill(); }
  }

  function drawCap(c) {
    const p = POW[c.k], w = 38, h = 18, sq = Math.abs(Math.cos(c.spin)) * .25 + .75;
    ctx.drawImage(glow(p.color, 24), c.x - 30, c.y - 18, 60, 36);
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, sq);
    rr(ctx, -w / 2, -h / 2, w, h, 9); ctx.fillStyle = p.color; ctx.fill();
    if (!p.good) { ctx.strokeStyle = '#ff2e63'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, -w / 2 + 5, -h / 2 + 2, w - 10, 4, 2); ctx.fill();
    ctx.fillStyle = '#07071a'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.label, 0, 1); ctx.restore();
  }

  function drawPaddle(G, t) {
    const p = G.pad, sq = p.squash;
    const w = p.w * (1 + .12 * sq), h = PAD_H * (1 - .35 * sq), x = p.x - w / 2, y = PAD_Y + (PAD_H - h);
    ctx.drawImage(glow(G.pow.C > 0 ? 'rgba(125,255,176,.55)' : 'rgba(56,249,215,.45)', 40), p.x - w / 2 - 20, y - 22, w + 40, 58);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    if (G.pow.V > 0) { g.addColorStop(0, '#c7c7c7'); g.addColorStop(1, '#7d7d8f'); }
    else { g.addColorStop(0, '#38f9d7'); g.addColorStop(.5, '#7b6bff'); g.addColorStop(1, '#ff4fd8'); }
    rr(ctx, x, y, w, h, 7); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(ctx, x + 6, y + 2, w - 12, 3, 2); ctx.fill();
    if (G.pow.C > 0) { ctx.fillStyle = '#7dffb0'; ctx.fillRect(x + 8, y - 2, w - 16, 2); }
    if (G.pow.V > 0) { ctx.fillStyle = '#07071a'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⇄', p.x, y + h / 2 + 1); }
    for (const sx of [x + 3, x + w - 13]) {
      if (G.pow.R > 0) { ctx.fillStyle = '#ff6b3d'; rr(ctx, sx, y - 9, 10, 12, 3); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx + 3, y - 12, 4, 4); }
      else if (G.pow.Z > 0) { ctx.fillStyle = '#ff3df0'; ctx.fillRect(sx + 3, y - 10, 4, 11); }
    }
  }

  function drawBall(G, b, t) {
    const fire = G.pow.F > 0;
    for (let i = 0; i < b.trail.length; i += 2) {
      const a = i / b.trail.length;
      ctx.fillStyle = b.bomb ? `rgba(255,46,99,${a * .5})` : fire ? `rgba(255,140,40,${a * .7})` : `rgba(140,200,255,${a * .35})`;
      ctx.beginPath(); ctx.arc(b.trail[i], b.trail[i + 1], b.r * a * (fire ? 1.3 : 1), 0, 7); ctx.fill();
    }
    const gc = b.bomb ? 'rgba(255,46,99,.8)' : fire ? 'rgba(255,140,40,.85)' : G.homing ? 'rgba(255,210,63,.7)' : 'rgba(159,216,255,.6)';
    const gs = b.bomb ? 26 + 6 * Math.sin(t / 80) : fire ? 26 : 20;
    ctx.drawImage(glow(gc, 30), b.x - gs, b.y - gs, gs * 2, gs * 2);
    const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
    if (b.bomb) { g.addColorStop(0, '#ffd1dc'); g.addColorStop(1, '#ff2e63'); }
    else if (fire) { g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#ff7a1a'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8fd3ff'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
  }

  function drawHud(G, t) {
    ctx.fillStyle = 'rgba(8,6,28,.92)'; ctx.fillRect(0, 0, W, HUD);
    ctx.fillStyle = WORLDS[G.world].accent; ctx.globalAlpha = .45; ctx.fillRect(0, HUD - 1, W, 1); ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle'; ctx.font = 'bold 17px system-ui';
    ctx.textAlign = 'left'; ctx.fillStyle = '#8a90b8'; ctx.fillText('SCORE', 14, HUD / 2);
    ctx.fillStyle = '#fff'; ctx.fillText(G.score.toLocaleString(), 78, HUD / 2);
    ctx.textAlign = 'center'; ctx.fillStyle = WORLDS[G.world].accent;
    ctx.fillText(`${G.world + 1}-${G.L.stage}  ${G.L.name}`, W / 2, HUD / 2);
    for (let i = 0; i < Math.min(G.lives, 9); i++) {
      ctx.fillStyle = '#ff4fd8'; ctx.beginPath(); ctx.arc(W - 18 - i * 18, HUD / 2, 6, 0, 7); ctx.fill();
    }
    // Active power-up timers
    let px = 10;
    for (const k in G.pow) {
      if (G.pow[k] <= 0) continue;
      const f = G.pow[k] / POW[k].time;
      ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, px, HUD + 6, 92, 16, 8); ctx.fill();
      ctx.fillStyle = POW[k].color; rr(ctx, px, HUD + 6, Math.max(16, 92 * f), 16, 8); ctx.fill();
      ctx.fillStyle = '#07071a'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(POW[k].name, px + 7, HUD + 14.5);
      px += 98;
    }
    if (G.balls.some(b => b.bomb)) {
      ctx.fillStyle = POW.B.color; rr(ctx, px, HUD + 6, 92, 16, 8); ctx.fill();
      ctx.fillStyle = '#07071a'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('SUPER BOMB', px + 7, HUD + 14.5);
    }
    ctx.textAlign = 'right'; ctx.font = 'bold 13px system-ui';
    if (G.homing) { ctx.fillStyle = '#ffd23f'; ctx.fillText('HOMING BALL', W - 12, HUD + 14); }
    else if (G.combo >= 4) { ctx.fillStyle = '#ffd23f'; ctx.fillText(`COMBO x${Math.min(5, 1 + Math.floor(G.combo / 4))}`, W - 12, HUD + 14); }
    // Boss health
    if (G.boss && !G.boss.b.dead) {
      const b = G.boss.b, bw = b.w, bx = b.x, by = b.y - 13;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, bx, by, bw, 7, 4); ctx.fill();
      ctx.fillStyle = b.hp / b.max < .4 ? '#ff2e63' : b.color; rr(ctx, bx, by, Math.max(6, bw * b.hp / b.max), 7, 4); ctx.fill();
    }
  }

  return { draw, setScale, background };
}

