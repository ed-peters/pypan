# pypan-71: Exclusive relationships with merchant houses

Part of pypan-68 (port differentiation). Depends on pypan-76 (named rival houses).

## Proposal

Bribe or cultivate a specific merchant house in a port for preferential pricing. Each
house has a personality and competing interests.

## How it fits today

- **The market is anonymous.** The player buys and sells at the port's posted price,
  with nobody behind it.
- **Characters with relationships exist,** but they're few:
  - **Li Yuen:** pay him and his pirates leave you alone.
  - **Wu:** owe him and he threatens you.

  Both use the same pattern: a payment or a debt changes how a character treats you.
- **No merchants yet:** pypan-76 introduces named houses as rivals. Exclusive
  relationships are the other side of the same characters: allies.

## Recommendation

**Each port has one or two local houses,** drawn from the same character model as
pypan-76. A house has:
- a personality: honest, greedy or political
- interests: the goods it trades
- its standing with you, from hostile to allied

**How standing changes:**
- **Raised by:** trading in its goods in its port, gifts (a lump sum, like Li Yuen's
  donation), and doing it favors (consignments for it, pypan-48).
- **Lowered by:** dealing with its rivals, undercutting it, or squeezing its goods
  (pypan-62).

**What it gets you:**
- **Allied:** better prices in that port (for example 5–10% on its goods), early word
  of price shocks or events, and protection from rival sabotage there.
- **Hostile:** worse prices, and the house may hire pirates or bribe the police
  against you.

**Exclusivity:** allying with one house angers its competitors. "Exclusive" means you
can't be friends with everyone.

## Questions to answer before implementing

1. **Are local houses the same characters as the rivals in pypan-76,** or separate,
   smaller merchants?
2. **How many per port,** and do they each have names and personalities?
3. **How do you raise standing:** gifts, trade, favors, all three? How fast does it
   decay?
4. **What exactly does an alliance give:** discounts, information, protection, access
   to contraband (pypan-67), or processing (pypan-65)?
5. **How does exclusivity work:** does allying with one house automatically make
   others hostile, or only lower their standing?
6. **Can a house betray you,** for example when its interests change or a rival
   outbids you?
7. **Interface:** how does the player see standings? A "Visit the merchant house"
   option in ports, or a status screen?
8. **Saved games:** standing per house.

## What changes in the code

- The house model from pypan-76, with standing.
- `src/engine/trade.ts`: per-player price modifiers when buying and selling.
- `src/engine/pypan.ts`: a menu option for visiting a house.
- Events for favors and betrayals.
- `src/engine/hong.ts` and `src/engine/save.ts`.
- SPEC.md §4.
