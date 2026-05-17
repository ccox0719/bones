import type { Destination, Enemy, Expedition, Hero } from '../types';
import { CLASS_DATA } from '../data/classes';
import { createEnemySquad } from '../data/enemies';
import { getFocusModifiers } from '../data/focusOrders';
import { masteryCombatModifiers } from '../data/masteries';
import { heroEvent, pushExpeditionEvent } from './events';
import { grantHeroXP } from './progression';
import { relationshipCombatModifiers } from './relationships';
import { applyMoraleAffliction, deathDoorModifier, heroDamageModifier, heroDefenseModifier, hasQuirk } from './quirks';

export function ensureEnemySquad(expedition: Expedition, destination: Destination, elite = false): Enemy[] {
  const living = (expedition.currentEnemies || []).filter((enemy) => enemy.hp > 0);
  if (living.length) {
    expedition.currentEnemies = living;
    return living;
  }
  const squad = createEnemySquad(destination, elite || destination.nodeType === 'boss');
  expedition.currentEnemies = squad;
  expedition.combatState = { round: 0, enemiesDefeated: 0 };
  pushExpeditionEvent(expedition, `${squad.map((enemy) => enemy.name).join(', ')} emerge from the dark.`);
  return squad;
}

export function hasLivingEnemies(expedition: Expedition): boolean {
  return Boolean((expedition.currentEnemies || []).some((enemy) => enemy.hp > 0));
}

export function resolveAutoCombatRound(expedition: Expedition, heroes: Hero[], destination: Destination, elite = false): void {
  const livingHeroes = heroes.filter((hero) => hero.status !== 'dead' && hero.hp > 0);
  const enemies = ensureEnemySquad(expedition, destination, elite).filter((enemy) => enemy.hp > 0);
  if (!livingHeroes.length || !enemies.length) return;

  expedition.combatState = expedition.combatState || { round: 0, enemiesDefeated: 0 };
  expedition.combatState.round++;

  const focus = getFocusModifiers(expedition, livingHeroes, destination.depth || destination.danger || 1);
  const behavior = expedition.currentFocus === 'combat' ? 'aggressive' : expedition.currentFocus === 'survival' ? 'survival' : expedition.behavior || 'balanced';
  const hero = chooseHeroActor(livingHeroes, behavior);
  if (hero && !applyMoraleAffliction(hero, expedition, destination)) {
    const target = chooseEnemyTarget(enemies, behavior, hero);
    heroAttack(hero, target, livingHeroes, expedition, destination);
  }

  expedition.currentEnemies = (expedition.currentEnemies || []).filter((enemy) => enemy.hp > 0);
  if (!expedition.currentEnemies.length) {
    pushExpeditionEvent(expedition, 'The enemy line breaks.');
    return;
  }

  const enemy = chooseEnemyActor(expedition.currentEnemies);
  const targetHero = chooseHeroTarget(livingHeroes, enemy);
  if (enemy && targetHero) enemyAttack(enemy, targetHero, livingHeroes, expedition, destination);
}

function chooseHeroActor(heroes: Hero[], behavior: string): Hero | null {
  const sorted = [...heroes].sort((a, b) => {
    const ar = CLASS_DATA[a.cls]?.role;
    const br = CLASS_DATA[b.cls]?.role;
    if (behavior === 'survival') return (a.hp / a.maxHp) - (b.hp / b.maxHp);
    if (behavior === 'aggressive') return Number(br === 'ranged') - Number(ar === 'ranged') || b.morale - a.morale;
    return b.morale - a.morale;
  });
  return sorted[0] || null;
}

function chooseEnemyTarget(enemies: Enemy[], behavior: string, hero: Hero): Enemy {
  if (behavior === 'aggressive' || hasQuirk(hero, 'Precise')) {
    return [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }
  if (behavior === 'survival') {
    return [...enemies].sort((a, b) => b.damage - a.damage)[0];
  }
  return enemies[0];
}

function chooseEnemyActor(enemies: Enemy[]): Enemy {
  return [...enemies].sort((a, b) => b.damage + b.moraleDamage - (a.damage + a.moraleDamage))[0];
}

function chooseHeroTarget(heroes: Hero[], enemy: Enemy): Hero {
  const live = heroes.filter((hero) => hero.status !== 'dead');
  if (enemy.targetPreference === 'back') return live[live.length - 1] || live[0];
  if (enemy.targetPreference === 'weak') return [...live].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (enemy.targetPreference === 'stressed') return [...live].sort((a, b) => a.morale - b.morale)[0];
  if (enemy.targetPreference === 'random') return live[Math.floor(Math.random() * live.length)];
  return live[0];
}

function heroAttack(hero: Hero, enemy: Enemy, allies: Hero[], expedition: Expedition, destination: Destination): void {
  const stats = equipmentStats(hero);
  const focus = getFocusModifiers(expedition, allies, destination.depth || destination.danger || 1);
  const rel = relationshipCombatModifiers(hero, allies);
  const slot = Math.max(1, allies.indexOf(hero) + 1);
  const mastery = masteryCombatModifiers(hero, allies, enemy, slot);
  const behaviorMult = (expedition.behavior === 'aggressive' ? 1.18 : expedition.behavior === 'survival' ? 0.88 : 1) * (0.9 + focus.combatWeight * 0.1);
  const crit = Math.random() < Math.max(0, stats.crit || 0) * 0.03;
  const base = 5 + (stats.damage || 0) + (CLASS_DATA[hero.cls]?.atkRange === 'ranged' ? 1 : 0);
  const damage = Math.max(1, Math.floor((base * behaviorMult * rel.damageMult * mastery.damageMult * heroDamageModifier(hero) * (crit ? 1.7 : 1)) - (enemy.armor || 0)));
  enemy.hp = Math.max(0, enemy.hp - damage);
  expedition.combatState!.lastActor = hero.name;
  expedition.combatState!.lastTarget = enemy.name;
  pushExpeditionEvent(expedition, heroEvent(hero, `${crit ? 'critically ' : ''}hits ${enemy.name} for ${damage}.`));
  grantHeroXP(hero, expedition, Math.max(1, Math.floor(damage / 4)) + (crit ? 2 : 0), 'the strike');
  if (enemy.hp <= 0) {
    expedition.combatState!.enemiesDefeated++;
    pushExpeditionEvent(expedition, `${enemy.name} falls.`);
    grantHeroXP(hero, expedition, enemy.boss ? 10 : enemy.elite ? 6 : 4, 'the kill');
  }
  if (hasQuirk(hero, 'Healer') && Math.random() < 0.2) {
    const ally = chooseMostWounded(allies, hero);
    if (ally) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 3);
      pushExpeditionEvent(expedition, `${hero.name} steadies ${ally.name}'s wounds.`);
    }
  }
  if (hasQuirk(hero, 'Corrupted')) hero.cor = Math.min(100, hero.cor + destination.danger * 0.2);
}

function enemyAttack(enemy: Enemy, hero: Hero, allies: Hero[], expedition: Expedition, destination: Destination): void {
  const stats = equipmentStats(hero);
  const focus = getFocusModifiers(expedition, [hero], destination.depth || destination.danger || 1);
  const rel = relationshipCombatModifiers(hero, allies.filter((ally) => ally.status !== 'dead'));
  const slot = Math.max(1, allies.indexOf(hero) + 1);
  const mastery = masteryCombatModifiers(hero, allies, enemy, slot);
  const behaviorDefense = (expedition.behavior === 'survival' ? 1.18 : expedition.behavior === 'aggressive' ? 0.9 : 1) * (0.9 + focus.survivalWeight * 0.1);
  const pressure = 1 + (destination.depth || destination.danger || 1) * 0.04 + (100 - (expedition.torchlight ?? 100)) * 0.004;
  const defense = (stats.defense || 0) * behaviorDefense * heroDefenseModifier(hero) * rel.defenseMult * mastery.defenseMult;
  const damage = Math.max(1, Math.floor(enemy.damage * pressure - defense));
  const moraleDamage = Math.max(0, Math.floor((enemy.moraleDamage * (1.08 - Math.min(0.28, (focus.survivalWeight - 1) * 0.16))) - (stats.moraleResist || 0) - rel.moraleResist - mastery.moraleResist));
  const corruption = Math.max(0, enemy.corruption * (1 + Math.max(0, focus.lootWeight - 1) * 0.16) - (stats.corruptionResist || 0));

  if (hero.status === 'deathDoor') {
    resolveDeathDoorHit(hero, enemy, allies, expedition, destination);
    return;
  }

  hero.hp = Math.max(0, hero.hp - damage);
  hero.morale = Math.max(0, hero.morale - moraleDamage);
  hero.cor = Math.min(100, hero.cor + corruption + Math.max(0, stats.corruptionGain || 0) * 0.15);
  pushExpeditionEvent(expedition, `${enemy.name} hits ${hero.name} for ${damage}.`);
  grantHeroXP(hero, expedition, 1, 'surviving the hit');

  if (hero.hp <= 0) {
    hero.hp = 1;
    hero.status = 'deathDoor';
    hero.morale = Math.max(0, hero.morale - 15 + Math.floor(rel.moraleResist));
    pushExpeditionEvent(expedition, `${hero.name} is on Death's Door.`);
  }
}

function resolveDeathDoorHit(hero: Hero, enemy: Enemy, allies: Hero[], expedition: Expedition, destination: Destination): void {
  const focus = getFocusModifiers(expedition, [hero], destination.depth || destination.danger || 1);
  const rel = relationshipCombatModifiers(hero, allies);
  const slot = Math.max(1, allies.indexOf(hero) + 1);
  const mastery = masteryCombatModifiers(hero, allies, enemy, slot);
  const baseDeathChance = 0.28 + destination.danger * 0.035 + (enemy.elite ? 0.08 : 0) + (enemy.boss ? 0.18 : 0);
  const moraleSave = hero.morale * 0.002;
  const save = moraleSave + deathDoorModifier(hero, expedition) + Math.max(0, focus.survivalWeight - 1) * 0.05 + rel.deathDoorBonus + mastery.deathDoorBonus;
  if (Math.random() < Math.max(0.08, baseDeathChance - save)) {
    hero.status = 'dead';
    hero.hp = 0;
    pushExpeditionEvent(expedition, `${hero.name} is slain by ${enemy.name}.`);
  } else {
    hero.morale = Math.max(0, hero.morale - 10);
    pushExpeditionEvent(expedition, `${hero.name} refuses to die.`);
  }
}

function chooseMostWounded(allies: Hero[], actor: Hero): Hero | null {
  return allies
    .filter((hero) => hero.id !== actor.id && hero.status !== 'dead')
    .sort((a: Hero, b: Hero) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}

function equipmentStats(hero: Hero) {
  return Object.values(hero.equipment || {}).reduce((acc, item) => {
    Object.entries(item.stats || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {} as Record<string, number>);
}
