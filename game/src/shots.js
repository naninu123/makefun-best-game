// EMBERFALL — the deterministic screenshot scenes. Each ?shot=<scene>&seed=<n>
// builds one fixed frame from the seeded RNG (no wall clock), so the same
// URL always renders the same picture. The staged records stay consistent:
// the title remembers an old best of 4,820, and the fallen screen shows a
// new best of 6,420, equal to that run's final score.
import { S, newRun } from './state.js';
import { CX, CY, BLESSINGS } from './config.js';
import { reseed, seedParam, randRange, randChoice } from './random.js';
import { makeFoe } from './enemies.js';
import { puff, popup } from './particles.js';
import { mouse } from './input.js';

export function setupScene(scene) {
  reseed(seedParam);
  newRun();
  const k = S.keeper;

  if (scene === 'start') {
    S.state = 'start';
    S.time = 4.2;
    S.best = { score: 4820, wave: 6, kills: 142, streak: 0 };
    // A few creatures at the edges, for a richer title.
    S.foes.push(makeFoe('cinder', 240, 190));
    S.foes.push(makeFoe('wisp', 1020, 210));
    S.foes.push(makeFoe('spitter', 210, 540));
    S.foes.push(makeFoe('brute', 1040, 520));
    return;
  }

  S.time = 94.5;
  S.wave = 3;
  S.score = 3480;
  S.kills = 68;
  S.combo = 5.4;
  S.comboTimer = 3.5;
  S.bannerTimer = 0;
  S.best = { score: 4820, wave: 6, kills: 142, streak: 9 };

  k.x = CX - 45;
  k.y = CY + 40;
  k.hp = 82;
  k.maxHp = 125;
  k.level = 5;
  k.xp = 24;
  k.xpNext = 42;
  k.blessings.dmg = 2;
  k.blessings.multi = 2;
  k.blessings.aura = 1;
  k.blessings.hp = 1;
  k.blessings.rate = 1;
  k.angle = -0.35;

  // A busy mid-fight field, one of each kind in view.
  const cast = [
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
  cast.forEach((sp, idx) => {
    const f = makeFoe(sp[0], sp[1], sp[2]);
    if (idx % 2 === 0) f.hp = f.maxHp * 0.65;
    if (idx === 1) f.flash = 0.08;
    S.foes.push(f);
  });

  // Bolts in flight, in a three-way spread, and two incoming foe shots.
  for (let b = -1; b <= 1; b++) {
    const a = k.angle + b * 0.14;
    S.bolts.push({
      x: k.x + Math.cos(a) * 55,
      y: k.y + Math.sin(a) * 55,
      vx: Math.cos(a) * 650,
      vy: Math.sin(a) * 650,
      r: b === 0 ? 6.5 : 5,
      dmg: 35,
      crit: b === 0,
      pierce: 1,
      hitIds: [],
      life: 1.2,
    });
    S.bolts.push({
      x: k.x + Math.cos(a) * 145,
      y: k.y + Math.sin(a) * 145,
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
  S.foeShots.push(
    { x: CX + 210, y: CY + 70, vx: -180, vy: -40, r: 6, dmg: 14, color: '#e0aaff', life: 2.5 },
    { x: CX - 220, y: CY - 10, vx: 170, vy: 30, r: 6, dmg: 14, color: '#e0aaff', life: 2.5 },
  );

  // Shards, a heart drop, sparks and damage numbers mid-burst.
  for (let g = 0; g < 9; g++) {
    S.shards.push({
      x: CX + randRange(-220, 220),
      y: CY + randRange(-160, 160),
      vx: 0, vy: 0,
      val: 3,
      r: g % 3 === 0 ? 7 : 5.5,
      color: g % 3 === 0 ? '#00f5d4' : '#ff9f1c',
      phase: g,
    });
  }
  S.drops.push({ x: CX - 110, y: CY - 75, type: 'heart', r: 13, life: 12, phase: 1.2 });

  for (let i = 0; i < 32; i++) {
    puff(
      CX + 115 + randRange(-35, 35),
      CY - 20 + randRange(-35, 35),
      randRange(-90, 90),
      randRange(-90, 90),
      randRange(3, 6),
      randChoice(['#ff7b00', '#ffd166', '#e63946', '#00f5d4']),
      0.55,
    );
  }
  popup(CX + 115, CY - 36, '45!', '#ffd166', 19);
  popup(CX + 170, CY - 82, '28', '#ffffff', 15);

  if (scene === 'play') {
    S.state = 'play';
  } else if (scene === 'upgrade') {
    S.blessingChoices = [BLESSINGS[0], BLESSINGS[2], BLESSINGS[9]];
    mouse.x = CX;
    mouse.y = CY + 20;
    S.state = 'bless';
  } else if (scene === 'over') {
    k.hp = 0;
    S.wave = 5;
    S.score = 6420;
    S.kills = 138;
    S.time = 195;
    S.best = { score: 6420, wave: 5, kills: 138, streak: 12 };
    S.state = 'over';
  }
}
