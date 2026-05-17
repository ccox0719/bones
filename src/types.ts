export enum DmgType {
  Slash = 'slash',
  Blunt = 'blunt',
  Pierce = 'pierce',
  Corruption = 'corruption',
  Fire = 'fire',
  Poison = 'poison',
}

export type ResistanceRating = 'strong' | 'neutral' | 'weak';
export type HeroStatus = 'ready' | 'expedition' | 'resting' | 'injured' | 'corrupted' | 'deathDoor' | 'dead';
export type BuildingStatus = 'active' | 'idle' | 'locked';
export type ExpeditionStatus = 'active' | 'complete' | 'retreating' | 'abandoned';
export type QuirkTone = 'positive' | 'negative' | '';
export type EquipmentSlot = 'weapon' | 'armor' | 'trinket1' | 'trinket2';
export type EquipmentKind = 'weapon' | 'armor' | 'trinket';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'ancient' | 'corrupted' | 'legendary';
export type MapNodeType = 'combat' | 'elite' | 'treasure' | 'camp' | 'event' | 'merchant' | 'shrine' | 'boss' | 'corruption' | 'exit';
export type ExpeditionFocus = 'balanced' | 'combat' | 'loot' | 'mission' | 'survival' | 'scouting';

export interface DmgTypeData {
  icon: string;
  label: string;
  color: string;
}

export interface ClassData {
  role: 'support' | 'melee' | 'tank' | 'ranged';
  preferredSlots: number[];
  atkRange?: 'melee' | 'ranged';
  atk?: DmgType;
  res: Partial<Record<DmgType, ResistanceRating>>;
  posBonus?: string;
  posPenalty?: string;
}

export interface Hero {
  id: number;
  name: string;
  cls: string;
  icon: string;
  level: number;
  hp: number;
  maxHp: number;
  morale: number;
  cor: number;
  status: HeroStatus;
  quirks: string[];
  qt: QuirkTone[];
  flavor: string;
  equipment?: Partial<Record<EquipmentSlot, EquipmentItem>>;
  xp?: number;
  traits?: HeroTrait[];
  fears?: string[];
  affinities?: Record<number, number>;
  relationships?: Record<number, number>;
  masteryPath?: string;
  masteryChosenAt?: number;
  deathDoorSurvived?: number;
  expeditionsSurvived?: number;
}

export interface Building {
  id: string;
  name: string;
  icon: string;
  level: number;
  status: BuildingStatus;
  desc: string;
}

export interface Destination {
  id: string;
  name: string;
  icon: string;
  durationMs: number;
  danger: number;
  threats: DmgType[];
  lore?: string;
  threatNote?: string;
  regionId?: string;
  regionName?: string;
  depth?: number;
  nodeType?: MapNodeType;
  routeTo?: string[];
  unlockDepth?: number;
  lootBias?: string[];
  environment?: string;
}

export interface WorldRegion {
  id: string;
  name: string;
  subtitle: string;
  depthMin: number;
  depthMax: number;
  identity: string;
  effects: string[];
}

export interface SynergyCombo {
  id: string;
  name: string;
  flavor: string;
  effect: string;
  modifiers: {
    surviveMult?: number;
    rewardMult?: number;
    corruptionMult?: number;
  };
  check: (slots: Array<Hero | null>) => boolean;
}

export interface Behavior {
  id: 'balanced' | 'aggressive' | 'survival';
  label: string;
  desc: string;
}

export interface FocusModifiers {
  combatWeight: number;
  lootWeight: number;
  missionWeight: number;
  survivalWeight: number;
  scoutingWeight: number;
}

export interface FocusOrderConfig {
  id: ExpeditionFocus;
  label: string;
  icon: string;
  tooltip: string;
  logText: string;
  modifiers: FocusModifiers;
}

export interface ExpeditionEvent {
  t: string;
  c: '' | 'warning' | 'good' | 'critical';
}

export interface ExpeditionResultSummary {
  destinationName: string;
  retreating: boolean;
  roomsCleared: number;
  soulsRecovered: number;
  lootSouls: number;
  gearNames: string[];
  survivors: number;
  deaths: number;
  injured: number;
  corrupted: number;
  leveled: number;
  routeHistory: string[];
}

export interface OfflineProgressReport {
  elapsedMs: number;
  activeExpeditions: number;
  completedExpeditions: number;
  roomsCleared: number;
  lootFound: number;
  heroesLeveled: number;
  heroesInjured: number;
  deaths: number;
  majorEvents: string[];
}

export interface Expedition {
  id: string;
  destId?: string;
  destinationId?: string;
  destinationName?: string;
  heroIds: Array<number | null>;
  formation?: Array<string | null>;
  synergyIds?: string[];
  partyScore?: number;
  startedAt?: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
  status: ExpeditionStatus;
  log: string[];
  behavior?: string;
  currentFocus?: ExpeditionFocus;
  focusChanges?: number;
  lastFocusChangeAt?: number;
  focusScoutUsed?: boolean;
  roomPath?: ExpeditionRoom[];
  currentRoomIndex?: number;
  roomStartedAt?: number;
  lastSimAt?: number;
  loot?: LootStack[];
  retreating?: boolean;
  torchlight?: number;
  supplies?: number;
  routeHistory?: string[];
  currentEnemies?: Enemy[];
  combatState?: CombatState;
  pendingDecision?: PendingExpeditionDecision;
  pendingDecisionChoice?: number;
  carriedLoot?: LootStack[];
  completedAt?: number;
  resultViewed?: boolean;
  resultSummary?: ExpeditionResultSummary;
}

export type RoomKind = 'entrance' | 'hallway' | 'battle' | 'event' | 'camp' | 'elite' | 'treasure' | 'exit';

export interface ExpeditionRoom {
  id: string;
  kind: RoomKind;
  name: string;
  durationMs: number;
  completed?: boolean;
  entered?: boolean;
  lastPulseAt?: number;
}

export interface LootStack {
  id: string;
  name: string;
  qty: number;
  souls?: number;
  equipment?: EquipmentItem;
}

export interface EquipmentStats {
  hp?: number;
  damage?: number;
  defense?: number;
  speed?: number;
  moraleResist?: number;
  corruptionResist?: number;
  corruptionGain?: number;
  crit?: number;
  scouting?: number;
  torch?: number;
}

export interface EquipmentItem {
  id: string;
  baseId: string;
  name: string;
  kind: EquipmentKind;
  slot: EquipmentKind;
  rarity: EquipmentRarity;
  icon: string;
  stats: EquipmentStats;
  tags: string[];
  tradeoff: string;
  flavor: string;
  cursed?: boolean;
  upgradeLevel?: number;
}

export interface Enemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  damage: number;
  damageType: DmgType;
  role: 'frontline' | 'ranged' | 'support' | 'brute' | 'boss';
  targetPreference: 'front' | 'back' | 'weak' | 'random' | 'stressed';
  moraleDamage: number;
  corruption: number;
  armor?: number;
  elite?: boolean;
  boss?: boolean;
}

export interface EnemyTemplate extends Omit<Enemy, 'id' | 'hp' | 'maxHp'> {
  hp: number;
  regions: string[];
}

export interface CombatState {
  round: number;
  lastActor?: string;
  lastTarget?: string;
  enemiesDefeated: number;
}

export interface Affliction {
  id: string;
  label: string;
  effect: string;
}

export interface HeroTrait {
  id: string;
  label: string;
  effect: string;
}

export interface PendingExpeditionDecision {
  id: string;
  kind: 'cursed_chest' | 'injured_ally' | 'strange_lantern' | 'retreat_offer';
  text: string;
  options: string[];
  createdAt: number;
  expiresAt?: number;
}

export interface GameState {
  souls: number;
  day: number;
  pressure: number;
  lastDayAt?: number;
  scoutedNodeIds?: string[];
  heroes: Hero[];
  buildings: Building[];
  expeditions: Expedition[];
  inventory?: EquipmentItem[];
  completedCount?: number;
  lastSaved?: number;
}
