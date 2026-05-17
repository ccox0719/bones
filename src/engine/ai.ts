import type { Hero } from '../types';
import { CLASS_DATA } from '../data/classes';

export function chooseActingHero(heroes: Hero[]): Hero | null {
  const living = heroes.filter((hero) => hero.status !== 'dead' && hero.hp > 0);
  if (!living.length) return null;
  return living.sort((a, b) => {
    const ar = CLASS_DATA[a.cls]?.role === 'ranged' ? 1 : 0;
    const br = CLASS_DATA[b.cls]?.role === 'ranged' ? 1 : 0;
    return br - ar || b.morale - a.morale;
  })[0];
}

export function chooseEndangeredHero(heroes: Hero[]): Hero | null {
  const living = heroes.filter((hero) => hero.status !== 'dead' && hero.hp > 0);
  if (!living.length) return null;
  return living.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
}
