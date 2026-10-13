# pypan-67: Contraband tiers

Part of pypan-63 (market depth). Depends on pypan-64 (persistent market model).
Related to pypan-48 (illegal consignments) and pypan-70 (political instability).

## Proposal

Goods become illegal in specific ports because of political events, creating
risk-and-reward arbitrage.

## How it fits today

- **Opium is the only contraband today.** In `checkSafety` (`src/engine/safety.ts`),
  after the first year, arriving at a foreign port with opium aboard carries a 1-in-10
  chance that the police seize it all and fine you.
- **It's always opium,** in every port except Hong Kong, at the same odds. It never
  changes.
- **`Cargo.illegal` exists but is never set,** so consignments are never contraband.

## Recommendation

**Generalize the opium rule into a per-port legality table** in the market state
(pypan-64):

| Tier | Trading it | Risk |
|---|---|---|
| **Legal** | normal | none |
| **Restricted** | taxed on sale (for example 20%) | none |
| **Contraband** | can't be sold openly; sells through smugglers at a premium | seizure and fine on arrival, like opium today |

- **What changes the tiers:** events (pypan-70, pypan-77). For example, "The new
  administration in Saigon has banned the arms trade, Taipan!" Bans last for some
  months, or until the next change.
- **The opportunity:** a banned good becomes **scarce**, so its smuggler price rises.
  That's the arbitrage: buy legally elsewhere, smuggle it in.
- **The starting table** keeps today's rule: opium is contraband everywhere except Hong
  Kong.

## Questions to answer before implementing

1. **How many tiers?** Legal/contraband only, or the restricted tier with taxes too?
2. **Can contraband be sold at all?** Through smugglers at a premium, or not at all?
3. **What triggers changes:** random events, scripted history (pypan-77), the player's
   actions (pypan-62's squeeze), or rivals (pypan-76) lobbying?
4. **Seizure odds:** a flat 1-in-10 like opium, or depending on amount, port and how
   often you've been caught? Can bribes or guards (pypan-55) reduce them?
5. **What happens to contraband in your warehouse,** at home or abroad (pypan-52)?
6. **Illegal consignments** (pypan-48): should consignments of contraband pay more and
   use the same rules?
7. **How does the player learn the rules?** Arrival messages, a line in the market
   report, or a "port info" screen (pypan-68)?
8. **Does it start in year one,** or after the first year like other hazards?

## What changes in the code

- `src/engine/safety.ts`: generalize opium seizure to any contraband.
- `src/engine/trade.ts`: restricted taxes, smuggler sales, and market report labels.
- Market state (pypan-64): legality per port and good.
- An event hook for changes (pypan-70, pypan-77).
- SPEC.md §4 and §11.
