import type { Destination, Expedition, Hero } from '../types';
import { pushExpeditionEvent } from './events';

export function hasQuirk(hero: Hero, quirk: string): boolean {
  return (hero.quirks || []).some((q) => q.toLowerCase() === quirk.toLowerCase());
}

export function heroDamageModifier(hero: Hero): number {
  let mod = 1;
  if (hasQuirk(hero, 'Precise')) mod += 0.12;
  if (hasQuirk(hero, 'Veteran')) mod += 0.08;
  if (hasQuirk(hero, 'Coward')) mod -= 0.08;
  if (hasQuirk(hero, 'Unstable')) mod += 0.16;
  return Math.max(0.5, mod);
}

export function heroDefenseModifier(hero: Hero): number {
  let mod = 1;
  if (hasQuirk(hero, 'Resolute')) mod += 0.12;
  if (hasQuirk(hero, 'Faithful')) mod += 0.08;
  if (hasQuirk(hero, 'Curious')) mod -= 0.08;
  return Math.max(0.5, mod);
}

export function deathDoorModifier(hero: Hero, expedition: Expedition): number {
  let save = 0;
  if (hasQuirk(hero, 'Resolute')) save += 0.12;
  if (hasQuirk(hero, 'Faithful')) save += 0.08;
  if (hasQuirk(hero, 'Coward')) save -= 0.08;
  if (expedition.behavior === 'survival') save += 0.08;
  if (expedition.behavior === 'aggressive') save -= 0.08;
  return save;
}

export function applyMoraleAffliction(hero: Hero, expedition: Expedition, destination: Destination): boolean {
  if (hero.morale > 30 || hero.status === 'dead') return false;
  const chance = hero.morale <= 10 ? 0.28 : 0.12;
  if (Math.random() > chance) return false;

  if (hasQuirk(hero, 'Coward')) {
    pushExpeditionEvent(expedition, `${hero.name} falters and pulls away from the fighting.`);
    hero.morale = Math.max(0, hero.morale - 4);
    return true;
  }
  if (hasQuirk(hero, 'Gambler')) {
    pushExpeditionEvent(expedition, `${hero.name} takes a reckless opening.`);
    hero.cor = Math.min(100, hero.cor + destination.danger);
    return false;
  }
  if (hasQuirk(hero, 'Obsessed') || hasQuirk(hero, 'Curious')) {
    pushExpeditionEvent(expedition, `${hero.name} stares too long into the dark.`);
    hero.cor = Math.min(100, hero.cor + 2 + destination.danger);
    return false;
  }

  pushExpeditionEvent(expedition, `${hero.name} refuses to advance for a moment.`);
  return true;
}
