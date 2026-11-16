// EMBERFALL — deterministic randomness. In normal play rand() is Math.random();
// in a ?shot=<scene> screenshot run it is a seeded mulberry32 stream, so the
// same URL always renders the same frame. No wall clock or Date.now is used
// for randomness anywhere in the game.
export const urlParams = new URLSearchParams(window.location.search);
export const shotMode = urlParams.get('shot'); // 'start', 'play', 'upgrade', 'over' or null
export const seedParam = parseInt(urlParams.get('seed') || '1337', 10);

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng = mulberry32(seedParam);

export function reseed(seed) {
  rng = mulberry32(seed);
}

export function rand() {
  return shotMode ? rng() : Math.random();
}

export function randRange(min, max) {
  return min + rand() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

export function randChoice(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
