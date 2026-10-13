# pypan-63: Market depth (epic)

## The pitch

> **Commodity chains:** raw silk → woven silk → finished garments, each step adding
> value but requiring processing time and facilities. Opium stays as-is.
>
> **Market saturation:** dump too much of one good into Canton and the price
> collapses until demand recovers. Forces diversification and route planning.
>
> **Contraband tiers:** some goods become illegal in specific ports based on political
> events, creating risk/reward arbitrage.

| Bead | Feature | Depends on |
|---|---|---|
| pypan-64 | Persistent market model (foundation) | — |
| pypan-65 | Commodity chains | pypan-69 (facilities) |
| pypan-66 | Market saturation | pypan-64 |
| pypan-67 | Contraband tiers | pypan-64 |

pypan-62 (the squeeze) and pypan-70 (political instability) also depend on pypan-64.

## How the pitch fits this game

- **The market has no memory.** `setPrices` rolls fresh prices for one port on each
  arrival, from a fixed table (`BASE_PRICES`) times a random 1–3. Nothing depends on
  what you, or anyone else, did before. **Saturation, contraband and instability all
  need memory**, which is why pypan-64 comes first and is filed as a task.
- **Sales have no limit.** You can sell any amount at the posted price. Today the best
  strategy is "fill the hold with the most valuable good you can afford". Saturation
  is the first feature that would challenge that, so it **changes the balance of
  everything**, including the 25%-a-month trading pace used to size consignments
  (pypan-48).
- **Five goods are built into everything:**
  - the save format (`NUM_GOODS` arrays, compatible with Python saves)
  - the two-column market report
  - the cargo pane
  - menus and first-letter keys

  Commodity chains add goods, which is the most expensive change in this epic.
- **Contraband already exists in one form:** the harbor police seize opium abroad
  (1-in-10 per arrival after the first year). Contraband tiers generalize that.

## Recommendation

1. **pypan-64 first:** a small per-port, per-good state, saved and advanced every month.
   It changes nothing on its own, but every other market feature builds on it.
2. **Then pypan-66 (saturation):** the most gameplay for the least new interface. It
   rebalances trading, so do it before tuning other features against trading income.
3. **Then pypan-67 (contraband):** it reuses the opium seizure code.
4. **pypan-65 (chains) last:** it needs new goods, processing facilities (pypan-69) and
   interface work. It's best attempted after the other three have settled.

## Questions that cut across the epic

1. **How much should the pace change?** Saturation will lower trading profits. Is that
   the goal (a harder, slower game), or should prices or starting money be raised to
   compensate?
2. **Does the market move on its own?** Should prices drift month to month, with
   rivals (pypan-76) buying and selling, or should only the player and events move them?
3. **How much should the player be told?** Should the market report show trends
   ("Silk ↓ glut") or just prices?
4. **Can the save format change?** Market state and new goods break the "same shape as
   pypan.py" rule unless they're optional extras. Is importing Python saves still a
   requirement?
