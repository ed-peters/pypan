# Wealth curve: what a player is worth after 2, 5 and 10 years

Starting estimates for the money thresholds, rates and prices in the late-game
recommendations (`etc/recommendations/`).

**Calculated on commit 81f21de** (bank interest at 0.5% a month). The figures go out
of date when the game engine changes. To list engine changes since then:

    git log --oneline 81f21de.. -- src/engine

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
| Early (2 years) | 99.8% | 43k | 532k | 4.2M |
| Mid (5 years) | 98.7% | 5.9M | 17.6M | 90M |
| Late (10 years) | 93.8% | 130M | 526M | 1.49B |

### Debt start (no guns)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.9% | 9k | 82k | 1.9M |
| Mid (5 years) | 98.7% | 2.8M | 11.1M | 50M |
| Late (10 years) | 94.2% | 104M | 380M | 1.17B |

The guns start does better. With no cash, the bot fights the early pirates and wins
booty, and it never pays Wu's 10% a month.

### By year (guns start)

| Months | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| 12 | 100% | 6k | 22k | 286k |
| 24 | 100% | 43k | 532k | 4.2M |
| 36 | 100% | 393k | 2.3M | 12M |
| 48 | 99% | 1.8M | 8.1M | 30M |
| 60 | 99% | 5.9M | 17.6M | 90M |
| 72 | 98% | 15M | 33M | 254M |
| 84 | 97% | 27M | 66M | 463M |
| 96 | 96% | 49M | 137M | 761M |
| 108 | 95% | 80M | 302M | 1.11B |
| 120 | 94% | 130M | 526M | 1.49B |

### The middling player's ship and money (guns start)

| Stage | Hold | Guns | Cash on hand | Bank |
|---|---|---|---|---|
| Early (2 years) | 260 | 5 | 30k | 47k |
| Mid (5 years) | 640 | 7 | 163k | 11.8M |
| Late (10 years) | 1,320 | 8 | 686k | 444M |

The middling player is out of debt by year 2 in both starts.

### Where the money comes from (guns start, cumulative medians)

| Stage | Trading | Bank interest | Booty | Robbery | Repairs | Ships | Li Yuen |
|---|---|---|---|---|---|---|---|
| Early (2 years) | 1.0M | 5k | 29k | 0 | 0 | 21k | 0 |
| Mid (5 years) | 25M | 885k | 108k | 133k | 126k | 281k | 1k |
| Late (10 years) | 579M | 43M | 350k | 7.5M | 6.0M | 2.4M | 87k |

| Stage | Share of trading profit: Silk | Opium | Jade | Games with jade |
|---|---|---|---|---|
| Early (2 years) | 17% | 81% | 0% | 0% |
| Mid (5 years) | 5% | 46% | 47% | 28% |
| Late (10 years) | 1% | 14% | 84% | 76% |

### With and without jade (guns start)

| Stage | Jade | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Mid (5 years) | yes (28%) | 17M | 47M | 207M |
| Mid (5 years) | no | 4.0M | 13M | 37M |
| Late (10 years) | yes (76%) | 418M | 742M | 1.66B |
| Late (10 years) | no | 41M | 78M | 171M |

## Findings

1. **Trading is nearly all of it.** Opium carries the early game. Once jade is on the
   market, it carries the late game: with jade, a player ends up about ten times
   richer. Bank interest at 0.5% is about 7% of income, booty under 1%, and
   consignments nothing: their money limit (100,000) is passed by year 2.
2. **Growth slows as the hold fills.** Money multiplies about 25× in year 2, about 4×
   in year 3, and about 2× a year from year 5 on, at the pace of ship upgrades.
3. **The spread is wide and stays wide.** High is about 10× middling early on and about
   3–5× later. Low is about a tenth of middling early on and a quarter later.
4. **Players rarely sink.** About 94% are afloat after 10 years, so the survivors-only
   figures are close to the whole population.
5. **Losses are small.** Robbery is the biggest drain (about 1% of income), then repairs and ships. Li Yuen's demands are negligible late, because
   they scale with time, not wealth.
6. **Scores:** at 10 years, middling scores about 30,000–45,000 (Master Taipan) and
   high about 100,000–120,000 (Ma Tsu). About 35–45% of players reach Ma Tsu's 50,000
   by then. For pypan-85's new ranks, a 10-year game scores about 100,000 at the top
   10%, 120,000–160,000 at the top 5% and 190,000–240,000 at the top 1%. Thresholds
   of roughly 100k, 150k and 250k would therefore mark the top 10%, the top 5% and the
   exceptional. Wealth grows faster than the months that divide it, so longer games
   score higher.

## Implications for tuning

- **Thresholds stated as fixed amounts fall out of date fast:** 1M is a top player at
  2 years and pocket change at 10. Prefer thresholds that scale with time, or with
  the player's own money (as consignments do), or pick the stage a feature is meant
  for and read its threshold from the tables above.
- **The jade expedition's 2,000,000 in the bank** is reached by the middling player
  in year 3, and by the low player in year 4 or 5. Its effect on the late game is
  bigger than any other single event, so any feature balanced against late-game
  wealth needs to state whether jade is assumed.
- **Rates competing with trading:** the middling player's money grows about 6% a
  month from year 5 on, mostly from trading. A 0.5% bank rate is safety, not income.
  Investments meant to rival trading (pypan-60's holdings, pypan-54's traders) need
  several percent a month. The "25% a month" used in pypan-48 and pypan-59 holds only
  in the first two years (about 30% a month in year 2, 13% in year 3).
- **Recommendations that still assume 5% bank interest** (pypan-54, pypan-59 and
  pypan-60) should be revisited.

## Caveats

- The bot is disciplined and knows the price table from the start. A real
  "middling" player probably sits between this bot's low and middling columns,
  especially in the first year.
- It never uses the warehouse, never borrows to trade, and never invests beyond the
  jade expedition (when it has twice the stake in the bank), so it leaves some money
  on the table.
- It ignores the opium police in its plans. Their fines cost it under 0.2% of its
  income (the confiscated opium isn't counted).
- Results move with any change to prices, ship offers or jade, so rerun
  `npm run sim` after balance changes.
