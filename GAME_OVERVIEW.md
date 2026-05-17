# Last Lantern - AI Handoff

## Game Concept

Last Lantern is a dark fantasy settlement-and-expedition management prototype. The player manages a ruined settlement around the Last Lantern, assigns heroes into a 4-slot formation, chooses a destination, and sends the party on timed expeditions. Heroes have health, morale, corruption, status, class roles, resistances, quirks, and position preferences.

The current game is a frontend-only prototype. There is no backend. State is persisted in `localStorage`.

## Current Player Loop

1. Review settlement buildings on the left.
2. Review heroes on the right.
3. Build a party using the bottom Formation slots, the `AUTO FILL` button, or a hero modal's `Add to Party`.
4. Choose a destination in the bottom bar.
5. Choose behavior: Balanced, Aggressive, or Survive.
6. Click `SEND FORTH`.
7. Expedition runs on a timer and resolves rewards, injuries, morale, corruption, and status changes.

Only heroes with status `ready` can be assigned. Heroes may be `ready`, `resting`, `injured`, `corrupted`, `expedition`, or `dead`.

## Tech Setup

This is now a Vite + TypeScript project.

```bash
npm install
npm run dev
npm run build
```

Default dev server:

```text
http://127.0.0.1:5173
```

The app entrypoint is:

```text
index.html -> src/main.ts
```

## Important Files

```text
index.html
```

Contains the static app shell and inline click handlers. Because `main.ts` is loaded as a module, functions used by inline handlers are explicitly exposed through `Object.assign(window, ...)` near the bottom of `src/main.ts`.

```text
src/main.ts
```

Main gameplay/UI file. It still has `// @ts-nocheck` because the migration is incremental. It owns:

- save/load/reset flow
- party state
- launch and expedition resolution
- DOM rendering
- modals and toasts
- ember and dungeon canvas animation

```text
src/types.ts
```

Shared TypeScript types for heroes, buildings, destinations, damage types, synergies, events, and game state.

```text
src/data/
```

Typed static data:

- `damageTypes.ts`
- `destinations.ts`
- `classes.ts`
- `synergies.ts`
- `defaults.ts`

## Current Architecture Notes

The code is mid-migration from one large HTML file into a modular TypeScript app. Static data has been extracted, but most behavior still lives in `src/main.ts`.

The next clean extraction target is:

```text
src/store/gameState.ts
```

Move these from `main.ts`:

- `SAVE_KEY`
- `defaultSave`
- `loadGame`
- `saveGame`
- save normalization
- `resetGame`

After that, extract expedition/combat logic into:

```text
src/engine/expeditions.ts
src/engine/combat.ts
src/engine/rooms.ts
```

## Known UX Details

- `AUTO FILL` assigns available `ready` heroes into empty formation slots.
- `SEND FORTH` now attempts to auto-fill if no party is selected.
- The first destination is selected by default.
- If launch fails, it should show a toast with a specific reason.
- `Ctrl+Shift+R` resets save data in-game.

## Known Technical Caveats

- `src/main.ts` still uses many untyped DOM calls and inline HTML strings.
- Inline `onclick` handlers require corresponding functions to be exposed on `window`.
- Some old save files may contain stale icon data; load normalization fixes hero/building icons from class/id maps.
- Canvas particles must clamp radius before calling `arc()` to avoid `IndexSizeError`.
- Do not remove `calcPartyScore`; both launch and the party score panel depend on it.

## Design Direction

The UI should stay compact, dark, and operational rather than becoming a landing page. This is a management tool/game screen, not marketing. Keep controls dense and directly usable.

Use the existing visual language:

- ember/gold/dark parchment palette
- Cinzel headings
- compact cards
- bottom action bar
- left settlement panel
- right hero roster
- central dungeon canvas

Avoid large decorative rewrites until the core Phase 2 systems are stable.

## Suggested Next Tasks

1. Extract game state persistence into `src/store/gameState.ts`.
2. Remove `// @ts-nocheck` section by section.
3. Type `party`, `GS`, expedition objects, and DOM helper functions.
4. Add a room/combat engine for Phase 2.
5. Replace inline `onclick` handlers with event listeners once the file is more modular.

## Working Roadmap

The active forward plan now lives in:

- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)
