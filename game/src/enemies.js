// EMBERFALL — enemies: six kinds with distinct shapes, movement and stats,
// plus the wave spawner. Stats scale with the wave so later waves stay
// dangerous; the boss (every 5th wave) is spawned by the wave logic in
// update.js, not here.
import { G } from './state.js';
import { W, H } from './config.js';
import { randRange, randInt, randChoice } from './random.js';

let nextEnemyId = 1;

export function createEnemy(type, x, y) {
  const wScale = 1 + (G.wave - 1) * 0.13;
  const spdScale = 1 + Math.min(0.6, (G.wave - 1) * 0.035);
  const e = {
    id: nextEnemyId++,
    type,
    x, y,
    vx: 0, vy: 0,
    kx: 0, ky: 0,
    flash: 0,
    phase: randRange(0, Math.PI * 2),
    shootTimer: randRange(1.0, 2.4),
    stateTimer: 2.5,
    subState: 'chase',
  };

  if (type === 'cinder') {
    e.r = 13;
    e.hp = 26 * wScale;
    e.maxHp = e.hp;
    e.speed = 135 * spdScale;
    e.color = '#ff7b00';
    e.xp = 2;
    e.score = 25;
    e.dmg = 12;
  } else if (type === 'spitter') {
    e.r = 16;
    e.hp = 42 * wScale;
    e.maxHp = e.hp;
    e.speed = 92 * spdScale;
    e.color = '#b5179e';
    e.xp = 4;
    e.score = 45;
    e.dmg = 14;
  } else if (type === 'brute') {
    e.r = 25;
    e.hp = 135 * wScale;
    e.maxHp = e.hp;
    e.speed = 68 * spdScale;
    e.color = '#e63946';
    e.xp = 8;
    e.score = 90;
    e.dmg = 24;
  } else if (type === 'wisp') {
    e.r = 12;
    e.hp = 20 * wScale;
    e.maxHp = e.hp;
    e.speed = 205 * spdScale;
    e.color = '#00f5d4';
    e.xp = 3;
    e.score = 40;
    e.dmg = 10;
  } else if (type === 'splitter') {
    e.r = 19;
    e.hp = 62 * wScale;
    e.maxHp = e.hp;
    e.speed = 95 * spdScale;
    e.color = '#38b000';
    e.xp = 5;
    e.score = 60;
    e.dmg = 16;
  } else if (type === 'boss') {
    e.r = 46;
    e.hp = 950 * wScale;
    e.maxHp = e.hp;
    e.speed = 82 * spdScale;
    e.color = '#9d4edd';
    e.xp = 35;
    e.score = 1000;
    e.dmg = 30;
    e.name = 'THE GLOOM WARDEN';
    e.stateTimer = 3.0;
  }
  return e;
}

export function spawnWaveEnemy() {
  const edge = randInt(0, 3);
  let x = 0, y = 0;
  const pad = 36;
  if (edge === 0) { x = randRange(pad, W - pad); y = -pad; }
  else if (edge === 1) { x = W + pad; y = randRange(pad, H - pad); }
  else if (edge === 2) { x = randRange(pad, W - pad); y = H + pad; }
  else { x = -pad; y = randRange(pad, H - pad); }

  const pool = ['cinder', 'cinder', 'cinder'];
  if (G.wave >= 1) pool.push('wisp');
  if (G.wave >= 2) pool.push('spitter', 'spitter');
  if (G.wave >= 3) pool.push('splitter', 'brute');
  if (G.wave >= 4) pool.push('brute', 'wisp', 'splitter');

  const type = randChoice(pool);
  G.enemies.push(createEnemy(type, x, y));
}
