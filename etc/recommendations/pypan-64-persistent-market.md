# pypan-64: Persistent market model

Part of pypan-63 (market depth). Blocks pypan-66 (saturation), pypan-67 (contraband),
pypan-70 (instability) and pypan-62 (squeeze).

## The problem

`establishPrices` (`src/engine/trade.ts`) rolls fresh prices for the port you've just
arrived in: the port's level for each good, times a random 1–3, times the good's
magnitude. An occasional shock multiplies or divides one good. **Nothing is remembered**
from month to month or port to port. Selling 1,000 jade in Shanghai doesn't affect
Shanghai's next price. A rule that says "opium is banned in Manila" has nowhere to
live.

## Recommendation

Add a market state: **one small record per port and good**, saved with the game and
advanced every month. For example:

```
markets[port][good] = {
  demand: number,     // 1.0 = normal; below 1 means a glut, above 1 means scarcity
  illegal?: boolean,  // contraband in this port (pypan-67)
  modifier?: number,  // squeeze, blockade or event multiplier (pypan-62, pypan-70)
  months?: number,    // how long the modifier lasts
}
```

- **Prices:** `setPrices` multiplies its usual roll by `demand × modifier`, then keeps
  the good's usual step size (as pypan-53 does for shocks).
- **Every month:** `demand` drifts back toward 1.0, and modifiers count down. This runs
  in the voyage, next to interest.
- **On its own,** this changes nothing: everything starts at 1.0. It's pure plumbing
  for the features that depend on it.

## Questions to answer before implementing

1. **What does the state hold?** Only demand and modifiers, or also a "last seen price"
   that the player can look up for other ports (a price memory or ledger)?
2. **Do shocks become persistent?** Should today's one-off price shocks set a modifier
   that lasts a few months, instead of only affecting the current visit?
3. **How fast does demand recover?** A fixed rate per month, or depending on the port
   (big ports recover faster)?
4. **Saved games:** 7 ports × 5 goods records is small. Should it be written only when
   something differs from normal, to keep saves short and Python-compatible?
5. **Does every port's market advance monthly,** even ones the player isn't in? It must,
   for "recovers over time" to work.
6. **New ports and goods** (pypan-57, pypan-65): the structure should allow for more of
   both without a format change.

## What changes in the code

- `src/engine/hong.ts` and `src/engine/save.ts`: market state, optional on load.
- `src/engine/prices.ts`: apply demand and modifiers.
- `src/engine/voyage.ts`: monthly drift.
- Tests: prices unchanged at neutral state; drift; save round-trip.
