import type { Expedition, Hero } from '../types';
import { masteryExpeditionModifiers } from '../data/masteries';
import { pushExpeditionEvent } from './events';

export function xpThreshold(hero: Hero): number {
  return Math.max(20, hero.level * 30);
}

export function grantHeroXP(hero: Hero, expedition: Expedition, amount: number, reason?: string): boolean {
  if (hero.status === 'dead') return false;
  const mastery = masteryExpeditionModifiers(hero);
  const nextAmount = Math.max(0, amount) * mastery.xpMult;
  hero.xp = (hero.xp || 0) + Math.max(0, Math.round(nextAmount));
  let leveled = false;
  while (hero.xp >= xpThreshold(hero)) {
    hero.xp -= xpThreshold(hero);
    hero.level += 1;
    hero.maxHp += 3;
    hero.hp = Math.min(hero.maxHp, hero.hp + 3);
    pushExpeditionEvent(expedition, `${hero.name} reaches Rank ${hero.level}.`);
    leveled = true;
  }
  if (reason && amount > 0) {
    pushExpeditionEvent(expedition, `${hero.name} gains ${amount} XP${reason ? ` from ${reason}` : ''}.`);
  }
  return leveled;
}
