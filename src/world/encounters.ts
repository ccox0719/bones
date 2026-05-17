import type { MapNodeType } from '../types';

export const NODE_RISK_TEXT: Record<MapNodeType, string> = {
  combat: 'Direct fighting expected.',
  elite: 'A stronger enemy commands this route.',
  treasure: 'Loot-rich, rarely safe.',
  camp: 'Recovery possible, but never guaranteed.',
  event: 'Unstable conditions and strange choices.',
  merchant: 'Trade route, if anyone still lives there.',
  shrine: 'Morale and corruption outcomes possible.',
  boss: 'Permanent consequences likely.',
  corruption: 'Corruption pressure climbs quickly.',
  exit: 'Safer extraction route.',
};
