# Wealth curve: what a player is worth after 2, 5 and 10 years

Starting estimates for the money thresholds, rates and prices in the late-game
recommendations (`etc/recommendations/`).

**Calculated with pypan-86 in place** (the commit after f38d9f3: four goods, and the
jade expedition paying out once instead of bringing jade to market; bank interest
at 0.5% a month). The figures go out of date when the game engine changes. To list
engine changes since then:

    git log --oneline f38d9f3.. -- src/engine

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
| Early (2 years) | 99.9% | 32k | 568k | 4.4M |
| Mid (5 years) | 97.7% | 5.4M | 16.4M | 45M |
| Late (10 years) | 91.6% | 60M | 100M | 223M |

### Debt start (no guns)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.9% | 9k | 110k | 2.0M |
| Mid (5 years) | 96.9% | 2.6M | 10.4M | 36M |
| Late (10 years) | 91.8% | 43M | 78M | 181M |

The guns start does better. With no cash, the bot fights the early pirates and wins
booty, and it never pays Wu's 10% a month.

### By year (guns start)

| Months | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| 12 | 100% | 6k | 19k | 348k |
| 24 | 100% | 32k | 568k | 4.4M |
| 36 | 100% | 453k | 2.6M | 13M |
| 48 | 99% | 1.9M | 7.4M | 27M |
| 60 | 98% | 5.4M | 16.4M | 45M |
| 72 | 97% | 12M | 25M | 72M |
| 84 | 96% | 20M | 39M | 102M |
| 96 | 95% | 32M | 57M | 132M |
| 108 | 93% | 44M | 74M | 177M |
| 120 | 92% | 60M | 100M | 223M |

### The middling player's ship and money (guns start)

| Stage | Hold | Guns | Cash on hand | Bank |
|---|---|---|---|---|
| Early (2 years) | 260 | 5 | 29k | 42k |
| Mid (5 years) | 630 | 7 | 163k | 12.0M |
| Late (10 years) | 1,310 | 8 | 668k | 90M |

The middling player is out of debt by year 2 in both starts.

### Where the money comes from (guns start, cumulative medians)

| Stage | Trading | Bank interest | Booty | Robbery | Opium seized | Repairs | Ships | Li Yuen |
|---|---|---|---|---|---|---|---|---|
| Early (2 years) | 1.0M | 6k | 28k | 0 | 0 | 0 | 20k | 0 |
| Mid (5 years) | 23M | 883k | 112k | 147k | 1.1M | 125k | 291k | 1k |
| Late (10 years) | 128M | 15M | 355k | 4.2M | 10M | 6.9M | 2.4M | 837k |

| Stage | Share of trading profit: Silk | Opium |
|---|---|---|
| Early (2 years) | 17% | 80% |
| Mid (5 years) | 10% | 88% |
| Late (10 years) | 9% | 91% |

### The jade expedition (guns start, at 10 years)

| Backed | Stake (median share of worth) | Expeditions backed (median) | Won per expedition | Position: won at least once | backed, never won |
|---|---|---|---|---|---|
| 98% | 40% | 3 | 33% | 121M | 67M |

| Stage | Won jade | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Mid (5 years) | yes (26%) | 18M | 30M | 71M |
| Mid (5 years) | no | 3.2M | 12M | 33M |
| Late (10 years) | yes (62%) | 83M | 121M | 258M |
| Late (10 years) | no | 34M | 64M | 150M |

## Findings

1. **Trading is still most of it, but opium is now the top good.** Opium carries
   the whole game: 80–90% of trading profit. With no jade to graduate to, late-game
   wealth is about a fifth of what it was (the middling player at 10 years: 100M,
   down from 526M), until pypan-87 adds porcelain. Bank interest at 0.5% is about 9%
   of income, booty under 1%, and consignments nothing: their money limit (100,000)
   is passed by year 2.
2. **Growth slows as the hold fills, and then as opium saturates.** Money multiplies
   about 25× in year 2, about 4× in year 3, and only about 1.3–1.5× a year from year
   6 on.
3. **The spread narrows late.** High is about 8× middling at 2 years and about 2×
   at 10. Low is about half of middling at 10 years.
4. **The jade expedition is now a real bet.** The bot stakes about 40% of its worth
   on each of three expeditions. Two players in three win at least once, and end
   up about twice as rich as those who never do (121M against 67M at 10 years).
5. **Players rarely sink.** About 92% are afloat after 10 years, so the survivors-only
   figures are close to the whole population.
6. **Scores:** at 10 years, middling scores about 6,500–8,300 (Taipan or Master
   Taipan) and high about 15,000–18,000 (Master Taipan). Almost nobody reaches Ma
   Tsu's 50,000: the top 1% score about 44,000. The ranks (and pypan-85's proposed
   new ones) were set when jade carried the late game, so they need revisiting once
   porcelain (pypan-87) settles the late-game curve.

## Implications for tuning

- **Thresholds stated as fixed amounts fall out of date fast:** 1M is a top player at
  2 years and pocket change at 10. Prefer thresholds that scale with time, or with
  the player's own money (as consignments do), or pick the stage a feature is meant
  for and read its threshold from the tables above.
- **The jade expedition's 2,000,000 in the bank** is reached by the middling player
  in year 3, and by the low player in year 4 or 5.
- **Rates competing with trading:** the middling player's money grows about 6% a
  month in years 3 to 5, and about 3% a month after that. A 0.5% bank rate is safety,
  not income. Investments meant to rival trading (pypan-60's holdings, pypan-54's
  traders) need a few percent a month.
- **Recommendations that still assume 5% bank interest** (pypan-54, pypan-59 and
  pypan-60) should be revisited.

## Caveats

- The bot is disciplined and knows the price table from the start. A real
  "middling" player probably sits between this bot's low and middling columns,
  especially in the first year.
- It never uses the warehouse, never borrows to trade, and never invests beyond the
  jade expedition, so it leaves some money on the table. It backs every expedition
  it can, which a cautious player wouldn't.
- It ignores the opium police in its plans. Their fines cost it under 0.2% of its
  income (the confiscated opium isn't counted).
- Results move with any change to prices, ship offers or jade, so rerun
  `npm run sim` after balance changes.
