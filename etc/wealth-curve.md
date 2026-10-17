# Wealth curve: what a player is worth after 2, 5 and 10 years

Starting estimates for the money thresholds, rates and prices in the late-game
recommendations (`etc/recommendations/`).

**Calculated after 0c8f21b, with porcelain's breakage raised** (porcelain as the
top good, bought into for half your fortune; the jade expedition paying out once;
bank interest at 0.5% a month). The figures go out of date when the game engine
changes. To list engine changes since then:

    git log --oneline 0c8f21b.. -- src/engine

After any change to prices, ships, pirates, jade or other money rules, rerun the
simulation, update the tables below, and update this commit.

## Method

`scripts/sim/` plays the real engine with one bot, a "decent player," for 1,000 games
per start (seeds 1–1000), and records the player's finances at the first port menu
after 24, 60 and 120 months. Rerun with:

    npm run sim -- --runs 1000 --start guns    # or --start debt

**The bot** knows the port price table (`BASE_PRICES`), so it knows what each good
usually costs where, but not today's prices elsewhere. It:

- sells a good when the local price is at least what it expects at any other port
- buys for whichever destination has the best expected profit, and sails there
- takes every consignment that fits, and sails to its destination
- repays Wu whenever it can, and borrows only for a bailout when broke
- uses the bank (buying from it directly in Hong Kong), keeping enough cash for the
  dearest new ship it might be offered
- pays Li Yuen, repairs fully, buys every bigger ship it can afford, and keeps about
  one gun per 50 of hold
- backs the jade expedition whenever it has twice the stake in the bank
- buys into the porcelain trade whenever it's offered, and doesn't allow for
  porcelain breaking when it plans
- fights when it has at least half as many guns as there are pirates, and otherwise
  runs

**Low, middling and high success** are the 25th, 50th and 90th percentiles of this one
bot. Only ships still afloat are counted; survival is shown separately.

**Cash position** is cash + bank − debt, the figure the score uses. Goods aboard don't
count. Amounts are in k (thousands), M (millions) and B (billions).

## Results

### Guns start (no debt)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.8% | 43k | 536k | 4.1M |
| Mid (5 years) | 98.3% | 4.2M | 14.2M | 54M |
| Late (10 years) | 92.0% | 134M | 406M | 1.16B |

### Debt start (no guns)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.9% | 8k | 82k | 1.9M |
| Mid (5 years) | 97.4% | 2.9M | 9.8M | 43M |
| Late (10 years) | 92.0% | 101M | 351M | 1.11B |

The guns start does better. With no cash, the bot fights the early pirates and wins
booty, and it never pays Wu's 10% a month.

### By year (guns start)

| Months | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| 12 | 100% | 6k | 22k | 286k |
| 24 | 100% | 43k | 536k | 4.1M |
| 36 | 100% | 394k | 2.3M | 13M |
| 48 | 99% | 1.8M | 7.8M | 28M |
| 60 | 98% | 4.2M | 14.2M | 54M |
| 72 | 97% | 11M | 26M | 121M |
| 84 | 97% | 19M | 47M | 267M |
| 96 | 95% | 31M | 87M | 524M |
| 108 | 94% | 65M | 199M | 816M |
| 120 | 92% | 134M | 406M | 1.16B |

### The middling player's ship and money (guns start)

| Stage | Hold | Guns | Cash on hand | Bank |
|---|---|---|---|---|
| Early (2 years) | 260 | 5 | 30k | 48k |
| Mid (5 years) | 630 | 7 | 156k | 9.7M |
| Late (10 years) | 1,310 | 8 | 1.7M | 313M |

The middling player is out of debt by year 2 in both starts.

### Where the money comes from (guns start, cumulative medians)

| Stage | Trading | Bank interest | Booty | Robbery | Opium seized | Repairs | Ships | Li Yuen |
|---|---|---|---|---|---|---|---|---|
| Early (2 years) | 1.0M | 5k | 29k | 0 | 0 | 0 | 21k | 0 |
| Mid (5 years) | 23M | 913k | 113k | 117k | 1.5M | 151k | 282k | 1k |
| Late (10 years) | 586M | 29M | 353k | 9.3M | 11M | 5.3M | 2.4M | 293k |

| Stage | Share of trading profit: Silk | Opium | Porcelain |
|---|---|---|---|
| Early (2 years) | 17% | 81% | 0% |
| Mid (5 years) | 7% | 61% | 31% |
| Late (10 years) | 1% | 18% | 80% |

### Porcelain (at 10 years)

| Start | In the trade | Bought in (median month) | Porcelain profit (share of income) | Lost to breakage |
|---|---|---|---|---|
| Guns | 85% | 81 | 68% | 12% |
| Debt | 82% | 83 | 67% | 10% |

"Lost to breakage" is what the bot paid for porcelain that broke, against its
porcelain profit plus that.

### The jade expedition (guns start, at 10 years)

| Backed | Stake (median share of worth) | Expeditions backed (median) | Won per expedition | Position: won at least once | backed, never won |
|---|---|---|---|---|---|
| 98% | 39% | 3 | 33% | 476M | 283M |

## Findings

1. **Porcelain carries the late game, as jade did.** Once a player is in the trade it
   is about two-thirds of income by 10 years, and the late-game curve is most of the
   way back to where it was with jade (the middling player at 10 years: 406M,
   against 510M with jade and 100M with neither). Opium carries the first five years. Bank interest at 0.5% is
   about 6% of income, booty under 1%, and consignments nothing: their money limit
   (100,000) is passed by year 2.
2. **The share comes late.** The offer needs a Hong Kong arrival, a cash position
   over 2,000,000 and a 1-in-20 roll that only reaches 1-in-3 by month 76, so the
   median player buys in around month 81 (year 7). Wealth then grows about 1.9–2.3× a
   year in years 8 to 10, against about 1.8× in years 6 and 7.
3. **Breakage is a real cost.** The bot loses about 10–12% of its porcelain profit
   to breakage, and the middling fortune at 10 years is about a fifth lower than
   with half the breakage (525M).
4. **The fee is a big, visible cut.** Half the cash position goes in one payment
   (worth here doesn't count the share as an asset), so it shows up as a 50% fall.
   It pays back fast: the middling player is several times richer two years after
   the median buy-in (month 81) than just before it.
5. **The spread is wide.** High is about 8× middling at 2 years and about 3× at 10.
   Low is about a third of middling at 10 years.
6. **The jade expedition matters less again.** Next to porcelain it's 1–2% of
   income, and players who win it end up about 1.7× as rich as those who never do.
7. **Players rarely sink.** About 93% are afloat after 10 years, so the survivors-only
   figures are close to the whole population.
8. **Scores:** at 10 years, middling scores about 29,000–34,000 (Master Taipan) and
   high about 92,000–96,000 (Ma Tsu, just short of Dragon of the Strait's 100,000).
   The top 5% score about 127,000 (Dragon of the Strait) and the top 1% about
   207,000 (Lord of Ten Thousand Ships); Jade Emperor (250,000) takes an exceptional
   game or a longer one.

## Implications for tuning

- **Thresholds stated as fixed amounts fall out of date fast:** 1M is a top player at
  2 years and pocket change at 10. Prefer thresholds that scale with time, or with
  the player's own money (as consignments and the porcelain fee do), or pick the
  stage a feature is meant for and read its threshold from the tables above.
- **The jade expedition's 2,000,000 in the bank** (and the porcelain share's
  2,000,000 cash position) is reached by the middling player in year 3, and by the
  low player in year 4 or 5.
- **When porcelain arrives sets the late game.** A faster ramp (or a lower fee)
  would bring the late-game wealth forward; a slower one would leave more games on
  opium alone.
- **Rates competing with trading:** the middling player's money grows about 13% a
  month in year 3, 10% in year 4 and 5% in year 5, and 5–7% a month once porcelain
  arrives. A 0.5% bank rate
  is safety, not income. Investments meant to rival trading (pypan-60's holdings,
  pypan-54's traders) need several percent a month.
- **Recommendations that still assume 5% bank interest** (pypan-54, pypan-59 and
  pypan-60) should be revisited.

## Caveats

- The bot is disciplined and knows the price table from the start. A real
  "middling" player probably sits between this bot's low and middling columns,
  especially in the first year.
- It never uses the warehouse (where porcelain is safe), never borrows to trade, and
  never invests beyond the jade expedition and the porcelain share, so it leaves
  some money on the table. It backs every expedition and buys every share it can,
  which a cautious player wouldn't.
- It ignores the opium police in its plans. Their fines cost it under 0.2% of its
  income (the confiscated opium isn't counted).
- Results move with any change to prices, ship offers, porcelain or jade, so rerun
  `npm run sim` after balance changes.
