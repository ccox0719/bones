# Last Lantern Development Roadmap

## Purpose
This document is the working reference for the next phases of Last Lantern. It tracks the direction of the game, the order of implementation, and the design rules that should not drift.

## Current Direction
The game is moving from:

`pick mission -> wait for result`

to:

`choose route -> issue focus orders -> react to risk -> return with consequences`

The core experience should remain:
- dark fantasy
- idle autobattler
- settlement management
- expedition risk management
- compact, operational UI

## Cohesive Gameplay Update
This is the active integration target for the next major development cycle. The systems already in the game need to be wired together so they read as one loop rather than separate features.

Current goal:

`pick a destination and wait`

should become:

`choose a dangerous route, send a party, adjust expedition focus, watch them evolve, recover loot, and develop heroes over time`

Systems to connect:

1. Layered expedition map
   - each node defines region, depth, danger, enemy tables, loot bias, mission availability, scouting difficulty, corruption pressure, and a room chain
   - selecting a node creates an expedition plan

2. Expedition focus orders
   - Balanced, Combat, Loot, Mission, Survival, Scouting
   - focus modifies path choices, encounter odds, loot rolls, progress, retreat, scouting, corruption, morale, and injury/death risk
   - focus can change during an active expedition and must persist in saves

3. Room-by-room simulation
   - expeditions progress through travel, scouting, combat, loot, camp, deeper-route decisions, and retreat over time
   - no more single-roll expedition resolution

4. Autobattler combat
   - combat remains automatic
   - formation, class role, level, equipment, morale, corruption, traits, focus, enemy type, and depth all matter
   - log entries must stay readable and terse

5. Equipment progression
   - weapon, armor, trinket 1, trinket 2
   - equipment affects stats, focus performance, survival, scouting, corruption, and morale
   - loot found on expeditions becomes usable gear without turning inventory into clutter

6. Hero development
   - XP, levels, quirks, injuries, trauma, corruption effects, and specialization progress
   - heroes should diverge into distinct survivors over time

7. Offline progression
   - elapsed time should advance active expeditions, apply room/combat/event resolution, update heroes, and finish or continue runs as appropriate
   - return summaries should explain what happened while the player was away

8. Event feed storytelling
   - one shared event feed should capture travel, focus changes, combat, loot, scouting, evolution, retreat, death, and offline progress
   - this feed is the emotional spine of the game

## Current State
- Vite + TypeScript frontend
- localStorage persistence
- heroes, formations, quirks, equipment, regions, routes, and expeditions already exist
- expeditions now have active simulation, combat, decisions, torchlight, supplies, and branching map support
- settlement buildings already have light functional effects
- focus orders and scouting reveal are already in place
- hero XP is visible in both the modal and roster cards
- offline progress now produces a return summary modal on load

## Phase 1: Map and Route Identity
Goal: make route choice matter before the expedition even starts.

Already in progress:
- layered map regions
- branching routes
- fogged and locked nodes
- route previews in the map UI

Next work:
- region-specific encounter pressure
- node-type-specific room weighting
- hidden route reveal through scouting
- boss routes with stronger consequences

Rules:
- deeper routes must feel more dangerous and more rewarding
- region identity must affect enemy tables, room events, and loot bias
- the map should remain compact and readable

## Phase 2: Expedition Focus System
Goal: let the player issue mid-expedition strategic orders without taking direct control of combat.

Focus types:
- Balanced
- Combat
- Loot
- Mission
- Survival
- Scouting

Core model:
- each active expedition stores `currentFocus`
- focus changes are allowed while the expedition is active
- changing focus should be a meaningful order, not a tiny stat toggle
- focus should alter behavior over time, not just one roll

Suggested config file:

```text
src/data/focusOrders.ts
```

Suggested type:

```ts
type ExpeditionFocus =
  | 'balanced'
  | 'combat'
  | 'loot'
  | 'mission'
  | 'survival'
  | 'scouting';
```

Suggested modifiers:
- combat weight
- loot weight
- mission weight
- survival weight
- scouting weight

Focus should influence:
- encounter rolls
- room selection
- combat aggression
- loot discovery
- trap discovery
- hidden node reveal
- retreat logic
- morale loss
- corruption exposure
- XP gain
- reward quality

Behavior rules:
- Combat: more XP, more danger
- Loot: more treasure, slower progress
- Mission: faster objective completion, fewer side rewards
- Survival: safer, lower reward
- Scouting: more reveal, less surprise
- Balanced: no major bias

Mid-expedition UI:
- show current focus in the expedition panel
- allow switching among the six orders
- log the change in the expedition event feed
- optionally apply a short delay or mild morale penalty when focus changes too often

Trait and class interactions:
- Ranger: better scouting
- Grave Knight: better combat
- Priest/Vestal: better survival
- Rogue: better loot and trap avoidance
- Banner/Captain type: reduced penalty from focus swaps
- Occult/corrupted classes: better mission pace in corrupted zones

Trait interactions:
- Greedy: stronger loot focus, weaker survival compliance
- Cowardly: stronger survival focus, weaker combat compliance
- Obsessive: stronger mission focus, unhappy when orders change
- Curious: stronger scouting and loot, more strange events
- Bloodthirsty: stronger combat focus, may seek extra fights

## Phase 3: Region-Specific Encounter Pressure
Goal: make each region feel mechanically distinct.

Each region should influence:
- enemy squads
- room odds
- corruption pressure
- morale pressure
- torch drain
- trap likelihood
- loot bias
- decision flavor

Examples:
- Outskirts: ambush-heavy, low corruption
- Ruins: undead and traps
- Catacombs: darkness, sanity damage, relic-heavy
- Sunken Depths: flooding, movement penalties, rare alchemy
- Black Below: extreme difficulty, legendary rewards, permanent risk

## Phase 4: Scouting and Fog of War
Goal: reveal the map slowly and make exploration matter.

Add:
- adjacent node reveal
- hidden branches
- trap detection
- elite warning
- hidden treasure hints

Scouting should be improved by:
- class choice
- focus order
- certain traits
- certain equipment
- tower/upgrades at settlement

## Phase 5: More Expedition Decisions
Goal: keep the expedition active without making it manual combat.

Add more interrupt events:
- cursed chest
- injured ally
- retreat with loot
- strange lantern
- sealed shrine
- sacrifice supplies
- press deeper or return

Rules:
- decisions should be infrequent but meaningful
- choices should alter state immediately
- some choices should create short-term risk for long-term gain
- retreat must preserve some loot but not full-clear rewards

## Phase 6: Settlement Progression That Matters
Goal: make buildings and long-term management matter.

Add stronger building effects:
- Infirmary: healing and trauma treatment
- Tavern: morale recovery and events
- Forge: repair and upgrade equipment
- Shrine/Chapel: reduce corruption and trauma
- Scouting Tower: map reveal and safer routing
- Graveyard: memorial bonuses from fallen heroes

World progression:
- day count advances reliably
- world pressure has actual consequences
- better buildings unlock deeper regions and safer expeditions

## Phase 7: Hero Identity and Relationships
Goal: make heroes feel like survivors, not disposable stat blocks.

Add:
- friendships
- rivalries
- mentorships
- grief
- shared expedition memory
- class or trait synergies between specific heroes

Long-term hero fields:
- XP
- traits
- fears
- affinities
- mastery path
- death door survival count
- expedition survival count

## Phase 8: Class Mastery and Specialization
Goal: let heroes diverge into unique builds.

Examples:
- Grave Knight: Bulwark, Executioner, Lantern Guard
- other classes should get similar archetypes later

Mastery should affect:
- targeting
- combat behavior
- formation preference
- focus synergy
- resistance profile

## Phase 9: Boss Consequences and World Change
Goal: make boss clears reshape the world.

Bosses should:
- permanently alter routes
- unlock deeper layers
- change enemy tables
- corrupt or bless survivors
- drop legendary relics

## Implementation Order
Recommended order from here:

1. Region-specific encounter pressure
2. Focus system
3. Scouting and fog reveal
4. More expedition decision events
5. Settlement progression hooks
6. Hero relationships
7. Class mastery
8. Boss consequences
9. Strengthen XP, level-up, and specialization feedback
10. Expand hero relationship and faction systems

## Technical Notes
- Keep the current compact UI.
- Keep the simulation idle-first.
- Do not introduce manual combat.
- Do not let focus become a flat stat buff only.
- Normalize old saves so missing focus defaults to `balanced`.
- Keep event logs readable and avoid repeated spam.
- Prefer small, complete vertical slices over broad rewrites.

## Working Types To Add
- `ExpeditionFocus`
- `FocusOrderConfig`
- `FocusModifiers`
- `PendingExpeditionDecision`
- `RegionEncounterProfile`
- `ScoutRevealState`
- `RouteBranch`

## Files Likely To Change
- `src/data/focusOrders.ts`
- `src/engine/expedition.ts`
- `src/engine/simulation.ts`
- `src/engine/rooms.ts`
- `src/world/mapGeneration.ts`
- `src/world/nodes.ts`
- `src/main.ts`
- `src/store/gameState.ts`
- `src/types.ts`

## Definition Of Done For The Focus System
- player can switch focus while expedition is active
- focus visibly changes behavior
- expedition log explains the order change
- old saves load with balanced focus
- focus interacts with region depth and route choice
- focus is useful, but no focus is always optimal

## Definition Of Done For The Cohesive Update
- layered map selection feeds directly into expedition generation
- active expeditions expose live focus orders
- simulation advances room-by-room
- combat, loot, XP, and scouting all write to the same event feed
- equipment, quirks, and hero development affect expedition outcomes
- offline progress resolves the same systems the live game uses
- save data remains compatible through normalization
