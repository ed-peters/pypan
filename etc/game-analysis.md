# Game analysis: risks, windfalls and moonshots

How the game's sources of income compare with the design goal, measured with the
wealth simulation, and ten tuning scenarios for (a) making risks feel riskier,
(b) making windfalls feel more powerful and (c) making moonshots make or break a
fortune.

**"The game today" is calculated after 5019dce, with the improved bot,** and with
porcelain offered from month 48 for three-quarters of the cash position (scores
divided by 200). The
sections after it are a history, each calculated with the old bot (which
understated wealth two- to threefold) on the game as it was then: commit 81f21de,
then "Li Yuen reworked" (pypan-88), "Jade as a payout" (pypan-86), "Porcelain"
(pypan-87) and "The jade mine" (pypan-89). Their comparisons still explain the
design decisions, but not today's numbers. The figures go out of date when the game
engine changes (`git log --oneline 5019dce.. -- src/engine`). Rerun with:

    npm run sim -- --compare --runs 1000 --start guns    # and --start debt

See `etc/wealth-curve.md` for the bot, the method and the baseline wealth curve.
Each scenario patches the game's code only inside the simulation
(`scripts/sim/scenarios.mjs`); the game itself is unchanged.

## The goal

The player should feel four sources of income:

| Source | Feel | Today's features |
|---|---|---|
| **Bank** | Slow and steady | Deposits at 0.5% a month |
| **Trading** | Faster, with some risk | Buying and selling, ships and guns, the warehouse, consignments, Wu's loans |
| **Windfalls** | Luck caught at the right moment | Price shocks, pirate booty, "good joss" consignments |
| **Moonshots** | Big risk, big reward | The jade expedition |

## The game today (after pypan-91, with the improved bot)

Since the history below: Li Yuen's demand tracks your fortune and refusing him earns
a grudge (pypan-88); jade is no longer a good, and a successful expedition gives a
share in the mine (pypan-86, pypan-89); porcelain is the fragile top good
(pypan-87); the lorcha and the bank's representative are gone, so banking and
transfers are Hong Kong only; and godowns and arms smuggling replace trading general
cargo and arms, leading on to the jade expedition (pypan-91, SPEC.md §4.8); and,
to rescale the game for the improved bot, porcelain comes later and dearer (from
month 48, for three-quarters of the cash position) and scores are divided by 200
instead of 100. The bot now replans the whole hold at every port and heads home
every six voyages (`etc/wealth-curve.md`).

Scenarios no longer in the list: Li Yuen's tithe, Backers only and Bet the house are
now the game's own rules. **Balanced** is now tougher pirates plus shocks on dear
goods, and **Combined** fiercer pirates plus both shock changes. **No porcelain**,
**Sturdy porcelain** (pypan-87's first breakage), **Small jade stakes** (about
1,000,000), **Li Yuen before pypan-88**, **Impatient Li Yuen** and **Refusing Li Yuen**
are as described in the history.

1,000 games per scenario, guns start first and the debt start in parentheses; ships
afloat at 10 years. Losses include venture losses, the porcelain fee and breakage.

| Scenario | P50 at 10 years | Sunk | Shocks (share of income) | Ventures | Losses | Worst drawdown after year 5 (median) | Biggest windfall after year 5 (median) |
|---|---|---|---|---|---|---|---|
| **Baseline** | 983M (847M) | 4% (6%) | 3% (2%) | 7% (6%) | 36% (34%) | 62% (62%) | 19% (15%) |
| Li Yuen before pypan-88 | 960M (862M) | 4% (6%) | 3% (2%) | 7% (6%) | 36% (34%) | 62% (62%) | 17% (15%) |
| Impatient Li Yuen | 905M (791M) | 7% (9%) | 3% (2%) | 7% (6%) | 37% (34%) | 62% (63%) | 16% (19%) |
| Refusing Li Yuen | 767M (570M) | 78% (91%) | 5% (3%) | 6% (6%) | 48% (50%) | 66% (66%) | 23% (21%) |
| Fiercer pirates | 992M (835M) | 17% (16%) | 3% (2%) | 7% (6%) | 36% (35%) | 62% (63%) | 15% (18%) |
| Heavy storms | 865M (815M) | 5% (7%) | 3% (3%) | 7% (6%) | 37% (35%) | 63% (62%) | 16% (15%) |
| Frequent shocks | 1.14B (993M) | 5% (4%) | 13% (13%) | 7% (7%) | 35% (34%) | 62% (62%) | 68% (72%) |
| Shocks on dear goods | 1.10B (983M) | 4% (5%) | 11% (11%) | 7% (7%) | 35% (33%) | 62% (61%) | 60% (71%) |
| Boom markets | 1.57B (1.45B) | 2% (2%) | 35% (35%) | 7% (7%) | 32% (32%) | 62% (62%) | 143% (147%) |
| Small jade stakes | 1.01B (839M) | 4% (6%) | 3% (3%) | 5% (5%) | 29% (26%) | 62% (62%) | 13% (12%) |
| No porcelain | 206M (178M) | 4% (5%) | 6% (6%) | 10% (10%) | 27% (24%) | 16% (17%) | 9% (11%) |
| Sturdy porcelain | 1.17B (992M) | 4% (5%) | 3% (3%) | 7% (7%) | 31% (29%) | 61% (61%) | 17% (14%) |
| Balanced | 1.05B (1.01B) | 7% (9%) | 12% (12%) | 7% (7%) | 36% (32%) | 62% (62%) | 66% (75%) |
| Combined | 1.63B (1.51B) | 11% (10%) | 36% (34%) | 8% (7%) | 32% (31%) | 62% (61%) | 157% (154%) |

Measured against the goal:

- **Bank: slow and steady, as intended.** About 4% of income, and safe.
- **Trading: the engine, with a big late gamble.** About 81% of income, nearly
  three-quarters of it from porcelain by 10 years. Its fee, three-quarters of the
  cash position, shows as the biggest fall of most games: the median worst fall
  after year 5 is about 62%, against 16% without porcelain. Breakage costs about a
  sixth of the median fortune (Sturdy porcelain: 1.17B).
- **Windfalls: still weak.** Shocks are 3% of income and the biggest late windfall
  is about a fifth of worth. Shocks on dear goods (scenario) remain the strongest
  lever: late windfalls of about 60–70% of worth, at about 12–16% more wealth.
- **Moonshots: present but tamer.** The jade expedition is offered once a player
  holds godowns and arms (93% of games); a third of expeditions succeed, and winners
  end up about 1.9× as rich as those who never win. Ventures as a whole are a steady
  7% of income.
- **Pirates and storms barely bite** with a bot that buys guns and repairs; even
  fiercer pirates sink only about 16–17% of ships. Refusing Li Yuen is still
  near-certain ruin.

## How the game measured up at 81f21de (history, old bot)

### Measures

- **Income shares:** each source's median share of a game's gross income over 10
  years. **Losses** (robbery, Li Yuen, police fines, seized opium, repairs and Wu's
  interest) are a share of that same income.
- **Shock gains:** selling into a price rise gains (price − usual price) per unit.
  Buying in a crash gains (usual price − price) per unit, counted when those goods
  are sold. "Usual" is the good's average price at that port.
- **Windfall:** the biggest single shock gain or booty, as a share of the player's
  worth at that moment. Worth here is cash + bank − debt plus what was paid for the
  goods aboard; windfalls are only counted once worth is over 10,000.
- **Drawdown:** the biggest fall in worth from an earlier peak.

### Income: trading is nearly everything

| Trading | Price shocks | Bank interest | Booty | Consignments | Losses |
|---|---|---|---|---|---|
| 87% | 2% | 8% | 0.1% | 0% | 11% |

Guns start, 1,000 games, ships afloat at 10 years. The debt start is within a point
or two of each.

### Windfalls: powerful early, irrelevant late

| Shocks per game | Rises sold into | Crashes bought into | Biggest windfall (median) | After year 5 |
|---|---|---|---|---|
| 12 | 28% | 42% | 153% of worth | 6% of worth |

- **Early on, a shock is a real windfall.** Buying a crashed good with everything you
  have and selling it at its usual price can multiply a small fortune, and 86% of
  games have a windfall worth a quarter or more of their worth.
- **Late in the game they stop mattering.** Three of the five goods (general cargo,
  arms and silk) are too cheap to matter once opium and jade carry the trade, yet
  shocks pick a good at random. A shock also happens only at the port you've just
  reached, so you profit only if you happen to be carrying the good, or can buy it
  and carry it on. After year 5, the median biggest windfall is 6% of worth.

### Risk: catastrophic early, mild late

| Sunk by 10 years | Worst drawdown (median) | Games losing half at some point | Worst drawdown after year 5 (median) |
|---|---|---|---|
| 6% | 61% | 59% | 19% |

- **The opium police are the game's real risk.** On each foreign arrival with opium
  aboard, there's a 1-in-10 chance they take all of it, plus a fine. Opium carries
  the early game, so a single seizure can take most of a fortune: in one game, a
  fortune of 3.3M fell to 87k in one arrival. Most of the big drawdowns are this.
- **Everything else barely registers.** Robbery costs about 1% of income. Li Yuen's
  demands grow with time, not wealth, and come about once every five years. Storms
  rarely damage a ship. Pirates sink 6% of ships in 10 years.
- **Late in the game, risk fades.** With a big hold and money in the bank, the worst
  fall after year 5 is about a fifth of worth.

### The moonshot: a small bet on someone else's luck

| Offered | Stake (median share of worth) | Won per expedition | Position at 10 years: won | Backed, never won |
|---|---|---|---|---|
| 97% | 7% | 35% | 744M | 90M |

The 8× gap between winners and losers looks like make or break, but it isn't the
bet that decides it. If the expedition succeeds, jade comes to market whether or
not you backed it. Backers get only three months of cheap jade at one port. The
outcome is luck about whether jade arrives at all, and the stake, 7% of worth, is
too small to hurt.

## Scenarios

Each scenario is 1,000 games per start, guns start first, with the debt start in
parentheses where it differs much. **P50 at 10 years** is the middling player's cash
position. Wealth counts ships afloat only.

| # | Scenario | Aim | What changes |
|---|---|---|---|
| 1 | Li Yuen's tithe | Risk | Li Yuen demands 2–6% of cash + bank (at least today's amount), and his patience runs out about every 2 years instead of every 5. Superseded by pypan-88 (see "Li Yuen reworked"); scenarios 9 and 10 now get his worth-based demand from the game itself, without the shorter patience |
| 2 | Fiercer pirates | Risk | Pirates gain health twice as fast each year (`ENEMY_HEALTH_BUMP` 10 → 20) and damage twice as fast (`ENEMY_DAMAGE_BUMP` 0.5 → 1) |
| 3 | Heavy storms | Risk | 1-in-3 storms damage the ship (not 1-in-10), by 10–30% of its size (not 5–20 points) |
| 4 | Frequent shocks | Windfall | A price shock on 1-in-4 arrivals instead of 1-in-10 |
| 5 | Shocks on dear goods | Windfall | Shocks hit one of the two dearest goods on the market (opium and jade, or silk and opium before jade) |
| 6 | Boom markets | Windfall | 4 and 5 together |
| 7 | Backers only (now the game's rule: see "Jade as a payout") | Moonshot | Jade comes to market only if you backed the successful expedition |
| 8 | Bet the house (the stake is now the game's rule) | Moonshot | 7, plus a stake of 25–50% of the bank (at least the old ~1M), and 12 months of cheap jade instead of 3 |
| 9 | Balanced | All | 1, milder pirates (health bump 15, damage bump 0.7), 5 and 8 |
| 10 | Combined | All | 1, 2, 4, 5 and 8 at full strength |

### Results

| Scenario | P25 / P50 / P90 at 10 years | Sunk | Shocks' share of income | Worst drawdown after year 5 (median) | Biggest windfall after year 5 (median) |
|---|---|---|---|---|---|
| Baseline | 130M / 526M / 1.49B | 6% | 2% | 19% | 6% |
| 1. Li Yuen's tithe | 132M / 524M / 1.50B | 8% | 2% | 18% | 5% |
| 2. Fiercer pirates | 119M / 476M / 1.39B | 32% (29%) | 2% | 22% | 7% |
| 3. Heavy storms | 114M / 496M / 1.38B | 8% | 3% | 21% | 7% |
| 4. Frequent shocks | 218M / 712M / 1.88B | 6% | 13% | 14% | 32% |
| 5. Shocks on dear goods | 167M / 620M / 2.03B | 6% | 11% | 17% | 32% |
| 6. Boom markets | 351M / 1.04B / 3.18B | 4% | 37% | 10% | 87% |
| 7. Backers only | 129M / 526M / 1.49B | 6% | 2% | 19% | 6% |
| 8. Bet the house | 81M / 484M / 1.43B | 7% | 2% | 40% | 7% |
| 9. Balanced | 97M / 618M / 1.84B | 18% (21%) | 13% | 39% | 40% |
| 10. Combined | 241M / 1.02B / 3.44B | 28% (23%) | 38% | 34% | 124% |

| Scenario | Stake (share of worth) | Position at 10 years: won | Backed, never won | Gap |
|---|---|---|---|---|
| Baseline | 7% | 744M | 90M | 8× |
| 8. Bet the house | 38% | 739M | 51M | 14× |
| 9. Balanced | 37% | 915M | 59M | 16× |

### What each scenario does

1. **Li Yuen's tithe: works as a tax, not a risk.** Losses rise from 11% to 13% of
   income (14% for the debt start), but nothing changes how the game feels: the bot
   pays every time, and a predictable cut doesn't feel dangerous. To feel risky, his
   demand needs a real consequence for refusing, or needs to arrive when the player
   can't easily pay (at sea, or when cash is low).
2. **Fiercer pirates: the strongest risk lever, too strong at this setting.** Sinking
   rises from 6% to about 30%. Survivors are barely poorer, so the risk is all or
   nothing. This is the right kind of risk for "make it or break it" at sea, but
   about 1 in 3 ships lost is harsh.
3. **Heavy storms: mild.** Two more ships in a hundred sink, and repair bills rise.
   Storms damage the ship but not the cargo. Losing cargo overboard would make them
   felt, but needs more than a level change.
4. **Frequent shocks: windfalls you notice, with inflation.** Shocks become 13% of
   income, and the biggest late windfall is a third of worth. Everyone gets richer,
   about 35% at the median, so other thresholds would need retuning.
5. **Shocks on dear goods: the best windfall lever.** Shocks become 11% of income and
   late windfalls about a third of worth, as with scenario 4, at half the inflation
   (about 18% at the median). It fixes the real problem: shocks on goods that no
   longer matter.
6. **Boom markets: too much.** Shocks become 37% of income, wealth doubles, and
   windfalls stop feeling special. More windfalls also smooth out the falls, so
   risk feels lower.
7. **Backers only: no effect on this bot,** which backs almost every expedition. For
   a real player, it makes declining the offer costly: no jade, the late game's main
   good, until the next offer. It's the precondition for a true moonshot rather than
   a moonshot by itself.
8. **Bet the house: a true make-or-break.** The stake is about 38% of worth. Two
   expeditions in three fail, and backers who never win end up with 51M at 10 years
   against 739M for winners (14×, up from 8×). The low player (P25) falls from 130M
   to 81M, and two-thirds of games lose a quarter or more after year 5. Twelve
   months of cheap jade give winners a real reward of their own.
9. **Balanced: the recommended direction.** The spread widens at both ends: the low
   player falls 25% to 97M, and the high player rises 23% to 1.84B. Shocks are 13%
   of income, the moonshot gap is 16×, and late-game drawdowns double. Sinking at
   18–21% is still on the high side (see recommendation 3).
10. **Combined: overshoots.** Windfalls dominate (38% of income, and the biggest late
    windfall is larger than the whole fortune), wealth doubles, and more than one
    ship in four sinks.

## Recommendations

1. **Make shocks pick the dear goods** (scenario 5): the single change that most
   improves windfalls. Perhaps weight them by price instead of only picking the top
   two, so cheap goods still get the occasional shock.
2. **Make the jade expedition backers-only, with a stake that scales with the bank**
   (scenario 8). Done in pypan-86, as a payout of 2–5 times the stake: see "Jade as
   a payout". This makes it the game's one true moonshot. Consider a lower bound
   on the stake (25–35% of the bank) and keep 12 months of cheap jade.
3. **Raise pirate danger gradually.** With a health bump of 15, simulated on their
   own, a damage bump of 0.6 sinks about 10% of ships in 10 years, 0.7 about 15%,
   and 1.0 (with a health bump of 20) about 30%. Other changes add to it: the
   Balanced mix sinks 18–21% at 0.7, so use 0.6 there. Pirates are the risk that
   most clearly reads as risk.
4. **Leave the opium police alone.** They're already the game's sharpest early risk.
   Mention them in the help or SPEC, so that losing a fortune to them feels like a
   known gamble rather than bad luck.
5. **Rework Li Yuen before scaling his demand.** A tithe by itself is only a tax.
   Pair it with a consequence for refusing that players can see coming. Done in
   pypan-88: see "Li Yuen reworked" below.
6. **Rerun the wealth curve** after any of these. Scenarios 4–6 inflate wealth, and
   scenario 8 spreads it, which moves every threshold in `etc/wealth-curve.md` and
   the score ranks (pypan-85).

## Li Yuen reworked (pypan-88)

After month 12, Li Yuen now asks 3–6% of the cash position (cash + bank − debt), or
`time × 1000` plus up to as much again if that's more (SPEC.md §8). Refusing, or
turning down Wu's help to pay, earns a grudge, up to 3. While he holds it his fleet
attacks on sight, turns up more often (1-in-20 voyages without pirates, then 1-in-10,
1-in-6 and 1-in-5) with 3 more ships per refusal, and each new demand is 50% larger.
His warnings grow sterner, and his lieutenant comes on every arrival until you pay.
His patience is unchanged: a demand about every five years.

Three scenarios compare it with the old rules:

- **Li Yuen before pypan-88:** the old time-based demand (`LI_YUEN_SHARE` 0), with the
  new grudge.
- **Impatient Li Yuen:** the new demand about every two and a half years
  (`LI_YUEN_PATIENCE` 10).
- **Refusing Li Yuen:** the bot never pays.

1,000 games per start, guns start first and the debt start in parentheses; ships
afloat at 10 years.

| Scenario | P50 at 10 years | Sunk | Losses (share of income) | Bank's share of income | Worst drawdown after year 5 (median) |
|---|---|---|---|---|---|
| Li Yuen before pypan-88 | 530M (384M) | 6.9% (7.4%) | 11.0% (12.0%) | 8.4% (7.8%) | 19.1% (20.6%) |
| **pypan-88 (the game now)** | 510M (369M) | 7.6% (7.6%) | 13.2% (13.3%) | 8.4% (7.6%) | 19.5% (22.7%) |
| Impatient Li Yuen | 536M (382M) | 7.5% (12.4%) | 15.1% (14.8%) | 8.4% (7.7%) | 20.5% (23.2%) |
| Refusing Li Yuen | 604M (725M) | 83% (96%) | 14.7% (16.5%) | 8.4% (8.3%) | 27.8% (19.2%) |

- **Paying him is still a tax, but a bigger one.** Losses rise by about 2 points of
  income, and the median fortune at 10 years is about 4% lower. Late drawdowns barely
  move, as a demand of 3–6% every five years is too small to register as a fall. The
  bank's share of income doesn't change: the bank is still safe.
- **The risk is in refusing, and it's lethal.** A player who never pays sinks in 83%
  of games (96% from the debt start). The few survivors are richer, since they kept
  every donation. A real player will pay up long before then. Each warning, the
  summons on every arrival and the growing fleet make the danger plain.
- **More frequent demands hurt poor players, not rich ones.** With a demand every
  two and a half years, the debt start sinks 12% of ships (up from 7%), while the
  guns start is unchanged. In year 2 or 3 a debt-start player often can't afford
  `time × 1000`, refuses, and meets a hostile fleet with a small ship. For that
  reason the game keeps the five-year patience.
- **Not done:** the bot pays whenever it can, so it never weighs the grudge against
  the demand. Making Li Yuen feel like a risk to a player who pays would need a
  demand that comes when cash is short (at sea, say), or a separate threat to the
  bank (the "predatory bankers" option in pypan-88).

## Jade as a payout (pypan-86)

Jade is no longer a good. Sir Beaumont-Finch's expedition asks 25–50% of the bank
(at least 1,000,000), up to three times a game, and a success (1-in-3) pays backers
2–5 times their stake into the bank (SPEC.md §4.6). Players who don't back it get
nothing. Scenario 7 and 8's patches are gone. **Small jade stakes** asks about
1,000,000 whatever the bank, as before, for comparison.

1,000 games per start, guns start first and the debt start in parentheses; ships
afloat at 10 years. "Jade" is what successes paid beyond their stakes; lost stakes
count as losses.

| Scenario | P25 / P50 / P90 at 10 years | Jade (share of income) | Losses | Worst drawdown after year 5 (median) | Biggest windfall after year 5 (median) |
|---|---|---|---|---|---|
| Before pypan-86 (jade on the market) | 127M / 510M / 1.45B (101M / 369M / 1.16B) | - | 13% (13%) | 20% (23%) | 6% (4%) |
| **pypan-86 (the game now)** | 60M / 100M / 223M (43M / 78M / 181M) | 4.7% (5.4%) | 35% (36%) | 43% (46%) | 59% (63%) |
| Small jade stakes | 71M / 106M / 198M (54M / 87M / 172M) | 1.2% (1.3%) | 25% (25%) | 23% (25%) | 11% (13%) |

| | Stake (median share of worth) | Expeditions backed (median) | Won per expedition | Position: won at least once | backed, never won | Gap |
|---|---|---|---|---|---|---|
| pypan-86 | 40% | 3 | 33% | 121M | 67M | 1.8× |
| Small jade stakes | 7% | 3 | 33% | 112M | 95M | 1.2× |

- **Late-game wealth falls by about four-fifths.** Without jade, opium is the top
  good and saturates: the middling fortune at 10 years is 100M, down from 510M. This
  is the gap pypan-87's porcelain is meant to fill.
- **The moonshot is now the late game's main swing.** A win is the biggest
  windfall after year 5 (about 60% of worth at the median), and a loss is the worst
  late drawdown (about 43%, up from 20%). Two-thirds of games lose a quarter or more
  of their worth after year 5.
- **It's a bet that pays over a game, not every time.** The bot backs all three
  offers. Two in three of them fail, but the 62% of players who win at least once
  end up about twice as rich as those who never do. Lost stakes push losses to a
  third of income.
- **The stake is what makes it a moonshot.** With the old ~1M stake, jade is 1% of
  income, late drawdowns stay at about a fifth, and winners are only 20% richer.
- **For a real player,** the bot overstates the gamble: it never declines, even
  after two failures. A cautious player can skip it at no cost, which is the point
  of making it a choice.

## Porcelain (pypan-87)

Porcelain is the new top good (×10,000, dearer than opium everywhere). It's hidden
until a Jingdezhen merchant house sells you a share in the trade, in Hong Kong after
month 24, for half your cash position. The offer is 1-in-20 per Hong Kong arrival at
first, improving to 1-in-3 by month 76. Porcelain aboard ship breaks: 20–50% in a
storm, 10–30% in rough seas (1-in-3 voyages without a storm), and 5–20% with each
enemy volley (SPEC.md §4.7). Two new scenarios: **No porcelain** (never offered,
the game after pypan-86) and **Sturdy porcelain** (pypan-87's first breakage, about
half today's, with rough seas 1-in-5).

1,000 games per start, guns start first and the debt start in parentheses; ships
afloat at 10 years. Losses include the porcelain fee and what was paid for broken
porcelain.

| Scenario | P25 / P50 / P90 at 10 years | Porcelain (share of income) | Bank | Losses | Lost to breakage | Worst drawdown after year 5 (median) | Sunk |
|---|---|---|---|---|---|---|---|
| No porcelain | 60M / 100M / 232M (45M / 81M / 195M) | - | 9.1% (8.5%) | 34% (34%) | - | 43% (45%) | 7.1% (7.2%) |
| Sturdy porcelain | 167M / 525M / 1.45B (119M / 432M / 1.21B) | 71% (69%) | 5.6% (5.6%) | 26% (27%) | 5.1% (4.3%) | 56% (56%) | 6.8% (7.7%) |
| **The game now** | 134M / 406M / 1.16B (101M / 351M / 1.11B) | 68% (67%) | 5.4% (5.4%) | 33% (31%) | 11.8% (9.9%) | 61% (61%) | 8.0% (8.0%) |

85% of guns-start games (82% from the debt start) buy in, at a median of month 81
(83).

- **Porcelain restores most of the late game.** The middling fortune at 10 years is
  406M, from 100M without it (and 510M when jade was a good). Porcelain is about
  two-thirds of income by 10 years, and the bank's share falls from 9% to 5%.
- **The fee is the biggest single cut in the game.** Half the cash position in one
  payment shows as a fall of half of worth, which is most of why the median worst
  drawdown after year 5 rises from 43% to 56% (61% with today's breakage). It's a cut
  the player chooses and sees coming, and it pays back within a couple of years.
- **Breakage is now a real cost.** The bot loses about 12% of its porcelain profit to
  breakage (10% from the debt start), against 5% at the first rates, and the median
  fortune at 10 years is about a fifth lower. A bad storm can take half the porcelain
  aboard, so a full hold of it is a gamble on the weather; the warehouse is the safe
  place for it.
- **It arrives late.** Year 7 is the median buy-in, so porcelain shapes only the last
  few years of a 10-year game. A faster ramp would bring it forward; this is the
  main tuning lever left.
- **The jade moonshot shrinks next to it.** Jade payouts fall to 1.5% of income, and
  players who win it are about 1.7× as rich as those who never do (1.6× from the
  debt start; 1.6× and 1.4× with sturdy porcelain).
- **Not simulated:** the bot doesn't use the warehouse, where porcelain is safe, and
  never declines the share. Pirates and storms don't change their odds when you
  carry porcelain.

## The jade mine (pypan-89)

A successful expedition no longer pays a lump sum. It makes the stake a share in the
mine worth 2–5 times as much. Every 3 months the share returns −10% to +20% of its
value: gains go into the bank, and a loss is a call for funds, where refusing costs
half the share. Rarely the mine strikes a rich vein (1-in-40 quarters, paying twice
the share) or is seized by rebels (1-in-80, the share is lost). The share counts
toward the score but can't be sold (SPEC.md §4.6).

1,000 games per start, guns start first and the debt start in parentheses; ships
afloat at 10 years. "Before" is the one-time payout of 2–5 times the stake, with
today's porcelain. "Jade" is the mine's dividends and rich veins; losses count failed
stakes, calls for funds and share value lost.

| Scenario | P25 / P50 / P90 at 10 years | Jade (share of income) | Bank | Losses | Worst drawdown after year 5 (median) | Biggest windfall after year 5 (median) |
|---|---|---|---|---|---|---|
| Before (one-time payout) | 134M / 406M / 1.16B (101M / 351M / 1.11B) | 1.5% (1.8%) | 5.4% (5.4%) | 33% (31%) | 61% (61%) | 64% (70%) |
| **The jade mine (the game now)** | 142M / 400M / 1.21B (111M / 332M / 1.09B) | 2.3% (1.8%) | 5.1% (4.7%) | 34% (32%) | 56% (55%) | 21% (19%) |
| Small jade stakes (about 1M) | 151M / 417M / 1.19B (107M / 345M / 1.03B) | 0.3% (0.3%) | 6.0% (5.8%) | 28% (26%) | 53% (53%) | 14% (14%) |

Among players holding a share at 10 years (53%, or 54% from the debt start):

| Scenario | Share (median, of position) | Mine income, share of gross: P10 / P50 / P90 |
|---|---|---|
| The jade mine | 13% (13%) | 1% / 8% / 33% (1% / 7% / 28%) |
| Small jade stakes | 1% (1%) | 0.1% / 1% / 6% (0.2% / 1% / 5%) |
| No porcelain | 21% (21%) | 6% / 19% / 48% (4% / 18% / 47%) |

- **Wealth is about the same as with the lump sum.** The middling fortune at 10
  years is 400M (406M before). A share worth 2–5× the stake hands winners about what
  the lump sum did, and then keeps paying.
- **The mine is a second income for those who hold it.** It's about 8% of income
  for the median holder and a third for the luckiest 10%. Next to porcelain
  it's a sideline; without porcelain (the No porcelain scenario) it's a fifth of
  income for the median holder.
- **It's riskier than the bank, in the open.** Each quarter's return is reported, a
  bad quarter comes as a call for funds the player must answer, and about one share
  in five is seized within five years. About four in five players who win a share
  still hold one at 10 years.
- **The late game is smoother.** With the payout spread over quarters, the biggest
  late windfall falls from about two-thirds of worth to a fifth, and the worst late
  drawdown eases from 61% to 56%. The expedition is still the moonshot: two in three
  lose the stake.
- **Not simulated:** the bot pays every call for funds. A player who refuses keeps
  the cash but loses half the share each time.

## Caveats

- **The bot doesn't adapt.** It backs every expedition it can afford, carries opium
  regardless of the police, and fights by the same rule however dangerous pirates
  are. Real players would back off from the bigger bets and buy more guns, so the
  risk scenarios overstate losses and the moonshot scenarios overstate how often
  players take the bet.
- **Survivors only.** Wealth figures leave out sunk ships, so harsher pirates look
  cheaper than they are; read sinking alongside wealth.
- **Shock gains are measured against usual prices** at the shocked port, so a bot
  that carried crashed goods to their dearest port would count somewhat more.
- **Levels only.** Every scenario changes numbers in existing rules. Ideas that need
  new rules (shocks announced in advance, storms that wash cargo overboard) aren't
  simulated. Li Yuen hunting non-payers is now in the game (pypan-88).
