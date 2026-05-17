import type { GameState, Hero } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function processSettlementTime(state: GameState, now = Date.now()): string[] {
  const events: string[] = [];
  state.lastDayAt = state.lastDayAt || now;
  let days = Math.floor((now - state.lastDayAt) / DAY_MS);
  if (days <= 0) return events;

  while (days-- > 0) {
    state.day += 1;
    state.lastDayAt += DAY_MS;
    events.push(...processDailyBuildings(state));
    processPressure(state, events);
  }
  return events;
}

function processDailyBuildings(state: GameState): string[] {
  const events: string[] = [];
  const level = (id: string) => state.buildings.find((building) => building.id === id)?.level || 0;

  const infirmary = level('infirmary');
  if (infirmary) {
    const injured = state.heroes.filter((hero) => hero.status === 'injured').slice(0, infirmary);
    injured.forEach((hero) => {
      hero.hp = Math.min(hero.maxHp, hero.hp + 12 + infirmary * 4);
      if (hero.hp >= hero.maxHp * 0.65) hero.status = 'resting';
      events.push(`${hero.name} receives treatment in the Infirmary.`);
    });
  }

  const tavern = level('tavern');
  if (tavern) {
    recoverMorale(state.heroes.filter((hero) => hero.status === 'resting'), 5 + tavern * 2);
    if (state.heroes.some((hero) => hero.status === 'resting')) events.push('The Ashen Tap steadies tired nerves.');
  }

  const shrine = level('shrine');
  if (shrine) {
    state.pressure = Math.max(0, state.pressure - shrine * 0.35);
    state.heroes.forEach((hero) => {
      if (hero.status !== 'dead') hero.cor = Math.max(0, hero.cor - shrine * 0.4);
    });
    events.push('The Vigil Shrine holds back a little darkness.');
  }

  const graveyard = level('graveyard');
  if (graveyard && state.heroes.some((hero) => hero.status === 'dead')) {
    state.pressure = Math.max(0, state.pressure - graveyard * 0.2);
  }

  state.heroes.forEach((hero) => {
    if (hero.status === 'resting' && hero.hp >= hero.maxHp * 0.75 && hero.morale >= 45 && hero.cor < 80) hero.status = 'ready';
    if (hero.status === 'deathDoor') hero.status = 'injured';
  });

  return events;
}

function recoverMorale(heroes: Hero[], amount: number): void {
  heroes.forEach((hero) => {
    hero.morale = Math.min(100, hero.morale + amount);
  });
}

function processPressure(state: GameState, events: string[]): void {
  state.pressure = Math.min(100, state.pressure + 0.8);
  if (state.pressure >= 80) {
    state.heroes.forEach((hero) => {
      if (hero.status !== 'dead') hero.morale = Math.max(0, hero.morale - 2);
    });
    events.push('World pressure gnaws at every survivor.');
  }
  if (state.pressure >= 95) {
    const target = state.heroes.find((hero) => hero.status === 'ready' || hero.status === 'resting');
    if (target) {
      target.cor = Math.min(100, target.cor + 5);
      events.push(`${target.name} dreams of the Black Below.`);
    }
  }
}
