# pypan-52: Warehouses in other ports

## Proposal

Let the player buy warehouses in ports other than Hong Kong.

## How it works today

- **The Hong Kong warehouse:** one warehouse, starting at 10,000 capacity. A
  +5,000 upgrade is offered at home after month 12 (1-in-10).
- **Transfers:** free in Hong Kong. Abroad, they're only possible through a lorcha
  (1-in-6 after month 12, 5–9% fee).
- **Fire:** 1-in-50 per arrival if the warehouse holds anything.
- **Saved game:** `warehouseGoods` is a single array of five goods.

## Impact on gameplay and balance

**What it adds:**
- **Stockpiling for price shocks.** Buy where a good is cheap, store it there, and
  sell when a positive shock hits nearby, without sailing home first.
- **Shorter routes.** With port-based prices (pypan-45), a player could set up a
  two-port shuttle between, for example, Singapore (cheap opium and jade) and
  Shanghai (dear opium), and never touch Hong Kong.
- **Something to spend money on in mid-game** besides guns and ships.

**What it costs the game:**
- **Hong Kong stops being the hub.** Li Yuen's donations, Wu's threats, repairs and
  the bank all rely on the player coming home. A player who rarely returns avoids
  extortion and Wu's robbery, and never repairs. That's a big balance shift.
- **The lorcha becomes pointless** once you have a warehouse in that port.
- **The hold limit matters less,** which weakens ship upgrades.
- **The interface gets harder.** The cargo pane shows one warehouse. On a phone,
  several warehouses need a different layout.

The risk is that the best strategy turns into "buy warehouses everywhere and never
go home". The game needs a reason to keep Hong Kong central.

## Recommendation

Make foreign warehouses a **limited, risky** option:

- **Availability:** offered occasionally, like the warehouse upgrade, after year 2.
  Limit them to one or two foreign ports.
- **Cost:** a purchase price, plus **monthly rent** charged on arrival (or taken from
  the bank).
- **Risk:** each foreign warehouse has its own fire and theft risk. Opium stored
  there can be seized by the harbor police.
- **Capacity:** smaller than Hong Kong's, for example 2,000–5,000.
- **Access:** you can only reach goods in a warehouse while you're in its port. No
  moving goods between warehouses without a ship or a lorcha.

## Questions to answer before implementing

1. **How many foreign warehouses**, and can there be one in every port?
2. **How is one acquired?** A random offer (like ships and guns), a menu option in
   every port, or an event? What does it cost, and does the cost grow over time?
3. **Is there ongoing upkeep?** If so, what happens when you can't pay: are the goods
   seized, or is the debt added to Wu's?
4. **Which hazards apply abroad?** Fire, the opium police, theft, and Li Yuen raiding
   your warehouse if you haven't paid him?
5. **Can foreign warehouses be upgraded,** like Hong Kong's?
6. **How do the lorcha and foreign warehouses interact?** Can a lorcha move goods
   between two foreign warehouses?
7. **What keeps Hong Kong central?** For example, Li Yuen's extortion growing the
   longer you stay away, Wu calling in loans, or repairs only in Hong Kong.
8. **Do stored goods count toward the score?** Today goods aren't counted at all.
9. **Interface:** how are several warehouses shown in the cargo pane on an iPhone? Is
   only the local one shown, or a summary of all of them?
10. **Saved games:** do warehouses become a per-port structure? How are Python saves
    (one warehouse) imported?

## What changes in the code

- `src/engine/hong.ts`: warehouses per port (sizes and goods).
- `src/engine/warehouse.ts`: transfers, upgrades and the new purchase offer.
- `src/engine/safety.ts`: fire, police and theft for each warehouse.
- `src/engine/save.ts`: per-port warehouses, with the Python format as the
  Hong Kong entry.
- `src/ui/panes.ts`: display.
- SPEC.md §10–11.
