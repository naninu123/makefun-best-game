// EMBERFALL — shared constants: arena size, the upgrade pool, storage key.
// One clear job: every number the rest of the game agrees on lives here.
export const W = 1280;
export const H = 720;
export const CX = W / 2;
export const CY = H / 2;

export const STORAGE_KEY = 'emberfall_best_v1';

// 12 distinct stackable upgrades (max rank 5 each). The level-up modal offers
// three of these; the HUD shows the ranks the player has taken.
export const UPGRADES = [
  { id: 'dmg', name: 'Kindled Wrath', desc: 'Ember Bolt Damage +25%', color: '#ff6b35', icon: 'flame' },
  { id: 'rate', name: 'Rapid Igniter', desc: 'Fire Rate +20%', color: '#ffbe0b', icon: 'bolt' },
  { id: 'multi', name: 'Split Spark', desc: 'Multishot +1 Ember Bolt', color: '#fb5607', icon: 'triple' },
  { id: 'pierce', name: 'Searing Lance', desc: 'Bolts Pierce +1 Enemy', color: '#ff006e', icon: 'arrow' },
  { id: 'bspd', name: 'Blazing Velocity', desc: 'Bolt Speed +20%', color: '#ff9f1c', icon: 'wings' },
  { id: 'mspd', name: 'Windstep Boots', desc: 'Move Speed +12%', color: '#3a86ff', icon: 'boot' },
  { id: 'hp', name: 'Heart of Oak', desc: 'Max HP +25 & Heal 25 HP', color: '#ff4d6d', icon: 'heart' },
  { id: 'mag', name: 'Lodestone Pull', desc: 'Ember Magnet Radius +40%', color: '#00f5d4', icon: 'magnet' },
  { id: 'dash', name: 'Phantom Flicker', desc: 'Dash Cooldown -25%', color: '#8338ec', icon: 'dash' },
  { id: 'aura', name: 'Lantern Radiance', desc: 'Searing Aura burns nearby foes', color: '#ffd166', icon: 'sun' },
  { id: 'crit', name: 'Keen Seeker', desc: 'Critical Hit Chance +10% (2x Dmg)', color: '#ef476f', icon: 'star' },
  { id: 'regen', name: 'Warmth Within', desc: 'Regenerate +1.5 HP / sec', color: '#06d6a0', icon: 'plus' },
];

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id);
}
