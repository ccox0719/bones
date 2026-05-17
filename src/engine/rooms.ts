import type { Destination, ExpeditionRoom } from '../types';
import { regionProfile } from '../world/regionPressure';

export function createRoomPath(destination: Destination): ExpeditionRoom[] {
  const total = Math.max(8 * 60_000, destination.durationMs);
  const profile = regionProfile(destination);
  const core = roomKindsForNode(destination);
  const weights = core.map((kind) => {
    if (kind === 'entrance' || kind === 'exit') return 0.08;
    const regionBias = roomRegionBias(kind, profile);
    if (kind === 'elite' || kind === 'treasure') return 0.16 * regionBias;
    if (kind === 'battle') return 0.18 * regionBias;
    return 0.12 * regionBias;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return core.map((kind, index) => ({
    id: `${destination.id}_${kind}_${index}`,
    kind,
    name: roomName(kind, destination),
    durationMs: Math.max(20_000, Math.floor(total * (weights[index] / totalWeight))),
    completed: false,
  }));
}

export function currentRoomLabel(path: ExpeditionRoom[] | undefined, index = 0): string {
  return path?.[index]?.name || 'Uncharted dark';
}

function roomKindsForNode(destination: Destination): ExpeditionRoom['kind'][] {
  const type = destination.nodeType || 'combat';
  const middle: ExpeditionRoom['kind'][] = [];
  if (type === 'treasure') middle.push('hallway', 'event', 'battle', 'treasure');
  else if (type === 'camp') middle.push('hallway', 'camp', 'event', 'battle');
  else if (type === 'elite') middle.push('hallway', 'battle', 'elite', 'treasure');
  else if (type === 'boss') middle.push('hallway', 'elite', 'event', 'elite');
  else if (type === 'corruption') middle.push('hallway', 'event', 'battle', 'event');
  else if (type === 'event' || type === 'shrine') middle.push('hallway', 'event', 'camp', 'battle');
  else middle.push('hallway', 'battle', 'event', destination.danger >= 3 ? 'elite' : 'treasure');

  if ((destination.depth || 1) >= 6) middle.splice(2, 0, 'battle');
  const profile = regionProfile(destination);
  if (profile.roomWeights.corruption > 1.1 && !middle.includes('event')) middle.splice(2, 0, 'event');
  if (profile.roomWeights.shrine > 1.05 && !middle.includes('camp')) middle.splice(2, 0, 'camp');
  return ['entrance', ...middle, 'exit'];
}

function roomName(kind: ExpeditionRoom['kind'], destination: Destination): string {
  const env = destination.environment || destination.regionName || 'dark';
  const names = {
    entrance: 'Broken Threshold',
    hallway: `${env} passage`,
    battle: 'Contested Hall',
    event: 'Omen Room',
    camp: 'Ash Camp',
    elite: destination.nodeType === 'boss' ? 'Antechamber Horror' : 'Elite Encounter',
    treasure: 'Sealed Cache',
    exit: 'Return Passage',
  };
  return names[kind];
}

function roomRegionBias(kind: ExpeditionRoom['kind'], profile: ReturnType<typeof regionProfile>): number {
  if (kind === 'hallway') return 1;
  if (kind === 'battle') return profile.roomWeights.battle;
  if (kind === 'elite') return profile.roomWeights.elite;
  if (kind === 'treasure') return profile.roomWeights.treasure;
  if (kind === 'camp') return profile.roomWeights.camp;
  if (kind === 'event') return profile.roomWeights.event;
  if (kind === 'exit') return 1;
  return 1;
}
