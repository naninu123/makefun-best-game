// EMBERFALL — juice: short-lived particles and floating combat numbers.
// Both lists are capped so a busy fight cannot grow memory without bound.
import { G } from './state.js';
import { randRange } from './random.js';

export function spawnParticle(x, y, vx, vy, r, color, life) {
  if (G.particles.length > 360) G.particles.shift();
  G.particles.push({ x, y, vx, vy, r, color, life, maxLife: life });
}

export function spawnFloatText(x, y, text, color, size = 15) {
  if (G.floatTexts.length > 60) G.floatTexts.shift();
  G.floatTexts.push({
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

export function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.pow(0.15, dt);
    pt.vy *= Math.pow(0.15, dt);
    pt.life -= dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
}

export function updateFloatTexts(dt) {
  for (let i = G.floatTexts.length - 1; i >= 0; i--) {
    const ft = G.floatTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) G.floatTexts.splice(i, 1);
  }
}
