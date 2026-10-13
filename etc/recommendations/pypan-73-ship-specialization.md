# pypan-73: Ship specialization

Part of pypan-72 (fleet evolution). Related to pypan-57 (steamship) and pypan-56
(armor).

## Proposal

Fast clippers for high-value, low-volume goods; bulk junks for grain and coal. Route
optimization becomes genuinely complex.

## How it fits today

- **One ship with no type.** It has a capacity (`shipSize`, starting at 60), guns and
  damage. McHenry's offers add 50 capacity at a time.
- **Every voyage takes one month,** so there's no speed to differentiate.
- **Speed could still matter** through:
  - the odds of running from pirates (`runAway` in `src/engine/battle.ts`)
  - storms (1-in-10 per voyage, with a chance of damage or diversion)

## Recommendation

**Ship types**, one ship at a time, swapped through McHenry:

| Type | Capacity | Guns | Speed | Good for |
|---|---|---|---|---|
| **Brig** (starting ship) | medium | some | medium | everything |
| **Clipper** | small | few | fast: much better escapes, fewer storm diversions | opium, jade |
| **Junk** | large | few | slow: worse escapes, more storm damage | general cargo, bulk |
| **Steamship** (pypan-57) | large | many | fast, ignores storm diversions, burns coal | late game |

- **Speed without voyage lengths:** speed acts on running away and on storms. If
  distances are added (pypan-72), it also shortens voyages.
- **Capacity** keeps growing through McHenry's upgrades, within each type's limit.
- **Trading in:** McHenry offers a new type in exchange for your ship plus cash.
  Damage is repaired, and guns move over if there's room.

## Questions to answer before implementing

1. **Voyage lengths:** is this blocked until distances exist (pypan-72), or is speed
   acting on battles and storms enough?
2. **Which types,** and what exact numbers? Is the starting ship a type?
3. **Do types limit capacity growth?** For example, a clipper can never exceed 150.
4. **One ship, or a small fleet?** A fleet (sending a junk one way while you sail the
   clipper another) is a much bigger change to the interface and the turn structure.
5. **How are ships acquired:** by offer, a menu in Hong Kong, or yards abroad
   (pypan-69)?
6. **What happens to guns, armor (pypan-56) and damage** on a trade-in?
7. **"Grain and coal":** do those become goods (pypan-65), or is bulk just general
   cargo?
8. **Display:** show the ship type in the status strip.
9. **Saved games:** a ship type field, defaulting to the starting type.

## What changes in the code

- `src/engine/hong.ts` and `src/engine/save.ts`: ship type.
- `src/engine/constants.ts`: type table.
- `src/engine/shipyard.ts`: trade-in offers, capacity limits.
- `src/engine/battle.ts`: run odds by speed.
- `src/engine/storm.ts`: storm odds by type.
- `src/ui/panes.ts`.
- SPEC.md §6, §7 and §9.
