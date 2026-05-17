import type { Hero } from '../types';

export interface MasteryPathConfig {
  id: string;
  cls: string;
  label: string;
  icon: string;
  summary: string;
  details: string;
  damageMult?: number;
  defenseMult?: number;
  moraleResist?: number;
  deathDoorBonus?: number;
  xpMult?: number;
  scoutingMult?: number;
  lootMult?: number;
  torchMult?: number;
  corruptionResist?: number;
}

const MASTERIES: Record<string, MasteryPathConfig[]> = {
  'Lantern Nun': [
    { id: 'beacon', cls: 'Lantern Nun', label: 'Beacon', icon: '✦', summary: 'Holds the line with living light.', details: 'Stronger morale, torch, and Death Door support.', defenseMult: 1.1, moraleResist: 4, deathDoorBonus: 0.05, torchMult: 1.12, xpMult: 1.04 },
    { id: 'penitent', cls: 'Lantern Nun', label: 'Penitent', icon: '⟐', summary: 'Turns suffering into endurance.', details: 'Hardier when wounded, slower to break.', defenseMult: 1.07, deathDoorBonus: 0.08, corruptionResist: 2, xpMult: 1.03 },
    { id: 'vigil', cls: 'Lantern Nun', label: 'Vigil', icon: '◈', summary: 'Sees danger before it forms.', details: 'Better scouting and safer retreats.', scoutingMult: 1.18, moraleResist: 2, torchMult: 1.06, xpMult: 1.03 },
  ],
  'Rat Duelist': [
    { id: 'skirmisher', cls: 'Rat Duelist', label: 'Skirmisher', icon: '✧', summary: 'Hits first, moves fast, leaves little behind.', details: 'Higher damage and loot pressure.', damageMult: 1.1, scoutingMult: 1.04, lootMult: 1.05, xpMult: 1.05 },
    { id: 'duelist', cls: 'Rat Duelist', label: 'Duelist', icon: '⚔', summary: 'Punishes weak targets.', details: 'Better against wounded enemies and elites.', damageMult: 1.06, deathDoorBonus: 0.03, xpMult: 1.06 },
    { id: 'opportunist', cls: 'Rat Duelist', label: 'Opportunist', icon: '◆', summary: 'Finds value in the chaos.', details: 'Better loot and scouting from the back line.', lootMult: 1.12, scoutingMult: 1.12, moraleResist: 1, xpMult: 1.04 },
  ],
  'Grave Knight': [
    { id: 'bulwark', cls: 'Grave Knight', label: 'Bulwark', icon: '🛡', summary: 'Anchors the party under pressure.', details: 'Better defense and Death Door survival.', defenseMult: 1.16, deathDoorBonus: 0.08, moraleResist: 4, xpMult: 1.03 },
    { id: 'executioner', cls: 'Grave Knight', label: 'Executioner', icon: '☠', summary: 'Ends hard fights quickly.', details: 'Hits harder against wounded and elite foes.', damageMult: 1.12, xpMult: 1.08 },
    { id: 'lantern_guard', cls: 'Grave Knight', label: 'Lantern Guard', icon: '✺', summary: 'Protects the flame and the route home.', details: 'Lower torch drain, safer scouting, steadier morale.', torchMult: 1.14, scoutingMult: 1.08, moraleResist: 3, xpMult: 1.04 },
  ],
  'Ash Alchemist': [
    { id: 'pyromancer', cls: 'Ash Alchemist', label: 'Pyromancer', icon: '🔥', summary: 'Burns through the dark faster than it burns back.', details: 'More damage, more risk, more reward.', damageMult: 1.12, lootMult: 1.04, corruptionResist: -1, xpMult: 1.06 },
    { id: 'distiller', cls: 'Ash Alchemist', label: 'Distiller', icon: '⚗', summary: 'Converts ruins into utility.', details: 'Better loot and torches, steadier expeditions.', lootMult: 1.14, torchMult: 1.08, scoutingMult: 1.04, xpMult: 1.04 },
    { id: 'hex_brewer', cls: 'Ash Alchemist', label: 'Hex Brewer', icon: '☾', summary: 'Tastes corruption and survives it.', details: 'Better corruption control and death door odds.', corruptionResist: 4, deathDoorBonus: 0.04, xpMult: 1.03 },
  ],
  'Mire Hunter': [
    { id: 'pathfinder', cls: 'Mire Hunter', label: 'Pathfinder', icon: '⌖', summary: 'Reads routes before they close.', details: 'Better scouting, reveals, and retreat safety.', scoutingMult: 1.22, torchMult: 1.05, xpMult: 1.05 },
    { id: 'stalker', cls: 'Mire Hunter', label: 'Stalker', icon: '➶', summary: 'Hunts from the shadows.', details: 'Better damage and loot when striking from safety.', damageMult: 1.08, lootMult: 1.08, xpMult: 1.05 },
    { id: 'warden', cls: 'Mire Hunter', label: 'Warden', icon: '⛯', summary: 'Watches the route and holds the line.', details: 'Safer retreats and stronger morale resistance.', defenseMult: 1.08, moraleResist: 3, deathDoorBonus: 0.04, xpMult: 1.03 },
  ],
  'Blood Priest': [
    { id: 'martyr', cls: 'Blood Priest', label: 'Martyr', icon: '✝', summary: 'Turns pain into protection.', details: 'Better defense when the party is hurt.', defenseMult: 1.12, deathDoorBonus: 0.07, moraleResist: 3, xpMult: 1.05 },
    { id: 'confessor', cls: 'Blood Priest', label: 'Confessor', icon: '◌', summary: 'Keeps the party from breaking under guilt.', details: 'Better morale recovery and corruption control.', moraleResist: 5, corruptionResist: 3, xpMult: 1.04 },
    { id: 'bloodletter', cls: 'Blood Priest', label: 'Bloodletter', icon: '🩸', summary: 'Spills more to gain more.', details: 'Harder hits, better XP, more corruption risk.', damageMult: 1.1, xpMult: 1.08, corruptionResist: -1 },
  ],
  'Bone Forager': [
    { id: 'ossuary', cls: 'Bone Forager', label: 'Ossuary', icon: '☠', summary: 'Carries the dead as armor.', details: 'Stability and armor rise together.', defenseMult: 1.14, moraleResist: 2, xpMult: 1.04 },
    { id: 'grave_tender', cls: 'Bone Forager', label: 'Grave Tender', icon: '⚘', summary: 'Maintains order inside ruin and rot.', details: 'Better healing, scouting, and recovery.', scoutingMult: 1.08, torchMult: 1.06, xpMult: 1.04 },
    { id: 'carrion', cls: 'Bone Forager', label: 'Carrion', icon: '❂', summary: 'Finds value in things left behind.', details: 'More loot and stronger pressure in deep routes.', lootMult: 1.12, damageMult: 1.04, xpMult: 1.05 },
  ],
  'Hollow Archer': [
    { id: 'longshot', cls: 'Hollow Archer', label: 'Longshot', icon: '➹', summary: 'Kills from the edge of the map.', details: 'More damage from the back line.', damageMult: 1.12, scoutingMult: 1.05, xpMult: 1.06 },
    { id: 'shade', cls: 'Hollow Archer', label: 'Shade', icon: '◬', summary: 'Moves through the dark without being seen.', details: 'Safer scouting and better retreats.', scoutingMult: 1.15, deathDoorBonus: 0.04, moraleResist: 2, xpMult: 1.04 },
    { id: 'sentinel', cls: 'Hollow Archer', label: 'Sentinel', icon: '⌁', summary: 'Keeps the route clear for the rest.', details: 'Higher torch safety and enemy pressure control.', torchMult: 1.1, defenseMult: 1.05, xpMult: 1.04 },
  ],
};

export function getMasteryOptions(cls: string): MasteryPathConfig[] {
  return MASTERIES[cls] || [];
}

export function getMasteryPath(hero: Hero): MasteryPathConfig | null {
  return getMasteryOptions(hero.cls).find((path) => path.id === hero.masteryPath) || null;
}

export function masteryLabel(hero: Hero): string {
  const path = getMasteryPath(hero);
  return path ? `${path.label}` : 'Unfocused';
}

export function masteryAvailable(hero: Hero): boolean {
  return hero.level >= 6 && !hero.masteryPath;
}

export function masterySummary(hero: Hero): string {
  const path = getMasteryPath(hero);
  if (!path) return hero.level >= 6 ? 'Ready to specialize' : 'Specializes at Rank 6';
  return path.summary;
}

export function masteryCombatModifiers(hero: Hero, allies: Hero[], enemy: { hp: number; maxHp: number; elite?: boolean; boss?: boolean }, slot: number): {
  damageMult: number;
  defenseMult: number;
  moraleResist: number;
  deathDoorBonus: number;
} {
  const path = getMasteryPath(hero);
  let damageMult = 1;
  let defenseMult = 1;
  let moraleResist = 0;
  let deathDoorBonus = 0;
  if (!path) return { damageMult, defenseMult, moraleResist, deathDoorBonus };

  damageMult *= path.damageMult || 1;
  defenseMult *= path.defenseMult || 1;
  moraleResist += path.moraleResist || 0;
  deathDoorBonus += path.deathDoorBonus || 0;

  if (path.id === 'executioner' && (enemy.hp / enemy.maxHp) <= 0.5) damageMult *= 1.14;
  if (path.id === 'bulwark' && slot === 1) defenseMult *= 1.1;
  if (path.id === 'lantern_guard' && slot <= 2) {
    moraleResist += 1;
    deathDoorBonus += 0.02;
  }
  if (path.id === 'stalker' && slot >= 3) damageMult *= 1.08;
  if (path.id === 'longshot' && slot === 4) damageMult *= 1.12;
  if (path.id === 'martyr' && allies.some((ally) => ally.status === 'injured' || ally.status === 'deathDoor')) defenseMult *= 1.06;
  if (path.id === 'bloodletter' && enemy.boss) damageMult *= 1.08;

  return { damageMult, defenseMult, moraleResist, deathDoorBonus };
}

export function masteryExpeditionModifiers(hero: Hero): {
  scoutingMult: number;
  lootMult: number;
  torchMult: number;
  xpMult: number;
  corruptionResist: number;
  moraleResist: number;
} {
  const path = getMasteryPath(hero);
  if (!path) {
    return { scoutingMult: 1, lootMult: 1, torchMult: 1, xpMult: 1, corruptionResist: 0, moraleResist: 0 };
  }
  return {
    scoutingMult: path.scoutingMult || 1,
    lootMult: path.lootMult || 1,
    torchMult: path.torchMult || 1,
    xpMult: path.xpMult || 1,
    corruptionResist: path.corruptionResist || 0,
    moraleResist: path.moraleResist || 0,
  };
}

export function masteryPartyModifier(heroes: Hero[]): {
  scoutingMult: number;
  lootMult: number;
  torchMult: number;
  xpMult: number;
  corruptionResist: number;
  moraleResist: number;
} {
  return heroes.reduce(
    (acc, hero) => {
      const mod = masteryExpeditionModifiers(hero);
      acc.scoutingMult *= mod.scoutingMult;
      acc.lootMult *= mod.lootMult;
      acc.torchMult *= mod.torchMult;
      acc.xpMult *= mod.xpMult;
      acc.corruptionResist += mod.corruptionResist;
      acc.moraleResist += mod.moraleResist;
      return acc;
    },
    { scoutingMult: 1, lootMult: 1, torchMult: 1, xpMult: 1, corruptionResist: 0, moraleResist: 0 },
  );
}
