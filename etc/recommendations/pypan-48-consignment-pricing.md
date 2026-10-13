# pypan-48: Rebalance consignments

## Proposal

With shrewd trading you can usually triple your money in about 5 months: fill the
hold and sail around until you find a good price. A consignment is a **guaranteed
month's income**. It carries much less risk, so it shouldn't match that rate.

- **Size of the boost:** about **15% of your money**.
- **Scaling:** in proportion to the share of the hold the consignment takes up.

```
value = 15% × money × (size / shipSize)
```

## The numbers

Tripling in 5 months works out to about **25% growth a month**
(3^(1/5) ≈ 1.246). That's what a full hold of shrewd trading earns, with the risk
of bad prices, pirates, storms and muggings.

A consignment that filled the whole hold would pay 15%, about 60% of the trading
rate, with no outlay and almost no risk. At the usual sizes it pays:

| Consignment size | Share of the hold | Pays (as % of money) |
|---|---|---|
| Small | 5% | 0.75% |
| Typical | 15% | 2.25% |
| Large | 30% | 4.5% |

So the decision for the player is: "Is 2–5% of my money, guaranteed, worth giving up
this much hold space for a voyage, and committing to this destination?" Early in the
game, with an empty hold, yes. Late in the game, with a full hold of jade, probably
not. That's a real choice, unlike today.

**Today's consignments,** for comparison:
- **Value:** a pay rate of 35, 350 or 3,500 per unit of space, times the size.
- **Size:** 5–30% of the hold.
- **When offered:** 1-in-20 on each arrival, from month 18.

The fee doesn't depend on the player's wealth, so it's large early and trivial later.

## Recommendation

Adopt the formula, with a few guards:

- **Fixed at offer time:** the value is set when the consignment is offered and doesn't
  change before delivery.
- **A minimum** so poor or indebted players still get a sensible offer. For example,
  the current formula, or a flat 100 per unit of space.
- **Optional variation** of ±20% around 15%, so offers aren't identical. It keeps the
  average at 15%.
- **Rate as a constant:** `CONSIGNMENT_RATE = 0.15` in `src/engine/constants.ts`, for
  tuning.

## Questions to answer before implementing

1. **What counts as "your money"?** Options:
   - **Cash on hand:** simplest. But a player can raise offers by carrying cash
     instead of banking it, which goes against the mugging risk.
   - **Cash + bank − debt** (the cash position used for the score): stable and matches
     how the game scores. Recommended.
   - **The cash position plus goods aboard at local prices** (`netWorthOnHand` plus the
     bank): closest to "your money" while trading. But goods prices swing with shocks.
2. **What does a player with little or negative money get?** A minimum (what amount?),
   or no offers until they're solvent?
3. **Should there be a maximum?** At a cash position of 10 million, a 30% consignment
   pays 450,000 for one voyage. That's fine if it really is "a month's income", but
   check it against the score scale.
4. **Should the 15% vary** per offer, or be exact?
5. **The one-month assumption:** every voyage takes a month, but a storm can blow you
   off course, and the player may choose to go elsewhere first. Should pay drop if
   delivery is late, or is the lost month the cost?
6. **Should a consignment ever be lost:** if the ship sinks (the game ends anyway),
   dumped in battle, or seized?
7. **Should the hold-size range (5–30%) and the frequency** (1-in-20 from month 18)
   change too? Now that consignments are worth taking, offering them earlier or more
   often matters more.
8. **Should illegal consignments** (`Cargo.illegal` exists but is never used) pay a
   higher rate, with a risk of seizure? Or file that separately?

## What changes in the code

- `src/engine/cargo.ts`: `randomCargo` uses the new formula. If the base is the cash
  position, it uses `cashPosition` from `src/engine/score.ts` (or a shared helper).
- `src/engine/constants.ts`: `CONSIGNMENT_RATE`, and the minimum.
- No saved-game change, since the value is stored in `Cargo` when offered.
- `test/engine/cargo.test.ts`: value as a share of money and of the hold, and the
  minimum.
- SPEC.md §12.
