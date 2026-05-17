import type { GameState } from '../types';
import { DEST_DEFS } from '../data/destinations';
import { simulateExpeditionTick } from './expedition';

export function simulateWorldTick(state: GameState, now = Date.now()): boolean {
  let changed = false;
  state.expeditions.forEach((expedition) => {
    if (expedition.status !== 'active') return;
    const destination = DEST_DEFS.find((dest) => dest.id === (expedition.destId || expedition.destinationId));
    if (!destination) return;
    const last = expedition.lastSimAt || expedition.startTime || expedition.startedAt || now;
    const delta = Math.max(0, now - last);
    if (delta > 0) changed = simulateExpeditionTick(state, expedition, destination, delta, now) || changed;
  });
  return changed;
}
