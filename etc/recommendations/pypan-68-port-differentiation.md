# pypan-68: Port differentiation (epic)

## The pitch

> **Port investment:** spend cash to build a warehouse in Nagasaki, a repair yard in
> Manila. Now ports are yours in a meaningful way and you have something to protect.
>
> **Political instability:** ports periodically fall under blockade, pirate control,
> or colonial administration changes, each shifting prices and access rules.
>
> **Exclusive relationships:** bribe or cultivate a specific merchant house in a port
> for preferential pricing. Each house has a personality and competing interests.

| Bead | Feature | Depends on |
|---|---|---|
| pypan-52 | Warehouses in other ports (already filed) | — |
| pypan-69 | Port investment: repair yards and other facilities | — |
| pypan-70 | Political instability | pypan-64 (persistent market) |
| pypan-71 | Exclusive relationships with merchant houses | pypan-76 (named rivals) |

## How the pitch fits this game

**Ports today differ in only two ways:**
- **Prices:** each port has its own price profile per good (pypan-45).
- **Hong Kong's services:** Hong Kong has everything else — the bank, Wu, McHenry,
  free transfers and the warehouse.

The other six ports are interchangeable apart from prices.

**Existing overlaps:**
- **Warehouses:** "a warehouse in Nagasaki" is already pypan-52, so it's part of this
  epic rather than a new bead.
- **The squeeze:** pypan-62 already proposes ports closing to you after a squeeze. That
  is one kind of instability.
- **Recurring risk:** in pypan-52, owning things abroad weakens Hong Kong as the hub.
  It applies to every port investment.

## Recommendation

- **A shared "port state":** give each port a small state alongside the market state
  in pypan-64: who controls it, whether it's blockaded, what's illegal there, and what
  you own there. All three new features read and write it.
- **Each port should have a character,** and the features should reinforce it:
  - **Nagasaki:** isolationist politics.
  - **Manila:** Spanish administration.
  - **Saigon:** French takeover.
  - **Singapore:** a free port.
  - **Batavia:** Dutch monopolies.
  - **Shanghai:** treaty-port politics.
- **Order:** pypan-52 and pypan-69 first. They're self-contained and give players
  something to protect. Then pypan-70, which threatens what they've built. pypan-71
  comes with the named houses (pypan-76).

## Questions that cut across the epic

1. **Should Hong Kong stay the hub?** Every feature here makes other ports more
   self-sufficient. What keeps players coming home (see pypan-52)?
2. **How historical should port politics be?** Real powers (Spain, France, the
   Netherlands, Japan), or invented ones?
3. **How much per-port interface?** A "port info" screen, or just messages on arrival?
4. **Do the new ports from pypan-57 get the same treatment?**
