# pypan-65: Commodity chains

Part of pypan-63 (market depth). Depends on pypan-69 (port investment) for processing
facilities.

## Proposal

Raw silk → woven silk → finished garments, each step adding value but needing
processing time and facilities. Opium stays as-is. New goods have crafting trees.

## How it fits today

- **Five fixed goods:** general cargo, arms, silk, opium and jade. Each has a price
  magnitude (1 to 10,000).
- **"Five" is built into many places:**
  - `NUM_GOODS` arrays in the game state and the save format
  - the two-column market report
  - the cargo pane
  - the goods menus, where first letters are also keyboard shortcuts
  - the price table, with one row per good
- **Nothing ever turns into anything else.** Goods are bought and sold, never
  transformed.
- **Time is monthly.** "Processing time" would be months, and the player is usually
  elsewhere while it happens.

## Recommendation

Start with **one chain, mostly reusing existing goods**, so the number of goods grows
slowly:

- **Silk becomes raw silk** (cheap, from Saigon or Manila). **Woven silk** and
  **garments** become new goods, each a step up in magnitude.
- **Processing** needs a **mill** (a port investment, pypan-69) in a port. You drop off
  raw silk. A month or two later the mill has finished goods for you to collect, minus
  a processing fee.
- **Where to sell:** finished goods sell best in ports where raw silk is dear, so the
  player plans a three-port route: buy, process, sell.
- **Opium, jade and arms** stay single goods. **General cargo** stays as the bulk good.

**Interface:** that's seven goods, which no longer fits two columns of three. Either
redesign the market report, or show only the goods traded in the current port.

## Questions to answer before implementing

1. **Which chains?** Silk only, or also tea (leaf → packed), cotton, iron? Are the new
   goods added, or do they replace existing ones?
2. **Where does processing happen?** In the player's own facilities only (pypan-69),
   or can you pay a local merchant to process (pypan-71)?
3. **How long does it take, and how much value does it add?** It must beat simply
   trading raw silk, or no one will bother.
4. **Can processing fail?** Fire, theft, strikes, quality variation?
5. **Are processed goods sold everywhere,** or only in certain markets (garments in
   colonial ports, for example)?
6. **Interface:** market report and cargo pane with more than five goods on an iPhone.
   First-letter keyboard shortcuts clash once there are several silk goods.
7. **Saved games:** `NUM_GOODS` becomes variable. How are Python saves (five goods)
   mapped?
8. **Consignments and shocks:** do the price-shock messages and the consignment
   descriptions need new entries?

## What changes in the code

- `src/engine/constants.ts`: goods, magnitudes, price rows.
- Everything indexed by `NUM_GOODS`.
- A new processing module, tied to pypan-69's facilities.
- `src/engine/save.ts`: variable goods arrays.
- `src/ui/panes.ts` and the market report in `src/engine/trade.ts`.
- SPEC.md §4.
