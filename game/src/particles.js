// EMBERFALL — the juice: short-lived sparks (explosions, trails, muzzle
// flashes) and popups (floating damage numbers). Both lists are capped so a
// busy fight cannot grow memory without bound.
import { S } from './state.js';
import { randRange } from './random.js';

export function puff(x, y, vx, vy, r, color, life) {
  if (S.sparks.length > 360) S.sparks.shift();
  S.sparks.push({ x, y, vx, vy, r, color, life, maxLife: life });
}

export function popup(x, y, text, color, size = 15) {
  if (S.popups.length > 60) S.popups.shift();
  S.popups.push({
    x: x + randRange(-8, 8),
    y: y - 10,
    vy: -48,
    text,
    color,
    size,
    life: 0.75,
    maxLife: 0.75,
  });
}

export function stepSparks(dt) {
  for (let i = S.sparks.length - 1; i >= 0; i--) {
    const s = S.sparks[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= Math.pow(0.15, dt);
    s.vy *= Math.pow(0.15, dt);
    s.life -= dt;
    if (s.life <= 0) S.sparks.splice(i, 1);
  }
}

export function stepPopups(dt) {
  for (let i = S.popups.length - 1; i >= 0; i--) {
    const p = S.popups[i];
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) S.popups.splice(i, 1);
  }
}
