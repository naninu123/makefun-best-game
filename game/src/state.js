// EMBERFALL — the single shared mutable run state. Every other module
// imports { S } and mutates its fields; S itself is never rebound, so all
// modules always see the same run. Also here: the keeper factory, the
// best-run record, and the stats derived from blessing ranks.
import { CX, CY, W, H, SAVE_KEY } from './config.js';
import { randRange, randChoice } from './random.js';

export function emptyBest() {
  return { score: 0, wave: 0, kills: 0 };
}

export function loadBest() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return emptyBest();
}

export function saveBest(score, wave, kills) {
  try {
    const cur = loadBest();
    if (score > cur.score) {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          score: Math.floor(score),
          wave: Math.max(wave, cur.wave),
          kills: Math.max(kills, cur.kills),
        }),
      );
    }
  } catch (e) {}
}

// A fresh keeper has no record yet, so the title screen hides the best line
// until a run has actually been played. Staged screenshot scenes set their
// own best explicitly in shots.js.
export const S = {
  state: 'start', // 'start' | 'play' | 'bless' | 'pause' | 'over'
  time: 0,
  score: 0,
  kills: 0,
  wave: 1,
  waveSpawned: 0,
  waveQuota: 14,
  spawnCooldown: 0,
  bannerTimer: 0,
  bannerText: '',
  bannerSub: '',
  combo: 1,
  comboTimer: 0,
  streak: 0,
  announce: '',
  announceTimer: 0,
  shakeTimer: 0,
  shakeMag: 0,
  hitStop: 0,
  hurtFlash: 0,
  whiteFlash: 0,
  blessingChoices: [],
  best: loadBest(),

  keeper: null,
  bolts: [],
  foeShots: [],
  foes: [],
  shards: [],
  drops: [],
  sparks: [],
  popups: [],
  drifting: [],
  pillars: [
    { x: CX - 260, y: CY - 150, r: 22 },
    { x: CX + 260, y: CY - 150, r: 22 },
    { x: CX - 260, y: CY + 150, r: 22 },
    { x: CX + 260, y: CY + 150, r: 22 },
  ],
};

export function makeKeeper() {
  return {
    x: CX,
    y: CY + 95,
    vx: 0,
    vy: 0,
    r: 15,
    angle: 0,
    hp: 100,
    maxHp: 100,
    xp: 0,
    xpNext: 10,
    level: 1,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashVx: 0,
    dashVy: 0,
    invuln: 0,
    auraTick: 0,
    blessings: {
      dmg: 0, rate: 0, multi: 0, pierce: 0,
      bspd: 0, mspd: 0, hp: 0, mag: 0,
      dash: 0, aura: 0, crit: 0, regen: 0,
    },
  };
}

export function scatterEmbers() {
  S.drifting = [];
  for (let i = 0; i < 65; i++) {
    S.drifting.push({
      x: randRange(0, W),
      y: randRange(0, H),
      r: randRange(1, 3.2),
      vx: randRange(-15, 15),
      vy: randRange(-35, -10),
      alpha: randRange(0.15, 0.65),
      phase: randRange(0, Math.PI * 2),
      color: randChoice(['#ff9e44', '#ff5722', '#ffd166', '#ff7b00']),
    });
  }
}

export function newRun() {
  S.state = 'play';
  S.time = 0;
  S.score = 0;
  S.kills = 0;
  S.wave = 1;
  S.waveSpawned = 0;
  S.waveQuota = 14;
  S.spawnCooldown = 0.8;
  S.bannerTimer = 2.6;
  S.bannerText = 'WAVE 1';
  S.bannerSub = 'THE NIGHT AWAKENS';
  S.combo = 1;
  S.comboTimer = 0;
  S.streak = 0;
  S.announce = '';
  S.announceTimer = 0;
  S.shakeTimer = 0;
  S.shakeMag = 0;
  S.hitStop = 0;
  S.hurtFlash = 0;
  S.whiteFlash = 0;
  S.blessingChoices = [];

  S.keeper = makeKeeper();
  S.bolts = [];
  S.foeShots = [];
  S.foes = [];
  S.shards = [];
  S.drops = [];
  S.sparks = [];
  S.popups = [];
  if (S.drifting.length === 0) scatterEmbers();
}

// --- Keeper stats derived from blessing ranks ---
export function boltDamage() {
  return 18 * (1 + S.keeper.blessings.dmg * 0.25);
}
export function fireGap() {
  return 0.21 / (1 + S.keeper.blessings.rate * 0.2);
}
export function moveSpeed() {
  return 235 * (1 + S.keeper.blessings.mspd * 0.12);
}
export function boltSpeed() {
  return 620 * (1 + S.keeper.blessings.bspd * 0.2);
}
export function magnetRange() {
  return 95 * (1 + S.keeper.blessings.mag * 0.4);
}
export function dashCooldownMax() {
  return 2.4 * Math.pow(0.75, S.keeper.blessings.dash);
}
export function auraRange() {
  const lv = S.keeper.blessings.aura;
  return lv > 0 ? 75 + lv * 28 : 0;
}
