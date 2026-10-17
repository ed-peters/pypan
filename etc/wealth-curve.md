# Wealth curve: what a player is worth after 2, 5 and 10 years

Starting estimates for the money thresholds, rates and prices in the late-game
recommendations (`etc/recommendations/`).

**Calculated after 02d48fd, with the improved bot** (ventures: godowns and arms
smuggling replacing general cargo and arms, then the jade expedition; porcelain as
the top good; the bank and warehouse transfers in Hong Kong only; bank interest at
0.5% a month). The figures go out of date when the game engine changes. To list
engine changes since then:

    git log --oneline 02d48fd.. -- src/engine

**The bot was improved at the same time,** which roughly doubled every figure here
compared with earlier versions of this page. It used to sell a good only when the
price beat what it expected at any other port, so cheap goods clogged its hold, and
it rarely went home. Earlier figures (and those in the older sections of
`etc/game-analysis.md`) understate what a decent player makes.

After any change to prices, ships, pirates, jade or other money rules, rerun the
simulation, update the tables below, and update this commit.

## Method

`scripts/sim/` plays the real engine with one bot, a "decent player," for 1,000 games
per start (seeds 1–1000), and records the player's finances at the first port menu
after 24, 60 and 120 months. Rerun with:

    npm run sim -- --runs 1000 --start guns    # or --start debt

**The bot** knows the port price table (`BASE_PRICES`), so it knows what each good
usually costs where, but not today's prices elsewhere. It:

- plans each port as if it had sold everything aboard (goods sell for what they cost
  there), fills the hold for whichever destination has the best expected profit,
  sells only what that plan doesn't keep, and sails there
- heads home to Hong Kong after six voyages away
- takes every consignment that fits, and sails to its destination
- repays Wu whenever it can, and borrows only for a bailout when broke
- uses the bank (buying from it directly in Hong Kong), keeping enough cash for the
  dearest new ship it might be offered
- pays Li Yuen, repairs fully, buys every bigger ship it can afford, and keeps about
  one gun per 50 of hold
- buys into the godowns and the arms smuggling (and adds to them) whenever offered,
  backs the jade expedition whenever it has twice the stake in the bank, and pays
  every call for funds
- buys into the porcelain trade whenever it's offered, and doesn't allow for
  porcelain breaking when it plans
- fights when it has at least half as many guns as there are pirates, and otherwise
  runs

**Low, middling and high success** are the 25th, 50th and 90th percentiles of this one
bot. Only ships still afloat are counted; survival is shown separately.

**Cash position** here is the final position the score uses: cash + bank − debt, plus
any share in the jade mine. Goods aboard don't count. Amounts are in k (thousands), M (millions) and B (billions).

## Results

### Guns start (no debt)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.9% | 117k | 1.2M | 7.8M |
| Mid (5 years) | 98.4% | 21M | 50M | 240M |
| Late (10 years) | 96.0% | 972M | 1.46B | 3.08B |

### Debt start (no guns)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.9% | 18k | 190k | 4.1M |
| Mid (5 years) | 97.7% | 12M | 32M | 199M |
| Late (10 years) | 94.8% | 856M | 1.32B | 2.62B |

The guns start does better. With no cash, the bot fights the early pirates and wins
booty, and it never pays Wu's 10% a month.

### By year (guns start)

| Months | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| 12 | 100% | 7k | 32k | 558k |
| 24 | 100% | 117k | 1.2M | 7.8M |
| 36 | 100% | 1.7M | 7.9M | 25M |
| 48 | 99% | 8.2M | 21M | 82M |
| 60 | 98% | 21M | 50M | 240M |
| 72 | 98% | 47M | 119M | 552M |
| 84 | 97% | 128M | 315M | 980M |
| 96 | 97% | 318M | 625M | 1.58B |
| 108 | 97% | 617M | 1.01B | 2.34B |
| 120 | 96% | 972M | 1.46B | 3.08B |

### The middling player's ship and money (guns start)

| Stage | Hold | Guns | Cash on hand | Bank |
|---|---|---|---|---|
| Early (2 years) | 260 | 5 | 32k | 135k |
| Mid (5 years) | 660 | 8 | 200k | 26M |
| Late (10 years) | 1,370 | 10 | 40M | 928M |

The middling player is out of debt by year 2 in both starts.

### Where the money comes from (guns start, cumulative medians)

| Stage | Trading | Bank interest | Booty | Robbery | Opium seized | Repairs | Ships | Li Yuen |
|---|---|---|---|---|---|---|---|---|
| Early (2 years) | 2.2M | 9k | 28k | 0 | 0 | 7k | 24k | 0 |
| Mid (5 years) | 67M | 2.2M | 117k | 72k | 2.9M | 832k | 315k | 25k |
| Late (10 years) | 1.67B | 107M | 438k | 23M | 13M | 17M | 2.7M | 8.9M |

| Stage | Share of trading profit: Silk | Opium | Porcelain |
|---|---|---|---|
| Early (2 years) | 12% | 87% | 0% |
| Mid (5 years) | 2% | 32% | 65% |
| Late (10 years) | 1% | 10% | 90% |

### Porcelain and ventures (at 10 years)

| Start | In the porcelain trade | Bought in (median month) | Porcelain profit (share of income) | Lost to breakage |
|---|---|---|---|---|
| Guns | 99% | 60 | 74% | 12% |
| Debt | 99% | 62 | 75% | 11% |

| Start | Holding godowns | Arms smuggling | Jade mine | Shares (median, of position) | Venture income, share of gross: P10 / P50 / P90 |
|---|---|---|---|---|---|
| Guns | 95% | 93% | 56% | 25% | 4% / 9% / 29% |
| Debt | 94% | 93% | 56% | 24% | 4% / 9% / 28% |

| Backed the jade expedition | Stake (median share of worth) | Expeditions backed (median) | Won per expedition | Position: won at least once | backed, never won |
|---|---|---|---|---|---|
| 98% | 28% | 3 | 33% | 1.67B | 1.11B |

## Findings

1. **Trading is still most of it, and porcelain carries the late game.** Opium
   carries the first five years; once a player is in the porcelain trade (about
   month 60) it's 90% of trading profit. Ventures are about 9% of income, the bank
   5%, booty and consignments next to nothing.
2. **A decent player gets rich fast.** Money multiplies about 40× in year 2, 6× in
   year 3, and 2–2.7× a year from year 4 to year 8, slowing to about 1.5× by year 10.
3. **The spread is moderate.** High is about 6× middling at 2 years and about 2× at
   10. Low is about two-thirds of middling at 10 years.
4. **Ventures are a steady second income.** Nearly everyone holds godowns and the
   arms smuggling at 10 years (the bot always buys and tops up), worth about a
   quarter of its position. The jade expedition is offered once both are held.
5. **Players rarely sink.** About 95% are afloat after 10 years, so the survivors-only
   figures are close to the whole population.
6. **Scores outgrow the ranks.** At 10 years, middling scores about 110,000–120,000
   (Dragon of the Strait), high about 215,000–255,000 (Lord of Ten Thousand Ships or
   Jade Emperor), the top 5% about 280,000–305,000 and the top 1% about
   400,000–450,000. With
   the better bot, the ranks set in pypan-85 (Ma Tsu at 50,000, Jade Emperor at
   250,000) are too easy and should be rescaled.

## Implications for tuning

- **Thresholds stated as fixed amounts fall out of date fast:** 1M is a top player at
  2 years and pocket change at 10. Prefer thresholds that scale with time, or with
  the player's own money (as consignments, ventures and the porcelain fee do), or
  pick the stage a feature is meant for and read its threshold from the tables above.
- **The jade expedition's 2,000,000 in the bank** (and the porcelain share's
  2,000,000 cash position) is reached by the middling player in year 2 or 3.
- **Rates competing with trading:** the middling player's money grows about 6–9% a
  month from year 4 to year 8. A 0.5% bank rate is safety, not income, and the
  ventures' few percent a quarter are a sideline.
- **Recommendations that still assume 5% bank interest** (pypan-54, pypan-59 and
  pypan-60) should be revisited.

## Caveats

- The bot is disciplined, knows the price table from the start, and replans every
  port. A real "middling" player probably sits between this bot's low and middling
  columns, especially in the first year.
- It never uses the warehouse (where porcelain is safe) and never borrows to trade,
  so it leaves some money on the table. It backs every expedition and buys every
  share it can, which a cautious player wouldn't.
- It ignores the opium police in its plans. Fines and seized opium cost it about 2%
  of its income.
- Results move with any change to prices, ship offers, porcelain, ventures or jade,
  or to the bot, so rerun
  `npm run sim` after balance changes.
