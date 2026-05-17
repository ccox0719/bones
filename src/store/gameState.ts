import type { GameState } from '../types';
import { DEFAULT_BUILDINGS, DEFAULT_HEROES, BUILDING_ICONS_BY_ID, HERO_ICONS_BY_CLASS } from '../data/defaults';
import { createStarterEquipment } from '../data/equipment';
import { DEFAULT_FOCUS } from '../data/focusOrders';
import { hydrateHeroRelationships } from '../engine/relationships';

export const SAVE_KEY = 'lastLantern_v2';

export function defaultSave(): GameState {
  const save: GameState = {
    souls: 847,
    pressure: 38,
    day: 34,
    lastDayAt: Date.now(),
    heroes: JSON.parse(JSON.stringify(DEFAULT_HEROES)),
    buildings: JSON.parse(JSON.stringify(DEFAULT_BUILDINGS)),
    expeditions: [],
    inventory: createStarterEquipment(),
    scoutedNodeIds: ['ash_road', 'watcher_camp', 'shrike_fields'],
    completedCount: 0,
    lastSaved: Date.now(),
  };
  hydrateHeroRelationships(save.heroes);
  return save;
}

export function normalizeSave(raw: Partial<GameState>): GameState {
  const base = defaultSave();
  const save = {
    ...base,
    ...raw,
    heroes: raw.heroes || base.heroes,
    buildings: raw.buildings || base.buildings,
    expeditions: raw.expeditions || [],
    inventory: raw.inventory || [],
    scoutedNodeIds: raw.scoutedNodeIds || base.scoutedNodeIds,
  };

  save.heroes.forEach((hero) => {
    if (HERO_ICONS_BY_CLASS[hero.cls]) hero.icon = HERO_ICONS_BY_CLASS[hero.cls];
    hero.equipment = hero.equipment || {};
    hero.xp = hero.xp || 0;
    hero.traits = hero.traits || [];
    hero.fears = hero.fears || [];
    hero.affinities = hero.affinities || {};
    hero.relationships = hero.relationships || {};
    hero.masteryPath = hero.masteryPath || '';
    hero.masteryChosenAt = hero.masteryChosenAt || 0;
    hero.deathDoorSurvived = hero.deathDoorSurvived || 0;
    hero.expeditionsSurvived = hero.expeditionsSurvived || 0;
  });
  hydrateHeroRelationships(save.heroes);
  const normalizeEquipment = (item: any) => {
    if (!item) return item;
    item.stats = item.stats || {};
    item.tags = item.tags || [];
    item.upgradeLevel = item.upgradeLevel || 0;
    return item;
  };
  save.inventory = (save.inventory || []).map(normalizeEquipment);
  save.heroes.forEach((hero) => {
    Object.keys(hero.equipment || {}).forEach((slot) => {
      const item = (hero.equipment as any)[slot];
      if (item) (hero.equipment as any)[slot] = normalizeEquipment(item);
    });
  });
  save.buildings.forEach((building) => {
    if (BUILDING_ICONS_BY_ID[building.id]) building.icon = BUILDING_ICONS_BY_ID[building.id];
  });
  save.expeditions.forEach((expedition) => {
    expedition.currentFocus = expedition.currentFocus || DEFAULT_FOCUS;
    expedition.focusChanges = expedition.focusChanges || 0;
    expedition.focusScoutUsed = expedition.focusScoutUsed || false;
    expedition.log = expedition.log || [];
    expedition.loot = expedition.loot || [];
    expedition.routeHistory = expedition.routeHistory || [];
    expedition.carriedLoot = expedition.carriedLoot || [];
    expedition.resultViewed = expedition.resultViewed || false;
  });

  return save;
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return normalizeSave(JSON.parse(raw));
  } catch {
    // Fall through to a fresh save.
  }
  return defaultSave();
}

export function saveGameState(state: GameState, onSaved?: () => void): void {
  try {
    state.lastSaved = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    onSaved?.();
  } catch {
    // localStorage can fail in private contexts; gameplay should continue.
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
