import type { Hero } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function relationshipBaseline(a: Hero, b: Hero): number {
  let score = 0;
  if (a.cls === b.cls) score += 8;
  if (a.status === b.status && a.status !== 'dead') score += 2;
  const sharedQuirks = (a.quirks || []).filter((quirk) => (b.quirks || []).includes(quirk)).length;
  score += sharedQuirks * 2;
  score += ((a.id * 31 + b.id * 17) % 7) - 3;
  return clamp(score, -40, 40);
}

export function relationshipBand(score: number): 'feud' | 'rival' | 'uneasy' | 'neutral' | 'companion' | 'friend' | 'bonded' {
  if (score >= 70) return 'bonded';
  if (score >= 40) return 'friend';
  if (score >= 15) return 'companion';
  if (score <= -60) return 'feud';
  if (score <= -30) return 'rival';
  if (score <= -12) return 'uneasy';
  return 'neutral';
}

export function relationshipLabel(score: number): string {
  const band = relationshipBand(score);
  if (band === 'bonded') return 'Bonded';
  if (band === 'friend') return 'Friend';
  if (band === 'companion') return 'Companion';
  if (band === 'uneasy') return 'Uneasy';
  if (band === 'rival') return 'Rival';
  if (band === 'feud') return 'Feud';
  return 'Neutral';
}

export function getRelationshipScore(hero: Hero, otherId: number): number {
  return hero.relationships?.[otherId] ?? 0;
}

export function hydrateHeroRelationships(heroes: Hero[]): void {
  const hasAnyRelationships = heroes.some((hero) => Object.keys(hero.relationships || {}).length > 0);
  for (let i = 0; i < heroes.length; i++) {
    const a = heroes[i];
    a.relationships = a.relationships || {};
    for (let j = i + 1; j < heroes.length; j++) {
      const b = heroes[j];
      b.relationships = b.relationships || {};
      const aScore = a.relationships[b.id];
      const bScore = b.relationships[a.id];
      if (aScore != null && bScore == null) {
        b.relationships[a.id] = aScore;
      } else if (bScore != null && aScore == null) {
        a.relationships[b.id] = bScore;
      } else if (aScore == null && bScore == null && !hasAnyRelationships) {
        const baseline = relationshipBaseline(a, b);
        a.relationships[b.id] = baseline;
        b.relationships[a.id] = baseline;
      }
    }
  }
}

export function seedHeroRelationships(hero: Hero, heroes: Hero[]): void {
  hero.relationships = hero.relationships || {};
  heroes.forEach((other) => {
    if (other.id === hero.id) return;
    other.relationships = other.relationships || {};
    const existing = hero.relationships?.[other.id];
    if (existing != null) {
      if (other.relationships[hero.id] == null) other.relationships[hero.id] = existing;
      return;
    }
    const score = relationshipBaseline(hero, other);
    hero.relationships![other.id] = score;
    if (other.relationships[hero.id] == null) other.relationships[hero.id] = score;
  });
}

export function adjustHeroRelationship(heroes: Hero[], heroAId: number, heroBId: number, delta: number): number {
  if (!delta) return 0;
  const heroA = heroes.find((hero) => hero.id === heroAId);
  const heroB = heroes.find((hero) => hero.id === heroBId);
  if (!heroA || !heroB) return 0;
  heroA.relationships = heroA.relationships || {};
  heroB.relationships = heroB.relationships || {};
  const next = clamp((heroA.relationships[heroBId] ?? 0) + delta, -100, 100);
  heroA.relationships[heroBId] = next;
  heroB.relationships[heroAId] = next;
  return next;
}

export function describeRelationship(hero: Hero, other: Hero): { score: number; label: string } {
  const score = hero.relationships?.[other.id] ?? other.relationships?.[hero.id] ?? 0;
  return { score, label: relationshipLabel(score) };
}

export function summarizeHeroRelationships(hero: Hero, heroes: Hero[]): {
  average: number;
  strongestBond?: { id: number; name: string; score: number; label: string };
  worstRival?: { id: number; name: string; score: number; label: string };
  entries: Array<{ id: number; name: string; score: number; label: string }>;
} {
  const entries = heroes
    .filter((other) => other.id !== hero.id)
    .map((other) => {
      const score = hero.relationships?.[other.id] ?? other.relationships?.[hero.id] ?? 0;
      return { id: other.id, name: other.name, score, label: relationshipLabel(score) };
    })
    .filter((entry) => entry.score !== 0)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || b.score - a.score);

  const average = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length) : 0;
  const strongestBond = entries.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score)[0];
  const worstRival = entries.filter((entry) => entry.score < 0).sort((a, b) => a.score - b.score)[0];
  return { average, strongestBond, worstRival, entries };
}

export function relationshipCombatModifiers(hero: Hero, allies: Hero[]): {
  damageMult: number;
  defenseMult: number;
  moraleResist: number;
  deathDoorBonus: number;
} {
  const scores = allies
    .filter((ally) => ally.id !== hero.id && ally.status !== 'dead')
    .map((ally) => hero.relationships?.[ally.id] ?? ally.relationships?.[hero.id] ?? 0);
  if (!scores.length) {
    return { damageMult: 1, defenseMult: 1, moraleResist: 0, deathDoorBonus: 0 };
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const strongest = Math.max(...scores);
  const weakest = Math.min(...scores);
  return {
    damageMult: clamp(1 + average / 350 + Math.max(0, strongest - 30) / 550 - Math.max(0, -weakest - 30) / 650, 0.9, 1.12),
    defenseMult: clamp(1 + average / 500, 0.9, 1.08),
    moraleResist: clamp(Math.max(0, average) / 6 + Math.max(0, strongest - 30) / 4, 0, 8),
    deathDoorBonus: clamp(Math.max(0, average) / 650 + Math.max(0, strongest - 40) / 500, 0, 0.08),
  };
}
