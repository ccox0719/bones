import type { Destination, EquipmentItem, EquipmentRarity } from '../types';

type EquipmentTemplate = Omit<EquipmentItem, 'id'>;

export const RARITY_COLORS: Record<EquipmentRarity, string> = {
  common: '#a09070',
  uncommon: '#7aaa5a',
  rare: '#6aa0b8',
  ancient: '#d4a83a',
  corrupted: '#9a5ac0',
  legendary: '#e8804a',
};

export const EQUIPMENT_POOL: EquipmentTemplate[] = [
  {
    baseId: 'rusted_halberd',
    name: 'Rusted Halberd',
    kind: 'weapon',
    slot: 'weapon',
    rarity: 'common',
    icon: '⚔',
    stats: { damage: 3, speed: -1 },
    tags: ['frontline', 'reach'],
    tradeoff: '+frontline damage, -speed',
    flavor: 'Too long for narrow halls, perfect for holding a door.',
  },
  {
    baseId: 'lantern_charm',
    name: 'Lantern Charm',
    kind: 'trinket',
    slot: 'trinket',
    rarity: 'uncommon',
    icon: '🕯',
    stats: { torch: 2, scouting: 1, moraleResist: 1 },
    tags: ['scouting', 'torch'],
    tradeoff: '+torch preservation, +scouting',
    flavor: 'Warm even when no flame touches it.',
  },
  {
    baseId: 'blessed_cloth',
    name: 'Blessed Cloth',
    kind: 'armor',
    slot: 'armor',
    rarity: 'uncommon',
    icon: '▧',
    stats: { moraleResist: 3, defense: -1 },
    tags: ['faith', 'stress'],
    tradeoff: '+stress resistance, -physical defense',
    flavor: 'Prayer-stiff linen wrapped around old wounds.',
  },
  {
    baseId: 'blood_vial',
    name: 'Blood Vial',
    kind: 'trinket',
    slot: 'trinket',
    rarity: 'corrupted',
    icon: '🩸',
    stats: { crit: 3, damage: 1, corruptionGain: 2 },
    tags: ['cursed', 'blood'],
    tradeoff: '+crit chance, +corruption gain',
    flavor: 'It beats once when the wearer is afraid.',
    cursed: true,
  },
  {
    baseId: 'graveplate',
    name: 'Graveplate Harness',
    kind: 'armor',
    slot: 'armor',
    rarity: 'rare',
    icon: '▣',
    stats: { hp: 10, defense: 3, speed: -2 },
    tags: ['tank', 'heavy'],
    tradeoff: '+durability, -speed',
    flavor: 'Forged from memorial iron. Heavy with names.',
  },
  {
    baseId: 'whispering_arrow',
    name: 'Whispering Arrowhead',
    kind: 'weapon',
    slot: 'weapon',
    rarity: 'ancient',
    icon: '🏹',
    stats: { damage: 2, scouting: 2, moraleResist: -1 },
    tags: ['ranged', 'omens'],
    tradeoff: '+ranged pressure, +scouting, -morale stability',
    flavor: 'It tells the archer where the body will fall.',
  },
  {
    baseId: 'saint_ash',
    name: 'Saint Ash Reliquary',
    kind: 'trinket',
    slot: 'trinket',
    rarity: 'legendary',
    icon: '✦',
    stats: { corruptionResist: 4, moraleResist: 2, torch: 2, damage: -1 },
    tags: ['holy', 'lantern'],
    tradeoff: '+corruption resistance, +morale, -damage',
    flavor: 'The ash inside refuses to cool.',
  },
];

export function createEquipmentInstance(template: EquipmentTemplate): EquipmentItem {
  return {
    ...template,
    id: `${template.baseId}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    stats: { ...template.stats },
    tags: [...template.tags],
    upgradeLevel: 0,
  };
}

export function rollEquipmentLoot(destination: Destination): EquipmentItem {
  const danger = destination.danger;
  const roll = Math.random() + danger * 0.08;
  const allowed = EQUIPMENT_POOL.filter((item) => {
    if (roll > 1.05) return true;
    if (roll > 0.8) return item.rarity !== 'legendary';
    if (roll > 0.55) return !['legendary', 'ancient'].includes(item.rarity);
    return ['common', 'uncommon'].includes(item.rarity);
  });
  return createEquipmentInstance(allowed[Math.floor(Math.random() * allowed.length)] || EQUIPMENT_POOL[0]);
}

export function createStarterEquipment(): EquipmentItem[] {
  return ['rusted_halberd', 'lantern_charm', 'blessed_cloth']
    .map((id) => EQUIPMENT_POOL.find((item) => item.baseId === id)!)
    .filter(Boolean)
    .map(createEquipmentInstance);
}
