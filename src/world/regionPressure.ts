import type { Destination } from '../types';

export interface RegionEncounterProfile {
  id: string;
  label: string;
  roomWeights: {
    battle: number;
    elite: number;
    treasure: number;
    camp: number;
    event: number;
    corruption: number;
    shrine: number;
  };
  pressure: {
    morale: number;
    corruption: number;
    torch: number;
    loot: number;
    xp: number;
  };
  enemyPool: string[];
  enemyBonus: {
    hp: number;
    damage: number;
    moraleDamage: number;
    corruption: number;
  };
  eventTags: string[];
}

export const REGION_PROFILES: Record<string, RegionEncounterProfile> = {
  outskirts: {
    id: 'outskirts',
    label: 'Outskirts',
    roomWeights: { battle: 1.25, elite: 0.7, treasure: 0.7, camp: 1.15, event: 0.95, corruption: 0.55, shrine: 0.6 },
    pressure: { morale: 0.9, corruption: 0.85, torch: 0.88, loot: 0.8, xp: 0.92 },
    enemyPool: ['outskirts', 'ruins'],
    enemyBonus: { hp: 0.95, damage: 0.92, moraleDamage: 0.9, corruption: 0.75 },
    eventTags: ['ambush', 'beast', 'scavenger'],
  },
  ruins: {
    id: 'ruins',
    label: 'Ruins',
    roomWeights: { battle: 1.1, elite: 0.95, treasure: 0.85, camp: 0.8, event: 1.1, corruption: 1.05, shrine: 1.1 },
    pressure: { morale: 1.05, corruption: 1, torch: 1, loot: 1, xp: 1 },
    enemyPool: ['ruins', 'catacombs'],
    enemyBonus: { hp: 1, damage: 1, moraleDamage: 1.05, corruption: 1 },
    eventTags: ['undead', 'trap', 'relic'],
  },
  catacombs: {
    id: 'catacombs',
    label: 'Catacombs',
    roomWeights: { battle: 0.95, elite: 1.1, treasure: 1.15, camp: 0.65, event: 1.05, corruption: 1.2, shrine: 1.15 },
    pressure: { morale: 1.1, corruption: 1.22, torch: 1.2, loot: 1.18, xp: 1.1 },
    enemyPool: ['catacombs', 'black_below'],
    enemyBonus: { hp: 1.08, damage: 1.08, moraleDamage: 1.15, corruption: 1.12 },
    eventTags: ['darkness', 'sanity', 'relic'],
  },
  depths: {
    id: 'depths',
    label: 'Sunken Depths',
    roomWeights: { battle: 0.95, elite: 1.15, treasure: 1.1, camp: 0.55, event: 1.2, corruption: 1.15, shrine: 0.85 },
    pressure: { morale: 1.08, corruption: 1.18, torch: 1.1, loot: 1.22, xp: 1.12 },
    enemyPool: ['depths', 'black_below'],
    enemyBonus: { hp: 1.1, damage: 1.12, moraleDamage: 1.08, corruption: 1.15 },
    eventTags: ['flooding', 'mire', 'alchemy'],
  },
  black_below: {
    id: 'black_below',
    label: 'Black Below',
    roomWeights: { battle: 1.2, elite: 1.25, treasure: 1, camp: 0.35, event: 1.15, corruption: 1.3, shrine: 0.55 },
    pressure: { morale: 1.2, corruption: 1.35, torch: 1.28, loot: 1.3, xp: 1.18 },
    enemyPool: ['black_below', 'catacombs'],
    enemyBonus: { hp: 1.18, damage: 1.18, moraleDamage: 1.22, corruption: 1.2 },
    eventTags: ['boss', 'cursed', 'permanent'],
  },
};

export function regionProfile(destination: Destination): RegionEncounterProfile {
  return REGION_PROFILES[destination.regionId || 'ruins'] || REGION_PROFILES.ruins;
}
