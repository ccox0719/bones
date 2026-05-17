import type { Expedition, Hero, RoomKind } from '../types';

export function pushExpeditionEvent(expedition: Expedition, text: string): void {
  expedition.log = expedition.log || [];
  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  expedition.log.push(text.startsWith('[') ? text : `[${stamp}] ${text}`);
  if (expedition.log.length > 80) expedition.log = expedition.log.slice(-80);
}

export function roomEntryText(kind: RoomKind, roomName: string): string {
  const byKind: Record<RoomKind, string> = {
    entrance: `The party crosses into ${roomName}.`,
    hallway: `Boots scrape through ${roomName}.`,
    battle: `Shapes gather in ${roomName}.`,
    event: `The air curdles inside ${roomName}.`,
    camp: `The party makes a low fire at ${roomName}.`,
    elite: `A named horror waits in ${roomName}.`,
    treasure: `Something valuable glints in ${roomName}.`,
    exit: `The survivors search for the way home through ${roomName}.`,
  };
  return byKind[kind];
}

export function heroEvent(hero: Hero, text: string): string {
  return `${hero.name.split(' ')[0]} ${text}`;
}
