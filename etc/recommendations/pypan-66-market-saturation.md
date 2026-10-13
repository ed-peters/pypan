# pypan-66: Market saturation

Part of pypan-63 (market depth). Depends on pypan-64 (persistent market model).

## Proposal

Sell too much of one good in a port and its price collapses until demand recovers.
That forces diversification and route planning.

## How it fits today

- **No limit on selling:** you can sell any quantity at the posted price.
- **The dominant strategy is simple:** fill the hold with the most valuable good you
  can afford (eventually jade, worth about 32,000 per unit per voyage), and sell it
  wherever it's dear.
- **Saturation is the first feature that challenges that strategy,** so it shifts the
  balance of the whole game.

## Recommendation

**Two effects:**

- **Within a sale:** the price falls as you sell. For example, each unit sold beyond a
  port's "depth" for that good lowers the price for the rest of the sale. The sell
  prompt shows the expected total, not just the posted price.
- **Across months:** after you sell, that port's `demand` for the good (pypan-64) drops
  in proportion to what you sold. It recovers over a few months.

**Depth** is the amount a port absorbs before prices drop. It varies:
- **By good:** large for general cargo, small for jade.
- **By port:** larger in big ports like Shanghai and Singapore.

**Buying could work the same way:** buying a lot raises the price. That stops players
clearing out a cheap market in one visit.

**The effect:** a hold full of jade can no longer be sold in one port. You spread it
across ports and goods, which is exactly the "route planning" in the pitch.

## Questions to answer before implementing

1. **Within a sale, across months, or both?** Within-sale only is simpler and needs no
   saved state. Across months is what "collapses until demand recovers" means.
2. **"Permanently until demand recovers":** how long is that? Months, or years for a
   very large dump?
3. **What are the depths?** Per good and per port, and do they grow over time as trade
   grows?
4. **Does buying move the price too?**
5. **How does the player see it?** Show the price falling during entry? Show "glut" or
   "scarce" in the market report?
6. **Rebalancing:** saturation will cut trading income. Do consignment pricing
   (pypan-48, sized against 25% a month), Li Yuen's demands and the score ranks need
   re-tuning?
7. **Do rivals (pypan-76) saturate markets too,** so prices move even where you haven't
   traded?
8. **The squeeze (pypan-62)** is the opposite of saturation. Should they use the same
   mechanism?

## What changes in the code

- `src/engine/trade.ts`: buy and sell pricing with depth, and the new prompts.
- `src/engine/prices.ts`: demand from pypan-64.
- `src/engine/constants.ts`: depths and recovery rate.
- Tests: falling price within a sale; recovery over months.
- SPEC.md §4.
