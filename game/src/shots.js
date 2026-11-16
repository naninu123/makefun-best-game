// EMBERFALL — deterministic screenshot scenes. Each ?shot=<scene>&seed=<n>
// builds one fixed frame from the seeded RNG (no wall clock), so the same
// URL always renders the same picture. The staged records are consistent:
// the title shows a past best of 4,820; the game-over screen shows a new
// best of 6,420, equal to that run's final score.
import { G, startNewGame } from './state.js';
import { CX, CY, UPGRADES } from './config.js';
import { reseed, seedParam, randRange, randChoice } from './random.js';
import { createEnemy } from './enemies.js';
import { spawnParticle, spawnFloatText } from './particles.js';
import { mouse } from './input.js';

export function setupDeterministicScene(scene) {
  reseed(seedParam);
  startNewGame();
  const p = G.player;

  if (scene === 'start') {
    G.state = 'start';
    G.time = 4.2;
    // A staged past record, so the title shows a best line.
    G.best = { score: 4820, wave: 6, kills: 142 };
    // Scenic background enemies for a rich title preview
    G.enemies.push(createEnemy('cinder', 240, 190));
    G.enemies.push(createEnemy('wisp', 1020, 210));
    G.enemies.push(createEnemy('spitter', 210, 540));
    G.enemies.push(createEnemy('brute', 1040, 520));
    return;
  }

  G.time = 94.5;
  G.wave = 3;
  G.score = 3480;
  G.kills = 68;
  G.combo = 5.4;
  G.comboTimer = 3.5;
  G.bannerTimer = 0;
  G.best = { score: 4820, wave: 6, kills: 142 };

  p.x = CX - 45;
  p.y = CY + 40;
  p.hp = 82;
  p.maxHp = 125;
  p.level = 5;
  p.xp = 24;
  p.xpNext = 42;
  p.upgrades.dmg = 2;
  p.upgrades.multi = 2;
  p.upgrades.aura = 1;
  p.upgrades.hp = 1;
  p.upgrades.rate = 1;
  p.angle = -0.35;

  // Populate diverse enemies around the arena
  const eSpecs = [
    ['brute', CX + 170, CY - 55],
    ['cinder', CX + 115, CY - 20],
    ['cinder', CX + 140, CY + 45],
    ['spitter', CX + 270, CY + 95],
    ['wisp', CX - 190, CY - 110],
    ['splitter', CX - 165, CY + 125],
    ['cinder', CX + 40, CY - 150],
    ['wisp', CX + 220, CY - 165],
    ['spitter', CX - 290, CY - 20],
    ['brute', CX - 235, CY - 180],
  ];
  eSpecs.forEach((sp, idx) => {
    const e = createEnemy(sp[0], sp[1], sp[2]);
    if (idx % 2 === 0) e.hp = e.maxHp * 0.65;
    if (idx === 1) e.flash = 0.08;
    G.enemies.push(e);
  });

  // Active multishot bolts & enemy projectiles
  for (let b = -1; b <= 1; b++) {
    const a = p.angle + b * 0.14;
    G.bullets.push({
      x: p.x + Math.cos(a) * 55,
      y: p.y + Math.sin(a) * 55,
      vx: Math.cos(a) * 650,
      vy: Math.sin(a) * 650,
      r: b === 0 ? 6.5 : 5,
      dmg: 35,
      crit: b === 0,
      pierce: 1,
      hitIds: [],
      life: 1.2,
    });
    G.bullets.push({
      x: p.x + Math.cos(a) * 145,
      y: p.y + Math.sin(a) * 145,
      vx: Math.cos(a) * 650,
      vy: Math.sin(a) * 650,
      r: 5,
      dmg: 25,
      crit: false,
      pierce: 1,
      hitIds: [],
      life: 1.0,
    });
  }

  G.enemyBullets.push(
    { x: CX + 210, y: CY + 70, vx: -180, vy: -40, r: 6, dmg: 14, color: '#e0aaff', life: 2.5 },
    { x: CX - 220, y: CY - 10, vx: 170, vy: 30, r: 6, dmg: 14, color: '#e0aaff', life: 2.5 },
  );

  // Gems & Pickups
  for (let g = 0; g < 9; g++) {
    G.gems.push({
      x: CX + randRange(-220, 220),
      y: CY + randRange(-160, 160),
      vx: 0, vy: 0,
      val: 3,
      r: g % 3 === 0 ? 7 : 5.5,
      color: g % 3 === 0 ? '#00f5d4' : '#ff9f1c',
      phase: g,
    });
  }
  G.pickups.push({ x: CX - 110, y: CY - 75, type: 'heart', r: 13, life: 12, phase: 1.2 });

  // Particles & Floating Damage Numbers
  for (let i = 0; i < 32; i++) {
    spawnParticle(
      CX + 115 + randRange(-35, 35),
      CY - 20 + randRange(-35, 35),
      randRange(-90, 90),
      randRange(-90, 90),
      randRange(3, 6),
      randChoice(['#ff7b00', '#ffd166', '#e63946', '#00f5d4']),
      0.55,
    );
  }
  spawnFloatText(CX + 115, CY - 36, '45!', '#ffd166', 19);
  spawnFloatText(CX + 170, CY - 82, '28', '#ffffff', 15);

  if (scene === 'play') {
    G.state = 'play';
  } else if (scene === 'upgrade') {
    G.upgradeChoices = [UPGRADES[0], UPGRADES[2], UPGRADES[9]];
    mouse.x = CX;
    mouse.y = CY + 20;
    G.state = 'upgrade';
  } else if (scene === 'over') {
    p.hp = 0;
    G.wave = 5;
    G.score = 6420;
    G.kills = 138;
    G.time = 195;
    // This run set a new best: the best line must match the final score.
    G.best = { score: 6420, wave: 5, kills: 138 };
    G.state = 'over';
  }
}
