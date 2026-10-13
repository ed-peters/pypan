# pypan-57: New ports

## Proposal

After a couple hundred rounds the seven ports get stale. Open up new ports later in
the game, perhaps by trading in for a steamship after an advance in technology.

## How it works today

- **Ports:** seven cities in `CITIES` (`src/engine/constants.ts`), plus an "At Sea"
  index of 7.
- **Code that assumes seven ports:**
  - `BASE_PRICES` has one column per city.
  - `randomOtherCity` picks from all cities.
  - `save.ts` checks that `location` is in `0..CITIES.length`.
- **The interface:** the destination menu is a choice prompt with numbered buttons.
  Keys 1–9 select the first nine options; "Never mind" is on Escape. First-letter
  shortcuts already clash (Shanghai, Saigon and Singapore all start with S).
- **Upgrading the ship:** only "+50 capacity" offers. There's no change of ship type.

## Recommendation

**A steamship, around 1869–1870,** tied to the opening of the Suez Canal:

- **The event:** after the in-game year 1869, McHenry offers to trade your ship for a
  steamship. It's expensive, and only offered once your cash position is high enough.
- **What a steamship gives you:**
  - more ports: two of Calcutta, Bombay, Yokohama, Bangkok or Rangoon (see the
    menu limit below)
  - better odds of outrunning pirates
  - fewer storms that blow you off course
  - possibly more capacity
- **What it costs you:** **coal** on each voyage, paid on departure and growing with
  distance (if distances are added). Without coal you can only reach the original
  seven ports.
- **The new ports:** each has its own price profile. Calcutta, for example, has cheap
  opium (historically accurate). Li Yuen doesn't reach them, but they have other risks:
  different pirates, or customs fines.

Keep the number of ports at nine or fewer (two new ports), so every port still has a
number key. More than that needs paging or a different picker.

## Questions to answer before implementing

1. **What triggers it:** a year, a cash position or rank, a random event, or a
   purchase? Is it optional?
2. **Steamship only, or other routes too?** For example, treaty ports opening by
   year, which is also historical.
3. **Which ports, and how many?** Does each new port need a unique price profile and
   any unique events?
4. **What does the steamship change:** capacity, speed, pirate odds, storm odds,
   running away? Can it carry the same guns?
5. **Does it have running costs** (coal)? If so, how is coal charged, and what happens
   when you can't pay?
6. **Can you still sail to the new ports without a steamship,** at higher risk? Or are
   they locked entirely?
7. **Do Li Yuen, Wu and the police operate in the new ports?** Do the bank's
   representative (pypan-51) and the lorcha?
8. **Distance and time:** today every voyage takes one month. Should far ports take
   longer, which affects interest, prices and score?
9. **Interface:** the destination menu with more than nine options on an iPhone, and
   keyboard keys beyond 9.
10. **Saved games:** the `location` range check and the per-city tables need to grow.
    Python saves must still load, since their indices 0–6 don't change.
11. **Score:** do steamship players need a different scale, since late-game income
    will be much higher?

## What changes in the code

- `src/engine/constants.ts`: `CITIES` and the `BASE_PRICES` columns.
- `src/engine/hong.ts` and `src/engine/save.ts`: ship type, and the expanded location
  range.
- `src/engine/voyage.ts`: destination filtering, coal, voyage length.
- `src/engine/battle.ts` and `src/engine/storm.ts`: steamship modifiers.
- `src/engine/shipyard.ts`: the trade-in offer.
- `src/ui/keys.ts` and `src/ui/terminal.ts`: menus with more options.
- SPEC.md §3, §5, §6, §7 and §9.
