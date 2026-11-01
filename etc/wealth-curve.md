# Wealth curve: what a player is worth after 2, 5 and 10 years

Starting estimates for the money thresholds, rates and prices in the late-game
recommendations (`etc/recommendations/`).

**Calculated with pypan-96's earlier porcelain (offered from month 36 for
three-quarters of the cash position), the arms smuggling held back until porcelain,
and scores divided by 330** (the bank opens only
once it invites the player, after three arrivals in a row at a cash position of
20,000 or more; ventures: godowns and arms smuggling replacing general cargo and
arms, then the jade expedition; the bank and warehouse transfers in Hong Kong only;
bank interest at 0.5% a month; debt interest rounded up). The figures go out of date
when the game engine changes. To list engine changes since this page was last
updated:

    git log --oneline $(git log -1 --format=%h -- etc/wealth-curve.md).. -- src/engine

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
- opens a bank account as soon as it's invited, then uses the bank (buying from it
  directly in Hong Kong), keeping enough cash for the dearest new ship it might be
  offered
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
| Early (2 years) | 99.9% | 97k | 1.4M | 8.0M |
| Mid (5 years) | 99.0% | 9.3M | 34M | 184M |
| Late (10 years) | 95.5% | 1.06B | 1.52B | 3.09B |

### Debt start (no guns)

| Stage | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| Early (2 years) | 99.7% | 12k | 126k | 3.9M |
| Mid (5 years) | 97.5% | 4.7M | 22M | 150M |
| Late (10 years) | 94.3% | 877M | 1.33B | 2.70B |

The guns start does better. With no cash, the bot fights the early pirates and wins
booty, and it never pays Wu's 10% a month.

### By year (guns start)

| Months | Afloat | Low (P25) | Middling (P50) | High (P90) |
|---|---|---|---|---|
| 12 | 100% | 7k | 22k | 627k |
| 24 | 100% | 97k | 1.4M | 8.0M |
| 36 | 100% | 2.0M | 7.7M | 23M |
| 48 | 99% | 4.2M | 16M | 47M |
| 60 | 99% | 9.3M | 34M | 184M |
| 72 | 99% | 35M | 116M | 467M |
| 84 | 98% | 151M | 337M | 915M |
| 96 | 97% | 390M | 658M | 1.52B |
| 108 | 96% | 688M | 1.04B | 2.23B |
| 120 | 96% | 1.06B | 1.52B | 3.09B |

### The middling player's ship and money (guns start)

| Stage | Hold | Guns | Cash on hand | Bank |
|---|---|---|---|---|
| Early (2 years) | 260 | 5 | 35k | 9k |
| Mid (5 years) | 660 | 7 | 252k | 12M |
| Late (10 years) | 1,390 | 10 | 37M | 962M |

The middling player is out of debt by year 2 in both starts.

### The bank's invitation (pypan-94)

| Start | Opened an account by 10 years | Month opened: P25 | Middling (P50) | P75 |
|---|---|---|---|---|
| Guns | 100% | 17 | 22 | 26 |
| Debt | 100% | 22 | 27 | 33 |

The bot only goes home every six voyages, and the invitation waits for Hong Kong, so
it opens its account later than its money alone would allow (the middling guns
player is past 20,000 by month 12). Until then it carries its cash, which it trades
with, so the middling guns player is a little richer at 2 years than before.

### Goods on the market (pypan-96)

No game, in either start, has a single voyage after month 12 with only two goods or
fewer on the market: the arms smuggling isn't offered until the player is in the
porcelain trade, so arms stays on the market until porcelain joins it. (Before this,
the median game spent 45 voyages in a row with only silk and opium.)

### Where the money comes from (guns start, cumulative medians)

| Stage | Trading | Bank interest | Booty | Robbery | Opium seized | Repairs | Ships | Li Yuen |
|---|---|---|---|---|---|---|---|---|
| Early (2 years) | 2.6M | 4k | 27k | 0 | 0 | 6k | 24k | 0 |
| Mid (5 years) | 63M | 1.8M | 114k | 132k | 2.7M | 799k | 327k | 8k |
| Late (10 years) | 1.74B | 110M | 416k | 26M | 14M | 17M | 2.7M | 10M |

| Stage | Share of trading profit: Silk | Opium | Porcelain |
|---|---|---|---|
| Early (2 years) | 12% | 87% | 0% |
| Mid (5 years) | 3% | 37% | 60% |
| Late (10 years) | 1% | 10% | 90% |

### Porcelain and ventures (at 10 years)

| Start | In the porcelain trade | Bought in (median month) | Porcelain profit (share of income) | Lost to breakage |
|---|---|---|---|---|
| Guns | 99% | 57 | 74% | 12% |
| Debt | 99% | 57 | 76% | 11% |

| Start | Holding godowns | Arms smuggling | Jade mine | Shares (median, of position) | Venture income, share of gross: P10 / P50 / P90 |
|---|---|---|---|---|---|
| Guns | 95% | 92% | 58% | 26% | 3% / 10% / 31% |
| Debt | 95% | 94% | 60% | 26% | 3% / 9% / 29% |

| Backed the jade expedition | Stake (median share of worth) | Expeditions backed (median) | Won per expedition | Position: won at least once | backed, never won |
|---|---|---|---|---|---|
| 98% | 28% | 3 | 33% | 1.75B | 1.16B |

## Findings

1. **Trading is still most of it, and porcelain carries the second half.** Opium
   carries the first four years or so; once a player is in the porcelain trade
   (about month 57) it's 60% of trading profit by 5 years and 90% by 10. Ventures are
   about 10% of income, the bank 5%, booty and consignments next to nothing.
2. **Fast early, slower middle, porcelain late.** Money multiplies about 60× in year
   2 and 5–6× in year 3, then about 2× a year in years 4 and 5, 3–3.5× a year in
   years 6 and 7 as porcelain arrives, and 1.5–2× a year after that.
3. **The spread is widest in the middle.** High is about 6× middling at 2 and 5
   years (at 5, some players have porcelain and some don't yet), and about 2× at 10.
   Low is about 70% of middling at 10 years.
4. **Porcelain's fee is the biggest fall.** Three-quarters of the cash position in
   one payment shows as a 75% fall in worth (the share isn't counted as an asset);
   it now usually comes before year 5, so the median worst fall after year 5 is
   about 46%.
5. **Ventures are a steady second income.** Nearly everyone holds godowns and the
   arms smuggling at 10 years (the bot always buys and tops up), worth about a
   quarter of its position. The jade expedition is offered once both are held.
6. **Players rarely sink.** About 95% are afloat after 10 years, so the survivors-only
   figures are close to the whole population.
7. **Scores** (the final position per month, divided by 330): at 10 years, middling
   scores about 33,000–38,000 (Master Taipan), high about 68,000–78,000 (Ma Tsu), the
   top 5% about 90,000–95,000 (Ma Tsu) and the top 1% about 144,000–152,000 (Dragon of
   the Strait, just reaching Lord of Ten Thousand Ships). Jade Emperor (250,000) takes
   an exceptional game or a longer one.

## Implications for tuning

- **Thresholds stated as fixed amounts fall out of date fast:** 1M is a top player at
  2 years and pocket change at 10. Prefer thresholds that scale with time, or with
  the player's own money (as consignments, ventures and the porcelain fee do), or
  pick the stage a feature is meant for and read its threshold from the tables above.
- **The jade expedition's 2,000,000 in the bank** (and the porcelain share's
  2,000,000 cash position, offered from month 36) is reached by the middling player
  in year 2 or 3.
- **Rates competing with trading:** the middling player's money grows about 6% a
  month in years 4 and 5, about 10% a month as porcelain arrives, and 4–6% a month
  after that. A 0.5% bank rate is safety, not income, and the
  ventures' few percent a quarter are a sideline.
- **Recommendations that still assume 5% bank interest** (pypan-54, pypan-59 and
  pypan-60) should be revisited.

## Caveats

- The bot is disciplined, knows the price table from the start, and replans every
  port. A real "middling" player probably sits between this bot's low and middling
  columns, especially in the first year.
- It never buys a warehouse from Senhor Remedios (where porcelain would be safe) and
  never borrows to trade,
  so it leaves some money on the table. It backs every expedition and buys every
  share it can, which a cautious player wouldn't.
- It ignores the opium police in its plans. Fines and seized opium cost it about 2%
  of its income.
- Results move with any change to prices, ship offers, porcelain, ventures or jade,
  or to the bot, so rerun
  `npm run sim` after balance changes.
