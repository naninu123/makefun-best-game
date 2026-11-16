// EMBERFALL — one frame of simulation: the keeper's movement and fire,
// the wave spawner, bolts and foe shots, foe brains, shards, drops, sparks
// and popups. Drawing lives in render.js; this file only moves things.
// step() runs only while the state is 'play' (the drifting embers move in
// every state; a hit-stop freezes the rest for a beat).
import { S, moveSpeed, fireGap, magnetRange, auraRange } from './state.js';
import { CX, CY, W, H } from './config.js';
import { rand, randRange, randChoice } from './random.js';
import { Sfx } from './audio.js';
import { keys, mouse } from './input.js';
import { puff, popup, stepSparks, stepPopups } from './particles.js';
import { makeFoe, spawnFoe } from './enemies.js';
import { fireBolts, dash, hitFoe, slayFoe, woundKeeper, openLevelUp } from './combat.js';

function driftEmbers(dt) {
  for (const b of S.drifting) {
    b.x += b.vx * dt + Math.sin(S.time * 1.5 + b.phase) * 12 * dt;
    b.y += b.vy * dt;
    if (b.y < -10) { b.y = H + 10; b.x = randRange(0, W); }
    if (b.x < -10) b.x = W + 10;
    if (b.x > W + 10) b.x = -10;
  }
}

// The lantern and the pillars block movement; built once, read every frame.
const OBSTACLES = [{ x: CX, y: CY, r: 28 }, ...S.pillars];

function stepKeeper(dt) {
  const k = S.keeper;

  if (k.blessings.regen > 0 && k.hp < k.maxHp) {
    k.hp = Math.min(k.maxHp, k.hp + k.blessings.regen * 1.5 * dt);
  }
  // Standing close to the lantern warms the keeper back up, slowly.
  if (Math.hypot(k.x - CX, k.y - CY) < 135 && k.hp < k.maxHp) {
    k.hp = Math.min(k.maxHp, k.hp + 0.8 * dt);
  }

  if (k.invuln > 0) k.invuln -= dt;
  if (k.dashCooldown > 0) k.dashCooldown -= dt;

  if (k.dashTimer > 0) {
    k.dashTimer -= dt;
    k.x += k.dashVx * dt;
    k.y += k.dashVy * dt;
    if (rand() < 0.7) {
      puff(k.x, k.y, randRange(-30, 30), randRange(-30, 30), randRange(3, 5), '#ff9f1c', 0.25);
    }
  } else {
    let mx = 0, my = 0;
    if (keys['KeyW'] || keys['ArrowUp']) my -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) my += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }
    const spd = moveSpeed();
    k.vx = mx * spd;
    k.vy = my * spd;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
  }

  // Stay inside the arena, and slide around the lantern and the pillars.
  k.x = Math.max(k.r + 16, Math.min(W - k.r - 16, k.x));
  k.y = Math.max(k.r + 16, Math.min(H - k.r - 16, k.y));
  for (const ob of OBSTACLES) {
    const dx = k.x - ob.x;
    const dy = k.y - ob.y;
    const d = Math.hypot(dx, dy);
    const minD = k.r + ob.r;
    if (d < minD && d > 0.001) {
      k.x = ob.x + (dx / d) * minD;
      k.y = ob.y + (dy / d) * minD;
    }
  }

  k.angle = Math.atan2(mouse.y - k.y, mouse.x - k.x);

  k.fireTimer -= dt;
  if ((mouse.down || keys['Space']) && k.fireTimer <= 0) {
    fireBolts();
    k.fireTimer = fireGap();
  }

  // The halo blessing scorches everything in reach, four times a second.
  const halo = auraRange();
  if (halo > 0) {
    k.auraTick -= dt;
    if (k.auraTick <= 0) {
      k.auraTick = 0.25;
      const burn = (6 + k.blessings.aura * 4.5) * (1 + k.blessings.dmg * 0.2);
      for (let i = S.foes.length - 1; i >= 0; i--) {
        const f = S.foes[i];
        if (Math.hypot(f.x - k.x, f.y - k.y) <= halo + f.r) hitFoe(f, burn, 0, 0, false);
      }
    }
  }
}

function stepWaves(dt) {
  if (S.waveSpawned < S.waveQuota) {
    S.spawnCooldown -= dt;
    if (S.spawnCooldown <= 0) {
      spawnFoe();
      S.waveSpawned++;
      const gap = Math.max(0.22, 0.95 - S.wave * 0.065);
      S.spawnCooldown = gap * randRange(0.7, 1.25);
    }
    return;
  }
  if (S.foes.length !== 0) return;

  // The field is clear: the next wave begins.
  S.wave++;
  S.score += 50 * S.wave;
  popup(CX, CY - 70, 'WAVE BONUS +' + (50 * S.wave), '#ffd166', 20);
  S.waveSpawned = 0;
  S.waveQuota = Math.floor(14 + S.wave * 5.5);
  S.spawnCooldown = 1.6;
  S.bannerTimer = 2.6;
  S.bannerText = 'WAVE ' + S.wave;

  if (S.wave % 5 === 0) {
    S.bannerSub = 'THE GLOOM WARDEN APPROACHES';
    S.foes.push(makeFoe('boss', CX, -60));
    S.shakeTimer = 0.5;
    S.shakeMag = 9;
    Sfx.play('boss');
    return;
  }
  const subs = [
    'SHADOWS GATHER AT THE PERIMETER',
    'THE HOLLOW GROWS COLDER',
    'HOLD FAST TO THE FLAME',
    'SWARM OF THE UNLIT',
  ];
  S.bannerSub = subs[S.wave % subs.length];
}

function stepBolts(dt) {
  for (let i = S.bolts.length - 1; i >= 0; i--) {
    const b = S.bolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (rand() < 0.45) {
      puff(b.x, b.y, randRange(-25, 25), randRange(-25, 25), randRange(1.8, 3.2), b.crit ? '#ffd166' : '#ff7b00', 0.16);
    }

    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
      S.bolts.splice(i, 1);
      continue;
    }

    // A bolt that clips a pillar dies in sparks.
    let blocked = false;
    for (const pil of S.pillars) {
      if (Math.hypot(b.x - pil.x, b.y - pil.y) < b.r + pil.r) { blocked = true; break; }
    }
    if (blocked) {
      for (let s = 0; s < 5; s++) {
        puff(b.x, b.y, randRange(-90, 90), randRange(-90, 90), 2.5, '#ff9f1c', 0.2);
      }
      S.bolts.splice(i, 1);
      continue;
    }

    for (let j = S.foes.length - 1; j >= 0; j--) {
      const f = S.foes[j];
      if (b.hitIds.includes(f.id)) continue;
      if (Math.hypot(b.x - f.x, b.y - f.y) < b.r + f.r) {
        b.hitIds.push(f.id);
        const len = Math.hypot(b.vx, b.vy) || 1;
        hitFoe(f, b.dmg, (b.vx / len) * 145, (b.vy / len) * 145, b.crit);
        if (b.pierce > 0) {
          b.pierce--;
          b.dmg *= 0.85;
        } else {
          S.bolts.splice(i, 1);
          break;
        }
      }
    }
  }
}

function stepFoeShots(dt) {
  const k = S.keeper;
  for (let i = S.foeShots.length - 1; i >= 0; i--) {
    const s = S.foeShots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0 || s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
      S.foeShots.splice(i, 1);
      continue;
    }
    if (Math.hypot(s.x - k.x, s.y - k.y) < s.r + k.r) {
      woundKeeper(s.dmg);
      S.foeShots.splice(i, 1);
    }
  }
}

function stepFoes(dt) {
  const k = S.keeper;
  for (let i = S.foes.length - 1; i >= 0; i--) {
    const f = S.foes[i];
    if (f.flash > 0) f.flash -= dt;

    const dx = k.x - f.x;
    const dy = k.y - f.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);

    if (f.type === 'cinder' || f.type === 'brute' || f.type === 'splitter') {
      f.vx = Math.cos(ang) * f.speed;
      f.vy = Math.sin(ang) * f.speed;
    } else if (f.type === 'wisp') {
      // Wisps dart: a sine weave over their chase line.
      const weave = Math.sin(S.time * 7 + f.phase) * 1.15;
      f.vx = Math.cos(ang + weave) * f.speed;
      f.vy = Math.sin(ang + weave) * f.speed;
    } else if (f.type === 'spitter') {
      // Spitters hold a ring: close in when far, back off when near, strafe between.
      if (dist > 280) {
        f.vx = Math.cos(ang) * f.speed;
        f.vy = Math.sin(ang) * f.speed;
      } else if (dist < 190) {
        f.vx = -Math.cos(ang) * f.speed * 0.8;
        f.vy = -Math.sin(ang) * f.speed * 0.8;
      } else {
        f.vx = Math.cos(ang + Math.PI / 2) * f.speed * 0.65;
        f.vy = Math.sin(ang + Math.PI / 2) * f.speed * 0.65;
      }
      f.shootTimer -= dt;
      if (f.shootTimer <= 0) {
        f.shootTimer = randRange(1.8, 2.7);
        S.foeShots.push({
          x: f.x, y: f.y,
          vx: Math.cos(ang) * 240,
          vy: Math.sin(ang) * 240,
          r: 6, dmg: 14, color: '#e0aaff', life: 3.5,
        });
      }
    } else if (f.type === 'boss') {
      stepBoss(f, ang, dt);
    }

    f.x += (f.vx + f.kx) * dt;
    f.y += (f.vy + f.ky) * dt;
    f.kx *= Math.pow(0.04, dt);
    f.ky *= Math.pow(0.04, dt);

    // Foes push each other apart so they never stack.
    for (let j = i - 1; j >= 0; j--) {
      const o = S.foes[j];
      const sx = f.x - o.x;
      const sy = f.y - o.y;
      const sd = Math.hypot(sx, sy);
      const minSep = f.r + o.r;
      if (sd > 0 && sd < minSep) {
        const shove = (minSep - sd) * 0.35;
        const nx = sx / sd;
        const ny = sy / sd;
        f.x += nx * shove;
        f.y += ny * shove;
        o.x -= nx * shove;
        o.y -= ny * shove;
      }
    }

    // A foe that reaches the keeper hurts them (brutes and the boss shove too).
    if (Math.hypot(f.x - k.x, f.y - k.y) < f.r + k.r) {
      if (f.type === 'brute' || f.type === 'boss') {
        k.x += Math.cos(ang) * 28;
        k.y += Math.sin(ang) * 28;
      }
      woundKeeper(f.dmg);
    }
  }
}

function stepBoss(f, ang, dt) {
  f.stateTimer -= dt;
  if (f.stateTimer <= 0) {
    if (f.subState === 'chase') {
      f.subState = randChoice(['burst', 'charge', 'summon']);
      f.stateTimer = f.subState === 'charge' ? 1.1 : 1.5;
      if (f.subState === 'charge') {
        f.chargeVx = Math.cos(ang) * 340;
        f.chargeVy = Math.sin(ang) * 340;
      } else if (f.subState === 'burst') {
        for (let b = 0; b < 12; b++) {
          const ba = (Math.PI * 2 / 12) * b + S.time;
          S.foeShots.push({
            x: f.x, y: f.y,
            vx: Math.cos(ba) * 230,
            vy: Math.sin(ba) * 230,
            r: 7, dmg: 18, color: '#ff4d6d', life: 4.0,
          });
        }
      } else if (f.subState === 'summon') {
        for (let s = 0; s < 3; s++) {
          const sa = (Math.PI * 2 / 3) * s;
          S.foes.push(makeFoe('cinder', f.x + Math.cos(sa) * 52, f.y + Math.sin(sa) * 52));
        }
      }
    } else {
      f.subState = 'chase';
      f.stateTimer = 2.6;
    }
  }
  if (f.subState === 'charge') {
    f.vx = f.chargeVx;
    f.vy = f.chargeVy;
  } else {
    f.vx = Math.cos(ang) * f.speed;
    f.vy = Math.sin(ang) * f.speed;
  }
}

function stepShards(dt) {
  const k = S.keeper;
  const reach = magnetRange();
  for (let i = S.shards.length - 1; i >= 0; i--) {
    const g = S.shards[i];
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= Math.pow(0.06, dt);
    g.vy *= Math.pow(0.06, dt);

    const d = Math.hypot(k.x - g.x, k.y - g.y);
    if (d < reach || g.magnetized) {
      const pull = g.magnetized ? 680 : 420;
      const ang = Math.atan2(k.y - g.y, k.x - g.x);
      g.x += Math.cos(ang) * pull * dt;
      g.y += Math.sin(ang) * pull * dt;
    }

    if (d < k.r + g.r + 6) {
      k.xp += g.val;
      S.score += g.val * 5;
      Sfx.play('gem', S.combo);
      S.shards.splice(i, 1);
      if (k.xp >= k.xpNext && S.state === 'play') openLevelUp();
    }
  }
}

function stepDrops(dt) {
  const k = S.keeper;
  for (let i = S.drops.length - 1; i >= 0; i--) {
    const d = S.drops[i];
    d.life -= dt;
    d.phase += dt * 4;
    if (d.life <= 0) {
      S.drops.splice(i, 1);
      continue;
    }
    if (Math.hypot(k.x - d.x, k.y - d.y) >= k.r + d.r + 6) continue;

    Sfx.play('pickup');
    if (d.type === 'heart') {
      k.hp = Math.min(k.maxHp, k.hp + 30);
      popup(k.x, k.y - 20, '+30 HP', '#ff4d6d', 18);
    } else if (d.type === 'magnet') {
      for (const g of S.shards) g.magnetized = true;
      popup(k.x, k.y - 20, 'EMBER MAGNET!', '#00f5d4', 18);
    } else if (d.type === 'bomb') {
      S.whiteFlash = 0.65;
      S.shakeTimer = 0.4;
      S.shakeMag = 12;
      popup(k.x, k.y - 20, 'SOLAR FLARE!', '#ffd166', 20);
      for (let j = S.foes.length - 1; j >= 0; j--) {
        const f = S.foes[j];
        if (f.type === 'boss') hitFoe(f, 220, 0, 0, true);
        else {
          slayFoe(f);
          S.foes.splice(j, 1);
        }
      }
    }
    S.drops.splice(i, 1);
  }
}

export function step(dt) {
  driftEmbers(dt);

  if (S.state !== 'play') {
    if (S.state === 'start') S.time += dt;
    mouse.clicked = false;
    return;
  }

  if (S.hitStop > 0) {
    S.hitStop -= dt;
    mouse.clicked = false;
    return;
  }

  S.time += dt;
  if (S.bannerTimer > 0) S.bannerTimer -= dt;
  if (S.announceTimer > 0) S.announceTimer -= dt;
  if (S.shakeTimer > 0) S.shakeTimer -= dt;
  if (S.hurtFlash > 0) S.hurtFlash -= dt * 1.4;
  if (S.whiteFlash > 0) S.whiteFlash -= dt * 2.2;

  if (S.combo > 1) {
    S.comboTimer -= dt;
    if (S.comboTimer <= 0) S.combo = 1;
  }

  stepKeeper(dt);
  stepWaves(dt);
  stepBolts(dt);
  stepFoeShots(dt);
  stepFoes(dt);
  stepShards(dt);
  stepDrops(dt);
  stepSparks(dt);
  stepPopups(dt);

  mouse.clicked = false;
}
