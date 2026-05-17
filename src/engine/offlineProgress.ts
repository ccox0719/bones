import type { GameState, OfflineProgressReport } from '../types';
import { simulateWorldTick } from './simulation';
import { processSettlementTime } from './settlement';

type HeroSnapshot = {
  level: number;
  hp: number;
  status: string;
  xp: number;
};

type ExpeditionSnapshot = {
  status: string;
  currentRoomIndex: number;
  logLength: number;
};

export function applyOfflineProgress(state: GameState, now = Date.now()): OfflineProgressReport {
  const lastSaved = state.lastSaved || now;
  const elapsed = Math.max(0, now - lastSaved);
  if (elapsed < 1000) {
    return {
      elapsedMs: 0,
      activeExpeditions: state.expeditions.filter((expedition) => expedition.status === 'active').length,
      completedExpeditions: 0,
      roomsCleared: 0,
      lootFound: 0,
      heroesLeveled: 0,
      heroesInjured: 0,
      deaths: 0,
      majorEvents: [],
    };
  }

  const heroSnapshot = new Map<number, HeroSnapshot>();
  state.heroes.forEach((hero) => {
    heroSnapshot.set(hero.id, {
      level: hero.level,
      hp: hero.hp,
      status: hero.status,
      xp: hero.xp || 0,
    });
  });

  const expeditionSnapshot = new Map<string, ExpeditionSnapshot>();
  state.expeditions.forEach((expedition) => {
    expeditionSnapshot.set(expedition.id, {
      status: expedition.status,
      currentRoomIndex: expedition.currentRoomIndex || 0,
      logLength: expedition.log?.length || 0,
    });
  });

  const inventoryBefore = state.inventory?.length || 0;

  simulateWorldTick(state, now);
  processSettlementTime(state, now);
  state.pressure = Math.min(100, state.pressure + elapsed / 3_600_000 * 0.35);
  state.lastSaved = now;

  let completedExpeditions = 0;
  let roomsCleared = 0;
  let heroesLeveled = 0;
  let heroesInjured = 0;
  let deaths = 0;
  const majorEvents: string[] = [];

  state.expeditions.forEach((expedition) => {
    const before = expeditionSnapshot.get(expedition.id);
    if (!before) return;
    if (before.status === 'active' && expedition.status !== 'active') completedExpeditions += 1;
    roomsCleared += Math.max(0, (expedition.currentRoomIndex || 0) - before.currentRoomIndex);
    expedition.log.slice(before.logLength).forEach((entry) => {
      if (majorEvents.length >= 6) return;
      if (/(reaches Rank|slain|returns|retreat|cache|corruption|panic|injured|death|revealed|scouted|boss|loot|found)/i.test(entry)) {
        majorEvents.push(entry);
      }
    });
  });

  state.heroes.forEach((hero) => {
    const before = heroSnapshot.get(hero.id);
    if (!before) return;
    if (hero.level > before.level) heroesLeveled += hero.level - before.level;
    if (before.status !== 'injured' && hero.status === 'injured') heroesInjured += 1;
    if (before.status !== 'dead' && hero.status === 'dead') deaths += 1;
  });

  const lootFound = Math.max(0, (state.inventory?.length || 0) - inventoryBefore);

  if (!majorEvents.length && completedExpeditions > 0) {
    majorEvents.push(`${completedExpeditions} expedition${completedExpeditions === 1 ? '' : 's'} returned while you were away.`);
  }

  return {
    elapsedMs: elapsed,
    activeExpeditions: state.expeditions.filter((expedition) => expedition.status === 'active').length,
    completedExpeditions,
    roomsCleared,
    lootFound,
    heroesLeveled,
    heroesInjured,
    deaths,
    majorEvents,
  };
}
