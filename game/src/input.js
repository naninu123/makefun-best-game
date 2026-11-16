// EMBERFALL — keyboard + mouse state. Dumb by design: it tracks keys and the
// pointer (in 1280x720 logical coordinates) and forwards events to the
// callbacks main.js wires up. No game logic lives here.
import { CX, CY, W, H } from './config.js';

export const keys = {};
export const mouse = { x: CX + 180, y: CY - 60, down: false, clicked: false };

export function bindInput(canvas, callbacks) {
  function updateMouseCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouse.x = Math.max(0, Math.min(W, (e.clientX - rect.left) * scaleX));
    mouse.y = Math.max(0, Math.min(H, (e.clientY - rect.top) * scaleY));
  }

  window.addEventListener('mousemove', updateMouseCoords);
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      updateMouseCoords(e);
      mouse.down = true;
      mouse.clicked = true;
      callbacks.onPress();
      callbacks.onClick();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    callbacks.onPress();
    callbacks.onKey(e.code);
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
}
