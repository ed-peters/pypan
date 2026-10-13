# pypan-60: Supply holdings and royalties

Part of pypan-59 (corner the market).

## Proposal

Spend a large lump sum to buy up the supply of a good in a region, for example
general cargo godowns in Saigon or silk looms in Manila. From then on the holding pays
you a royalty every month, wherever you are.

## How it fits today

- **No other trade exists to tax.** The game has no other ships, only the player, so
  "a percentage of every shipment" has to be **abstracted** into a monthly return.
- **The monthly tick:** `accrueInterest` in `src/engine/bank.ts` runs on every arrival.
  The royalty belongs beside it.
- **Unit prices vary enormously:** from about 5 for general cargo to about 240,000 for
  jade. A royalty based on the volume of a good's trade would make general cargo
  holdings worthless. **The return should be a percentage of what the holding cost.**

## Recommendation

**What a holding is:** one good in one port, for example "General cargo in Saigon". A
holding has:

- **A purchase price** that scales with the good's magnitude and with time. For
  example, general cargo 200,000, arms 400,000, silk 800,000, opium 2,000,000 and jade
  5,000,000, all times a time factor like the ship and gun offers.
- **A monthly yield:** a percentage of the purchase price, paid on every arrival.
  Suggest **8–10%** before rivals' losses (pypan-61). That beats the bank's 5% but stays
  well below active trading.
- **Shares:** a holding can be bought in **shares**, for example quarters, so control
  builds up gradually. Control feeds the squeeze (pypan-62).

**Buying:**
- **When:** an occasional offer on arrival ("The owners of the general cargo godowns in
  Saigon are willing to sell a quarter share for 50,000, Taipan."), unlocked late.
- **Where:** only in the port where the holding is, so the player has to go there.

**Selling:** a holding can be sold back at a discount (for example 70%), so it can be
cashed out when retiring.

**Flavor:** the general cargo holding comes with a line like "Nobody else wanted the
rice trade, Taipan." That signals that low-value holdings are safe.

## Questions to answer before implementing

1. **Unit of ownership:** one good in one port, one good everywhere, or a "region"
   (several ports)? One good in one port is simplest and gives seven times five
   possible holdings.
2. **Shares or all-or-nothing?** Shares make the squeeze threshold meaningful, but add
   state and interface.
3. **What does a holding cost**, and does the cost grow with time, with the good's
   value, or with how much of that good you already own?
4. **What does it yield?** A flat percentage, a percentage that varies with the good's
   current price in that port, or one that varies randomly month to month? Is it
   **paid while at sea and away**, or only on arrival in that port? The pitch says
   "whether you're paying attention or not", which suggests every month.
5. **Does owning a holding change your own trading?** For example, buying that good
   in that port at a discount.
6. **How is it unlocked:** by rank, cash position or year? Is it offered at random, or
   available on a menu?
7. **Can you sell holdings,** and at what discount? Do unsold holdings count toward the
   score at retirement?
8. **Where does the royalty go:** cash on hand (risk of muggings) or the bank?
9. **Interface:** how are holdings listed? Is the monthly royalty reported on arrival
   ("Your holdings paid 42,000 this month, Taipan.")?
10. **Saved games:** a list of holdings (good, port, shares, price paid), written only
    when non-empty.

## What changes in the code

- A new `src/engine/holdings.ts` with offers, the monthly yield and selling.
- `src/engine/hong.ts` and `src/engine/save.ts`: holdings.
- `src/engine/voyage.ts`: offers and royalties on arrival.
- `src/engine/constants.ts`: prices, yield and sale discount.
- `src/engine/score.ts`: if holdings count.
- `src/ui/panes.ts`: holdings display.
- A new SPEC.md section.
