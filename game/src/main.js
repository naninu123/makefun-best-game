// EMBERFALL — Last Lantern of the Hollow. Top-down arena survival shooter:
// hold the lantern, survive the waves, forge a build from ember blessings,
// and face the Gloom Warden every 5th wave. Boot + game loop + input wiring.
// All art is drawn in code, all sound is synthesized, nothing is fetched.
import { G, initBgEmbers, startNewGame } from './state.js';
import { shotMode } from './random.js';
import { Sfx } from './audio.js';
import { bindInput } from './input.js';
import { canvas, render } from './render.js';
import { update } from './update.js';
import { setupDeterministicScene } from './shots.js';
import { handleClick, applyUpgrade, tryDash } from './combat.js';

bindInput(canvas, {
  onPress() {
    Sfx.init();
  },
  onClick() {
    handleClick(startNewGame);
  },
  onKey(code) {
    if (code === 'KeyM') {
      Sfx.toggleMute();
    } else if (code === 'KeyP' || code === 'Escape') {
      if (G.state === 'play') G.state = 'pause';
      else if (G.state === 'pause') G.state = 'play';
    } else if (code === 'KeyR') {
      if (G.state === 'over' || G.state === 'pause') {
        startNewGame();
      }
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      if (G.state === 'play') tryDash();
    } else if (G.state === 'upgrade') {
      if (code === 'Digit1' && G.upgradeChoices[0]) applyUpgrade(G.upgradeChoices[0]);
      if (code === 'Digit2' && G.upgradeChoices[1]) applyUpgrade(G.upgradeChoices[1]);
      if (code === 'Digit3' && G.upgradeChoices[2]) applyUpgrade(G.upgradeChoices[2]);
    } else if (G.state === 'start' && (code === 'Space' || code === 'Enter')) {
      startNewGame();
    }
  },
});

initBgEmbers();

if (shotMode) {
  // Deterministic screenshot: one fixed frame, then signal the harness.
  setupDeterministicScene(shotMode);
  render();
  window.__shotReady = true;
} else {
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
