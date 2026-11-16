// EMBERFALL — combat: dashing, firing, damage, kills, hurting the player,
// level-ups and upgrade picks, and click handling for menus. This is where
// the numbers change; update.js decides when each of these runs.
import { G, saveBest, loadBest, getPlayerDmg, getFireInterval, getBoltSpeed, getDashMaxCooldown } from './state.js';
import { UPGRADES, W, H } from './config.js';
import { rand, randRange, randChoice } from './random.js';
import { spawnParticle, spawnFloatText } from './particles.js';
import { createEnemy } from './enemies.js';
import { Sfx } from './audio.js';
import { keys, mouse } from './input.js';

export function tryDash() {
  const p = G.player;
  if (!p || p.dashCooldown > 0 || p.dashTimer > 0) return;

  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx === 0 && dy === 0) {
    const ang = Math.atan2(mouse.y - p.y, mouse.x - p.x);
    dx = Math.cos(ang);
    dy = Math.sin(ang);
  } else {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }

  p.dashVx = dx * 720;
  p.dashVy = dy * 720;
  p.dashTimer = 0.17;
  p.dashCooldown = getDashMaxCooldown();
  p.invuln = Math.max(p.invuln, 0.26);
  Sfx.play('dash');

  for (let i = 0; i < 14; i++) {
    spawnParticle(p.x, p.y, -dx * randRange(40, 160) + randRange(-50, 50), -dy * randRange(40, 160) + randRange(-50, 50), randRange(3, 6), '#ff9f1c', 0.45);
  }
}

export function firePlayerBolts() {
  const p = G.player;
  const baseAngle = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  const count = 1 + p.upgrades.multi;
  const spreadArc = Math.min(0.65, (count - 1) * 0.13);
  const spd = getBoltSpeed();
  const baseDmg = getPlayerDmg();
  const critChance = 0.05 + p.upgrades.crit * 0.10;

  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : -spreadArc / 2 + (spreadArc / (count - 1)) * i;
    const ang = baseAngle + offset + randRange(-0.02, 0.02);
    const isCrit = rand() < critChance;
    G.bullets.push({
      x: p.x + Math.cos(ang) * 18,
      y: p.y + Math.sin(ang) * 18,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: isCrit ? 6.5 : 5,
      dmg: isCrit ? baseDmg * 2 : baseDmg,
      crit: isCrit,
      pierce: p.upgrades.pierce,
      hitIds: [],
      life: 1.4,
    });
  }

  // Muzzle spark
  const mx = p.x + Math.cos(baseAngle) * 20;
  const my = p.y + Math.sin(baseAngle) * 20;
  for (let i = 0; i < 4; i++) {
    const a = baseAngle + randRange(-0.5, 0.5);
    const s = randRange(60, 160);
    spawnParticle(mx, my, Math.cos(a) * s, Math.sin(a) * s, randRange(2, 4), '#ffd166', 0.2);
  }
  Sfx.play('shoot');
}

export function damageEnemy(e, dmg, kbX, kbY, isCrit = false) {
  e.hp -= dmg;
  e.flash = 0.11;
  const kbResist = e.type === 'boss' ? 0.12 : (e.type === 'brute' ? 0.35 : 1.0);
  e.kx += kbX * kbResist;
  e.ky += kbY * kbResist;

  spawnFloatText(
    e.x,
    e.y - e.r,
    Math.round(dmg) + (isCrit ? '!' : ''),
    isCrit ? '#ffd166' : '#ffffff',
    isCrit ? 19 : 14,
  );

  if (e.hp <= 0) {
    killEnemy(e);
  } else {
    Sfx.play('hit');
  }
}

export function killEnemy(e) {
  G.kills++;
  G.combo = Math.min(8, G.combo + (e.type === 'boss' ? 3 : 0.25));
  G.comboTimer = 4.2;
  const mult = Math.floor(G.combo);
  G.score += e.score * mult;

  // Death particles
  const pCount = e.type === 'boss' ? 55 : (e.type === 'brute' ? 24 : 14);
  for (let i = 0; i < pCount; i++) {
    const ang = randRange(0, Math.PI * 2);
    const spd = randRange(40, e.type === 'boss' ? 320 : 200);
    spawnParticle(e.x, e.y, Math.cos(ang) * spd, Math.sin(ang) * spd, randRange(2.5, 6.5), e.color, randRange(0.3, 0.75));
  }

  // Splitter spawns 2 Cinders
  if (e.type === 'splitter') {
    for (let s = -1; s <= 1; s += 2) {
      const child = createEnemy('cinder', e.x + s * 16, e.y + randRange(-10, 10));
      child.kx = s * 140;
      child.ky = randRange(-80, 80);
      G.enemies.push(child);
    }
  }

  // Hit-stop & shake on big enemies
  if (e.type === 'brute' || e.type === 'boss') {
    G.hitStop = e.type === 'boss' ? 0.12 : 0.045;
    G.shakeTimer = e.type === 'boss' ? 0.45 : 0.18;
    G.shakeMag = e.type === 'boss' ? 14 : 6;
  }

  // Drop XP Gem(s)
  const gemCount = e.type === 'boss' ? 10 : (e.type === 'brute' ? 3 : 1);
  for (let g = 0; g < gemCount; g++) {
    G.gems.push({
      x: e.x + randRange(-14, 14),
      y: e.y + randRange(-14, 14),
      vx: randRange(-60, 60),
      vy: randRange(-60, 60),
      val: Math.max(1, Math.round(e.xp / gemCount)),
      r: e.xp >= 6 ? 7 : 5.5,
      color: e.xp >= 6 ? '#00f5d4' : '#ff9f1c',
      phase: randRange(0, Math.PI * 2),
    });
  }

  // Rare pickup drop
  const dropRoll = rand();
  if (e.type === 'boss' || dropRoll < 0.045) {
    const pType = randChoice(['heart', 'bomb', 'magnet']);
    G.pickups.push({
      x: e.x,
      y: e.y,
      type: pType,
      r: 13,
      life: 16,
      phase: 0,
    });
  }

  Sfx.play('kill');
}

export function hurtPlayer(dmg) {
  const p = G.player;
  if (p.invuln > 0) return;
  p.hp -= dmg;
  p.invuln = 0.65;
  G.combo = 1;
  G.comboTimer = 0;
  G.hurtFlash = 0.45;
  G.shakeTimer = 0.28;
  G.shakeMag = 10;
  Sfx.play('hurt');
  spawnFloatText(p.x, p.y - 18, '-' + Math.round(dmg), '#ff2a55', 18);

  if (p.hp <= 0) {
    p.hp = 0;
    G.state = 'over';
    saveBest(G.score, G.wave, G.kills);
    G.best = loadBest();
  }
}

export function triggerLevelUp() {
  G.player.level++;
  G.player.xp -= G.player.xpNext;
  G.player.xpNext = Math.floor(10 + G.player.level * 6.5);

  const available = UPGRADES.filter((u) => G.player.upgrades[u.id] < 5);
  const pool = available.length >= 3 ? available.slice() : UPGRADES.slice();
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    choices.push(pool.splice(idx, 1)[0]);
  }
  G.upgradeChoices = choices;
  G.state = 'upgrade';
  Sfx.play('levelup');
}

export function applyUpgrade(u) {
  const p = G.player;
  if (!p || !u) return;
  p.upgrades[u.id] = Math.min(5, (p.upgrades[u.id] || 0) + 1);
  if (u.id === 'hp') {
    p.maxHp += 25;
    p.hp = Math.min(p.maxHp, p.hp + 25);
  }
  spawnFloatText(p.x, p.y - 20, u.name.toUpperCase() + '!', u.color, 17);
  G.state = 'play';
  Sfx.play('pickup');
}

export function getUpgradeCardRects() {
  const cardW = 270;
  const cardH = 330;
  const gap = 34;
  const totalW = cardW * 3 + gap * 2;
  const startX = (W - totalW) / 2;
  const y = (H - cardH) / 2 + 18;
  return [
    { x: startX, y, w: cardW, h: cardH },
    { x: startX + cardW + gap, y, w: cardW, h: cardH },
    { x: startX + (cardW + gap) * 2, y, w: cardW, h: cardH },
  ];
}

// Click handling for menus (start / game-over / pause / upgrade cards).
// startNewGame is injected by main.js to avoid a state<->combat cycle.
export function handleClick(startNewGame) {
  if (G.state === 'start') {
    startNewGame();
  } else if (G.state === 'over') {
    startNewGame();
  } else if (G.state === 'pause') {
    G.state = 'play';
  } else if (G.state === 'upgrade') {
    const cards = getUpgradeCardRects();
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (mouse.x >= c.x && mouse.x <= c.x + c.w && mouse.y >= c.y && mouse.y <= c.y + c.h) {
        if (G.upgradeChoices[i]) {
          applyUpgrade(G.upgradeChoices[i]);
          break;
        }
      }
    }
  }
}
