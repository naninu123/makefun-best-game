// EMBERFALL — the numbers every module agrees on: the arena, the blessing
// pool, the save key. Nothing here moves; everything else reads from it.
export const W = 1280;
export const H = 720;
export const CX = W / 2;
export const CY = H / 2;

export const SAVE_KEY = 'emberfall_best_v1';

// Twelve blessings, each stackable to rank 5. A level-up offers three of
// them; the HUD shows the ranks the keeper has already taken.
export const BLESSINGS = [
  { id: 'dmg', name: 'Ember Fury', desc: 'Bolt damage +25%', color: '#ff6b35', glyph: 'flame' },
  { id: 'rate', name: 'Quickening Flame', desc: 'Fire rate +20%', color: '#ffbe0b', glyph: 'bolt' },
  { id: 'multi', name: 'Triple Spark', desc: '+1 ember bolt per shot', color: '#fb5607', glyph: 'triple' },
  { id: 'pierce', name: 'Lance of Cinders', desc: 'Bolts pierce +1 foe', color: '#ff006e', glyph: 'arrow' },
  { id: 'bspd', name: 'Swift Embers', desc: 'Bolt speed +20%', color: '#ff9f1c', glyph: 'wings' },
  { id: 'mspd', name: 'Ashen Stride', desc: 'Move speed +12%', color: '#3a86ff', glyph: 'boot' },
  { id: 'hp', name: 'Oakheart', desc: 'Max HP +25 and heal 25', color: '#ff4d6d', glyph: 'heart' },
  { id: 'mag', name: 'Shard Magnet', desc: 'Pickup radius +40%', color: '#00f5d4', glyph: 'magnet' },
  { id: 'dash', name: 'Ghost Step', desc: 'Dash recharges 25% faster', color: '#8338ec', glyph: 'dash' },
  { id: 'aura', name: 'Halo of Embers', desc: 'Burning aura harms nearby foes', color: '#ffd166', glyph: 'sun' },
  { id: 'crit', name: 'Deadly Spark', desc: '+10% critical chance (double damage)', color: '#ef476f', glyph: 'star' },
  { id: 'regen', name: 'Inner Warmth', desc: 'Regenerate +1.5 HP each second', color: '#06d6a0', glyph: 'plus' },
];

export function blessingById(id) {
  return BLESSINGS.find((b) => b.id === id);
}
