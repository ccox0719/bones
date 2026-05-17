import { DmgType, type Destination } from '../types';

export const NODE_TYPE_LABELS = {
  combat: 'Combat',
  elite: 'Elite',
  treasure: 'Treasure',
  camp: 'Camp',
  event: 'Event',
  merchant: 'Merchant',
  shrine: 'Shrine',
  boss: 'Boss',
  corruption: 'Corruption',
  exit: 'Safe Exit',
};

export const NODE_TYPE_ICONS = {
  combat: '⚔',
  elite: '◆',
  treasure: '⬖',
  camp: '☨',
  event: '?',
  merchant: '$',
  shrine: '✧',
  boss: '☠',
  corruption: '●',
  exit: '↩',
};

export const WORLD_NODES: Destination[] = [
  { id: 'ash_road', icon: NODE_TYPE_ICONS.combat, name: 'Ash Road', regionId: 'outskirts', regionName: 'The Outskirts', depth: 1, nodeType: 'combat', durationMs: 30 * 60000, danger: 1, threats: [DmgType.Slash], lore: 'Ash Road - Outer Approach', threatNote: 'Beast packs and desperate scavengers. Low corruption.', routeTo: ['watcher_camp', 'shrike_fields', 'ruins_entrance'], unlockDepth: 1, environment: 'open road' },
  { id: 'watcher_camp', icon: NODE_TYPE_ICONS.camp, name: 'Watcher Camp', regionId: 'outskirts', regionName: 'The Outskirts', depth: 2, nodeType: 'camp', durationMs: 40 * 60000, danger: 1, threats: [DmgType.Blunt], lore: 'Watcher Camp - Dead Fire Ring', threatNote: 'A safer route with poor rewards and useful recovery.', routeTo: ['forgotten_chapel'], unlockDepth: 1, environment: 'low visibility' },
  { id: 'shrike_fields', icon: NODE_TYPE_ICONS.event, name: 'Shrike Fields', regionId: 'outskirts', regionName: 'The Outskirts', depth: 2, nodeType: 'event', durationMs: 35 * 60000, danger: 2, threats: [DmgType.Pierce, DmgType.Corruption], lore: 'Shrike Fields - Windbreak Line', threatNote: 'Ambush birds, blown cover, and a narrow chance at hidden supplies.', routeTo: ['ruins_entrance', 'bone_galleries'], unlockDepth: 1, environment: 'ambush route' },
  { id: 'ruins_entrance', icon: NODE_TYPE_ICONS.combat, name: 'Ruins Entrance', regionId: 'ruins', regionName: 'The Ruins', depth: 3, nodeType: 'combat', durationMs: 55 * 60000, danger: 2, threats: [DmgType.Pierce, DmgType.Slash], lore: 'Ruins Entrance - Eastern Wing', threatNote: 'Hollow bowmen and blade-wraith patrols.', routeTo: ['forgotten_chapel', 'flooded_passage', 'bone_galleries'], unlockDepth: 2, environment: 'traps' },
  { id: 'forgotten_chapel', icon: NODE_TYPE_ICONS.shrine, name: 'Forgotten Chapel', regionId: 'ruins', regionName: 'The Ruins', depth: 4, nodeType: 'shrine', durationMs: 70 * 60000, danger: 2, threats: [DmgType.Corruption, DmgType.Blunt], lore: 'Forgotten Chapel - Nave of Soot', threatNote: 'Morale attacks, relic chance, rising corruption.', routeTo: ['catacomb_stairs'], unlockDepth: 3, environment: 'morale pressure' },
  { id: 'flooded_passage', icon: NODE_TYPE_ICONS.event, name: 'Flooded Passage', regionId: 'ruins', regionName: 'The Ruins', depth: 4, nodeType: 'event', durationMs: 75 * 60000, danger: 3, threats: [DmgType.Poison, DmgType.Pierce], lore: 'Flooded Passage - Black Water', threatNote: 'Movement penalties and hidden caches.', routeTo: ['ancient_vault', 'reliquary_knot'], unlockDepth: 3, environment: 'flooding' },
  { id: 'bone_galleries', icon: NODE_TYPE_ICONS.elite, name: 'Bone Galleries', regionId: 'ruins', regionName: 'The Ruins', depth: 4, nodeType: 'elite', durationMs: 80 * 60000, danger: 3, threats: [DmgType.Blunt, DmgType.Corruption], lore: 'Bone Galleries - Hanging Reliquaries', threatNote: 'Armored undead. Better armor and relic odds.', routeTo: ['catacomb_stairs', 'ossuary_gate'], unlockDepth: 3, environment: 'armored undead' },
  { id: 'catacomb_stairs', icon: NODE_TYPE_ICONS.corruption, name: 'Catacomb Stairs', regionId: 'catacombs', regionName: 'The Catacombs', depth: 5, nodeType: 'corruption', durationMs: 2 * 3600000, danger: 3, threats: [DmgType.Slash, DmgType.Blunt, DmgType.Corruption], lore: 'Catacomb Stairs - Sector II', threatNote: 'Darkness thickens. Corruption pressure increases.', routeTo: ['ancient_vault', 'ossuary_gate', 'reliquary_knot'], unlockDepth: 4, environment: 'darkness' },
  { id: 'ancient_vault', icon: NODE_TYPE_ICONS.treasure, name: 'Ancient Vault', regionId: 'catacombs', regionName: 'The Catacombs', depth: 6, nodeType: 'treasure', durationMs: 3 * 3600000, danger: 4, threats: [DmgType.Corruption, DmgType.Poison], lore: 'Ancient Vault - Sealed Cache', threatNote: 'Rare loot, cursed chest risk, poor retreat odds.', routeTo: ['drowned_lift'], unlockDepth: 5, environment: 'cursed treasure' },
  { id: 'ossuary_gate', icon: NODE_TYPE_ICONS.elite, name: 'Ossuary Gate', regionId: 'catacombs', regionName: 'The Catacombs', depth: 7, nodeType: 'elite', durationMs: 4 * 3600000, danger: 4, threats: [DmgType.Blunt, DmgType.Corruption], lore: 'Ossuary Gate - Choir of Teeth', threatNote: 'Elite undead, high morale damage.', routeTo: ['drowned_lift'], unlockDepth: 6, environment: 'sanity damage' },
  { id: 'reliquary_knot', icon: NODE_TYPE_ICONS.shrine, name: 'Reliquary Knot', regionId: 'catacombs', regionName: 'The Catacombs', depth: 6, nodeType: 'shrine', durationMs: 2 * 3600000, danger: 4, threats: [DmgType.Corruption, DmgType.Fire], lore: 'Reliquary Knot - Unnamed Bones', threatNote: 'A fractured shrine with strong cleansing rites and dangerous whispers.', routeTo: ['drowned_lift'], unlockDepth: 5, environment: 'holy pressure' },
  { id: 'drowned_lift', icon: NODE_TYPE_ICONS.event, name: 'Drowned Lift', regionId: 'depths', regionName: 'The Sunken Depths', depth: 8, nodeType: 'event', durationMs: 6 * 3600000, danger: 5, threats: [DmgType.Poison, DmgType.Pierce, DmgType.Corruption], lore: 'Drowned Lift - Below the City', threatNote: 'Flooding, movement penalties, rare alchemy material.', routeTo: ['pale_mire', 'black_well'], unlockDepth: 7, environment: 'deep tide' },
  { id: 'pale_mire', icon: NODE_TYPE_ICONS.combat, name: 'The Pale Mire', regionId: 'depths', regionName: 'The Sunken Depths', depth: 9, nodeType: 'combat', durationMs: 8 * 3600000, danger: 4, threats: [DmgType.Poison, DmgType.Corruption], lore: 'The Pale Mire - Fog Sector', threatNote: 'Mireborn rot and corruption seep from the swamp.', routeTo: ['black_well'], unlockDepth: 7, environment: 'flooded mire' },
  { id: 'black_well', icon: NODE_TYPE_ICONS.boss, name: 'The Black Well', regionId: 'black_below', regionName: 'The Black Below', depth: 12, nodeType: 'boss', durationMs: 12 * 3600000, danger: 6, threats: [DmgType.Corruption, DmgType.Fire, DmgType.Blunt], lore: 'The Black Well - No Return Charted', threatNote: 'Boss route. Legendary rewards. Permanent corruption risk.', routeTo: [], unlockDepth: 10, environment: 'near-suicidal' },
];
