// Breakout 2.0 sound: synthesized effects and a small music sequencer per world.
import { WORLDS } from './levels.js';

let ac = null, master, sfxBus, musicBus, noiseBuf;
const state = { sound: true, music: true };

function ctx() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
      const comp = ac.createDynamicsCompressor(); comp.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = .8; sfxBus.connect(comp);
      musicBus = ac.createGain(); musicBus.gain.value = .32; musicBus.connect(comp);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}

export function unlockAudio() { ctx(); }
export function setSound(on) { state.sound = on; }
export function setMusic(on) { state.music = on; if (!on) stopMusic(); }

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function tone({ f, d = .1, type = 'square', vol = .05, slide = 0, at = 0, bus = sfxBus, attack = .004 }) {
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(bus); o.start(t); o.stop(t + d + .05);
}
function noise({ d = .2, vol = .2, freq = 1200, q = 1, type = 'bandpass', sweep = 0, at = 0, bus = sfxBus }) {
  const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * .5); s.stop(t + d + .05);
}

// A pentatonic ladder so long combos climb in pitch
const LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
let lastWall = 0;

const SFX = {
  paddle: () => { tone({ f: 180, d: .12, type: 'sine', vol: .22, slide: -60 }); noise({ d: .04, vol: .05, freq: 2500 }); },
  wall: () => { const n = ac.currentTime; if (n - lastWall < .05) return; lastWall = n; tone({ f: 420, d: .04, type: 'triangle', vol: .04 }); },
  launch: () => tone({ f: 300, d: .15, type: 'triangle', vol: .08, slide: 300 }),
  brick: (combo = 1) => {
    const f = midi(72 + LADDER[Math.min(combo - 1, LADDER.length - 1)]);
    tone({ f, d: .12, type: 'square', vol: .045 }); tone({ f: f * 2, d: .08, type: 'sine', vol: .03 });
    noise({ d: .05, vol: .08, freq: 3000, q: 2 });
  },
  tough: () => { tone({ f: 160, d: .08, type: 'triangle', vol: .1 }); noise({ d: .05, vol: .08, freq: 900 }); },
  metal: () => { tone({ f: 1480, d: .18, type: 'triangle', vol: .05 }); tone({ f: 2217, d: .14, type: 'sine', vol: .03 }); },
  boom: (big) => {
    noise({ d: big ? 1.1 : .45, vol: big ? .55 : .3, freq: big ? 1800 : 1400, type: 'lowpass', sweep: big ? -1700 : -1200 });
    tone({ f: big ? 120 : 160, d: big ? .8 : .3, type: 'sine', vol: big ? .35 : .2, slide: big ? -85 : -100 });
  },
  power: () => [0, 4, 7, 12].forEach((s, i) => tone({ f: midi(72 + s), d: .12, type: 'square', vol: .045, at: i * .05 })),
  bad: () => [12, 8, 5, 0].forEach((s, i) => tone({ f: midi(60 + s), d: .14, type: 'sawtooth', vol: .04, at: i * .06 })),
  coin: () => { tone({ f: 988, d: .08, type: 'square', vol: .05 }); tone({ f: 1319, d: .3, type: 'square', vol: .05, at: .07 }); },
  rocket: () => noise({ d: .25, vol: .12, freq: 600, sweep: 2400 }),
  laser: () => tone({ f: 1400, d: .09, type: 'square', vol: .03, slide: -900 }),
  catch: () => tone({ f: 520, d: .1, type: 'sine', vol: .12, slide: -200 }),
  portal: () => { tone({ f: 300, d: .25, type: 'sine', vol: .1, slide: 900 }); tone({ f: 600, d: .25, type: 'triangle', vol: .04, slide: 1200, at: .03 }); },
  orb: () => tone({ f: 220, d: .3, type: 'sawtooth', vol: .04, slide: -120 }),
  bossHit: () => { tone({ f: 90, d: .2, type: 'square', vol: .12, slide: -30 }); noise({ d: .1, vol: .15, freq: 500 }); },
  lose: () => { tone({ f: 330, d: .7, type: 'sawtooth', vol: .07, slide: -260 }); noise({ d: .4, vol: .08, freq: 400, type: 'lowpass' }); },
  clear: () => [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone({ f: midi(67 + s), d: .22, type: 'square', vol: .05, at: i * .075 })),
  star: (i = 0) => tone({ f: midi(79 + i * 4), d: .3, type: 'triangle', vol: .09 }),
  click: () => tone({ f: 660, d: .05, type: 'triangle', vol: .05 }),
};

export function sfx(name, arg) {
  if (!state.sound || !ctx() || !SFX[name]) return;
  try { SFX[name](arg); } catch (e) {}
}

// ---------- Music ----------
// Four bars per world: a chord progression with bass, arpeggio and drums.
const PROGRESSIONS = [[0, 5, 3, 4], [0, 1, 5, 4], [0, 3, 4, 2], [0, 5, 1, 6]];
let music = null;

export function startMusic(world) {
  if (!state.music || !ctx()) return;
  if (music && music.world === world) return;
  stopMusic();
  const w = WORLDS[world], step = 60 / w.tempo / 4;
  music = { world, next: ac.currentTime + .1, i: 0, timer: null };
  const scale = w.scale, root = w.root, prog = PROGRESSIONS[world];
  const deg = (d, oct = 0) => root + scale[((d % scale.length) + scale.length) % scale.length] + 12 * (oct + Math.floor(d / scale.length));
  const schedule = () => {
    if (!music) return;
    if (music.next < ac.currentTime) music.next = ac.currentTime + .05;
    while (music.next < ac.currentTime + .2) {
      const i = music.i, bar = Math.floor(i / 16) % 4, s = i % 16, at = music.next - ac.currentTime, chord = prog[bar];
      if (s % 4 === 0) tone({ f: midi(deg(chord, -1)), d: step * 3.5, type: 'triangle', vol: .16, at, bus: musicBus, attack: .01 });
      if (s % 2 === 0) {
        const arp = [0, 2, 4, 2, 0, 4, 2, 4][(s / 2) % 8];
        tone({ f: midi(deg(chord + arp, 1)), d: step * 1.6, type: world === 2 ? 'sine' : 'square', vol: world === 2 ? .05 : .025, at, bus: musicBus });
      }
      if (s % 8 === 0) tone({ f: 110, d: .14, type: 'sine', vol: .22, slide: -70, at, bus: musicBus });
      if (s % 8 === 4 && world !== 2) noise({ d: .1, vol: .06, freq: 1800, at, bus: musicBus });
      if (s % 2 === 1) noise({ d: .03, vol: .025, freq: 8000, type: 'highpass', at, bus: musicBus });
      music.next += step; music.i++;
    }
  };
  schedule();
  music.timer = setInterval(schedule, 50);
}

export function stopMusic() {
  if (music) { clearInterval(music.timer); music = null; }
}
