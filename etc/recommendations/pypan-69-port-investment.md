# pypan-69: Port investment

Part of pypan-68 (port differentiation). Related to pypan-52 (warehouses abroad) and
pypan-60 (supply holdings). Blocks pypan-65 (commodity chains need mills).

## Proposal

Spend cash to build facilities in ports, for example a repair yard in Manila.
Warehouses abroad are already pypan-52. Ports become yours in a meaningful way, and
you have something to protect.

## How it fits today

- **Only Hong Kong offers services.** McHenry repairs (Hong Kong only, on arrival),
  plus the bank, Wu, the warehouse and free transfers.
- **Abroad, nothing,** apart from the occasional lorcha and, now, the bank's
  representative.
- **Damage limits where you can go:** a damaged ship has to return to Hong Kong for
  repairs, and that is one of the main things pulling players home.

## Recommendation

**Facilities as a small catalog**, each built once per port:

| Facility | What it does | Notes |
|---|---|---|
| **Repair yard** | repairs on arrival in that port, like McHenry | Weakens Hong Kong as the hub; price it high |
| **Warehouse** | pypan-52 | Already filed |
| **Mill** | processes raw goods (pypan-65) | Only once commodity chains exist |
| **Agency / office** | lowers buying prices a little in that port, or reveals its next prices | A light version of pypan-71 |

- **How you build one:** an offer on arrival, or a "Build" menu option in ports where
  you're eligible. Costs grow with time.
- **Upkeep:** each facility costs a monthly fee. Facilities can be damaged by hazards
  (fire, unrest from pypan-70, rivals from pypan-61), which gives you "something to
  protect".
- **Shared with pypan-60:** facilities and supply holdings are both "things you own in
  a port". Use one structure for both.

## Questions to answer before implementing

1. **Which facilities,** and which first? The repair yard is the most useful, and the
   biggest threat to Hong Kong's role.
2. **How are they built:** by offer or by menu? Is any port eligible, or does each port
   allow only certain facilities?
3. **What do they cost, and what's the upkeep?** What happens when you can't pay?
4. **Do they take time to build?**
5. **What threatens them:** fire, rivals, unrest, blockades? Can they be destroyed, or
   only damaged? Can they be insured?
6. **Can they be upgraded or sold?** Do they count toward the score?
7. **What keeps Hong Kong central** once you can repair abroad? (See pypan-52.)
8. **Interface:** how does the player see what they own? Shared with pypan-60's
   holdings display?
9. **Saved games:** a list of facilities per port.

## What changes in the code

- A new module for owned property, shared with pypan-60.
- `src/engine/shipyard.ts`: repairs abroad at your yard.
- `src/engine/voyage.ts`: upkeep and events on arrival.
- `src/engine/hong.ts` and `src/engine/save.ts`.
- `src/ui/panes.ts`.
- SPEC.md §9–10.
