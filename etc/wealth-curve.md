# Wealth curve: what a player is worth after 2, 5 and 10 years

Starting estimates for the money thresholds, rates and prices in the late-game
recommendations (`etc/recommendations/`).

**Calculated after 5019dce, with porcelain offered from month 48 for three-quarters
of the cash position and scores divided by 200** (ventures: godowns and arms
smuggling replacing general cargo and arms, then the jade expedition; the bank and
warehouse transfers in Hong Kong only; bank interest at 0.5% a month). The figures go
out of date when the game engine changes. To list engine changes since then:

    git log --oneline 5019dce.. -- src/engine

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
| Mid (5 years) | 98.3% | 18M | 37M | 92M |
| Late (10 years) | 96.3% | 499M | 983M | 2.37B |

### Debt start (no guns)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.9% | 18k | 190k | 4.1M |
| Mid (5 years) | 97.5% | 10M | 25M | 65M |
| Late (10 years) | 94.4% | 456M | 847M | 2.00B |

The guns start does better. With no cash, the bot fights the early pirates and wins
booty, and it never pays Wu's 10% a month.

### By year (guns start)

| Months | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| 12 | 100% | 7k | 32k | 558k |
| 24 | 100% | 117k | 1.2M | 7.8M |
| 36 | 100% | 2.5M | 8.5M | 24M |
| 48 | 99% | 9.9M | 20M | 49M |
| 60 | 98% | 18M | 37M | 92M |
| 72 | 98% | 34M | 66M | 219M |
| 84 | 97% | 56M | 111M | 505M |
| 96 | 97% | 93M | 237M | 999M |
| 108 | 97% | 225M | 547M | 1.58B |
| 120 | 96% | 499M | 983M | 2.37B |

### The middling player's ship and money (guns start)

| Stage | Hold | Guns | Cash on hand | Bank |
|---|---|---|---|---|
| Early (2 years) | 260 | 5 | 32k | 135k |
| Mid (5 years) | 640 | 8 | 156k | 23M |
| Late (10 years) | 1,360 | 10 | 28M | 535M |

The middling player is out of debt by year 2 in both starts.

### Where the money comes from (guns start, cumulative medians)

| Stage | Trading | Bank interest | Booty | Robbery | Opium seized | Repairs | Ships | Li Yuen |
|---|---|---|---|---|---|---|---|---|
| Early (2 years) | 2.2M | 9k | 28k | 0 | 0 | 7k | 24k | 0 |
| Mid (5 years) | 49M | 2.1M | 126k | 56k | 3.3M | 921k | 305k | 21k |
| Late (10 years) | 1.27B | 52M | 444k | 7.0M | 15M | 17M | 2.6M | 3.9M |

| Stage | Share of trading profit: Silk | Opium | Porcelain |
|---|---|---|---|
| Early (2 years) | 12% | 87% | 0% |
| Mid (5 years) | 5% | 77% | 18% |
| Late (10 years) | 1% | 14% | 85% |

### Porcelain and ventures (at 10 years)

| Start | In the porcelain trade | Bought in (median month) | Porcelain profit (share of income) | Lost to breakage |
|---|---|---|---|---|
| Guns | 98% | 79 | 72% | 12% |
| Debt | 99% | 80 | 74% | 11% |

| Start | Holding godowns | Arms smuggling | Jade mine | Shares (median, of position) | Venture income, share of gross: P10 / P50 / P90 |
|---|---|---|---|---|---|
| Guns | 95% | 93% | 53% | 26% | 3% / 7% / 22% |
| Debt | 93% | 93% | 53% | 25% | 2% / 6% / 21% |

| Backed the jade expedition | Stake (median share of worth) | Expeditions backed (median) | Won per expedition | Position: won at least once | backed, never won |
|---|---|---|---|---|---|
| 93% | 27% | 3 | 32% | 1.30B | 690M |

## Findings

1. **Trading is still most of it, and porcelain carries the late game.** Opium
   carries the first six or seven years; once a player is in the porcelain trade
   (about month 80) it's 85% of trading profit by 10 years. Ventures are about 7% of
   income, the bank 4%, booty and consignments next to nothing.
2. **Fast early, slower middle, porcelain late.** Money multiplies about 40× in year
   2 and 7× in year 3, then about 1.7–2.4× a year in years 4 to 7, and 1.8–2.3× a
   year once porcelain arrives.
3. **The spread is wide late.** High is about 6× middling at 2 years, about 2.5× at
   5 and 10. Low is about half of middling at 10 years.
4. **Porcelain's fee is the biggest fall.** Three-quarters of the cash position in
   one payment shows as a 75% fall in worth (the share isn't counted as an asset), so
   the median worst fall after year 5 is about 62%.
5. **Ventures are a steady second income.** Nearly everyone holds godowns and the
   arms smuggling at 10 years (the bot always buys and tops up), worth about a
   quarter of its position. The jade expedition is offered once both are held.
6. **Players rarely sink.** About 95% are afloat after 10 years, so the survivors-only
   figures are close to the whole population.
7. **Scores** (the final position per month, divided by 200): at 10 years, middling
   scores about 35,000–41,000 (Master Taipan), high about 82,000–98,000 (Ma Tsu), the
   top 5% about 107,000–129,000 (Dragon of the Strait) and the top 1% about
   150,000–196,000 (Lord of Ten Thousand Ships). Jade Emperor (250,000) takes an
   exceptional game or a longer one.

## Implications for tuning

- **Thresholds stated as fixed amounts fall out of date fast:** 1M is a top player at
  2 years and pocket change at 10. Prefer thresholds that scale with time, or with
  the player's own money (as consignments, ventures and the porcelain fee do), or
  pick the stage a feature is meant for and read its threshold from the tables above.
- **The jade expedition's 2,000,000 in the bank** (and the porcelain share's
  2,000,000 cash position, offered from month 48) is reached by the middling player
  in year 2 or 3.
- **Rates competing with trading:** the middling player's money grows about 5% a
  month in years 4 to 7, and 6–7% a month once porcelain arrives. A 0.5% bank rate is safety, not income, and the
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
