// EMBERFALL — everything drawn: the canvas setup, the arena, entities, HUD
// and every screen (title, level-up, pause, game over). No simulation here;
// update.js moves things, this file only paints the current state.
import { G, getAuraRadius, getDashMaxCooldown } from './state.js';
import { W, H, CX, CY, UPGRADES } from './config.js';
import { rand } from './random.js';
import { Sfx } from './audio.js';
import { mouse } from './input.js';
import { getUpgradeCardRects } from './combat.js';

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scale = Math.min(winW / W, winH / H);
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

export function drawPolygon(x, y, r, sides, rotation, fill, stroke, lineWidth = 2) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function drawUpgradeIcon(id, cx, cy, r, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;

  if (id === 'dmg') {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.1, r * 0.5, r * 0.7);
    ctx.quadraticCurveTo(0, r * 1.1, -r * 0.5, r * 0.7);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.1, 0, -r);
    ctx.fill();
  } else if (id === 'rate') {
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r);
    ctx.lineTo(-r * 0.5, r * 0.1);
    ctx.lineTo(r * 0.1, r * 0.1);
    ctx.lineTo(-r * 0.2, r);
    ctx.lineTo(r * 0.6, -r * 0.1);
    ctx.lineTo(0, -r * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'multi') {
    for (let a = -0.45; a <= 0.45; a += 0.45) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.arc(0, -r * 0.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (id === 'pierce') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.7);
    ctx.lineTo(r * 0.7, -r * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.7);
    ctx.lineTo(r * 0.15, -r * 0.65);
    ctx.lineTo(r * 0.65, -r * 0.15);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'hp' || id === 'regen') {
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.2, r * 0.38, Math.PI, 0, false);
    ctx.arc(r * 0.32, -r * 0.2, r * 0.38, Math.PI, 0, false);
    ctx.lineTo(0, r * 0.75);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'aura') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    drawPolygon(0, 0, r * 0.8, 6, -Math.PI / 2, color, '#fff', 1.5);
  }
  ctx.restore();
}

export function render() {
  ctx.save();

  // Screen Shake
  if (G.shakeTimer > 0 && G.state === 'play') {
    const sx = (rand() - 0.5) * G.shakeMag * 2;
    const sy = (rand() - 0.5) * G.shakeMag * 2;
    ctx.translate(sx, sy);
  }

  // 1. Arena Floor & Central Lantern Light
  ctx.fillStyle = '#09060e';
  ctx.fillRect(0, 0, W, H);

  const pulse = Math.sin(G.time * 3.2) * 18;
  const lanternGrad = ctx.createRadialGradient(CX, CY, 12, CX, CY, 520 + pulse);
  lanternGrad.addColorStop(0, 'rgba(255, 195, 100, 0.32)');
  lanternGrad.addColorStop(0.22, 'rgba(255, 115, 35, 0.16)');
  lanternGrad.addColorStop(0.55, 'rgba(110, 40, 85, 0.06)');
  lanternGrad.addColorStop(1, 'rgba(9, 6, 14, 0)');
  ctx.fillStyle = lanternGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle Ancient Stone Concentric Rings & Grid
  ctx.strokeStyle = 'rgba(255, 180, 120, 0.05)';
  ctx.lineWidth = 1.5;
  [130, 260, 410, 560].forEach((rad) => {
    ctx.beginPath();
    ctx.arc(CX, CY, rad, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let x = 80; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 80; y < H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Arena Border Runes
  ctx.strokeStyle = 'rgba(255, 130, 50, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  // Stone Pillars
  for (let i = 0; i < G.pillars.length; i++) {
    const pil = G.pillars[i];
    drawPolygon(pil.x, pil.y, pil.r + 4, 8, Math.PI / 8, '#161122', '#3a2c52', 2);
    drawPolygon(pil.x, pil.y, pil.r - 5, 8, Math.PI / 8, '#231c35', '#ff9f1c', 1);
  }

  // Central Sacred Lantern Brazier
  ctx.save();
  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 28;
  drawPolygon(CX, CY, 30, 8, G.time * 0.2, '#1f162b', '#ff9f1c', 2.5);
  drawPolygon(CX, CY, 19, 6, -G.time * 0.5, '#ff6b35', '#ffd166', 2);
  ctx.beginPath();
  ctx.arc(CX, CY, 9 + Math.sin(G.time * 6) * 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff5cc';
  ctx.fill();
  ctx.restore();

  // Drifting Background Embers
  for (let i = 0; i < G.bgEmbers.length; i++) {
    const b = G.bgEmbers[i];
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // If not on title screen, draw active battlefield entities
  if (G.player) {
    const p = G.player;

    // Lantern Aura Upgrade ring
    const auraR = getAuraRadius();
    if (auraR > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, auraR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 175, 55, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 200, 90, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();
    }

    // XP Gems
    for (let i = 0; i < G.gems.length; i++) {
      const g = G.gems[i];
      const s = g.r + Math.sin(G.time * 5 + g.phase) * 1.2;
      drawPolygon(g.x, g.y, s, 4, G.time * 2 + g.phase, g.color, '#ffffff', 1);
    }

    // Rare Pickups
    for (let i = 0; i < G.pickups.length; i++) {
      const pk = G.pickups[i];
      const bob = Math.sin(pk.phase) * 3;
      ctx.save();
      ctx.translate(pk.x, pk.y + bob);
      let col = '#ff4d6d';
      if (pk.type === 'bomb') col = '#ffd166';
      if (pk.type === 'magnet') col = '#00f5d4';

      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, pk.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 15, 30, 0.9)';
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = pk.type === 'heart' ? 'HP' : (pk.type === 'bomb' ? '✦' : 'U');
      ctx.fillText(label, 0, 1);
      ctx.restore();
    }

    // Particles
    for (let i = 0; i < G.particles.length; i++) {
      const pt = G.particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * (pt.life / pt.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Enemy Projectiles
    for (let i = 0; i < G.enemyBullets.length; i++) {
      const eb = G.enemyBullets[i];
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
      ctx.fillStyle = eb.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player Bolts
    for (let i = 0; i < G.bullets.length; i++) {
      const b = G.bullets[i];
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.fillStyle = b.crit ? '#fff3b0' : '#ff9f1c';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 1.9, b.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(2, 0, b.r * 0.9, b.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemies
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      const fillCol = e.flash > 0 ? '#ffffff' : e.color;
      const strokeCol = e.flash > 0 ? '#ffd166' : '#1b112c';

      ctx.save();
      if (e.type === 'cinder') {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = fillCol;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffd166';
        ctx.stroke();
        // Glowing core
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#fff1d0';
        ctx.fill();
      } else if (e.type === 'spitter') {
        drawPolygon(e.x, e.y, e.r * 1.15, 4, G.time * 1.8 + e.phase, fillCol, '#f72585', 2.2);
        ctx.beginPath();
        ctx.arc(e.x, e.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (e.type === 'brute') {
        drawPolygon(e.x, e.y, e.r, 6, G.time * 0.6, fillCol, '#ffb703', 3);
        drawPolygon(e.x, e.y, e.r * 0.55, 6, -G.time * 0.6, '#6a040f', '#ffba08', 1.5);
      } else if (e.type === 'wisp') {
        const moveAng = Math.atan2(e.vy, e.vx);
        drawPolygon(e.x, e.y, e.r * 1.25, 3, moveAng, fillCol, '#ffffff', 1.8);
      } else if (e.type === 'splitter') {
        drawPolygon(e.x, e.y, e.r * 1.1, 4, Math.PI / 4 + Math.sin(G.time * 4) * 0.2, fillCol, '#b5e48c', 2.2);
        drawPolygon(e.x, e.y, e.r * 0.5, 4, 0, '#1b4332', '#b5e48c', 1.5);
      } else if (e.type === 'boss') {
        ctx.shadowColor = '#9d4edd';
        ctx.shadowBlur = 22;
        drawPolygon(e.x, e.y, e.r, 10, G.time * 0.8, '#240046', '#c77dff', 3.5);
        drawPolygon(e.x, e.y, e.r * 0.72, 8, -G.time * 1.2, fillCol, '#ff9e00', 2);
        // Glowing Warden Eyes
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(e.x - 12, e.y - 6, 6, 0, Math.PI * 2);
        ctx.arc(e.x + 12, e.y - 6, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small health bar on damaged tough enemies
      if (e.hp < e.maxHp && e.type !== 'boss' && e.maxHp >= 40) {
        const bw = e.r * 1.8;
        const bh = 4;
        const bx = e.x - bw / 2;
        const by = e.y - e.r - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#ff4d6d';
        ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), bh);
      }
      ctx.restore();
    }

    // Player Character (Lantern-Keeper)
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invuln > 0 && Math.floor(G.time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    // Keeper Cloak
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 16;
    drawPolygon(0, 0, p.r * 1.15, 6, p.angle, '#3a0ca3', '#ff9f1c', 2.2);

    // Hood / Head
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();

    // Aiming Hand-Lantern
    const lx = Math.cos(p.angle) * (p.r + 7);
    const ly = Math.sin(p.angle) * (p.r + 7);
    ctx.beginPath();
    ctx.arc(lx, ly, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8d6';
    ctx.fill();
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Floating Combat Numbers
    for (let i = 0; i < G.floatTexts.length; i++) {
      const ft = G.floatTexts[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = `bold ${ft.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // Hurt Vignette & Bomb Flash
  if (G.hurtFlash > 0) {
    const vig = ctx.createRadialGradient(CX, CY, H * 0.25, CX, CY, W * 0.65);
    vig.addColorStop(0, 'rgba(255, 0, 50, 0)');
    vig.addColorStop(1, `rgba(255, 15, 60, ${G.hurtFlash * 0.65})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.whiteFlash > 0) {
    ctx.fillStyle = `rgba(255, 240, 200, ${G.whiteFlash * 0.7})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Overlays & HUD
  if (G.state === 'start') {
    renderStartScreen();
  } else {
    renderHUD();
    if (G.state === 'upgrade') renderUpgradeModal();
    else if (G.state === 'pause') renderPauseModal();
    else if (G.state === 'over') renderGameOverModal();
  }

  ctx.restore();
}

export function renderHUD() {
  const p = G.player;
  if (!p) return;

  // Top-Left: HP Bar & Dash Indicator
  ctx.save();
  ctx.fillStyle = 'rgba(14, 10, 22, 0.82)';
  ctx.strokeStyle = 'rgba(255, 159, 28, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(24, 22, 260, 62);
  ctx.strokeRect(24, 22, 260, 62);

  // HP Bar
  const hpRatio = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = '#261830';
  ctx.fillRect(36, 32, 236, 20);
  const hpGrad = ctx.createLinearGradient(36, 0, 272, 0);
  hpGrad.addColorStop(0, '#e63946');
  hpGrad.addColorStop(1, '#ff758f');
  ctx.fillStyle = hpGrad;
  ctx.fillRect(36, 32, 236 * hpRatio, 20);
  ctx.strokeStyle = '#ffccd5';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 32, 236, 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HP  ${Math.ceil(p.hp)} / ${p.maxHp}`, 154, 46);

  // Dash Cooldown Bar
  const dashMax = getDashMaxCooldown();
  const dashReady = p.dashCooldown <= 0;
  const dashRatio = dashReady ? 1 : 1 - p.dashCooldown / dashMax;
  ctx.fillStyle = '#1b1429';
  ctx.fillRect(36, 60, 150, 12);
  ctx.fillStyle = dashReady ? '#00f5d4' : '#8338ec';
  ctx.fillRect(36, 60, 150 * dashRatio, 12);
  ctx.fillStyle = dashReady ? '#00f5d4' : '#b8b0c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dashReady ? 'DASH READY [SHIFT]' : 'DASH RECHARGING', 194, 70);

  // Build Upgrade Icons under HP Box
  let iconX = 28;
  const iconY = 102;
  UPGRADES.forEach((u) => {
    const lv = p.upgrades[u.id] || 0;
    if (lv > 0) {
      ctx.fillStyle = 'rgba(18, 12, 28, 0.88)';
      ctx.strokeStyle = u.color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(iconX, iconY - 14, 34, 34);
      ctx.strokeRect(iconX, iconY - 14, 34, 34);
      drawUpgradeIcon(u.id, iconX + 17, iconY + 1, 9, u.color);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('L' + lv, iconX + 32, iconY + 18);
      iconX += 40;
    }
  });

  // Top-Right: Wave, Score, Combo, Kills
  ctx.fillStyle = 'rgba(14, 10, 22, 0.82)';
  ctx.strokeStyle = 'rgba(255, 159, 28, 0.45)';
  ctx.fillRect(W - 264, 22, 240, 74);
  ctx.strokeRect(W - 264, 22, 240, 74);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`SCORE  ${Math.floor(G.score).toLocaleString()}`, W - 36, 46);

  ctx.fillStyle = '#e0d6ed';
  ctx.font = 'bold 13px sans-serif';
  const mins = Math.floor(G.time / 60);
  const secs = Math.floor(G.time % 60).toString().padStart(2, '0');
  ctx.fillText(`WAVE ${G.wave}   •   KILLS ${G.kills}   •   ${mins}:${secs}`, W - 36, 68);

  const mult = Math.floor(G.combo);
  ctx.fillStyle = mult >= 4 ? '#ff006e' : (mult >= 2 ? '#ff9f1c' : '#8d829c');
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`COMBO  x${mult}${Sfx.muted ? '  [MUTED]' : ''}`, W - 36, 86);

  // Boss HP Bar at Top-Center if Boss is alive
  const boss = G.enemies.find((e) => e.type === 'boss');
  if (boss) {
    const bw = 420;
    const bx = CX - bw / 2;
    const by = 26;
    ctx.fillStyle = 'rgba(14, 8, 24, 0.9)';
    ctx.fillRect(bx - 8, by - 6, bw + 16, 42);
    ctx.strokeStyle = '#c77dff';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 8, by - 6, bw + 16, 42);

    ctx.fillStyle = '#e0aaff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, CX, by + 10);

    ctx.fillStyle = '#240046';
    ctx.fillRect(bx, by + 16, bw, 14);
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(bx, by + 16, bw * Math.max(0, boss.hp / boss.maxHp), 14);
  } else if (G.bannerTimer > 0) {
    // Wave Banner
    const alpha = Math.min(1, G.bannerTimer * 1.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 34px sans-serif';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 16;
    ctx.fillText(G.bannerText, CX, 118);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e2d9f3';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(G.bannerSub, CX, 140);
    ctx.restore();
  }

  // Bottom XP Bar
  const xpW = W - 48;
  const xpX = 24;
  const xpY = H - 28;
  ctx.fillStyle = 'rgba(14, 10, 22, 0.88)';
  ctx.fillRect(xpX, xpY, xpW, 14);
  const xpGrad = ctx.createLinearGradient(xpX, 0, xpX + xpW, 0);
  xpGrad.addColorStop(0, '#ff7b00');
  xpGrad.addColorStop(1, '#ffd166');
  ctx.fillStyle = xpGrad;
  ctx.fillRect(xpX, xpY, xpW * Math.min(1, p.xp / p.xpNext), 14);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(xpX, xpY, xpW, 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${p.level}  —  EMBER RESONANCE (${p.xp} / ${p.xpNext})`, CX, xpY + 11);

  ctx.restore();
}

export function renderStartScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 4, 12, 0.55)';
  ctx.fillRect(0, 0, W, H);

  // Center Ornamental Frame
  const bw = 660;
  const bh = 470;
  const bx = CX - bw / 2;
  const by = CY - bh / 2;

  ctx.fillStyle = 'rgba(16, 11, 26, 0.90)';
  ctx.strokeStyle = '#ff9f1c';
  ctx.lineWidth = 2.5;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeRect(bx, by, bw, bh);

  ctx.strokeStyle = 'rgba(255, 209, 102, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 8, by + 8, bw - 16, bh - 16);

  // Title
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#ffd166';
  ctx.font = '900 68px sans-serif';
  ctx.fillText('EMBERFALL', CX, by + 95);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff9f1c';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('L A S T   L A N T E R N   O F   T H E   H O L L O W', CX, by + 128);

  // Lore & Controls Box
  ctx.fillStyle = 'rgba(28, 20, 44, 0.75)';
  ctx.fillRect(bx + 48, by + 156, bw - 96, 165);
  ctx.strokeStyle = 'rgba(255, 159, 28, 0.35)';
  ctx.strokeRect(bx + 48, by + 156, bw - 96, 165);

  ctx.fillStyle = '#e5dcf2';
  ctx.font = '15px sans-serif';
  ctx.fillText('Night creatures swarm from the dark to snuff the sacred flame.', CX, by + 188);
  ctx.fillText('Gather glowing embers, forge your build, and survive the Gloom Warden.', CX, by + 210);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('WASD / Arrows : Move     •     Mouse / Space : Aim & Fire Bolts', CX, by + 252);
  ctx.fillText('Shift : Flame Dash (Invulnerable)     •     P : Pause     •     M : Mute', CX, by + 278);

  // Best Score Banner — only once a run has actually been played.
  if (G.best.score > 0) {
    ctx.fillStyle = '#00f5d4';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`HIGHEST RECORD:  ${G.best.score.toLocaleString()} PTS   (WAVE ${G.best.wave}  •  ${G.best.kills} KILLS)`, CX, by + 352);
  }

  // Pulsing CTA Button
  const btnW = 280;
  const btnH = 54;
  const btnX = CX - btnW / 2;
  const btnY = by + 382;
  const pulse = Math.sin(G.time * 4.5) * 4;

  const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  grad.addColorStop(0, '#ff9f1c');
  grad.addColorStop(1, '#fb5607');
  ctx.fillStyle = grad;
  ctx.fillRect(btnX - pulse / 2, btnY - pulse / 2, btnW + pulse, btnH + pulse);
  ctx.strokeStyle = '#fff3b0';
  ctx.lineWidth = 2;
  ctx.strokeRect(btnX - pulse / 2, btnY - pulse / 2, btnW + pulse, btnH + pulse);

  ctx.fillStyle = '#120b1d';
  ctx.font = '900 20px sans-serif';
  ctx.fillText('IGNITE THE LANTERN', CX, btnY + 34);

  ctx.restore();
}

export function renderUpgradeModal() {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 5, 15, 0.78)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffd166';
  ctx.font = '900 38px sans-serif';
  ctx.fillText('LEVEL UP — KINDLE YOUR FLAME', CX, 118);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d8cde8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Choose an Ember Blessing (Click a card or press 1, 2, 3)', CX, 148);

  const rects = getUpgradeCardRects();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const u = G.upgradeChoices[i];
    if (!u) continue;

    const curLv = G.player.upgrades[u.id] || 0;
    const hover = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;

    ctx.save();
    if (hover) ctx.translate(0, -6);

    ctx.fillStyle = hover ? 'rgba(34, 24, 52, 0.96)' : 'rgba(22, 15, 36, 0.94)';
    ctx.strokeStyle = hover ? '#ffd166' : u.color;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Key badge
    ctx.fillStyle = u.color;
    ctx.fillRect(r.x + 14, r.y + 14, 28, 28);
    ctx.fillStyle = '#120b1d';
    ctx.font = '900 15px sans-serif';
    ctx.fillText(String(i + 1), r.x + 28, r.y + 34);

    // Icon Medallion
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + 92, 38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 8, 20, 0.9)';
    ctx.fill();
    ctx.strokeStyle = u.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    drawUpgradeIcon(u.id, r.x + r.w / 2, r.y + 92, 20, u.color);

    // Title & Description
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(u.name, r.x + r.w / 2, r.y + 168);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(u.desc, r.x + r.w / 2, r.y + 202);

    // Level Pips (1..5)
    const pipW = 24;
    const pipGap = 8;
    const totalPipW = 5 * pipW + 4 * pipGap;
    const startPipX = r.x + (r.w - totalPipW) / 2;
    const pipY = r.y + 252;

    for (let p = 0; p < 5; p++) {
      const px = startPipX + p * (pipW + pipGap);
      ctx.fillStyle = p <= curLv ? u.color : '#2a1f3d';
      ctx.fillRect(px, pipY, pipW, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, pipY, pipW, 10);
    }

    ctx.fillStyle = '#b8adc9';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`RANK ${curLv + 1} / 5`, r.x + r.w / 2, r.y + 288);

    ctx.restore();
  }

  ctx.restore();
}

export function renderPauseModal() {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 5, 14, 0.75)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = '900 44px sans-serif';
  ctx.fillText('GAME PAUSED', CX, CY - 24);

  ctx.fillStyle = '#e0d6ed';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press P or Click anywhere to resume   •   Press R to restart', CX, CY + 22);
  ctx.restore();
}

export function renderGameOverModal() {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 12, 0.82)';
  ctx.fillRect(0, 0, W, H);

  const bw = 520;
  const bh = 380;
  const bx = CX - bw / 2;
  const by = CY - bh / 2;

  ctx.fillStyle = 'rgba(18, 11, 28, 0.95)';
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2.5;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeRect(bx, by, bw, bh);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#e63946';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff4d6d';
  ctx.font = '900 46px sans-serif';
  ctx.fillText('THE FLAME FADES', CX, by + 72);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#d8cde8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('The dark reclaimed the Hollow, yet your embers linger.', CX, by + 104);

  // Stats Grid
  const mins = Math.floor(G.time / 60);
  const secs = Math.floor(G.time % 60).toString().padStart(2, '0');
  const stats = [
    ['FINAL SCORE', Math.floor(G.score).toLocaleString(), '#ffd166'],
    ['WAVE REACHED', `WAVE ${G.wave}`, '#ff9f1c'],
    ['CREATURES VANQUISHED', String(G.kills), '#00f5d4'],
    ['TIME SURVIVED', `${mins}:${secs}  (LV ${G.player.level})`, '#e0aaff'],
  ];

  stats.forEach((st, idx) => {
    const sy = by + 150 + idx * 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b5a8c9';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(st[0], bx + 65, sy);

    ctx.textAlign = 'right';
    ctx.fillStyle = st[2];
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(st[1], bx + bw - 65, sy);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#06d6a0';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`ALL-TIME BEST:  ${G.best.score.toLocaleString()} PTS  (WAVE ${G.best.wave})`, CX, by + 305);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px sans-serif';
  ctx.fillText('PRESS [R] OR CLICK TO REKINDLE', CX, by + 348);

  ctx.restore();
}
