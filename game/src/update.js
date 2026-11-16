// EMBERFALL — the per-frame simulation: player movement, firing, waves,
// bullets, enemy AI, gems, pickups, particles. Render lives in render.js.
// update() runs only while the state is 'play' (background embers drift in
// every state; hit-stop freezes the rest for a beat).
import { G, getMoveSpeed, getFireInterval, getMagnetRadius, getAuraRadius } from './state.js';
import { CX, CY, W, H } from './config.js';
import { rand, randRange, randChoice } from './random.js';
import { Sfx } from './audio.js';
import { keys, mouse } from './input.js';
import { spawnParticle, spawnFloatText, updateParticles, updateFloatTexts } from './particles.js';
import { createEnemy, spawnWaveEnemy } from './enemies.js';
import { firePlayerBolts, tryDash, damageEnemy, killEnemy, hurtPlayer, triggerLevelUp } from './combat.js';

export function update(dt) {
  // Update drifting background embers in all states
  for (let i = 0; i < G.bgEmbers.length; i++) {
    const b = G.bgEmbers[i];
    b.x += b.vx * dt + Math.sin(G.time * 1.5 + b.phase) * 12 * dt;
    b.y += b.vy * dt;
    if (b.y < -10) { b.y = H + 10; b.x = randRange(0, W); }
    if (b.x < -10) b.x = W + 10;
    if (b.x > W + 10) b.x = -10;
  }

  if (G.state !== 'play') {
    if (G.state === 'start') {
      G.time += dt;
    }
    mouse.clicked = false;
    return;
  }

  if (G.hitStop > 0) {
    G.hitStop -= dt;
    mouse.clicked = false;
    return;
  }

  G.time += dt;
  if (G.bannerTimer > 0) G.bannerTimer -= dt;
  if (G.shakeTimer > 0) G.shakeTimer -= dt;
  if (G.hurtFlash > 0) G.hurtFlash -= dt * 1.4;
  if (G.whiteFlash > 0) G.whiteFlash -= dt * 2.2;

  if (G.combo > 1) {
    G.comboTimer -= dt;
    if (G.comboTimer <= 0) {
      G.combo = 1;
    }
  }

  const p = G.player;

  // Regen
  if (p.upgrades.regen > 0 && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + p.upgrades.regen * 1.5 * dt);
  }
  // Warmth near central lantern (subtle +1 HP/s within 130px)
  const distToLantern = Math.hypot(p.x - CX, p.y - CY);
  if (distToLantern < 135 && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + 0.8 * dt);
  }

  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashCooldown > 0) p.dashCooldown -= dt;

  // Movement
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashVx * dt;
    p.y += p.dashVy * dt;
    if (rand() < 0.7) {
      spawnParticle(p.x, p.y, randRange(-30, 30), randRange(-30, 30), randRange(3, 5), '#ff9f1c', 0.25);
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
    const spd = getMoveSpeed();
    p.vx = mx * spd;
    p.vy = my * spd;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  // Keep player inside arena & collide with central lantern / pillars
  p.x = Math.max(p.r + 16, Math.min(W - p.r - 16, p.x));
  p.y = Math.max(p.r + 16, Math.min(H - p.r - 16, p.y));

  const obstacles = [{ x: CX, y: CY, r: 28 }, ...G.pillars];
  for (let i = 0; i < obstacles.length; i++) {
    const ob = obstacles[i];
    const dx = p.x - ob.x;
    const dy = p.y - ob.y;
    const d = Math.hypot(dx, dy);
    const minD = p.r + ob.r;
    if (d < minD && d > 0.001) {
      p.x = ob.x + (dx / d) * minD;
      p.y = ob.y + (dy / d) * minD;
    }
  }

  p.angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

  // Firing
  p.fireTimer -= dt;
  if ((mouse.down || keys['Space']) && p.fireTimer <= 0) {
    firePlayerBolts();
    p.fireTimer = getFireInterval();
  }

  // Lantern Aura upgrade
  const auraR = getAuraRadius();
  if (auraR > 0) {
    p.auraTick -= dt;
    if (p.auraTick <= 0) {
      p.auraTick = 0.25;
      const auraDmg = (6 + p.upgrades.aura * 4.5) * (1 + p.upgrades.dmg * 0.2);
      for (let i = G.enemies.length - 1; i >= 0; i--) {
        const e = G.enemies[i];
        if (Math.hypot(e.x - p.x, e.y - p.y) <= auraR + e.r) {
          damageEnemy(e, auraDmg, 0, 0, false);
        }
      }
    }
  }

  // Wave Spawner
  if (G.waveSpawned < G.waveQuota) {
    G.spawnCooldown -= dt;
    if (G.spawnCooldown <= 0) {
      spawnWaveEnemy();
      G.waveSpawned++;
      const baseInterval = Math.max(0.22, 0.95 - G.wave * 0.065);
      G.spawnCooldown = baseInterval * randRange(0.7, 1.25);
    }
  } else if (G.enemies.length === 0) {
    // Next Wave
    G.wave++;
    G.waveSpawned = 0;
    G.waveQuota = Math.floor(14 + G.wave * 5.5);
    G.spawnCooldown = 1.6;
    G.bannerTimer = 2.6;
    G.bannerText = 'WAVE ' + G.wave;

    if (G.wave % 5 === 0) {
      G.bannerSub = 'THE GLOOM WARDEN APPROACHES';
      G.enemies.push(createEnemy('boss', CX, -60));
      G.shakeTimer = 0.5;
      G.shakeMag = 9;
      Sfx.play('boss');
    } else {
      const subs = [
        'SHADOWS GATHER AT THE PERIMETER',
        'THE HOLLOW GROWS COLDER',
        'HOLD FAST TO THE FLAME',
        'SWARM OF THE UNLIT',
      ];
      G.bannerSub = subs[G.wave % subs.length];
    }
  }

  // Update Player Bullets
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (rand() < 0.45) {
      spawnParticle(b.x, b.y, randRange(-25, 25), randRange(-25, 25), randRange(1.8, 3.2), b.crit ? '#ffd166' : '#ff7b00', 0.16);
    }

    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
      G.bullets.splice(i, 1);
      continue;
    }

    // Check pillar hit
    let hitPillar = false;
    for (let k = 0; k < G.pillars.length; k++) {
      const pil = G.pillars[k];
      if (Math.hypot(b.x - pil.x, b.y - pil.y) < b.r + pil.r) {
        hitPillar = true;
        break;
      }
    }
    if (hitPillar) {
      for (let s = 0; s < 5; s++) {
        spawnParticle(b.x, b.y, randRange(-90, 90), randRange(-90, 90), 2.5, '#ff9f1c', 0.2);
      }
      G.bullets.splice(i, 1);
      continue;
    }

    // Check enemy hit
    for (let j = G.enemies.length - 1; j >= 0; j--) {
      const e = G.enemies[j];
      if (b.hitIds.includes(e.id)) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
        b.hitIds.push(e.id);
        const bLen = Math.hypot(b.vx, b.vy) || 1;
        damageEnemy(e, b.dmg, (b.vx / bLen) * 145, (b.vy / bLen) * 145, b.crit);
        if (b.pierce > 0) {
          b.pierce--;
          b.dmg *= 0.85;
        } else {
          G.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  // Update Enemy Projectiles
  for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
    const eb = G.enemyBullets[i];
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;
    eb.life -= dt;
    if (eb.life <= 0 || eb.x < -30 || eb.x > W + 30 || eb.y < -30 || eb.y > H + 30) {
      G.enemyBullets.splice(i, 1);
      continue;
    }
    if (Math.hypot(eb.x - p.x, eb.y - p.y) < eb.r + p.r) {
      hurtPlayer(eb.dmg);
      G.enemyBullets.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.flash > 0) e.flash -= dt;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);

    if (e.type === 'cinder' || e.type === 'brute' || e.type === 'splitter') {
      e.vx = Math.cos(ang) * e.speed;
      e.vy = Math.sin(ang) * e.speed;
    } else if (e.type === 'wisp') {
      const zig = Math.sin(G.time * 7 + e.phase) * 1.15;
      e.vx = Math.cos(ang + zig) * e.speed;
      e.vy = Math.sin(ang + zig) * e.speed;
    } else if (e.type === 'spitter') {
      if (dist > 280) {
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
      } else if (dist < 190) {
        e.vx = -Math.cos(ang) * e.speed * 0.8;
        e.vy = -Math.sin(ang) * e.speed * 0.8;
      } else {
        e.vx = Math.cos(ang + Math.PI / 2) * e.speed * 0.65;
        e.vy = Math.sin(ang + Math.PI / 2) * e.speed * 0.65;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = randRange(1.8, 2.7);
        const bSpd = 240;
        G.enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(ang) * bSpd,
          vy: Math.sin(ang) * bSpd,
          r: 6,
          dmg: 14,
          color: '#e0aaff',
          life: 3.5,
        });
      }
    } else if (e.type === 'boss') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        if (e.subState === 'chase') {
          e.subState = randChoice(['burst', 'charge', 'summon']);
          e.stateTimer = e.subState === 'charge' ? 1.1 : 1.5;
          if (e.subState === 'charge') {
            e.chargeVx = Math.cos(ang) * 340;
            e.chargeVy = Math.sin(ang) * 340;
          } else if (e.subState === 'burst') {
            const count = 12;
            for (let b = 0; b < count; b++) {
              const ba = (Math.PI * 2 / count) * b + G.time;
              G.enemyBullets.push({
                x: e.x, y: e.y,
                vx: Math.cos(ba) * 230,
                vy: Math.sin(ba) * 230,
                r: 7,
                dmg: 18,
                color: '#ff4d6d',
                life: 4.0,
              });
            }
          } else if (e.subState === 'summon') {
            for (let s = 0; s < 3; s++) {
              const sa = (Math.PI * 2 / 3) * s;
              G.enemies.push(createEnemy('cinder', e.x + Math.cos(sa) * 52, e.y + Math.sin(sa) * 52));
            }
          }
        } else {
          e.subState = 'chase';
          e.stateTimer = 2.6;
        }
      }
      if (e.subState === 'charge') {
        e.vx = e.chargeVx;
        e.vy = e.chargeVy;
      } else {
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
      }
    }

    e.x += (e.vx + e.kx) * dt;
    e.y += (e.vy + e.ky) * dt;
    e.kx *= Math.pow(0.04, dt);
    e.ky *= Math.pow(0.04, dt);

    // Soft separation between enemies
    for (let j = i - 1; j >= 0; j--) {
      const o = G.enemies[j];
      const sdx = e.x - o.x;
      const sdy = e.y - o.y;
      const sd = Math.hypot(sdx, sdy);
      const minSep = e.r + o.r;
      if (sd > 0 && sd < minSep) {
        const push = (minSep - sd) * 0.35;
        const nx = sdx / sd;
        const ny = sdy / sd;
        e.x += nx * push;
        e.y += ny * push;
        o.x -= nx * push;
        o.y -= ny * push;
      }
    }

    // Collide with player
    if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
      if (e.type === 'brute' || e.type === 'boss') {
        p.x += Math.cos(ang) * 28;
        p.y += Math.sin(ang) * 28;
      }
      hurtPlayer(e.dmg);
    }
  }

  // Update XP Gems
  const magR = getMagnetRadius();
  for (let i = G.gems.length - 1; i >= 0; i--) {
    const g = G.gems[i];
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= Math.pow(0.06, dt);
    g.vy *= Math.pow(0.06, dt);

    const d = Math.hypot(p.x - g.x, p.y - g.y);
    if (d < magR || g.magnetized) {
      const pullSpd = g.magnetized ? 680 : 420;
      const ang = Math.atan2(p.y - g.y, p.x - g.x);
      g.x += Math.cos(ang) * pullSpd * dt;
      g.y += Math.sin(ang) * pullSpd * dt;
    }

    if (d < p.r + g.r + 6) {
      p.xp += g.val;
      G.score += g.val * 5;
      Sfx.play('gem', G.combo);
      G.gems.splice(i, 1);
      if (p.xp >= p.xpNext && G.state === 'play') {
        triggerLevelUp();
      }
    }
  }

  // Update Rare Pickups
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i];
    pk.life -= dt;
    pk.phase += dt * 4;
    if (pk.life <= 0) {
      G.pickups.splice(i, 1);
      continue;
    }
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < p.r + pk.r + 6) {
      Sfx.play('pickup');
      if (pk.type === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + 30);
        spawnFloatText(p.x, p.y - 20, '+30 HP', '#ff4d6d', 18);
      } else if (pk.type === 'magnet') {
        for (let g of G.gems) g.magnetized = true;
        spawnFloatText(p.x, p.y - 20, 'EMBER MAGNET!', '#00f5d4', 18);
      } else if (pk.type === 'bomb') {
        G.whiteFlash = 0.65;
        G.shakeTimer = 0.4;
        G.shakeMag = 12;
        spawnFloatText(p.x, p.y - 20, 'SOLAR FLARE!', '#ffd166', 20);
        for (let j = G.enemies.length - 1; j >= 0; j--) {
          const e = G.enemies[j];
          if (e.type === 'boss') {
            damageEnemy(e, 220, 0, 0, true);
          } else {
            killEnemy(e);
            G.enemies.splice(j, 1);
          }
        }
      }
      G.pickups.splice(i, 1);
    }
  }

  updateParticles(dt);
  updateFloatTexts(dt);

  mouse.clicked = false;
}
