import { DmgType, type Destination, type Enemy, type EnemyTemplate } from '../types';
import { regionProfile } from '../world/regionPressure';

const ENEMY_POOL: EnemyTemplate[] = [
  { name: 'Ash Gnawer', icon: '·', hp: 18, damage: 4, damageType: DmgType.Slash, role: 'frontline', targetPreference: 'front', moraleDamage: 1, corruption: 0, regions: ['outskirts'] },
  { name: 'Road Starved', icon: '!', hp: 22, damage: 5, damageType: DmgType.Blunt, role: 'brute', targetPreference: 'weak', moraleDamage: 2, corruption: 0, regions: ['outskirts', 'ruins'] },
  { name: 'Hollow Bowman', icon: '↑', hp: 20, damage: 5, damageType: DmgType.Pierce, role: 'ranged', targetPreference: 'back', moraleDamage: 2, corruption: 0, regions: ['ruins'] },
  { name: 'Blade Wraith', icon: '†', hp: 26, damage: 7, damageType: DmgType.Slash, role: 'frontline', targetPreference: 'weak', moraleDamage: 3, corruption: 1, regions: ['ruins', 'catacombs'] },
  { name: 'Bone Spearman', icon: '╂', hp: 34, damage: 7, damageType: DmgType.Pierce, role: 'frontline', targetPreference: 'front', moraleDamage: 2, corruption: 1, armor: 1, regions: ['ruins', 'catacombs'] },
  { name: 'Choir Skull', icon: '○', hp: 24, damage: 4, damageType: DmgType.Corruption, role: 'support', targetPreference: 'stressed', moraleDamage: 6, corruption: 3, regions: ['catacombs', 'black_below'] },
  { name: 'Drowned Penitent', icon: '≈', hp: 38, damage: 8, damageType: DmgType.Poison, role: 'brute', targetPreference: 'front', moraleDamage: 3, corruption: 2, armor: 1, regions: ['depths'] },
  { name: 'Well Saint', icon: '☠', hp: 90, damage: 13, damageType: DmgType.Corruption, role: 'boss', targetPreference: 'stressed', moraleDamage: 8, corruption: 6, armor: 3, boss: true, regions: ['black_below'] },
];

export function createEnemySquad(destination: Destination, elite = false): Enemy[] {
  const profile = regionProfile(destination);
  const region = destination.regionId || 'ruins';
  const depth = destination.depth || destination.danger || 1;
  const candidates = ENEMY_POOL.filter((enemy) => enemy.regions.includes(region) || enemy.regions.some((entry) => profile.enemyPool.includes(entry))) || ENEMY_POOL;
  const count = destination.nodeType === 'boss' ? 1 : Math.min(4, Math.max(1, destination.danger + (elite ? 1 : 0) + (profile.id === 'black_below' ? 1 : 0)));
  const squad: Enemy[] = [];

  for (let i = 0; i < count; i++) {
    const boss = destination.nodeType === 'boss';
    const template = boss ? ENEMY_POOL.find((enemy) => enemy.boss)! : candidates[Math.floor(Math.random() * candidates.length)];
    const scale = (1 + depth * 0.12 + (elite ? 0.35 : 0)) * profile.enemyBonus.hp;
    const maxHp = Math.floor(template.hp * scale);
    squad.push({
      ...template,
      id: `${template.name.toLowerCase().replace(/\W+/g, '_')}_${Date.now()}_${i}_${Math.floor(Math.random() * 999)}`,
      hp: maxHp,
      maxHp,
      damage: Math.max(1, Math.floor(template.damage * scale * profile.enemyBonus.damage)),
      moraleDamage: Math.max(0, Math.floor(template.moraleDamage * scale * profile.enemyBonus.moraleDamage)),
      corruption: Math.max(0, Math.floor(template.corruption * scale * profile.enemyBonus.corruption)),
      elite: elite || template.elite || boss,
      boss: template.boss || boss,
    });
  }

  return squad;
}
