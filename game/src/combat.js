// EMBERFALL — the fighting itself: dashing, firing, hitting foes, dying
// foes and their drops, hurting the keeper, level-ups and blessing picks,
// and taps on the menus. update.js decides WHEN each of these runs; this
// file decides WHAT happens.
import { S, saveBest, loadBest, boltDamage, fireGap, boltSpeed, dashCooldownMax } from './state.js';
import { BLESSINGS, W, H } from './config.js';
import { rand, randRange, randChoice } from './random.js';
import { puff, popup } from './particles.js';
import { makeFoe } from './enemies.js';
import { Sfx } from './audio.js';
import { keys, mouse } from './input.js';

export function dash() {
  const k = S.keeper;
  if (!k || k.dashCooldown > 0 || k.dashTimer > 0) return;

  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx === 0 && dy === 0) {
    // No movement keys: dash toward the aim.
    const ang = Math.atan2(mouse.y - k.y, mouse.x - k.x);
    dx = Math.cos(ang);
    dy = Math.sin(ang);
  } else {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }

  k.dashVx = dx * 720;
  k.dashVy = dy * 720;
  k.dashTimer = 0.17;
  k.dashCooldown = dashCooldownMax();
  k.invuln = Math.max(k.invuln, 0.26);
  Sfx.play('dash');

  for (let i = 0; i < 14; i++) {
    puff(k.x, k.y, -dx * randRange(40, 160) + randRange(-50, 50), -dy * randRange(40, 160) + randRange(-50, 50), randRange(3, 6), '#ff9f1c', 0.45);
  }
}

export function fireBolts() {
  const k = S.keeper;
  const aim = Math.atan2(mouse.y - k.y, mouse.x - k.x);
  const count = 1 + k.blessings.multi;
  const arc = Math.min(0.65, (count - 1) * 0.13);
  const spd = boltSpeed();
  const dmg = boltDamage();
  const critOdds = 0.05 + k.blessings.crit * 0.10;

  for (let i = 0; i < count; i++) {
    const off = count === 1 ? 0 : -arc / 2 + (arc / (count - 1)) * i;
    const ang = aim + off + randRange(-0.02, 0.02);
    const crit = rand() < critOdds;
    S.bolts.push({
      x: k.x + Math.cos(ang) * 18,
      y: k.y + Math.sin(ang) * 18,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: crit ? 6.5 : 5,
      dmg: crit ? dmg * 2 : dmg,
      crit,
      pierce: k.blessings.pierce,
      hitIds: [],
      life: 1.4,
    });
  }

  // Muzzle sparks at the lantern's mouth.
  const mx = k.x + Math.cos(aim) * 20;
  const my = k.y + Math.sin(aim) * 20;
  for (let i = 0; i < 4; i++) {
    const a = aim + randRange(-0.5, 0.5);
    const s = randRange(60, 160);
    puff(mx, my, Math.cos(a) * s, Math.sin(a) * s, randRange(2, 4), '#ffd166', 0.2);
  }
  Sfx.play('shoot');
}

export function hitFoe(foe, dmg, kbX, kbY, crit = false) {
  foe.hp -= dmg;
  foe.flash = 0.11;
  const resist = foe.type === 'boss' ? 0.12 : (foe.type === 'brute' ? 0.35 : 1.0);
  foe.kx += kbX * resist;
  foe.ky += kbY * resist;

  popup(
    foe.x,
    foe.y - foe.r,
    Math.round(dmg) + (crit ? '!' : ''),
    crit ? '#ffd166' : '#ffffff',
    crit ? 19 : 14,
  );

  if (foe.hp <= 0) slayFoe(foe);
  else Sfx.play('hit');
}

export function slayFoe(foe) {
  S.kills++;
  S.combo = Math.min(8, S.combo + (foe.type === 'boss' ? 3 : 0.25));
  S.comboTimer = 4.2;
  S.score += foe.score * Math.floor(S.combo);

  const burst = foe.type === 'boss' ? 55 : (foe.type === 'brute' ? 24 : 14);
  for (let i = 0; i < burst; i++) {
    const ang = randRange(0, Math.PI * 2);
    const spd = randRange(40, foe.type === 'boss' ? 320 : 200);
    puff(foe.x, foe.y, Math.cos(ang) * spd, Math.sin(ang) * spd, randRange(2.5, 6.5), foe.color, randRange(0.3, 0.75));
  }

  // A splitter bursts into two cinders.
  if (foe.type === 'splitter') {
    for (const s of [-1, 1]) {
      const child = makeFoe('cinder', foe.x + s * 16, foe.y + randRange(-10, 10));
      child.kx = s * 140;
      child.ky = randRange(-80, 80);
      S.foes.push(child);
    }
  }

  // Big kills freeze the frame for a beat and shake the screen.
  if (foe.type === 'brute' || foe.type === 'boss') {
    S.hitStop = foe.type === 'boss' ? 0.12 : 0.045;
    S.shakeTimer = foe.type === 'boss' ? 0.45 : 0.18;
    S.shakeMag = foe.type === 'boss' ? 14 : 6;
  }

  // Shard drops: bosses rain them, brutes drop three, the rest one.
  const n = foe.type === 'boss' ? 10 : (foe.type === 'brute' ? 3 : 1);
  for (let g = 0; g < n; g++) {
    S.shards.push({
      x: foe.x + randRange(-14, 14),
      y: foe.y + randRange(-14, 14),
      vx: randRange(-60, 60),
      vy: randRange(-60, 60),
      val: Math.max(1, Math.round(foe.xp / n)),
      r: foe.xp >= 6 ? 7 : 5.5,
      color: foe.xp >= 6 ? '#00f5d4' : '#ff9f1c',
      phase: randRange(0, Math.PI * 2),
    });
  }

  // Rare drops: a boss always leaves one; anyone else rarely does.
  if (foe.type === 'boss' || rand() < 0.045) {
    S.drops.push({
      x: foe.x,
      y: foe.y,
      type: randChoice(['heart', 'bomb', 'magnet']),
      r: 13,
      life: 16,
      phase: 0,
    });
  }

  Sfx.play('kill');
}

export function woundKeeper(dmg) {
  const k = S.keeper;
  if (k.invuln > 0) return;
  k.hp -= dmg;
  k.invuln = 0.65;
  S.combo = 1;
  S.comboTimer = 0;
  S.hurtFlash = 0.45;
  S.shakeTimer = 0.28;
  S.shakeMag = 10;
  Sfx.play('hurt');
  popup(k.x, k.y - 18, '-' + Math.round(dmg), '#ff2a55', 18);

  if (k.hp <= 0) {
    k.hp = 0;
    S.state = 'over';
    saveBest(S.score, S.wave, S.kills);
    S.best = loadBest();
  }
}

export function openLevelUp() {
  const k = S.keeper;
  k.level++;
  k.xp -= k.xpNext;
  k.xpNext = Math.floor(10 + k.level * 6.5);

  const open = BLESSINGS.filter((b) => k.blessings[b.id] < 5);
  const pool = open.length >= 3 ? open.slice() : BLESSINGS.slice();
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    picks.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  S.blessingChoices = picks;
  S.state = 'bless';
  Sfx.play('levelup');
}

export function takeBlessing(b) {
  const k = S.keeper;
  if (!k || !b) return;
  k.blessings[b.id] = Math.min(5, (k.blessings[b.id] || 0) + 1);
  if (b.id === 'hp') {
    k.maxHp += 25;
    k.hp = Math.min(k.maxHp, k.hp + 25);
  }
  popup(k.x, k.y - 20, b.name.toUpperCase() + '!', b.color, 17);
  S.state = 'play';
  Sfx.play('pickup');
}

export function cardRects() {
  const cw = 270;
  const ch = 330;
  const gap = 34;
  const total = cw * 3 + gap * 2;
  const x0 = (W - total) / 2;
  const y = (H - ch) / 2 + 18;
  return [
    { x: x0, y, w: cw, h: ch },
    { x: x0 + cw + gap, y, w: cw, h: ch },
    { x: x0 + (cw + gap) * 2, y, w: cw, h: ch },
  ];
}

// Taps on the menus. newRun is passed in by main.js so this module never
// imports the boot sequence back.
export function onTap(newRun) {
  if (S.state === 'start' || S.state === 'over') {
    newRun();
  } else if (S.state === 'pause') {
    S.state = 'play';
  } else if (S.state === 'bless') {
    for (let i = 0; i < cardRects().length; i++) {
      const c = cardRects()[i];
      const inside = mouse.x >= c.x && mouse.x <= c.x + c.w && mouse.y >= c.y && mouse.y <= c.y + c.h;
      if (inside && S.blessingChoices[i]) {
        takeBlessing(S.blessingChoices[i]);
        break;
      }
    }
  }
}
