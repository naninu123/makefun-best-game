# EMBERFALL — Last Lantern of the Hollow

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/naninu123/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/naninu123/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A top-down arena survival shooter: you are the last Lantern-Keeper, holding
the sacred flame against the night. Survive escalating waves, gather ember
gems, forge a build from 12 stackable blessings, and face the Gloom Warden
every 5th wave. Built by an AI agent for make.fun's "Make the best game"
bounty, $1,000 in USDC.

- **Waves:** 6 enemy kinds (Cinder, Wisp, Spitter, Splitter, Brute, and the
  Gloom Warden boss with charge / radial-burst / summon phases), scaling
  spawns, wave banners, boss HP bar.
- **Builds:** XP gems level you up; each level offers 3 upgrade cards
  (damage, fire rate, multishot, pierce, dash, magnet, lantern aura, crit,
  regen, max HP...) up to rank 5 each, shown as icons in the HUD.
- **Juice:** particles, screen shake, hit-stop, floating damage numbers,
  combo multiplier, dash with invulnerability, heart / bomb / magnet
  pickups, and kill-streak shouts (Ember Streak 5, Rampage 10, Inferno 15,
  Emberfall 25) that reset when you take a hit. Every tenth kill drops a
  surge shard, and your best streak is kept on the game-over screen.  pickups, and a full synthesized WebAudio soundscape — no audio files.
- **Complete:** title screen with best record, HUD (HP, dash, XP, score,
  wave, kills, combo), pause, game-over stats with restart, best score kept
  in localStorage.
- **Tech:** plain ES modules on a 2D canvas, zero dependencies, zero network
  requests. Deterministic screenshot scenes via `?shot=start|play|upgrade|over&seed=1`
  (sets `window.__shotReady`).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Controls: WASD / arrows move, mouse aim, hold click or Space to fire,
Shift dash, P pause, M mute, R restart, 1/2/3 pick a blessing card.

## Layout

- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `game/index.html` — canvas + module entry
- `game/src/main.js` — boot, game loop, input wiring
- `game/src/state.js` — shared run state, keeper, best record, derived stats
- `game/src/update.js` — per-frame simulation (keeper, waves, bolts, foe AI)
- `game/src/render.js` — all drawing: arena, keeper, foes, HUD, screens
- `game/src/combat.js` — dash, firing, hits, kills, level-ups, blessings
- `game/src/enemies.js` — foe kinds and the wave spawner
- `game/src/audio.js` — synthesized WebAudio effects and ambient drone
- `game/src/input.js` — keyboard + mouse state
- `game/src/particles.js` — sparks and floating combat numbers
- `game/src/config.js` — arena size, blessing pool
- `game/src/random.js` — seeded RNG for deterministic screenshots
- `game/src/shots.js` — deterministic screenshot scene builder
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=3zvqxnwh&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
