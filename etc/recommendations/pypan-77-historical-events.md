# pypan-77: Historical events

Part of pypan-75 (macro-scale play). Related to pypan-57 (new ports), pypan-33 (jade
event), pypan-70 (instability) and pypan-67 (contraband).

## Proposal

Opium Wars, typhoons, treaty port openings: scripted events that permanently reshape
the map and force strategic adaptation, rather than optimizing a fixed system.

## How it fits today

- **The game starts in January 1860** and advances a month per voyage. A
  **date-triggered** event slots in easily.
- **The game has no end date,** so a fixed script eventually runs out. Players reaching
  "a couple hundred rounds" (pypan-57) would be past 1876.
- **Every event today is random and temporary:** price shocks, storms, pirates,
  muggings. Nothing changes the map permanently.
- **Existing beads are already "events":** the steamship (pypan-57), the jade mine
  (pypan-33) and squeeze fallout (pypan-62).

## Recommendation

**An event framework,** then a small set of events. Each event has:

- **When:** a date (or a date range), plus conditions (for example, the player has
  been to Nagasaki).
- **A message:** a news report, shown on arrival.
- **Effects:**
  - on ports: status (pypan-70), contraband (pypan-67), new ports (pypan-57)
  - on prices: modifiers (pypan-64)
  - on goods: unlocks (pypan-33)
  - on characters: Li Yuen, Wu, rivals

**Candidate events** in the game's 1860s–70s window (dates to verify):

| Event | Rough date | Possible effect |
|---|---|---|
| End of the Second Opium War (Convention of Peking) | late 1860 | New ports open on the China coast; opium trade becomes legal in China |
| Taiping Rebellion near Shanghai | early 1860s | Shanghai disrupted; silk prices erratic |
| France takes Saigon and Cochinchina | 1862 | Saigon's administration changes; new contraband rules |
| Meiji Restoration | 1868 | Nagasaki's trade opens up; new goods in demand |
| Suez Canal opens | 1869 | Steamships arrive (pypan-57); faster routes to Europe |
| Great Hong Kong typhoon | 1874 | Hong Kong damaged; warehouse losses; repairs dear |

**After the script runs out,** either end the game at a set date with a final score,
or switch to random "historical-style" events.

## Questions to answer before implementing

1. **How accurate?** Real events at real dates, or plausible invented ones? Real
   history means checking the dates and the effects carefully.
2. **Fixed dates, or ranges with randomness,** so games differ?
3. **Permanent or temporary effects?** The pitch says "permanently reshape the map".
4. **What happens after the last scripted event:** game end, random events, or a loop?
5. **Do the player's actions influence events,** for example funding one side, or
   making the jade mine possible?
6. **How much warning?** Rumors a few months ahead, so players can prepare?
7. **Should events be optional** (a "historical" game mode)?
8. **Saved games:** which events have fired, and any pending ones.

## What changes in the code

- A new `src/engine/events.ts` (event table, triggers, effects).
- `src/engine/voyage.ts`: check events on arrival.
- Hooks into port state, market state, contraband and new ports.
- `src/engine/hong.ts` and `src/engine/save.ts`: fired events.
- A new SPEC.md section.
