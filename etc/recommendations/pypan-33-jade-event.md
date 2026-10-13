# pypan-33: Jade as an event

## Proposal

Hide jade at the start of the game, and bring it into the world with an event. What
is the event, what triggers it, and does it need an investment?

## How it works today

- **Always available:** jade is the fifth good from month 1, at the top price
  magnitude (10,000).
- **Port prices:** its row in `BASE_PRICES` is our own invention, since taipan.c had
  no jade. It's cheap in Singapore and Batavia and dear in Nagasaki.
- **Profit:** jade dominates late-game trading, at about 32,000 per unit per voyage
  on average.
- **Text that mentions jade:** the price-shock messages, including "Burmese jade from
  a newly-discovered mine", and the "jade statue" consignment.

## Recommendation

**Event: a Burmese jade mine opens.** It fits the existing shock message and the
period.

- **Trigger:** after year 2, and once the player's cash position passes a threshold
  (for example 100,000). A small chance each arrival after that, so it doesn't always
  happen in the same month.
- **The investment:** a "Burmese merchant" in Singapore or Batavia asks the player to
  fund an expedition for a large sum.
  - **If you fund it,** after a few months you get exclusive cheap jade in one port for
    a while, then jade spreads to every port.
  - **If you decline,** jade still arrives later, without the head start.
  - **Risk:** some chance the expedition fails, or that Li Yuen takes a cut.
- **Before the event:** jade isn't listed in the market report. The goods arrays still
  keep five slots, so saved games don't change shape.

That turns jade from a starting good into a late-game reward that has to be earned.

## Questions to answer before implementing

1. **Hide or lock?** Should jade be completely hidden (not in the market report,
   cargo pane or Buy menu), or shown as unavailable ("Jade – none")?
2. **What triggers it:** time, wealth, rank, a random event, or a mix? Should it be
   guaranteed by some month, so every game eventually gets jade?
3. **Does it need an investment?** If so, how much, where is it offered, and what
   happens if you decline or can't afford it?
4. **Can the investment fail?** What does a failure look like, and can you retry?
5. **Does it happen once per game, everywhere at once,** or does jade spread from port
   to port?
6. **Balance:** without jade, opium becomes the top good for the first years. Is that
   intended, and does the score (cash position per month) need adjusting so a jade
   game scores comparably?
7. **What about text that mentions jade before it exists?** The jade price shocks and
   the "jade statue" consignment would need to be suppressed until then.
8. **Saved games:** add a `jadeUnlocked` flag (written only when set). Do restored
   Python saves count as unlocked, since they had jade from the start?
9. **Starting choices:** should a new start option ("Jade merchant") begin with it
   unlocked?

## What changes in the code

- `src/engine/hong.ts`: an unlock flag, plus any expedition state.
- `src/engine/trade.ts`: hide jade from the reports and menus, and suppress its shocks.
- `src/engine/cargo.ts`: the jade statue description.
- `src/engine/save.ts`: the new flag.
- A new event module: the offer, the expedition, the reveal.
- `src/ui/panes.ts`: the cargo pane with four or five goods.
- SPEC.md §4.
