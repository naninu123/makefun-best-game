// EMBERFALL — the one shared mutable game state, plus the player factory,
// the best-score record, and the derived player stats every system reads.
// Every other module imports { G } and mutates its fields; G itself is never
// rebound, so all modules always see the same game.
import { CX, CY, W, H, STORAGE_KEY } from './config.js';
import { randRange, randChoice } from './random.js';

// Fresh players start with no record: the title screen hides the best line
// until a run has actually been played (staged screenshot scenes set their
// own best explicitly in shots.js).
export function emptyBest() {
  return { score: 0, wave: 0, kills: 0 };
}

export function loadBest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return emptyBest();
}

export function saveBest(score, wave, kills) {
  try {
    const cur = loadBest();
    if (score > cur.score) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          score: Math.floor(score),
          wave: Math.max(wave, cur.wave),
          kills: Math.max(kills, cur.kills),
        }),
      );
    }
  } catch (e) {}
}

export const G = {
  state: 'start', // 'start', 'play', 'upgrade', 'pause', 'over'
  time: 0,
  score: 0,
  kills: 0,
  wave: 1,
  waveTimer: 0,
  waveSpawned: 0,
  waveQuota: 14,
  spawnCooldown: 0,
  bannerTimer: 0,
  bannerText: '',
  bannerSub: '',
  combo: 1,
  comboTimer: 0,
  shakeTimer: 0,
  shakeMag: 0,
  hitStop: 0,
  hurtFlash: 0,
  whiteFlash: 0,
  upgradeChoices: [],
  best: loadBest(),

  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: [],
  gems: [],
  pickups: [],
  particles: [],
  floatTexts: [],
  bgEmbers: [],
  pillars: [
    { x: CX - 260, y: CY - 150, r: 22 },
    { x: CX + 260, y: CY - 150, r: 22 },
    { x: CX - 260, y: CY + 150, r: 22 },
    { x: CX + 260, y: CY + 150, r: 22 },
  ],
};

export function createPlayer() {
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
    upgrades: {
      dmg: 0, rate: 0, multi: 0, pierce: 0,
      bspd: 0, mspd: 0, hp: 0, mag: 0,
      dash: 0, aura: 0, crit: 0, regen: 0,
    },
  };
}

export function initBgEmbers() {
  G.bgEmbers = [];
  for (let i = 0; i < 65; i++) {
    G.bgEmbers.push({
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

export function startNewGame() {
  G.state = 'play';
  G.time = 0;
  G.score = 0;
  G.kills = 0;
  G.wave = 1;
  G.waveTimer = 0;
  G.waveSpawned = 0;
  G.waveQuota = 14;
  G.spawnCooldown = 0.8;
  G.bannerTimer = 2.6;
  G.bannerText = 'WAVE 1';
  G.bannerSub = 'THE NIGHT AWAKENS';
  G.combo = 1;
  G.comboTimer = 0;
  G.shakeTimer = 0;
  G.shakeMag = 0;
  G.hitStop = 0;
  G.hurtFlash = 0;
  G.whiteFlash = 0;
  G.upgradeChoices = [];

  G.player = createPlayer();
  G.bullets = [];
  G.enemyBullets = [];
  G.enemies = [];
  G.gems = [];
  G.pickups = [];
  G.particles = [];
  G.floatTexts = [];
  if (G.bgEmbers.length === 0) initBgEmbers();
}

// --- Derived player stats (upgrade ranks -> numbers) ---
export function getPlayerDmg() {
  return 18 * (1 + G.player.upgrades.dmg * 0.25);
}
export function getFireInterval() {
  return 0.21 / (1 + G.player.upgrades.rate * 0.2);
}
export function getMoveSpeed() {
  return 235 * (1 + G.player.upgrades.mspd * 0.12);
}
export function getBoltSpeed() {
  return 620 * (1 + G.player.upgrades.bspd * 0.2);
}
export function getMagnetRadius() {
  return 95 * (1 + G.player.upgrades.mag * 0.4);
}
export function getDashMaxCooldown() {
  return 2.4 * Math.pow(0.75, G.player.upgrades.dash);
}
export function getAuraRadius() {
  const lv = G.player.upgrades.aura;
  return lv > 0 ? 75 + lv * 28 : 0;
}
