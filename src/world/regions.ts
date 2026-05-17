import type { WorldRegion } from '../types';

export const WORLD_REGIONS: WorldRegion[] = [
  { id: 'outskirts', name: 'The Outskirts', subtitle: 'Abandoned roads and ash-choked farms', depthMin: 1, depthMax: 2, identity: 'Low corruption, frequent ambushes, poor loot.', effects: ['manageable', 'beasts', 'low corruption'] },
  { id: 'ruins', name: 'The Ruins', subtitle: 'Collapsed keeps and chapel bones', depthMin: 3, depthMax: 4, identity: 'Undead, traps, morale pressure.', effects: ['undead', 'traps', 'moderate corruption'] },
  { id: 'catacombs', name: 'The Catacombs', subtitle: 'A descent beneath remembered names', depthMin: 5, depthMax: 7, identity: 'Darkness mechanics, sanity damage, stronger relics.', effects: ['darkness', 'sanity', 'relic-rich'] },
  { id: 'depths', name: 'The Sunken Depths', subtitle: 'Flooded vaults below the old city', depthMin: 8, depthMax: 10, identity: 'Elite monsters, flooding, rare alchemy materials.', effects: ['flooding', 'elite', 'rare loot'] },
  { id: 'black_below', name: 'The Black Below', subtitle: 'Where the lantern light thins to a thread', depthMin: 11, depthMax: 12, identity: 'Near-suicidal difficulty, legendary rewards, permanent corruption risk.', effects: ['boss', 'legendary', 'permanent corruption'] },
];
