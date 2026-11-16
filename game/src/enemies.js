// EMBERFALL — the night's creatures: six kinds, each with its own shape,
// speed and temperament, plus the spawner that throws them in from the
// arena's edges. Stats scale with the wave so later waves stay dangerous.
// The boss (every 5th wave) is spawned by the wave logic in update.js.
import { S } from './state.js';
import { W, H } from './config.js';
import { randRange, randInt, randChoice } from './random.js';

let nextFoeId = 1;

const KINDS = {
  cinder:   { r: 13, hp: 26,  speed: 135, color: '#ff7b00', xp: 2,  score: 25,   dmg: 12 },
  spitter:  { r: 16, hp: 42,  speed: 92,  color: '#b5179e', xp: 4,  score: 45,   dmg: 14 },
  brute:    { r: 25, hp: 135, speed: 68,  color: '#e63946', xp: 8,  score: 90,   dmg: 24 },
  wisp:     { r: 12, hp: 20,  speed: 205, color: '#00f5d4', xp: 3,  score: 40,   dmg: 10 },
  splitter: { r: 19, hp: 62,  speed: 95,  color: '#38b000', xp: 5,  score: 60,   dmg: 16 },
  boss:     { r: 46, hp: 950, speed: 82,  color: '#9d4edd', xp: 35, score: 1000, dmg: 30, name: 'THE GLOOM WARDEN' },
};

export function makeFoe(type, x, y) {
  const def = KINDS[type];
  const hpScale = 1 + (S.wave - 1) * 0.13;
  const spdScale = 1 + Math.min(0.6, (S.wave - 1) * 0.035);
  const foe = {
    id: nextFoeId++,
    type,
    x, y,
    vx: 0, vy: 0,
    kx: 0, ky: 0,
    flash: 0,
    phase: randRange(0, Math.PI * 2),
    shootTimer: randRange(1.0, 2.4),
    stateTimer: type === 'boss' ? 3.0 : 2.5,
    subState: 'chase',
    r: def.r,
    hp: def.hp * hpScale,
    speed: def.speed * spdScale,
    color: def.color,
    xp: def.xp,
    score: def.score,
    dmg: def.dmg,
  };
  foe.maxHp = foe.hp;
  if (def.name) foe.name = def.name;
  return foe;
}

export function spawnFoe() {
  const edge = randInt(0, 3);
  const pad = 36;
  let x = 0, y = 0;
  if (edge === 0) { x = randRange(pad, W - pad); y = -pad; }
  else if (edge === 1) { x = W + pad; y = randRange(pad, H - pad); }
  else if (edge === 2) { x = randRange(pad, W - pad); y = H + pad; }
  else { x = -pad; y = randRange(pad, H - pad); }

  const pool = ['cinder', 'cinder', 'cinder', 'wisp'];
  if (S.wave >= 2) pool.push('spitter', 'spitter');
  if (S.wave >= 3) pool.push('splitter', 'brute');
  if (S.wave >= 4) pool.push('brute', 'wisp', 'splitter');

  S.foes.push(makeFoe(randChoice(pool), x, y));
}
