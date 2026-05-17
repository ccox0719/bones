import type { Behavior, Building, ExpeditionEvent, Hero } from '../types';

export const BEHAVIORS: Behavior[] = [
  { id: 'balanced', label: 'Balanced', desc: 'Press forward cautiously' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Seek combat and treasure' },
  { id: 'survival', label: 'Survive', desc: 'Avoid danger, conserve' },
];

export const EVENT_POOL: ExpeditionEvent[] = [
  { t: 'The party descends past the iron gate. The torchlight wavers.', c: '' },
  { t: 'Something moves in the dark ahead. The rear guard raises weapons.', c: '' },
  { t: 'Combat! Three Rotbound ambush from the eastern passage.', c: 'warning' },
  { t: 'Two Rotbound fall. The third flees into the dark.', c: 'good' },
  { t: '{h} is WOUNDED - deep gash across the shoulder. Morale falls.', c: 'critical' },
  { t: 'A relic chest discovered in the antechamber. The lock is peculiar.', c: '' },
  { t: 'Rations growing low. The party pauses to redistribute supplies.', c: 'warning' },
  { t: 'Corruption rising in sector two. The walls weep black fluid.', c: 'critical' },
  { t: '{h} spots a hidden route. The party angles toward it.', c: 'good' },
  { t: 'Something vast stirs beneath them. Deep. Breathing. Watching.', c: 'critical' },
  { t: 'The lantern flame surges. The darkness retreats slightly.', c: 'good' },
  { t: 'An old inscription: "Those who bear the light shall be consumed last."', c: '' },
  { t: 'Echo of footsteps - not their own. The rear guard tightens.', c: 'warning' },
  { t: 'Supply cache found. Spirits lifted.', c: 'good' },
  { t: 'AMBUSH - The Thornborn Hollow erupts with creatures.', c: 'critical' },
  { t: 'A prayer etched in bone: "Let the flame remember us."', c: '' },
  { t: '{h} mutters darkly. Morale is cracking.', c: 'warning' },
  { t: 'Corruption seeping through the eastern wall. The air tastes wrong.', c: 'critical' },
  { t: 'Torch oil running low. The radius of safety shrinks.', c: 'warning' },
  { t: 'They find a body. One of ours, from a previous expedition.', c: '' },
];

export const DEFAULT_HEROES: Hero[] = [
  { id: 1, name: 'Maren Ashveil', cls: 'Lantern Nun', icon: '🕯', level: 4, hp: 78, maxHp: 90, morale: 85, cor: 12, status: 'ready', quirks: ['Faithful', 'Night Terror'], qt: ['positive', 'negative'], flavor: 'She has seen seventeen comrades fall. Her lantern has never gone dark.' },
  { id: 2, name: 'Dusk Edric', cls: 'Rat Duelist', icon: '🗡', level: 3, hp: 55, maxHp: 65, morale: 60, cor: 28, status: 'resting', quirks: ['Gambler', 'Scarred', 'Coward'], qt: ['negative', 'negative', 'negative'], flavor: 'He ran once. He still carries the shame like a second blade.' },
  { id: 3, name: 'Petra Graveborn', cls: 'Grave Knight', icon: '⚔', level: 5, hp: 110, maxHp: 115, morale: 70, cor: 5, status: 'ready', quirks: ['Resolute', 'Veteran'], qt: ['positive', 'positive'], flavor: 'The oldest living hero. She has stopped counting the dead.' },
  { id: 4, name: 'Vael the Thin', cls: 'Ash Alchemist', icon: '⚗', level: 2, hp: 30, maxHp: 52, morale: 40, cor: 55, status: 'corrupted', quirks: ['Curious', 'Corrupted', 'Unstable'], qt: ['positive', 'negative', 'negative'], flavor: 'The corruption has given him... gifts. At terrible cost.' },
  { id: 5, name: 'Rook Coldwater', cls: 'Mire Hunter', icon: '🏹', level: 3, hp: 72, maxHp: 80, morale: 75, cor: 8, status: 'ready', quirks: ['Patient', 'Precise'], qt: ['positive', 'positive'], flavor: 'He speaks less than the dead. Shoots straighter than fate.' },
  { id: 6, name: 'Sable Mirewitch', cls: 'Blood Priest', icon: '🩸', level: 2, hp: 45, maxHp: 60, morale: 55, cor: 30, status: 'injured', quirks: ['Obsessed', 'Healer'], qt: ['negative', 'positive'], flavor: 'She pays for power in her own blood. Always has enough.' },
];

export const DEFAULT_BUILDINGS: Building[] = [
  { id: 'infirmary', icon: '🩹', name: 'Infirmary', level: 2, status: 'active', desc: 'Wounded heroes recover. Two beds occupied.' },
  { id: 'tavern', icon: '🍺', name: 'The Ashen Tap', level: 1, status: 'idle', desc: 'Broken souls find warmth. Recruits gather here.' },
  { id: 'forge', icon: '🔥', name: 'Ember Forge', level: 2, status: 'active', desc: 'Weapons shaped from salvaged ruin. Crafting available.' },
  { id: 'archive', icon: '📜', name: 'Lore Archive', level: 1, status: 'idle', desc: 'Ancient knowledge. Unlocks scouting reports.' },
  { id: 'shrine', icon: '🕯', name: 'Vigil Shrine', level: 3, status: 'active', desc: 'The lantern is tended here. Pressure reduced each dawn.' },
  { id: 'graveyard', icon: '⚰', name: "Hero's Rest", level: 1, status: 'idle', desc: 'The fallen are remembered. Morale preserved.' },
  { id: 'tower', icon: '🗼', name: 'Scouting Tower', level: 0, status: 'locked', desc: 'Reveals expedition dangers in advance.' },
  { id: 'vault', icon: '🛡', name: 'Relic Vault', level: 0, status: 'locked', desc: 'Houses cursed artifacts. Requires Archive lv 2.' },
];

export const HERO_ICONS_BY_CLASS: Record<string, string> = Object.fromEntries(DEFAULT_HEROES.map((hero) => [hero.cls, hero.icon]));
export const BUILDING_ICONS_BY_ID: Record<string, string> = Object.fromEntries(DEFAULT_BUILDINGS.map((building) => [building.id, building.icon]));
