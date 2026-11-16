// EMBERFALL — everything the eye sees: the canvas, the arena, the keeper,
// the foes, the HUD and all four screens (title, blessings, pause, fallen).
// Nothing here simulates; update.js moves things and this file paints the
// state it finds, once per frame.
import { S, auraRange, dashCooldownMax } from './state.js';
import { W, H, CX, CY, BLESSINGS } from './config.js';
import { rand } from './random.js';
import { Sfx } from './audio.js';
import { mouse } from './input.js';
import { cardRects } from './combat.js';

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// A regular polygon, filled and/or stroked.
export function poly(x, y, r, sides, rot, fill, stroke, lw = 2) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides;
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
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// A dark panel with a warm rim, used by the HUD and the screens.
function panel(x, y, w, h, fill = 'rgba(14, 10, 22, 0.82)', rim = 'rgba(255, 159, 28, 0.45)', lw = 1.5) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rim;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

// The little pictogram for one blessing, drawn at (cx, cy).
export function blessingGlyph(id, cx, cy, r, color) {
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
    poly(0, 0, r * 0.8, 6, -Math.PI / 2, color, '#fff', 1.5);
  }
  ctx.restore();
}

function drawArena() {
  ctx.fillStyle = '#09060e';
  ctx.fillRect(0, 0, W, H);

  // The lantern's light: a warm radial wash that breathes.
  const breathe = Math.sin(S.time * 3.2) * 18;
  const glow = ctx.createRadialGradient(CX, CY, 12, CX, CY, 520 + breathe);
  glow.addColorStop(0, 'rgba(255, 195, 100, 0.32)');
  glow.addColorStop(0.22, 'rgba(255, 115, 35, 0.16)');
  glow.addColorStop(0.55, 'rgba(110, 40, 85, 0.06)');
  glow.addColorStop(1, 'rgba(9, 6, 14, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Faint rings and a grid etched into the stone.
  ctx.strokeStyle = 'rgba(255, 180, 120, 0.05)';
  ctx.lineWidth = 1.5;
  for (const rad of [130, 260, 410, 560]) {
    ctx.beginPath();
    ctx.arc(CX, CY, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
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

  // The rune border.
  ctx.strokeStyle = 'rgba(255, 130, 50, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  // Pillars.
  for (const pil of S.pillars) {
    poly(pil.x, pil.y, pil.r + 4, 8, Math.PI / 8, '#161122', '#3a2c52', 2);
    poly(pil.x, pil.y, pil.r - 5, 8, Math.PI / 8, '#231c35', '#ff9f1c', 1);
  }

  // The brazier at the middle of everything.
  ctx.save();
  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 28;
  poly(CX, CY, 30, 8, S.time * 0.2, '#1f162b', '#ff9f1c', 2.5);
  poly(CX, CY, 19, 6, -S.time * 0.5, '#ff6b35', '#ffd166', 2);
  ctx.beginPath();
  ctx.arc(CX, CY, 9 + Math.sin(S.time * 6) * 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff5cc';
  ctx.fill();
  ctx.restore();

  // Embers drifting up through the dark.
  for (const b of S.drifting) {
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShardsAndDrops() {
  for (const g of S.shards) {
    const s = g.r + Math.sin(S.time * 5 + g.phase) * 1.2;
    poly(g.x, g.y, s, 4, S.time * 2 + g.phase, g.color, '#ffffff', 1);
  }

  for (const d of S.drops) {
    const bob = Math.sin(d.phase) * 3;
    ctx.save();
    ctx.translate(d.x, d.y + bob);
    let col = '#ff4d6d';
    if (d.type === 'bomb') col = '#ffd166';
    if (d.type === 'magnet') col = '#00f5d4';

    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, d.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 15, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.type === 'heart' ? 'HP' : (d.type === 'bomb' ? '✦' : 'U'), 0, 1);
    ctx.restore();
  }
}

function drawShots() {
  for (const s of S.foeShots) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const b of S.bolts) {
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

  for (const pt of S.sparks) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r * (pt.life / pt.maxLife), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFoes() {
  for (const f of S.foes) {
    const fill = f.flash > 0 ? '#ffffff' : f.color;

    ctx.save();
    if (f.type === 'cinder') {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd166';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fff1d0';
      ctx.fill();
    } else if (f.type === 'spitter') {
      poly(f.x, f.y, f.r * 1.15, 4, S.time * 1.8 + f.phase, fill, '#f72585', 2.2);
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (f.type === 'brute') {
      poly(f.x, f.y, f.r, 6, S.time * 0.6, fill, '#ffb703', 3);
      poly(f.x, f.y, f.r * 0.55, 6, -S.time * 0.6, '#6a040f', '#ffba08', 1.5);
    } else if (f.type === 'wisp') {
      poly(f.x, f.y, f.r * 1.25, 3, Math.atan2(f.vy, f.vx), fill, '#ffffff', 1.8);
    } else if (f.type === 'splitter') {
      poly(f.x, f.y, f.r * 1.1, 4, Math.PI / 4 + Math.sin(S.time * 4) * 0.2, fill, '#b5e48c', 2.2);
      poly(f.x, f.y, f.r * 0.5, 4, 0, '#1b4332', '#b5e48c', 1.5);
    } else if (f.type === 'boss') {
      ctx.shadowColor = '#9d4edd';
      ctx.shadowBlur = 22;
      poly(f.x, f.y, f.r, 10, S.time * 0.8, '#240046', '#c77dff', 3.5);
      poly(f.x, f.y, f.r * 0.72, 8, -S.time * 1.2, fill, '#ff9e00', 2);
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(f.x - 12, f.y - 6, 6, 0, Math.PI * 2);
      ctx.arc(f.x + 12, f.y - 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // A dented foe shows a sliver of health (bosses get the big bar instead).
    if (f.hp < f.maxHp && f.type !== 'boss' && f.maxHp >= 40) {
      const bw = f.r * 1.8;
      const bx = f.x - bw / 2;
      const by = f.y - f.r - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(bx, by, bw * Math.max(0, f.hp / f.maxHp), 4);
    }
    ctx.restore();
  }
}

function drawKeeper() {
  const k = S.keeper;

  // The halo blessing paints its reach on the floor.
  const halo = auraRange();
  if (halo > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(k.x, k.y, halo, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 175, 55, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 90, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(k.x, k.y);
  if (k.invuln > 0 && Math.floor(S.time * 20) % 2 === 0) ctx.globalAlpha = 0.55;

  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 16;
  poly(0, 0, k.r * 1.15, 6, k.angle, '#3a0ca3', '#ff9f1c', 2.2);

  ctx.beginPath();
  ctx.arc(0, 0, k.r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();

  // The little lantern the keeper aims with.
  const lx = Math.cos(k.angle) * (k.r + 7);
  const ly = Math.sin(k.angle) * (k.r + 7);
  ctx.beginPath();
  ctx.arc(lx, ly, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff8d6';
  ctx.fill();
  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  for (const ft of S.popups) {
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

function drawFlashes() {
  if (S.hurtFlash > 0) {
    const vig = ctx.createRadialGradient(CX, CY, H * 0.25, CX, CY, W * 0.65);
    vig.addColorStop(0, 'rgba(255, 0, 50, 0)');
    vig.addColorStop(1, `rgba(255, 15, 60, ${S.hurtFlash * 0.65})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
  if (S.whiteFlash > 0) {
    ctx.fillStyle = `rgba(255, 240, 200, ${S.whiteFlash * 0.7})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function draw() {
  ctx.save();

  if (S.shakeTimer > 0 && S.state === 'play') {
    ctx.translate((rand() - 0.5) * S.shakeMag * 2, (rand() - 0.5) * S.shakeMag * 2);
  }

  drawArena();

  if (S.keeper) {
    drawShardsAndDrops();
    drawShots();
    drawFoes();
    drawKeeper();
  }

  drawFlashes();

  if (S.state === 'start') drawTitle();
  else {
    drawHud();
    if (S.state === 'bless') drawBlessings();
    else if (S.state === 'pause') drawPaused();
    else if (S.state === 'over') drawFallen();
  }

  ctx.restore();
}

export function drawHud() {
  const k = S.keeper;
  if (!k) return;

  ctx.save();

  // Top left: the keeper's health and dash.
  panel(24, 22, 260, 62);

  const hpRatio = Math.max(0, k.hp / k.maxHp);
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
  ctx.fillText(`HP  ${Math.ceil(k.hp)} / ${k.maxHp}`, 154, 46);

  const dashMax = dashCooldownMax();
  const dashReady = k.dashCooldown <= 0;
  const dashRatio = dashReady ? 1 : 1 - k.dashCooldown / dashMax;
  ctx.fillStyle = '#1b1429';
  ctx.fillRect(36, 60, 150, 12);
  ctx.fillStyle = dashReady ? '#00f5d4' : '#8338ec';
  ctx.fillRect(36, 60, 150 * dashRatio, 12);
  ctx.fillStyle = dashReady ? '#00f5d4' : '#b8b0c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dashReady ? 'DASH READY [SHIFT]' : 'DASH RECHARGING', 194, 70);

  // The build so far, as a row of little icons.
  let iconX = 28;
  for (const b of BLESSINGS) {
    const lv = k.blessings[b.id] || 0;
    if (lv === 0) continue;
    panel(iconX, 88, 34, 34, 'rgba(18, 12, 28, 0.88)', b.color);
    blessingGlyph(b.id, iconX + 17, 103, 9, b.color);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('L' + lv, iconX + 32, 120);
    iconX += 40;
  }

  // Top right: score, wave, kills, clock, combo.
  panel(W - 264, 22, 240, 74);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`SCORE  ${Math.floor(S.score).toLocaleString()}`, W - 36, 46);

  ctx.fillStyle = '#e0d6ed';
  ctx.font = 'bold 13px sans-serif';
  const mins = Math.floor(S.time / 60);
  const secs = Math.floor(S.time % 60).toString().padStart(2, '0');
  ctx.fillText(`WAVE ${S.wave}   •   KILLS ${S.kills}   •   ${mins}:${secs}`, W - 36, 68);

  const mult = Math.floor(S.combo);
  ctx.fillStyle = mult >= 4 ? '#ff006e' : (mult >= 2 ? '#ff9f1c' : '#8d829c');
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`COMBO  x${mult}${Sfx.muted ? '  [MUTED]' : ''}`, W - 36, 86);

  // The Warden's health, dead center, while it lives; else the wave banner.
  const boss = S.foes.find((f) => f.type === 'boss');
  if (boss) {
    const bw = 420;
    const bx = CX - bw / 2;
    const by = 26;
    panel(bx - 8, by - 6, bw + 16, 42, 'rgba(14, 8, 24, 0.9)', '#c77dff', 2);

    ctx.fillStyle = '#e0aaff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, CX, by + 10);

    ctx.fillStyle = '#240046';
    ctx.fillRect(bx, by + 16, bw, 14);
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(bx, by + 16, bw * Math.max(0, boss.hp / boss.maxHp), 14);
  } else if (S.bannerTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, S.bannerTimer * 1.2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 34px sans-serif';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 16;
    ctx.fillText(S.bannerText, CX, 118);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e2d9f3';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(S.bannerSub, CX, 140);
    ctx.restore();
  }

  // A kill-streak shout, fading out under the wave banner.
  if (S.announceTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, S.announceTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff006e';
    ctx.font = '900 30px sans-serif';
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 14;
    ctx.fillText(S.announce, CX, 168);
    ctx.restore();
  }

  // The ember resonance bar along the bottom.
  const xpW = W - 48;
  const xpX = 24;
  const xpY = H - 28;
  ctx.fillStyle = 'rgba(14, 10, 22, 0.88)';
  ctx.fillRect(xpX, xpY, xpW, 14);
  const xpGrad = ctx.createLinearGradient(xpX, 0, xpX + xpW, 0);
  xpGrad.addColorStop(0, '#ff7b00');
  xpGrad.addColorStop(1, '#ffd166');
  ctx.fillStyle = xpGrad;
  ctx.fillRect(xpX, xpY, xpW * Math.min(1, k.xp / k.xpNext), 14);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(xpX, xpY, xpW, 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${k.level}  —  EMBER RESONANCE (${k.xp} / ${k.xpNext})`, CX, xpY + 11);

  ctx.restore();
}

export function drawTitle() {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 4, 12, 0.55)';
  ctx.fillRect(0, 0, W, H);

  const bw = 660;
  const bh = 470;
  const bx = CX - bw / 2;
  const by = CY - bh / 2;

  panel(bx, by, bw, bh, 'rgba(16, 11, 26, 0.90)', '#ff9f1c', 2.5);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 8, by + 8, bw - 16, bh - 16);

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

  // The best line only appears once a run has actually been played.
  if (S.best.score > 0) {
    ctx.fillStyle = '#00f5d4';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`HIGHEST RECORD:  ${S.best.score.toLocaleString()} PTS   (WAVE ${S.best.wave}  •  ${S.best.kills} KILLS)`, CX, by + 352);
  }

  // The pulsing call to action.
  const btnW = 280;
  const btnH = 54;
  const btnX = CX - btnW / 2;
  const btnY = by + 382;
  const pulse = Math.sin(S.time * 4.5) * 4;

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

export function drawBlessings() {
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

  const rects = cardRects();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const b = S.blessingChoices[i];
    if (!b) continue;

    const curLv = S.keeper.blessings[b.id] || 0;
    const hover = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;

    ctx.save();
    if (hover) ctx.translate(0, -6);

    panel(r.x, r.y, r.w, r.h, hover ? 'rgba(34, 24, 52, 0.96)' : 'rgba(22, 15, 36, 0.94)', hover ? '#ffd166' : b.color, hover ? 3 : 2);

    ctx.fillStyle = b.color;
    ctx.fillRect(r.x + 14, r.y + 14, 28, 28);
    ctx.fillStyle = '#120b1d';
    ctx.font = '900 15px sans-serif';
    ctx.fillText(String(i + 1), r.x + 28, r.y + 34);

    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + 92, 38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 8, 20, 0.9)';
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    blessingGlyph(b.id, r.x + r.w / 2, r.y + 92, 20, b.color);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(b.name, r.x + r.w / 2, r.y + 168);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(b.desc, r.x + r.w / 2, r.y + 202);

    // Five pips: filled up to the rank this pick would reach.
    const pipW = 24;
    const pipGap = 8;
    const totalPipW = 5 * pipW + 4 * pipGap;
    const startPipX = r.x + (r.w - totalPipW) / 2;
    const pipY = r.y + 252;
    for (let p = 0; p < 5; p++) {
      const px = startPipX + p * (pipW + pipGap);
      ctx.fillStyle = p <= curLv ? b.color : '#2a1f3d';
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

export function drawPaused() {
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

export function drawFallen() {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 12, 0.82)';
  ctx.fillRect(0, 0, W, H);

  const bw = 520;
  const bh = 380;
  const bx = CX - bw / 2;
  const by = CY - bh / 2;

  panel(bx, by, bw, bh, 'rgba(18, 11, 28, 0.95)', '#e63946', 2.5);

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

  const mins = Math.floor(S.time / 60);
  const secs = Math.floor(S.time % 60).toString().padStart(2, '0');
  const rows = [
    ['FINAL SCORE', Math.floor(S.score).toLocaleString(), '#ffd166'],
    ['WAVE REACHED', `WAVE ${S.wave}`, '#ff9f1c'],
    ['CREATURES VANQUISHED', String(S.kills), '#00f5d4'],
    ['TIME SURVIVED', `${mins}:${secs}  (LV ${S.keeper.level})`, '#e0aaff'],
  ];

  rows.forEach((row, idx) => {
    const sy = by + 150 + idx * 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b5a8c9';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(row[0], bx + 65, sy);

    ctx.textAlign = 'right';
    ctx.fillStyle = row[2];
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(row[1], bx + bw - 65, sy);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#06d6a0';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`ALL-TIME BEST:  ${S.best.score.toLocaleString()} PTS  (WAVE ${S.best.wave})`, CX, by + 305);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px sans-serif';
  ctx.fillText('PRESS [R] OR CLICK TO REKINDLE', CX, by + 348);

  ctx.restore();
}
