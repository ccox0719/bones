import type { Destination, GameState } from '../types';
import { WORLD_NODES } from './nodes';
import { WORLD_REGIONS } from './regions';

export function unlockedDepth(state: GameState): number {
  const clears = state.completedCount || 0;
  const archive = state.buildings.find((building) => building.id === 'archive')?.level || 0;
  const tower = state.buildings.find((building) => building.id === 'tower')?.level || 0;
  return Math.min(12, 2 + clears + archive + tower * 2);
}

export function scoutingDepth(state: GameState): number {
  const tower = state.buildings.find((building) => building.id === 'tower')?.level || 0;
  return unlockedDepth(state) + 1 + tower;
}

export function getVisibleMapNodes(state: GameState): Array<Destination & { locked: boolean; fogged: boolean; scouted: boolean; branchCount: number; routeNames: string[] }> {
  const unlocked = unlockedDepth(state);
  const scouted = scoutingDepth(state);
  const known = new Set(state.scoutedNodeIds || []);
  return WORLD_NODES
    .filter((node) => (node.depth || 1) <= scouted || known.has(node.id))
    .map((node) => {
      const nodeKnown = known.has(node.id) || (node.depth || 1) <= unlocked;
      const routeNames = (node.routeTo || [])
        .map((routeId) => WORLD_NODES.find((candidate) => candidate.id === routeId))
        .filter(Boolean)
        .map((route) => known.has(route!.id) || (route!.depth || 1) <= unlocked ? `${route!.name} (${route!.regionName})` : `Unscouted route (Depth ${route!.depth})`);
      return {
        ...node,
        locked: (node.unlockDepth || node.depth || 1) > unlocked,
        fogged: !nodeKnown,
        scouted: nodeKnown,
        branchCount: node.routeTo?.length || 0,
        routeNames,
      };
    })
    .sort((a, b) => {
      const aRegion = WORLD_REGIONS.find((region) => region.id === a.regionId)?.depthMin ?? 99;
      const bRegion = WORLD_REGIONS.find((region) => region.id === b.regionId)?.depthMin ?? 99;
      return aRegion - bRegion || (a.depth || 1) - (b.depth || 1);
    });
}

export function findWorldNode(id: string): Destination | undefined {
  return WORLD_NODES.find((node) => node.id === id);
}

export function revealRoutesFromNode(state: GameState, nodeId: string, maxReveals = 1): Destination[] {
  const node = findWorldNode(nodeId);
  if (!node?.routeTo?.length) return [];
  state.scoutedNodeIds = state.scoutedNodeIds || [];
  const known = new Set(state.scoutedNodeIds);
  const candidates = node.routeTo
    .map((routeId) => findWorldNode(routeId))
    .filter((route): route is Destination => Boolean(route))
    .filter((route) => !known.has(route.id))
    .sort((a, b) => (a.depth || 1) - (b.depth || 1));
  const revealed = candidates.slice(0, maxReveals);
  revealed.forEach((route) => {
    if (!state.scoutedNodeIds!.includes(route.id)) state.scoutedNodeIds!.push(route.id);
  });
  return revealed;
}
