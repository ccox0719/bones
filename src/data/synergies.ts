import type { SynergyCombo } from '../types';
import { CLASS_DATA } from './classes';

export const SYNERGY_COMBOS: SynergyCombo[] = [
  {
    id: 'iron_vigil',
    name: 'Iron Vigil',
    flavor: 'The Knight shields the Nun, who keeps his flame alive.',
    effect: 'Knight -25% dmg - Nun heals +30%',
    modifiers: { surviveMult: 1.18, rewardMult: 1.1 },
    check(slots) {
      const ki = slots.findIndex((h) => h && h.cls === 'Grave Knight');
      const ni = slots.findIndex((h) => h && h.cls === 'Lantern Nun');
      return ki >= 0 && ni >= 0 && ki < ni;
    },
  },
  {
    id: 'clear_shot',
    name: 'Clear Shot',
    flavor: 'A wall of steel opens a lane for the hunters behind.',
    effect: 'Ranged dmg +35% when tank holds the front',
    modifiers: { rewardMult: 1.2, surviveMult: 1.05 },
    check(slots) {
      return Boolean(
        slots[0] &&
          CLASS_DATA[slots[0].cls]?.role === 'tank' &&
          slots.slice(1).some((h) => h && CLASS_DATA[h.cls]?.atkRange === 'ranged'),
      );
    },
  },
  {
    id: 'blood_tithe',
    name: 'Blood Tithe',
    flavor: 'The priest draws power from the wounds of the faithful.',
    effect: 'Heals scale with front injury - Morale +10',
    modifiers: { surviveMult: 1.22, corruptionMult: 0.85 },
    check(slots) {
      const pi = slots.findIndex((h) => h && h.cls === 'Blood Priest');
      return pi >= 2 && slots.slice(0, 2).some((h) => h && CLASS_DATA[h.cls]?.atkRange === 'melee');
    },
  },
  {
    id: 'venom_wall',
    name: 'Venom Wall',
    flavor: 'Poison soaks from behind while the line holds firm.',
    effect: 'Poison dmg +40% - Enemies weakened before melee',
    modifiers: { rewardMult: 1.25, surviveMult: 1.08 },
    check(slots) {
      return slots.some((h) => h && h.cls === 'Ash Alchemist') && slots.some((h) => h && h.cls === 'Mire Hunter');
    },
  },
  {
    id: 'death_march',
    name: 'Death March',
    flavor: 'All four positions filled - relentless, merciless pressure.',
    effect: 'Attack speed +20% - Supply use +25%',
    modifiers: { rewardMult: 1.3, surviveMult: 0.95 },
    check(slots) {
      return slots.filter(Boolean).length === 4;
    },
  },
  {
    id: 'ember_faith',
    name: 'Ember Faith',
    flavor: 'Lantern and flame - two sources of holy light against the dark.',
    effect: 'Corruption resistance +30% for whole party',
    modifiers: { corruptionMult: 0.7, surviveMult: 1.05 },
    check(slots) {
      return slots.some((h) => h && h.cls === 'Lantern Nun') && slots.some((h) => h && h.cls === 'Ash Alchemist');
    },
  },
];
