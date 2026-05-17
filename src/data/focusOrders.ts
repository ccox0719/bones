import type { Expedition, ExpeditionFocus, FocusModifiers, FocusOrderConfig, Hero } from '../types';

export const FOCUS_ORDERS: FocusOrderConfig[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    icon: '=',
    tooltip: 'Steady pace. No major strengths or weaknesses.',
    logText: 'New order received: maintain balanced expedition discipline.',
    modifiers: { combatWeight: 1, lootWeight: 1, missionWeight: 1, survivalWeight: 1, scoutingWeight: 1 },
  },
  {
    id: 'combat',
    label: 'Combat',
    icon: 'X',
    tooltip: 'Seek fights. More XP. Higher injury risk.',
    logText: 'New order received: seek enemy contact and press the attack.',
    modifiers: { combatWeight: 1.45, lootWeight: 0.9, missionWeight: 0.85, survivalWeight: 0.75, scoutingWeight: 0.8 },
  },
  {
    id: 'loot',
    label: 'Loot',
    icon: '$',
    tooltip: 'Search thoroughly. More treasure. Slower and more dangerous.',
    logText: 'New order received: prioritize relic recovery.',
    modifiers: { combatWeight: 0.85, lootWeight: 1.6, missionWeight: 0.75, survivalWeight: 0.8, scoutingWeight: 1.1 },
  },
  {
    id: 'mission',
    label: 'Mission',
    icon: '!',
    tooltip: 'Prioritize objectives. Faster completion. Fewer side rewards.',
    logText: 'New order received: ignore salvage and push toward the objective.',
    modifiers: { combatWeight: 0.75, lootWeight: 0.65, missionWeight: 1.7, survivalWeight: 1, scoutingWeight: 1 },
  },
  {
    id: 'survival',
    label: 'Survival',
    icon: '+',
    tooltip: 'Avoid danger. Lower rewards. Better chance to return.',
    logText: 'Survival order received. The party avoids unnecessary conflict.',
    modifiers: { combatWeight: 0.55, lootWeight: 0.6, missionWeight: 0.8, survivalWeight: 1.8, scoutingWeight: 1.25 },
  },
  {
    id: 'scouting',
    label: 'Scouting',
    icon: '?',
    tooltip: 'Reveal threats. Avoid ambushes. Find hidden routes.',
    logText: 'New order received: mark threats and scout the lower passages.',
    modifiers: { combatWeight: 0.7, lootWeight: 0.85, missionWeight: 0.9, survivalWeight: 1.15, scoutingWeight: 1.8 },
  },
];

export const DEFAULT_FOCUS: ExpeditionFocus = 'balanced';

export function focusOrder(id?: string): FocusOrderConfig {
  return FOCUS_ORDERS.find((focus) => focus.id === id) || FOCUS_ORDERS[0];
}

export function getFocusModifiers(expedition: Expedition, party: Hero[] = [], depth = 1): FocusModifiers {
  const base = { ...focusOrder(expedition.currentFocus).modifiers };
  const depthPressure = Math.max(0, depth - 4) * 0.035;

  if (expedition.currentFocus === 'combat') base.combatWeight += classCount(party, ['Grave Knight', 'Bone Forager']) * 0.08;
  if (expedition.currentFocus === 'loot') base.lootWeight += classCount(party, ['Rat Duelist']) * 0.09;
  if (expedition.currentFocus === 'survival') base.survivalWeight += classCount(party, ['Lantern Nun', 'Blood Priest']) * 0.08;
  if (expedition.currentFocus === 'scouting') base.scoutingWeight += classCount(party, ['Mire Hunter', 'Hollow Archer']) * 0.1;
  if (expedition.currentFocus === 'mission' && party.some((hero) => hero.cls === 'Blood Priest')) base.missionWeight += 0.08;

  party.forEach((hero) => {
    if (hasQuirk(hero, 'Greedy')) base.lootWeight += 0.08;
    if (hasQuirk(hero, 'Coward')) base.survivalWeight += 0.08;
    if (hasQuirk(hero, 'Obsessed')) base.missionWeight += 0.08;
    if (hasQuirk(hero, 'Curious')) {
      base.scoutingWeight += 0.07;
      base.lootWeight += 0.04;
    }
  });

  if (depthPressure > 0) {
    base.lootWeight += expedition.currentFocus === 'loot' ? depthPressure : 0;
    base.survivalWeight += expedition.currentFocus === 'survival' ? depthPressure : 0;
    base.scoutingWeight += expedition.currentFocus === 'scouting' ? depthPressure : 0;
  }

  return base;
}

function classCount(party: Hero[], classes: string[]): number {
  return party.filter((hero) => classes.includes(hero.cls)).length;
}

function hasQuirk(hero: Hero, quirk: string): boolean {
  return (hero.quirks || []).some((entry) => entry.toLowerCase() === quirk.toLowerCase());
}
