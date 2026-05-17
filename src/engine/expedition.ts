import type { Destination, Expedition, ExpeditionRoom, GameState, Hero, PendingExpeditionDecision } from '../types';
import { DEFAULT_FOCUS, getFocusModifiers } from '../data/focusOrders';
import { SYNERGY_COMBOS } from '../data/synergies';
import { revealRoutesFromNode } from '../world/mapGeneration';
import { regionProfile, type RegionEncounterProfile } from '../world/regionPressure';
import { grantHeroXP } from './progression';
import { createRoomPath } from './rooms';
import { pushExpeditionEvent, roomEntryText } from './events';
import { hasLivingEnemies, resolveAutoCombatRound } from './combat';
import { grantEquipmentLoot, grantRoomLoot, totalSoulLoot } from './loot';
import { adjustHeroRelationship, relationshipBand, relationshipLabel } from './relationships';
import { masteryPartyModifier, masteryExpeditionModifiers } from '../data/masteries';

const DEFAULT_REGION_PROFILE: RegionEncounterProfile = regionProfile({ regionId: 'ruins', durationMs: 1, danger: 1, threats: [], id: 'tmp', name: '', icon: '', nodeType: 'combat' } as Destination);

export function ensureExpeditionRuntime(expedition: Expedition, destination: Destination, now = Date.now()): void {
  expedition.destId = expedition.destId || expedition.destinationId;
  expedition.startTime = expedition.startTime || expedition.startedAt || now;
  expedition.endTime = expedition.endTime || expedition.startTime + destination.durationMs;
  expedition.roomPath = expedition.roomPath?.length ? expedition.roomPath : createRoomPath(destination);
  expedition.currentRoomIndex = expedition.currentRoomIndex ?? 0;
  expedition.roomStartedAt = expedition.roomStartedAt || expedition.startTime;
  expedition.lastSimAt = expedition.lastSimAt || expedition.startTime;
  expedition.log = expedition.log || [];
  expedition.loot = expedition.loot || [];
  expedition.currentFocus = expedition.currentFocus || DEFAULT_FOCUS;
  expedition.focusChanges = expedition.focusChanges || 0;
  expedition.focusScoutUsed = expedition.focusScoutUsed || false;
  expedition.torchlight = expedition.torchlight ?? 100;
  expedition.supplies = expedition.supplies ?? Math.max(2, Math.ceil(destination.danger * 1.5));
  expedition.routeHistory = expedition.routeHistory || [];
  expedition.carriedLoot = expedition.carriedLoot || [];
  expedition.pendingDecisionChoice = expedition.pendingDecisionChoice ?? undefined;
}

export function createExpedition(input: {
  id: string;
  destination: Destination;
  heroIds: Array<number | null>;
  formation: Array<string | null>;
  synergyIds: string[];
  partyScore: number;
  behavior: string;
  now?: number;
}): Expedition {
  const now = input.now || Date.now();
  const expedition: Expedition = {
    id: input.id,
    destId: input.destination.id,
    destinationId: input.destination.id,
    destinationName: input.destination.name,
    heroIds: input.heroIds,
    formation: input.formation,
    synergyIds: input.synergyIds,
    partyScore: input.partyScore,
    behavior: input.behavior,
    currentFocus: DEFAULT_FOCUS,
    focusChanges: 0,
    focusScoutUsed: false,
    startTime: now,
    startedAt: now,
    endTime: now + input.destination.durationMs,
    duration: input.destination.durationMs,
    status: 'active',
    log: [],
    loot: [],
    carriedLoot: [],
    torchlight: 100,
    supplies: Math.max(2, Math.ceil(input.destination.danger * 1.5)),
    routeHistory: [input.destination.id],
    roomPath: createRoomPath(input.destination),
    currentRoomIndex: 0,
    roomStartedAt: now,
    lastSimAt: now,
  };
  pushExpeditionEvent(expedition, `Expedition departs for ${input.destination.name}.`);
  return expedition;
}

export function expeditionHeroes(state: GameState, expedition: Expedition): Hero[] {
  return expedition.heroIds.map((id) => state.heroes.find((hero) => hero.id === id)).filter(Boolean) as Hero[];
}

export function simulateExpeditionTick(state: GameState, expedition: Expedition, destination: Destination, deltaTime: number, now = Date.now()): boolean {
  if (expedition.status !== 'active') return false;
  ensureExpeditionRuntime(expedition, destination, now);
  const region = regionProfile(destination);

  if (expedition.retreating) {
    expedition.lastSimAt = now;
    if (now >= (expedition.endTime || 0)) {
      completeExpedition(state, expedition, destination);
      return true;
    }
    return false;
  }

  if (expedition.pendingDecision) {
    const choice = defaultDecisionChoice(expedition.pendingDecision);
    const expiresAt = expedition.pendingDecision.expiresAt || Infinity;
    const deadline = Math.min(expiresAt, expedition.endTime || Infinity);
    if (now >= deadline) {
      resolveExpeditionDecision(state, expedition, destination, choice, now);
      return true;
    }
    expedition.lastSimAt = now;
    return false;
  }

  let changed = false;
  let remaining = Math.max(0, deltaTime);
  const maxSteps = 24;
  let steps = 0;

  while (remaining > 0 && expedition.status === 'active' && steps++ < maxSteps) {
    const room = expedition.roomPath![expedition.currentRoomIndex || 0];
    if (!room) {
      completeExpedition(state, expedition, destination);
      return true;
    }

    if (!room.entered) {
      pushExpeditionEvent(expedition, roomEntryText(room.kind, room.name));
      room.entered = true;
      changed = true;
    }

    const elapsed = now - (expedition.roomStartedAt || now);
    const heroes = expeditionHeroes(state, expedition).filter((hero) => hero.status !== 'dead');
    const focus = getFocusModifiers(expedition, heroes, destination.depth || destination.danger || 1);
    const roomDuration = adjustedRoomDuration(room.durationMs, expedition.behavior, focus.missionWeight, focus.lootWeight, region);
    const roomRemaining = Math.max(0, roomDuration - elapsed);
    const spent = Math.min(remaining, roomRemaining || remaining);
    remaining -= spent;

    drainTorch(expedition, destination, spent, region, heroes);
    applyRoomPressure(state, expedition, destination, room, now, region);

    if ((room.kind === 'battle' || room.kind === 'elite') && hasLivingEnemies(expedition)) {
      break;
    }

    if (elapsed + spent >= roomDuration) {
      if (maybeQueueDecision(state, expedition, destination, room, now)) {
        changed = true;
        break;
      }
      completeRoom(state, expedition, destination, room.kind);
      room.completed = true;
      expedition.currentEnemies = [];
      expedition.currentRoomIndex = (expedition.currentRoomIndex || 0) + 1;
      expedition.roomStartedAt = now - remaining;
      changed = true;
    } else {
      break;
    }
  }

  expedition.lastSimAt = now;
  if (now >= (expedition.endTime || 0) && expedition.status === 'active') {
    completeExpedition(state, expedition, destination);
    changed = true;
  }
  return changed;
}

function applyRoomPressure(state: GameState, expedition: Expedition, destination: Destination, room: { kind: string; lastPulseAt?: number }, now: number, region = regionProfile(destination)): void {
  const heroes = expeditionHeroes(state, expedition).filter((hero) => hero.status !== 'dead');
  if (!heroes.length) {
    expedition.status = 'complete';
    pushExpeditionEvent(expedition, 'No one remains to carry the lantern.');
    return;
  }

  if (room.kind === 'battle' || room.kind === 'elite') {
    const focus = getFocusModifiers(expedition, heroes, destination.depth || destination.danger || 1);
    const cadenceBase = room.kind === 'elite' ? 12000 : 16000;
    const cadence = cadenceBase / Math.max(0.7, focus.combatWeight * region.pressure.xp);
    if (room.lastPulseAt && now - room.lastPulseAt < cadence) return;
    room.lastPulseAt = now;
    resolveAutoCombatRound(expedition, heroes, destination, room.kind === 'elite');
    return;
  }

  const focus = getFocusModifiers(expedition, heroes, destination.depth || destination.danger || 1);
  heroes.forEach((hero) => {
    const behaviorRisk = expedition.behavior === 'aggressive' ? 1.25 : expedition.behavior === 'survival' ? 0.75 : 1;
    const torchRisk = 1 + (100 - (expedition.torchlight ?? 100)) / 140;
    const corruptionRisk = ((focus.lootWeight * 0.2 + focus.combatWeight * 0.1 + 1) / Math.max(0.8, focus.survivalWeight)) * region.pressure.corruption;
    hero.cor = Math.min(100, hero.cor + destination.danger * 0.02 * behaviorRisk * torchRisk * corruptionRisk);
    if (room.kind === 'hallway' || room.kind === 'event') {
      const moraleRisk = behaviorRisk * (1.15 - Math.min(0.35, (focus.survivalWeight - 1) * 0.18)) * region.pressure.morale;
      hero.morale = Math.max(0, hero.morale - destination.danger * 0.04 * moraleRisk);
    }
  });
}

function completeRoom(state: GameState, expedition: Expedition, destination: Destination, kind: string): void {
  const heroes = expeditionHeroes(state, expedition).filter((hero) => hero.status !== 'dead');
  expedition.routeHistory = expedition.routeHistory || [];
  const choice = expedition.pendingDecisionChoice ?? 0;
  const decisionKind = expedition.pendingDecision?.kind;
  if (kind === 'camp') {
    if (choice === 0 || !expedition.pendingDecision) {
      expedition.supplies = Math.max(0, (expedition.supplies || 0) - 1);
      const partyMastery = masteryPartyModifier(heroes);
      heroes.forEach((hero) => {
        const supplyBonus = expedition.supplies! >= 0 ? 1 : 0.4;
        hero.hp = Math.min(hero.maxHp, hero.hp + Math.floor(6 * supplyBonus));
        hero.morale = Math.min(100, hero.morale + Math.floor((5 + partyMastery.moraleResist * 0.2) * supplyBonus));
        grantHeroXP(hero, expedition, 1, 'resting at camp');
      });
      pushExpeditionEvent(expedition, 'A brief camp steadies the party.');
    } else {
      pushExpeditionEvent(expedition, 'The camp is left cold and empty.');
    }
  }
  if (kind === 'treasure') {
    if (choice === 1) {
      pushExpeditionEvent(expedition, 'The chest is sealed shut and left behind.');
    } else {
      const focus = getFocusModifiers(expedition, heroes, destination.depth || destination.danger || 1);
      const region = regionProfile(destination);
      const partyMastery = masteryPartyModifier(heroes);
      const lootMult = (expedition.behavior === 'aggressive' ? 1.25 : expedition.behavior === 'survival' ? 0.8 : 1) * focus.lootWeight * region.pressure.loot * partyMastery.lootMult;
      grantRoomLoot(expedition, destination, 1.4 * lootMult);
      if (Math.random() < Math.min(0.95, (expedition.behavior === 'aggressive' ? 0.9 : 0.65) * focus.lootWeight)) grantEquipmentLoot(expedition, destination);
      heroes.forEach((hero) => grantHeroXP(hero, expedition, 2, 'searching the cache'));
    }
  }
  if (kind === 'event' && heroes.length) {
    const hero = heroes[Math.floor(Math.random() * heroes.length)];
    if (decisionKind === 'strange_lantern') {
      if (choice === 0) {
        hero.cor = Math.min(100, hero.cor + 2 + Math.floor(destination.danger / 2));
        pushExpeditionEvent(expedition, `${hero.name} carries the borrowed flame onward.`);
      } else {
        hero.morale = Math.min(100, hero.morale + 3);
        pushExpeditionEvent(expedition, `${hero.name} rejects the omen and keeps the lantern low.`);
      }
    } else if (decisionKind === 'injured_ally') {
      if (choice === 0) {
        hero.hp = Math.min(hero.maxHp, hero.hp + 2);
        pushExpeditionEvent(expedition, `${hero.name}'s wounds are wrapped and bound.`);
        grantHeroXP(hero, expedition, 1, 'tending wounds');
      } else {
        hero.morale = Math.max(0, hero.morale - 2);
        pushExpeditionEvent(expedition, `${hero.name} grits through the pain.`);
      }
    } else if (choice === 0) {
      hero.cor = Math.min(100, hero.cor + 4 + destination.danger);
      pushExpeditionEvent(expedition, `${hero.name} hears something calling from behind the wall.`);
      grantHeroXP(hero, expedition, 1, 'enduring the omen');
    } else {
      hero.morale = Math.min(100, hero.morale + 3);
      pushExpeditionEvent(expedition, `${hero.name} dismisses the omen and keeps watch.`);
      grantHeroXP(hero, expedition, 1, 'keeping watch');
    }
  }
  if (kind === 'hallway' && choice === 0 && destination.depth >= 6 && heroes.length) {
    const hero = heroes[Math.floor(Math.random() * heroes.length)];
    hero.cor = Math.min(100, hero.cor + 2);
    pushExpeditionEvent(expedition, `${hero.name} feels the dark press in the corridor.`);
    grantHeroXP(hero, expedition, 1, 'pressing forward');
  }
  maybeRevealMapRoute(state, expedition, destination, heroes, kind);
  expedition.routeHistory.push(kind);
}

function maybeRevealMapRoute(state: GameState, expedition: Expedition, destination: Destination, heroes: Hero[], kind: string): void {
  if (!destination.routeTo?.length) return;
  if (!['hallway', 'event', 'camp', 'treasure', 'exit'].includes(kind)) return;
  const focus = getFocusModifiers(expedition, heroes, destination.depth || destination.danger || 1);
  const partyMastery = masteryPartyModifier(heroes);
  const classBonus = heroes.reduce((sum, hero) => sum + scoutingHeroBonus(hero), 0);
  const gearBonus = heroes.reduce((sum, hero) => sum + equipmentScouting(hero), 0);
  const nodeBonus = destination.nodeType === 'event' || destination.nodeType === 'camp' ? 0.06 : 0;
  const depthPenalty = Math.max(0, (destination.depth || 1) - 4) * 0.012;
  const chance = Math.max(0.03, Math.min(0.65, (0.06 * focus.scoutingWeight + classBonus + gearBonus + partyMastery.scoutingMult * 0.05 + nodeBonus - depthPenalty) * regionScoutingMultiplier(destination)));
  if (Math.random() > chance) return;
  const reveals = revealRoutesFromNode(state, destination.id, expedition.currentFocus === 'scouting' ? 2 : 1);
  reveals.forEach((node) => pushExpeditionEvent(expedition, `Scouts mark a route toward ${node.name}.`));
}

function scoutingHeroBonus(hero: Hero): number {
  let bonus = 0;
  if (hero.cls === 'Mire Hunter' || hero.cls === 'Hollow Archer') bonus += 0.05;
  if (hero.cls === 'Rat Duelist') bonus += 0.025;
  if ((hero.quirks || []).some((quirk) => ['Curious', 'Patient', 'Precise'].includes(quirk))) bonus += 0.025;
  return bonus;
}

function equipmentScouting(hero: Hero): number {
  return Object.values(hero.equipment || {}).reduce((sum, item) => sum + Math.max(0, item.stats?.scouting || 0) * 0.012, 0);
}

function regionScoutingMultiplier(destination: Destination): number {
  const profile = regionProfile(destination);
  if (profile.id === 'outskirts') return 1.05;
  if (profile.id === 'ruins') return 1;
  if (profile.id === 'catacombs') return 0.92;
  if (profile.id === 'depths') return 1.1;
  if (profile.id === 'black_below') return 0.88;
  return 1;
}

function maybeQueueDecision(state: GameState, expedition: Expedition, destination: Destination, room: ExpeditionRoom, now: number): boolean {
  if (expedition.pendingDecision || expedition.retreating) return true;
  const decision = createRoomDecision(state, expedition, destination, room, now);
  if (!decision) return false;
  expedition.pendingDecision = decision;
  expedition.pendingDecisionChoice = undefined;
  pushExpeditionEvent(expedition, decision.text);
  return true;
}

function createRoomDecision(state: GameState, expedition: Expedition, destination: Destination, room: ExpeditionRoom, now: number): PendingExpeditionDecision | null {
  const torchLow = (expedition.torchlight ?? 100) < 45;
  const deep = (destination.depth || destination.danger || 1) >= 6;

  if (room.kind === 'treasure') {
    return {
      id: `decision_${room.id}_${now}`,
      kind: 'cursed_chest',
      text: 'A sealed cache waits in the dark. Break it open or leave it untouched?',
      options: ['Open the chest', 'Leave it sealed'],
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
    };
  }

  if (room.kind === 'camp') {
    return {
      id: `decision_${room.id}_${now}`,
      kind: 'retreat_offer',
      text: 'The camp is defensible, but every minute here costs precious time. Rest or press on?',
      options: ['Rest at camp', 'Press onward'],
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
    };
  }

  if (room.kind === 'event') {
    if (torchLow || deep) {
      return {
        id: `decision_${room.id}_${now}`,
        kind: 'strange_lantern',
        text: 'A strange lantern burns beyond the wall. Feed the flame or snuff it out?',
        options: ['Feed the flame', 'Snuff it'],
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000,
      };
    }
    if (Math.random() < 0.7) {
      return {
        id: `decision_${room.id}_${now}`,
        kind: 'injured_ally',
        text: 'One hero is badly strained. Tend the wound or keep moving?',
        options: ['Tend the wound', 'Keep moving'],
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000,
      };
    }
  }

  if (room.kind === 'hallway' && deep && Math.random() < 0.2) {
    return {
      id: `decision_${room.id}_${now}`,
      kind: 'strange_lantern',
      text: 'A lantern flame flickers in the corridor. Harvest it or ignore the omen?',
      options: ['Harvest the flame', 'Ignore it'],
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
    };
  }

  return null;
}

export function resolveExpeditionDecision(state: GameState, expedition: Expedition, destination: Destination, choiceIndex: number, now = Date.now()): boolean {
  const decision = expedition.pendingDecision;
  if (!decision) return false;
  const room = expedition.roomPath?.[expedition.currentRoomIndex || 0];
  expedition.pendingDecisionChoice = choiceIndex;
  applyDecisionOutcome(state, expedition, destination, room, decision, choiceIndex);
  if (room) {
    completeRoom(state, expedition, destination, room.kind);
    room.completed = true;
    expedition.currentEnemies = [];
    expedition.currentRoomIndex = (expedition.currentRoomIndex || 0) + 1;
    expedition.roomStartedAt = now;
  }
  expedition.pendingDecision = undefined;
  expedition.pendingDecisionChoice = undefined;
  expedition.lastSimAt = now;
  return true;
}

function applyDecisionOutcome(state: GameState, expedition: Expedition, destination: Destination, room: ExpeditionRoom | undefined, decision: PendingExpeditionDecision, choiceIndex: number): void {
  const heroes = expeditionHeroes(state, expedition).filter((hero) => hero.status !== 'dead');
  const lead = heroes[Math.floor(Math.random() * heroes.length)];

  if (decision.kind === 'cursed_chest') {
    if (choiceIndex === 0) {
      if (lead) {
        lead.cor = Math.min(100, lead.cor + 4 + (destination.depth || destination.danger || 1));
        lead.morale = Math.max(0, lead.morale - 2);
      }
      pushExpeditionEvent(expedition, 'The seal breaks. The dark takes its due.');
    } else {
      pushExpeditionEvent(expedition, 'The cache is left untouched.');
      if (lead) lead.morale = Math.min(100, lead.morale + 2);
    }
    return;
  }

  if (decision.kind === 'injured_ally') {
    if (choiceIndex === 0) {
      const target = heroes.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (target) {
        target.hp = Math.min(target.maxHp, target.hp + 8);
        target.morale = Math.min(100, target.morale + 4);
        pushExpeditionEvent(expedition, `${target.name} is steadied before the march continues.`);
      }
      expedition.supplies = Math.max(0, (expedition.supplies || 0) - 1);
    } else {
      if (lead) lead.morale = Math.max(0, lead.morale - 3);
      pushExpeditionEvent(expedition, 'The wounded are left to pace themselves.');
    }
    return;
  }

  if (decision.kind === 'strange_lantern') {
    if (choiceIndex === 0) {
      expedition.torchlight = Math.min(100, (expedition.torchlight ?? 100) + 18);
      if (lead) lead.morale = Math.min(100, lead.morale + 3);
      pushExpeditionEvent(expedition, 'The lantern feeds the party with borrowed fire.');
    } else {
      expedition.torchlight = Math.max(0, (expedition.torchlight ?? 100) - 6);
      state.pressure = Math.max(0, state.pressure - 0.1);
      pushExpeditionEvent(expedition, 'The omen is snuffed out.');
    }
    return;
  }

  if (decision.kind === 'retreat_offer') {
    if (choiceIndex === 0) {
      if (lead) lead.morale = Math.min(100, lead.morale + 2);
      pushExpeditionEvent(expedition, 'The campfire is fed and the party takes a breath.');
    } else {
      if (lead) lead.morale = Math.max(0, lead.morale - 2);
      pushExpeditionEvent(expedition, 'The party refuses to retreat and marches on.');
    }
  }
}

function defaultDecisionChoice(decision: PendingExpeditionDecision): number {
  if (decision.kind === 'cursed_chest') return 1;
  return 0;
}

function adjustedRoomDuration(durationMs: number, behavior?: string, missionWeight = 1, lootWeight = 1, region: RegionEncounterProfile = DEFAULT_REGION_PROFILE): number {
  let duration = durationMs;
  if (behavior === 'aggressive') duration *= 0.85;
  if (behavior === 'survival') duration *= 1.15;
  duration *= 1 - Math.min(0.22, (missionWeight - 1) * 0.16);
  duration *= 1 + Math.max(0, lootWeight - 1) * 0.12;
  duration *= 1 + Math.max(0, region.pressure.morale - 1) * 0.08;
  return duration;
}

function drainTorch(expedition: Expedition, destination: Destination, spentMs: number, region = regionProfile(destination), heroes: Hero[] = []): void {
  const depth = destination.depth || destination.danger || 1;
  const behavior = expedition.behavior === 'aggressive' ? 1.2 : expedition.behavior === 'survival' ? 0.85 : 1;
  const focus = getFocusModifiers(expedition, [], depth);
  const party = masteryPartyModifier(heroes);
  const focusDrain = (1 + Math.max(0, focus.lootWeight - 1) * 0.16 + Math.max(0, focus.combatWeight - 1) * 0.08) / Math.max(0.8, focus.scoutingWeight * 0.18 + focus.survivalWeight * 0.16 + 0.7);
  const drain = (spentMs / 60000) * (0.12 + depth * 0.035) * behavior * focusDrain * region.pressure.torch / Math.max(0.7, party.torchMult);
  expedition.torchlight = Math.max(0, (expedition.torchlight ?? 100) - drain);
}

export function completeExpedition(state: GameState, expedition: Expedition, destination: Destination): void {
  expedition.status = 'complete';
  expedition.completedAt = Date.now();
  expedition.resultViewed = false;
  const activeCombs = (expedition.synergyIds || []).map((id) => SYNERGY_COMBOS.find((combo) => combo.id === id)).filter(Boolean);
  const rewardMult = activeCombs.reduce((value, combo) => value * (combo!.modifiers.rewardMult || 1), 1);
  const baseReward = Math.floor(destination.danger * 35 * rewardMult);
  const lootReward = totalSoulLoot(expedition);
  const retreatPenalty = expedition.retreating ? 0.6 : 1;
  const totalReward = Math.floor((baseReward + lootReward) * retreatPenalty);
  let survivors = 0;
  const beforeLevels = new Map<number, number>();
  const beforeHp = new Map<number, number>();
  const beforeStatus = new Map<number, string>();
  const beforeCor = new Map<number, number>();
  expeditionHeroes(state, expedition).forEach((hero) => {
    beforeLevels.set(hero.id, hero.level);
    beforeHp.set(hero.id, hero.hp);
    beforeStatus.set(hero.id, hero.status);
    beforeCor.set(hero.id, hero.cor);
  });

  expeditionHeroes(state, expedition).forEach((hero) => {
    if (hero.status === 'dead') return;
    survivors++;
    const focus = getFocusModifiers(expedition, expeditionHeroes(state, expedition), destination.depth || destination.danger || 1);
    grantHeroXP(hero, expedition, Math.floor((10 + destination.danger * 3) * (0.8 + focus.combatWeight * 0.2)), 'surviving the expedition');
    hero.expeditionsSurvived = (hero.expeditionsSurvived || 0) + 1;
    if (hero.status === 'deathDoor') {
      hero.deathDoorSurvived = (hero.deathDoorSurvived || 0) + 1;
      addTrait(hero, 'death_refuser', 'Death Refuser', 'Survived Death’s Door. Better death saves, worse recovery dreams.');
    }
    maybeEvolveHero(hero, expedition, destination);
    if (hero.hp < hero.maxHp * 0.35) hero.status = 'injured';
    else if (hero.cor >= 80) hero.status = 'corrupted';
    else hero.status = 'resting';
    hero.morale = Math.max(5, Math.min(100, hero.morale + (survivors ? 4 : -15)));
  });

  settlePartyRelationships(state, expedition);

  state.souls += survivors ? totalReward : Math.floor(totalReward * 0.2);
  state.inventory = state.inventory || [];
  const gearNames: string[] = [];
  (expedition.loot || []).forEach((item) => {
    if (item.equipment && !state.inventory!.find((existing) => existing.id === item.equipment!.id)) {
      state.inventory!.push(item.equipment);
      gearNames.push(item.equipment.name);
    }
  });
  state.completedCount = (state.completedCount || 0) + 1;
  const leveled = expeditionHeroes(state, expedition).reduce((sum, hero) => sum + Math.max(0, hero.level - (beforeLevels.get(hero.id) || hero.level)), 0);
  const injured = expeditionHeroes(state, expedition).filter((hero) => hero.status === 'injured' || hero.status === 'deathDoor' || hero.hp < hero.maxHp).length;
  const corrupted = expeditionHeroes(state, expedition).filter((hero) => hero.status === 'corrupted' || hero.cor >= 80).length;
  const deaths = expeditionHeroes(state, expedition).filter((hero) => hero.status === 'dead').length;
  expedition.resultSummary = {
    destinationName: destination.name,
    retreating: expedition.retreating ?? false,
    roomsCleared: Math.max(0, (expedition.currentRoomIndex || 0)),
    soulsRecovered: Math.max(0, totalReward),
    lootSouls: lootReward,
    gearNames: gearNames.slice(-8),
    survivors,
    deaths,
    injured,
    corrupted,
    leveled,
    routeHistory: [...(expedition.routeHistory || [])],
  };
  if (expedition.retreating) {
    pushExpeditionEvent(expedition, survivors ? `The party returns early with ${totalReward} Remnant Souls.` : 'The retreat collapses in the dark.');
  } else {
    pushExpeditionEvent(expedition, survivors ? `Survivors return with ${totalReward} Remnant Souls.` : 'The expedition is lost.');
  }
}

function addTrait(hero: Hero, id: string, label: string, effect: string): void {
  hero.traits = hero.traits || [];
  if (!hero.traits.find((trait) => trait.id === id)) hero.traits.push({ id, label, effect });
}

function maybeEvolveHero(hero: Hero, expedition: Expedition, destination: Destination): void {
  if (destination.depth && destination.depth >= 5 && Math.random() < 0.12) {
    addTrait(hero, 'tunnel_fighter', 'Tunnel Fighter', 'More reliable in underground battle rooms.');
    pushExpeditionEvent(expedition, `${hero.name} learns to fight in suffocating tunnels.`);
  }
  if (hero.cor >= 60 && Math.random() < 0.14) {
    addTrait(hero, 'doom_touched', 'Doom-Touched', 'Corruption rises slower, morale recovers slower.');
    pushExpeditionEvent(expedition, `${hero.name} returns Doom-Touched.`);
  }
  if (hero.morale <= 20 && Math.random() < 0.16) {
    hero.fears = hero.fears || [];
    if (!hero.fears.includes('Fear of the Deep')) hero.fears.push('Fear of the Deep');
    pushExpeditionEvent(expedition, `${hero.name} develops Fear of the Deep.`);
  }
}

function settlePartyRelationships(state: GameState, expedition: Expedition): void {
  const party = expeditionHeroes(state, expedition);
  for (let i = 0; i < party.length; i++) {
    for (let j = i + 1; j < party.length; j++) {
      const a = party[i];
      const b = party[j];
      const before = a.relationships?.[b.id] ?? b.relationships?.[a.id] ?? 0;
      let delta = 0;

      if (a.status !== 'dead' && b.status !== 'dead') {
        delta += expedition.retreating ? 1 : 2;
        if (a.status === 'injured' || b.status === 'injured' || a.status === 'deathDoor' || b.status === 'deathDoor') delta += 1;
        if (a.cor >= 80 || b.cor >= 80) delta -= 1;
        if (a.cls === b.cls) delta += 1;
        if ((a.quirks || []).some((quirk) => (b.quirks || []).includes(quirk))) delta += 1;
      } else {
        delta -= 3;
      }

      if (a.level === b.level) delta += 1;
      if (a.expeditionsSurvived && b.expeditionsSurvived) delta += 1;
      if (!delta) continue;

      const next = adjustHeroRelationship(state.heroes, a.id, b.id, delta);
      const beforeBand = relationshipBand(before);
      const afterBand = relationshipBand(next);
      if (beforeBand !== afterBand) {
        if (next >= 15) {
          pushExpeditionEvent(expedition, `${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} return ${relationshipLabel(next).toLowerCase()} to one another.`);
        } else if (next <= -12) {
          pushExpeditionEvent(expedition, `${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} return at odds.`);
        }
      }
    }
  }
}
