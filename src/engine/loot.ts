import type { Destination, Expedition, LootStack } from '../types';
import { rollEquipmentLoot } from '../data/equipment';
import { pushExpeditionEvent } from './events';

export function grantRoomLoot(expedition: Expedition, destination: Destination, multiplier = 1): number {
  const souls = Math.max(5, Math.floor((destination.danger * 8 + Math.random() * destination.danger * 12) * multiplier));
  const stack: LootStack = { id: `souls_${Date.now()}`, name: 'Remnant Souls', qty: souls, souls };
  expedition.loot = expedition.loot || [];
  expedition.loot.push(stack);
  pushExpeditionEvent(expedition, `Recovered ${souls} Remnant Souls.`);
  return souls;
}

export function totalSoulLoot(expedition: Expedition): number {
  return (expedition.loot || []).reduce((sum, item) => sum + (item.souls || 0), 0);
}

export function grantEquipmentLoot(expedition: Expedition, destination: Destination): void {
  const equipment = rollEquipmentLoot(destination);
  const stack: LootStack = { id: equipment.id, name: equipment.name, qty: 1, equipment };
  expedition.loot = expedition.loot || [];
  expedition.loot.push(stack);
  pushExpeditionEvent(expedition, `Recovered ${equipment.rarity} ${equipment.name}.`);
}
