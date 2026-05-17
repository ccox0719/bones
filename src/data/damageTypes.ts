import { DmgType, type DmgTypeData } from '../types';

export const DMG_TYPES: Record<DmgType, DmgTypeData> = {
  [DmgType.Slash]: { label: 'Slash', icon: '⚔', color: '#c89050' },
  [DmgType.Blunt]: { label: 'Blunt', icon: '🔨', color: '#a07840' },
  [DmgType.Pierce]: { label: 'Pierce', icon: '🏹', color: '#80a860' },
  [DmgType.Corruption]: { label: 'Corruption', icon: '☠', color: '#7a3a9a' },
  [DmgType.Fire]: { label: 'Fire', icon: '🔥', color: '#c84020' },
  [DmgType.Poison]: { label: 'Poison', icon: '🧪', color: '#507840' },
};
