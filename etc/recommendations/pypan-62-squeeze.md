# pypan-62: The squeeze

Part of pypan-59 (corner the market). Depends on pypan-60 (supply holdings). Its
consequences mostly come from pypan-61 (rivals).

## Proposal

Once you control enough of a good's supply, you can restrict it, spiking its price in
every port at once. You make a fortune in the short term. In return, ports starve,
political instability follows, and the merchant houses you've cultivated for years
become your enemies.

## How it fits today

- **Prices are rolled fresh on each arrival,** for one port only (`setPrices` in
  `src/engine/prices.ts`). Nothing remembers prices across ports. A squeeze needs a
  **shared modifier for each good** that `setPrices` applies in every port.
- **Price shocks already do this for one port:** `establishPrices` multiplies a good's
  price by 5–9 with a themed message. A squeeze is the same effect, everywhere, for
  several months, caused by the player.
- **Profiting from a squeeze** means owning the good when its price spikes. Today that's
  the ship's hold or the Hong Kong warehouse. pypan-52 (foreign warehouses) would make
  that easier.

## Recommendation

**When you can squeeze:** once you control enough of a good's supply, for example half
or more of its holdings, "Squeeze the market" appears on the port menu.

**What the squeeze does:**
- **Price:** for **3 months** the good's price is multiplied by **2–4** in every port.
  The price keeps the good's usual step size (pypan-53). Your holdings in that good pay
  double.
- **Messages:** themed news reports, such as "Silk is scarce from Shanghai to Batavia,
  Taipan! Prices have soared!"
- **Once only:** you can't squeeze the same good again until some time after it ends.

**What it costs:**
- **Rival hostility** (pypan-61) in that good **jumps to the maximum**. Hostility in
  other goods rises too.
- **A port may close to you:** one port in turmoil refuses to trade with you for a few
  months.
- **Harsher authorities:** the police seize more for a while, Li Yuen's next donation
  costs more, and Wu may raise his rate.
- **Merchant houses:** if they're named characters (pypan-61, pypan-54), they remember.
  Borrowers refuse to repay, and offers dry up.

**The profit has to beat the cost.** A squeeze should be a big, deliberate move: stock
up first, then squeeze, then sell into the spike. Then deal with the fallout.

## Questions to answer before implementing

1. **What triggers it:** a share of control, a number of holdings, or holdings in a
   number of ports? Is the squeeze a menu action or an offer?
2. **How big a spike, for how long?** A multiplier like a price shock's 5–9, or smaller
   but everywhere? Does it come on gradually or all at once?
3. **Can you squeeze several goods at once?** How long before you can squeeze the same
   good again?
4. **What does "starves ports" mean in play?** Port closures, unrest that triggers
   events (riots, looting your warehouse), or worse prices for other goods?
5. **What does "political instability" mean?** Police, Li Yuen, Wu, the bank, or a new
   authority (the Viceroy, or a British trade commissioner)?
6. **Who are your enemies afterwards,** and how long do they stay enemies? Is it
   possible to make peace?
7. **Can rivals squeeze you,** for example spiking a good you hold or crashing its
   price?
8. **Price shocks during a squeeze:** do random shocks in that good still happen, and
   do they combine with the squeeze multiplier?
9. **Interface:** how does the player know a squeeze is active, and how long it has
   left? A line on the market report?
10. **Saved games:** squeeze state per good (multiplier, months left, cooldown) and any
    port closures.

## What changes in the code

- `src/engine/prices.ts`: apply the squeeze multiplier in every port, keeping each
  good's step size.
- `src/engine/trade.ts`: squeeze messages; how squeezes and shocks interact.
- `src/engine/holdings.ts`: when you can squeeze, and the doubled royalty.
- `src/engine/pypan.ts`: the menu option.
- Port closures in the menu and on arrival.
- `src/engine/hong.ts` and `src/engine/save.ts`: squeeze state.
- SPEC.md §4.
