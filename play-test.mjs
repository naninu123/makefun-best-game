// Live play-test for the rebuilt EMBERFALL: start the game, strafe + fire for
// 30 s, dash, pause/resume, and report any page error. Screenshots saved for
// visual inspection. Usage: node play-test.mjs [port]
import { chromium } from '/home/hatch/workspace/makefun/best-game-01/pw-node/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';

const port = Number(process.argv[2] || 8094);
const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: '/home/hatch/workspace/makefun/best-game-01/repo', stdio: 'inherit',
});
await new Promise((r) => setTimeout(r, 1200));
let code = 0;
const errors = [];
try {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', (e) => { errors.push('PAGEERROR: ' + String(e)); code = 1; });
  page.on('request', (req) => {
    const u = req.url();
    if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith('data:')) errors.push('EXTERNAL: ' + u);
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.mouse.click(640, 500); // IGNITE THE LANTERN
  await page.waitForTimeout(400);

  // Strafe in a circle while firing at the mouse; dash once; wiggle aim.
  await page.mouse.move(900, 300);
  await page.mouse.down();
  const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
  for (let i = 0; i < 30; i++) {
    const k = keys[i % 4];
    await page.keyboard.down(k);
    await page.mouse.move(640 + Math.cos(i * 0.9) * 260, 360 + Math.sin(i * 0.9) * 180);
    if (i === 10) await page.keyboard.press('ShiftLeft'); // dash
    await page.waitForTimeout(1000);
    await page.keyboard.up(k);
    if (i === 14) await page.screenshot({ path: '/home/hatch/workspace/makefun/best-game-01/argon/shots/live-rebuilt-15s.jpg', type: 'jpeg', quality: 82 });
  }
  await page.mouse.up();
  await page.screenshot({ path: '/home/hatch/workspace/makefun/best-game-01/argon/shots/live-rebuilt-30s.jpg', type: 'jpeg', quality: 82 });
  console.log('played 30s');

  // Pause / resume
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/home/hatch/workspace/makefun/best-game-01/argon/shots/live-rebuilt-pause.jpg', type: 'jpeg', quality: 82 });
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(400);
  console.log('pause toggled');
  await browser.close();
} catch (e) {
  console.log('DRIVER ERROR:', String(e));
  code = 1;
} finally {
  server.kill();
}
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
process.exit(code);
