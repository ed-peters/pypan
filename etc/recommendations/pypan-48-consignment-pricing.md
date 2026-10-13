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

## Parameters

* Value is fixed at offer time: set when the consignment is offered and doesn't
  change before delivery.

* Value has a minimum, so poor or indebted players still get a sensible offer. Use
  the current formula.

* Value varies +/- 20% around a base rate of 15%, which is stored as a constant:
  `CONSIGNMENT_RATE = 0.15` in `src/engine/constants.ts`, for tuning.

* Values are subject to a "price shock" just like goods. If offering a consignment,
  on a random chance of 1 in 15, the computed value is tripled. The message offering
  the consignment should be prepended with "Good joss!!".

* For calculating the value, use "cash + bank - debt" as the player's money,
  and ignore current goods in the hold or the warehouse.

* If a player has >100,000 in money, they will not be offered consignments. If a player 
  has no  or negative money, the chance of being offered a consignment should raise to 
  1 in 3, as a "life line".

* Pay should drop if delivery is late. When holding a consignment, if the player
  arrives at a port other than the target, the compradore should say "Taipan, we
  are still committed to deliver ((good)) to ((port))". For each month it's late,
  the value reduced by 20%. After 5 months, the compradore should report, "Taipan,
  we have missed the deliver window, and offloaded the ((good)) that was bound for
  ((port))."

* Consignments cannot be dumped.

* Let's create a new feature for later called "Illegal consigments".
