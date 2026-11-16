// EMBERFALL — Last Lantern of the Hollow. A top-down arena survival
// shooter: keep the lantern lit, survive the waves, forge a build from ember
// blessings, and face the Gloom Warden every fifth wave. This is the boot:
// it wires input, then either stages one deterministic screenshot frame or
// runs the live loop. All art is drawn in code, all sound is synthesized,
// nothing is fetched from the network.
import { S, scatterEmbers, newRun } from './state.js';
import { shotMode } from './random.js';
import { Sfx } from './audio.js';
import { bindInput } from './input.js';
import { canvas, draw } from './render.js';
import { step } from './update.js';
import { setupScene } from './shots.js';
import { onTap, takeBlessing, dash } from './combat.js';

bindInput(canvas, {
  onPress() {
    Sfx.init();
  },
  onClick() {
    onTap(newRun);
  },
  onKey(code) {
    if (code === 'KeyM') {
      Sfx.toggleMute();
    } else if (code === 'KeyP' || code === 'Escape') {
      if (S.state === 'play') S.state = 'pause';
      else if (S.state === 'pause') S.state = 'play';
    } else if (code === 'KeyR') {
      if (S.state === 'over' || S.state === 'pause') newRun();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      if (S.state === 'play') dash();
    } else if (S.state === 'bless') {
      if (code === 'Digit1' && S.blessingChoices[0]) takeBlessing(S.blessingChoices[0]);
      if (code === 'Digit2' && S.blessingChoices[1]) takeBlessing(S.blessingChoices[1]);
      if (code === 'Digit3' && S.blessingChoices[2]) takeBlessing(S.blessingChoices[2]);
    } else if (S.state === 'start' && (code === 'Space' || code === 'Enter')) {
      newRun();
    }
  },
});

scatterEmbers();

if (shotMode) {
  // One fixed frame for the screenshot harness, then signal readiness.
  setupScene(shotMode);
  draw();
  window.__shotReady = true;
} else {
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
