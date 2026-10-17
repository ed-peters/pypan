# PyPan — Game Specification

PyPan is a text-based trading and seafaring game set in 1860s East Asia, a modern
reimplementation of the classic *Taipan!* game. The player is a "Taipan" — a merchant
captain — who sails between seven Asian ports buying and selling goods, managing debt,
upgrading a ship, dodging the harbor police, and fighting pirates, all while trying to
build a fortune.

The game began as a Python `curses` terminal application (`etc/pypan.py`, kept as a
reference). It is now a TypeScript web app with a green-screen UI for iPhone and iPad:
the game logic lives in `src/engine`, the UI in `src/ui`. The port fixed a number of
bugs in the Python version and added port-based prices, Li Yuen's pirate fleet,
sinking, and retiring with a final score; see §17 for the full list of changes.

---

## 1. Objective

The player builds a fortune while servicing a large starting debt. The game ends when
the player **retires** (in Hong Kong, once out of debt; see §5) or the ship is **sunk**
in a pirate battle (§7.3). Either way the game is over for good and is scored.

### 1.1 Scoring

When the game ends, the **final position** is cash + bank − debt, plus the value of
any shares in ventures (the godowns, the arms smuggling and the jade mine, §4.8);
goods don't count. The captain comments on it, if it deserves a comment (only the first that
applies):

- Over 1,000,000: "You're a M I L L I O N A I R E !!!"
- Below 0: "The crew has requested that you stay on shore for their safety!!"
- Below 1,000: "Have you considered a land-based job?"

The **score** is `final position / months played / 200` (`SCORE_DIVISOR`; pypan.py
divided by 100), rounded down (it can be
negative). The final screen says "Your score is N." and shows the ranking table with
the player's rank marked:

| Rank | Score |
|---|---|
| Jade Emperor | 250,000+ |
| Lord of Ten Thousand Ships | 150,000+ |
| Dragon of the Strait | 100,000+ |
| Ma Tsu | 50,000+ |
| Master Taipan | 8,000+ |
| Taipan | 1,000+ |
| Compradore | 500+ |
| Galley Hand | below 500 |

The three ranks above Ma Tsu are pypan-85's. In a 10-year game, Dragon of the Strait
is about the top 10% of a decent player's games, Lord of Ten Thousand Ships the top
few percent, and Jade Emperor the exceptional game (`etc/wealth-curve.md`). The
ranges are written short so the table fits a phone screen.

To stop playing without ending the game, the player just closes the app; the game is
saved at every port menu and can be restored (§13).

---

## 2. Core Concepts

### 2.1 The Player State (`Hong`)

All game state lives in a single `Hong` object (a "hong" is a 19th-century trading
house). It is fully serializable to JSON for save/load. Key fields:

| Field | Meaning | Start value |
|---|---|---|
| `name` | Player / ship name | `"Rising Sun"` |
| `year`, `month` | In-game date | 1860, January |
| `cash` | Cash on hand | 400 (or 0 in "guns" start) |
| `debt` | Owed to Elder Brother Wu | 5000 (or 0 in "guns" start) |
| `bank` | Savings on deposit | 0 |
| `ship_size` | Total cargo capacity (units) | 60 |
| `ship_goods[5]` | Goods carried aboard, by type | all 0 |
| `ship_guns` | Number of cannons | 0 (or 5 in "guns" start) |
| `ship_damage` | Accumulated hull damage | 0 |
| `ship_cargo` | Optional special consignment (`Cargo`) | none |
| `pirate_chance` | 1-in-N chance of pirate encounter per voyage | 10 (or 7 with guns) |
| `warehouse_size` | Hong Kong warehouse capacity | 10000 |
| `warehouse_goods[5]` | Goods stored in warehouse | all 0 |
| `threatened` | Whether Wu has issued his debt threat | false |
| `extorted` | Li Yuen extortion counter (0–3) | 0 |
| `grudge` | Times you've refused Li Yuen since you last paid him (0–3, §8); saved only when not 0 | 0 |
| `bailout` | Multiplier for emergency loan cost (see §4.5) | 1 |
| `location` | Current city index (or AT_SEA) | Hong Kong |
| `transfer` | pypan.py's warehouse transfer fee: written as 0 in Hong Kong and −1 elsewhere, and ignored on loading (transfers are Hong Kong only, §10) | 0 |
| `prices[5]` | Current local price of each good | set for Hong Kong |
| `expedition` | The jade expedition under way: `port`, `resolves` (month), `stake` (0 if you didn't back it); saved only when set | none |
| `expedition_failed` | Whether a jade expedition has failed, so later offers say Sir Beaumont-Finch escaped; saved only when true | false |
| `jade_offers` | How many times the jade expedition has been offered (§4.6); saved only when not 0 | 0 |
| `mine` | A share in the jade mine (§4.6): `value`, `due` (month of the next return); saved only when held | none |
| `godowns`, `arms` | Shares in the Nanking godowns and the Red Wind gang's smuggling (§4.8), as `mine`; saved only when held | none |
| `godowns_bought`, `arms_bought` | Whether you've ever bought into them, so general cargo or arms are off your market (§4.8); saved only when true | false |
| `porcelain` | Whether you own a share in the porcelain trade (§4.7); saved only when true | false |

**Older saves.** Saves without `porcelain` come from before porcelain:
- Those written between pypan-86 and pypan-87 have four goods. They load with no
  porcelain, priced at its usual price in that port (Hong Kong's at sea).
- Older ones (and pypan.py's) have five goods, but the fifth is jade. Any jade aboard
  or in the warehouse is sold for 120,000 a unit (its usual Hong Kong price) and
  added to cash; jade's price stands in for porcelain's, which is hidden until the
  next arrival sets prices. Their `jade` and `jade_deal` keys are ignored, and an
  expedition saved with `invested` gets a stake of 1,000,000 if it was true (0 if not).

### 2.2 Starting Choices

At launch the player chooses one of:

1. **Guns (and no debt)** — start with 5 guns, 0 cash, 0 debt, lower pirate risk (7 vs 10).
2. **Debt (and no guns)** — start with 400 cash, 5000 debt, 0 guns.
3. **Your last game restored** — only offered if a saved game exists (see §13).

### 2.3 Cities

Seven tradeable ports, indexed 0–6:

`Hong Kong` (0), `Shanghai` (1), `Nagasaki` (2), `Saigon` (3), `Manila` (4),
`Singapore` (5), `Batavia` (6).

An eighth pseudo-location, **At Sea** (7), is used while traveling. **Hong Kong is
the home port**: it is the only place with a bank, the moneylender (Elder Brother
Wu), ship repair (McHenry), warehouse upgrades, and warehouse transfers.

### 2.4 Goods

Five tradeable commodities, indexed 0–4, each in a different price tier (the tier
sets the order of magnitude via `mult(n) = 10^n`). Porcelain, the dearest, is hidden
until you buy a share in the porcelain trade (§4.7). General cargo and arms leave
your market for good once you buy into the godowns and the arms smuggling (§4.8).
(Jade held its tier until pypan-86 made the jade expedition pay out instead, §4.6.)

| Index | Good | Price magnitude |
|---|---|---|
| 0 | General | ~1× (tens) |
| 1 | Arms | ~10× (hundreds) |
| 2 | Silk | ~100× (thousands) |
| 3 | Opium | ~1000× (tens of thousands) |
| 4 | Porcelain | ~10000× (hundreds of thousands) |

### 2.5 Randomness

Every roll goes through one seedable random-number generator, so games are
reproducible from a seed and tests can force outcomes. The helpers mirror the Python
ones: `chance_of(n)` is true 1-in-n; `randrange(n)` gives 0..n-1 (truncating a
fractional n); `in_range(lo, hi)` gives lo..hi-1.

---

## 3. Time

Time advances by **one month per voyage** (every time the player sails between
ports). `current_time()` returns the number of months elapsed since the start
(`(year - 1860) * 12 + month`). Many events and prices scale with elapsed time, so
the game becomes progressively more dangerous and expensive. Several features
unlock only after certain thresholds:

- **> 1 month**: price shocks and emergency bailout loans can occur.
- **> 6 months**: new-ship and new-gun offers appear.
- **> 12 months**: Wu robbery risk, larger Li Yuen demands, warehouse upgrades,
  harbor-police / mugging / fire events, and the godowns (§4.8).
- **>= 18 months**: special cargo consignments begin to appear.
- **> 24 months**: the arms smuggling (§4.8), and then the jade expedition (§4.6), can
  be offered.
- **> 48 months**: the porcelain share (§4.7) can be offered.

---

## 4. Economy

### 4.1 Pricing

Each time the player arrives at a port, local prices are regenerated by `set_prices`.
Prices depend on the port, using the formula from the original C *Taipan!*
(`etc/taipan.c`):

    price = (base / 2, rounded down) × (1, 2 or 3 at random) × the good's magnitude

`base` comes from the `BASE_PRICES` table: how dear each good is in each port, from
10 to 16. Halving and rounding down gives a **port level** of 5–8, so each good has
exactly three possible prices in each port (e.g. opium in Shanghai is always 8,000,
16,000 or 24,000), and prices overall run from 5× to 24× the magnitude. The random
1–3 multiplier swings prices more (3×) than the port does (8/5 = 1.6×), so good
routes improve the odds rather than guarantee a profit.

| Port level | Hong Kong | Shanghai | Nagasaki | Saigon | Manila | Singapore | Batavia |
|---|---|---|---|---|---|---|---|
| General (×1) | 5 | 5 | 6 | 6 | 7 | 7 | 8 |
| Arms (×10) | 6 | 8 | 5 | 5 | 6 | 7 | 7 |
| Silk (×100) | 5 | 7 | 7 | 8 | 5 | 6 | 6 |
| Opium (×1000) | 5 | 8 | 7 | 7 | 6 | 5 | 6 |
| Porcelain (×10000) | 5 | 5 | 7 | 7 | 6 | 8 | 8 |

The General, Arms, Silk and Opium rows are taipan.c's. It has no Porcelain, so
Porcelain's row is our own: cheap near Canton (Hong Kong and Shanghai), dear in
Singapore and Batavia, where it ships for Europe. Its cheapest price (50,000) is above
opium's dearest (24,000) everywhere. Porcelain prices are set even before you're in
the trade (§4.7); they just aren't shown.

With the `BASED_PRICES` flag turned off, prices are fully random instead:
`in_range(5, 31) * 10^good_index`, i.e. 5–30× the magnitude in every port.

### 4.2 Price Shocks

After month 1, there is a 1-in-10 chance per arrival of a market shock on a random
good (porcelain only once you're in the trade, §4.7). A good that a venture has taken
off your market (§4.8) is still shocked, but quietly, with no message: otherwise, with
the cheap goods gone, every shock would land on the dear ones. A coin flip decides
direction:

- **Positive shock** (e.g. famine, rebellion): price multiplied by a factor of 5–9.
- **Negative shock** (e.g. a glut, dumping): price divided by that factor.

Either way the result keeps the good's usual granularity: it is rounded down to a
multiple of its magnitude (General 1, Arms 10, Silk 100, ...), and is at least one
magnitude.

Each shock prints a themed flavor message, picked at random from three for that good
and direction (see `MSG_POS_SHOCK` / `MSG_NEG_SHOCK`).

### 4.3 Buying and Selling

- **Buy**: limited by cash (`floor(cash / price)`); in Hong Kong, by cash plus the
  bank (abroad, cash only). Goods you
  can't afford any of are disabled on the menu. Goods go into the ship's hold. No explicit capacity check at purchase time —
  overload is caught when sailing. When cash doesn't cover it, the rest comes from
  the bank: "The necessary funds will be sent from the bank, Taipan."
- **Sell**: limited by the quantity in the ship's hold; goods not aboard are disabled
  on the menu. Proceeds added to cash. With
  only one good aboard, there's no menu: "Would you like to sell all of your
  ((good)), Taipan?" Yes sells it all; No asks how much.

Both show a condition report listing the current price of each good on the market
(four goods until you're in the porcelain trade, §4.7), in two columns.

### 4.4 Banking (Hong Kong only)

Deposit cash into or withdraw from the bank, in Hong Kong. The bank balance **earns
0.5% interest per voyage** (`BANK_RATE`), applied on arrival at any port.

Leaving the bank carries the same mugging risk as arriving at a foreign harbor
(§11): after month 12, a 1-in-20 chance if cash on hand exceeds 20000.

### 4.5 Debt & the Moneylender (Elder Brother Wu, Hong Kong only)

Debt **accrues 10% interest per voyage** (`LOAN_RATE`), applied on arrival.

Visiting Wu (`visit_wu`):

- **If broke** (no cash and no goods anywhere, after month 1): Wu offers an
  emergency loan of 1500–2999 cash in exchange for a larger repayment obligation
  (`randrange(2000) * bailout + 1500`). The `bailout` multiplier was meant to make each
  successive rescue more expensive, but nothing increases it yet (pypan-39).
- **If you have no cash but aren't fully broke**: Wu just gives a warning.
- **Otherwise**: you may repay up to `min(cash, debt)`, and may borrow up to
  `2 * cash - debt` (i.e. he lends against your liquid position).

Debt pressure (`check_lender`, Hong Kong only, triggered on arrival):

- **Debt > 10000 (`DEBT_THREAT_LEVEL`) and not yet threatened**: Wu sends braves to
  escort you to his mansion and delivers an escalating Confucian warning; sets
  `threatened = True`.
- On every arrival in Hong Kong (and at the start of a game) you are offered a
  chance to do business with Wu, whether or not you owe him. This arrival prompt is
  the only way to visit him; he is not on the port menu.
- **Robbery**: after month 12, if Wu threatened you on an *earlier* visit and your
  debt is still above 10000, there is a 1-in-4 chance cutthroats rob you of **all
  cash** (the consequence of ignoring the debt).

Wu can also cover a shortfall when you can't afford a repair (§9) or Li Yuen's
"donation" (§8), adding the difference to your debt.

### 4.6 The Jade Expedition and the Jade Mine (pypan-33, pypan-86, pypan-89)

The game's moonshot: a Burmese jade mining expedition which, if it succeeds, gives
its backers a share in the mine: a passive asset like the bank, but riskier
(`check_jade`, on arrival, before consignments). Jade is never a tradeable good.

- **Offer:** after month 24, once you have bought into both the godowns and the arms
  smuggling (§4.8, held now or not), if no expedition is under way, it has been offered fewer
  than 3 times this game (`JADE_MAX_OFFERS`, counting declined offers), the bank
  holds over 2,000,000 (`JADE_BANK_LEVEL`; cash on hand doesn't count) and the port
  is Singapore or Batavia, there's a 1-in-3 chance the East India Company man Sir
  Beaumont-Finch seeks backers. The compradore asks whether to invest 25–50% of the
  bank (`JADE_STAKE_SHARE` times 1 to 2), but at least 1,000,000
  (`JADE_INVESTMENT`), rounded to the thousand. If you accept, the funds are
  arranged from Hong Kong and taken from the bank. Either way the expedition goes
  ahead from that port, due 3 months later (`JADE_EXPEDITION_MONTHS`).
- **Outcome:** on the first arrival once it's due, it succeeds 1-in-3; otherwise
  Sir Beaumont-Finch is captured by rebels, and a new expedition can be offered later:
  he has escaped and is back seeking investment.
- **Success** turns the stake into a share in the jade mine worth 2–5 times as much
  (`MINE_SHARE_MIN`, `MINE_SHARE_MAX`, rolled, rounded to the thousand): "Our
  ((stake)) has become a share in the jade mine worth ((value)), which will settle
  with us every three months." A later success adds to the share. Players who didn't
  back it hear the rumor of a new mine and get nothing. He may be back with another
  expedition after a success too, up to the limit of three offers.

**The mine** is the riskiest and richest of the ventures, and settles as they do
(§4.8), starting 3 months after the success:

- **Seized** (1-in-80 quarters, `MINE_SEIZURE_CHANCE`): "Rebels have seized the jade
  mine, and our share in it, worth ((value)), is lost."
- **Rich vein** (else 1-in-40, `MINE_VEIN_CHANCE`): pays twice the share's value
  (`MINE_VEIN_PAYOUT`) into the bank.
- **Otherwise** a return of −10% to +20% of the share's value (`MINE_RETURN`).

On average a quarter returns about 5% of the share, plus 5% from rich veins, less
about 1% lost to seizure.

### 4.8 Ventures: the Godowns, the Arms Smuggling and the Jade Mine (pypan-91)

Three ventures, offered in turn, are shares that settle every three months
(`check_ventures`, on arrival, before the jade expedition). The first two replace
trading a good: once you buy in, that good leaves your market (menus, the condition
report, the panes) for the rest of the game, even if you later lose the share.

| Venture | Offered | Replaces | Each quarter | Lost |
|---|---|---|---|---|
| Cargo godowns in Nanking | Shanghai, 1-in-3 arrivals, after month 12 | General cargo | −5% to +10% (`GODOWN_RETURN`) | Seized by a rival hong, 1-in-60 quarters |
| The Red Wind gang's arms smuggling | Any port but Hong Kong, 1-in-6 arrivals, after month 24, once you've had godowns | Arms | −15% to +30% (`ARMS_RETURN`) | Shut down by the authorities, 1-in-30 quarters, with a fine of up to ~`cash/1.8` |
| The jade mine | A successful jade expedition (§4.6), offered once you've had both | – | −10% to +20%, rich veins | Seized by rebels, 1-in-80 quarters |

- **Buying in** (godowns and arms): the offer is for a tenth of your cash position
  (`VENTURE_FEE_SHARE`, rounded to the thousand), only when that's over 10,000
  (`VENTURE_WORTH_LEVEL`). The fee is paid from cash and then the bank. Any of the
  replaced good aboard or in the warehouse goes into the share at its usual Hong Kong
  price ("Our 15 general cargo has gone into them too"). Declining costs nothing; the
  offer comes again. After a loss you can buy back in ("the merchant of Nanking has
  new godowns", "the Red Wind gang is back in business").
- **Adding to a share:** while you hold one, the same offer can add a tenth of your
  cash position to it, but only once the share is worth less than that.
- **Settling** (`VENTURE_QUARTER_MONTHS`, on the first arrival anywhere once it's
  due): first the 1-in-N chance the share is lost (its news gives what it was worth),
  then the mine's rich vein, then the quarter's return, rounded to the thousand. A
  gain is paid into the bank ("Our share in the Nanking godowns has paid us
  ((amount)) this quarter"). Zero has "broken even". A loss is a **call for funds**:
  "it has been a bad quarter for the ((venture)), and the backers must put in
  ((amount)) more. Shall we pay our part?" Paying takes it from the bank, then cash.
  If that's not enough, Elder Brother Wu can make up the difference, adding it to
  your debt. Refusing, or turning Wu down, costs half the share (`REFUSAL_LOSS`).
- **Shares** can't be sold, but count toward the final position and score (§1.1). The
  status pane shows each one held ("Godowns", "Smuggling", "Jade mine"). Returns are
  paid out, so a share's value changes only by buying, adding, refusing and losing it.

On average a quarter of godowns returns about 2.5% (less about 1.7% for seizure),
the arms smuggling about 7.5% (less about 3.3% for shutdowns, and fines).

### 4.7 Porcelain (pypan-87)

The late game's top good. A new game starts without it. Until you're in the trade,
porcelain is left out of the condition report, the buy, sell, transfer and dump
menus, price shocks, and the hold and warehouse panes.

- **The offer** (`check_porcelain`, on arrival, after the jade expedition): in Hong
  Kong after month 48, while your cash position (cash + bank − debt) is over
  2,000,000 (`PORCELAIN_WORTH_LEVEL`), a merchant house from Jingdezhen offers a
  share in the porcelain trade. The chance is 1-in-20 per arrival at first, one
  better every 3 months (1-in-19 from month 52, 1-in-18 from month 55, ...), down to
  1-in-3 from month 100 (`PORCELAIN_ODDS_START`, `_MIN`, `PORCELAIN_RAMP_MONTHS`).
- **The fee** is three-quarters of your cash position (`PORCELAIN_FEE_SHARE`, rounded to the
  thousand), paid from cash and then the bank. Declining costs nothing, and the
  offer comes again on a later arrival.
- **Owning it** makes porcelain a regular good at every port for the rest of the
  game. It can be stored in the warehouse, where it's safe.
- **Breakage:** porcelain aboard ship breaks. A storm breaks 20–50% of it
  (`STORM_BREAKAGE`, §6); rough seas break 10–30% on 1-in-3 voyages without a storm
  (`ROUGH_SEAS_BREAKAGE`, `ROUGH_SEAS_CHANCE`); and each enemy volley in a pirate
  battle breaks 5–20% (`VOLLEY_BREAKAGE`, §7.2). Each break is at least one unit, and
  each is reported ("The storm broke 12 of our porcelain, Taipan!"). The rolls are
  made only when there's porcelain aboard.

---

## 5. The Voyage Loop

The game is driven by `compradors_loop`, which (in Hong Kong) first checks extortion
and the lender, then repeatedly presents the port action menu. The menu
(`establish_opts`) offers, in order:

- **Buy goods**
- **Sell goods** (disabled when the hold has no goods)
- In Hong Kong only: **Transfer goods** (disabled when there are no goods in the hold
  or the warehouse) and **Visit the bank**
- **Leave port**
- In Hong Kong only, and only when out of debt: **Retire**. It asks "Are you sure you
  want to retire, Taipan?" before ending the game (§1.1).

Abroad, the menu is just Buy, Sell and **Leave port**.

The game auto-saves at the top of every menu iteration.

### 5.1 Sailing (`sail_away`)

1. Refuses to sail if the ship is **overloaded** (`ship_available() < 0`).
2. Prompts for a destination; the current city is shown but disabled, and it can be
   cancelled. "Never mind" comes before Batavia, the last port.
3. Sets location to **At Sea**, advances the clock one month, shows the boat art.
4. **Pirate check**, including Li Yuen's fleet (see §7). If the ship sinks, the game
   ends here.
5. **Storm check** (see §6).
6. Arrives; **debt and bank interest are applied**.
7. Runs the arrival event sequence:
   `check_lender` → `check_extortion` → `check_upgrades` → `check_warehouse`
   → `check_ventures` (shares, the godown and arms offers, then `check_jade`)
   → `check_porcelain` → `check_cargo`
   → `check_safety` → `establish_prices`.

---

## 6. Storms (`check_storm`)

A 1-in-10 chance per voyage. When a storm hits, one of three outcomes:

- **Damage**: if hull damage is under 80% of ship size, a 1-in-10 chance of taking
  5–20 additional damage.
- **Blown off course**: else 1-in-3 chance of being diverted to a different random
  city than intended (any of the other six).
- **Safe passage**: otherwise, "We made it!"

Storms can't sink the ship. With porcelain aboard, a storm also breaks 20–50% of it.
A voyage without a storm has rough seas 1-in-3, breaking 10–30% of the porcelain
aboard ("Rough seas, Taipan! ((n)) of our porcelain was broken."), with the storm
art (§4.7). Without porcelain aboard, there are no rough seas.

---

## 7. Pirates (`check_pirates` / `PirateBattle`)

Each voyage has a `1-in-pirate_chance` chance of an encounter with the regular
**pirate fleet** (`PIRATE_FLEET`). Li Yuen's fleet (`PIRATE_KING`) can also appear
(§7.4).

### 7.1 Battle Setup

- **Number of pirate ships**: `randrange(ship_size/10 + ship_guns) + 1` for the
  regular fleet; for Li Yuen's fleet, see §7.4.
- **Enemy health per ship**: base `20 + 10 * years_elapsed`, randomized at start of
  each ship (`int(base * rand) + 20`).
- **Enemy damage factor**: `0.5 + 0.5 * years_elapsed` — pirates hit harder in later
  years. Li Yuen's ships do double damage.
- **Booty** (awarded on victory): scales with elapsed time and pirate count
  (`current_time/4 * 1000 * pirates + randrange(1000) + 250`).

The battle opens with "N ((pirates)) approaching, Taipan!" (regular fleet), where the
pirates are picked at random, as the last setup roll, from `PIRATE_NAMES`: hostile
ships, war junks of the Black Hand, Malay prahus, lorchas flying the red flag, junks
of the Ladrone pirates, or snake boats of the Widow Ching's fleet (singular for one
ship: "1 hostile ship approaching, Taipan!"). Li Yuen's fleet opens with
"N ships of Li Yuen's pirate fleet, Taipan!!!".

### 7.2 Turn Structure

Battle alternates player turn then enemy turn until all pirates are gone, the player
flees, the ship sinks, or (regular fleet only) Li Yuen interrupts.

At the start of each round of a **regular** battle there is a 1-in-20 chance that Li
Yuen interrupts: the captain says "Li Yuen's fleet drove them off, Taipan!!", the
battle ends with no booty, and the Li Yuen encounter follows (§7.4). Li Yuen's fleet
never interrupts its own battle.

**Player options** (`get_opts`):

- **Fire cannons** (if any guns): each gun does `randrange(30)+10` damage to the
  current enemy ship; when a ship's health drops below 0 it sinks and a fresh enemy
  ship rotates in. Once the last ship sinks, the remaining guns hold their fire.
- **Dump cargo** (if carrying goods): throw goods overboard to improve escape odds.
  Dumping n > 0 units adds `max(1, n/10)` to `run_ok`.
- **Run away**: escape chance grows each attempt (`run_ik`/`run_ok` ratchet up);
  success ends the battle with no booty (`fled = True`). Partial escapes can shed
  some pirates; otherwise the attempt fails.

**Enemy turn** (`their_turn`): pirates fire; a hit may destroy one of your guns
(raising capacity by the gun's size since a gun occupies 10 units) or damage the
hull. Gun-hit probability rises with existing damage (certain above 80%). Every
volley also breaks 5–20% of any porcelain aboard: "They smashed ((n)) of our
porcelain!" (§4.7).

### 7.3 Resolution

- **Won**: booty is added to cash.
- **Fled** or **interrupted**: no reward.
- **Sunk**: in any battle, once hull damage reaches 100% of ship size the captain
  says "The buggers got us, Taipan!!" and "It's all over now!!", and the game is
  over and scored (§1.1). The saved game is deleted so it can't be restored.

### 7.4 Li Yuen's Fleet

Li Yuen's fleet shows up in one of two ways:

- It interrupts a regular battle (§7.2), or
- No regular pirates attacked this voyage, and a further chance comes up: 1-in-20,
  or 1-in-10, 1-in-6 and 1-in-5 as Li Yuen's grudge grows (§8): `trunc(20 / (1 + grudge))`.

(After a regular battle that ends normally — won or fled — Li Yuen doesn't appear.)

The captain says "Li Yuen's pirates, Taipan!!!". If `extorted` is not 0 (you've paid
Li Yuen's "donation" recently, §8), the captain says "Good joss!! They let us be!!"
and the voyage continues. Otherwise Li Yuen attacks with a fleet of 5 to
`(ship_size / 5) + ship_guns` ships (random, at least 5), plus 3 more for each level of
his grudge (`LI_YUEN_GRUDGE_SHIPS`), which do double damage. The player either flees,
wins (taking the booty), or sinks.

---

## 8. Li Yuen Extortion (`check_extortion`)

Li Yuen is the pirate admiral who demands "donations." A counter (`extorted`, 0–3)
randomly increments over time (1-in-20 per arrival after month 1, `LI_YUEN_PATIENCE`);
extortion only triggers when the counter wraps back to 0, about every five years.
Since it starts at 0, Li Yuen asks at the very start of a game that begins with cash
(the debt start).

- **Away from Hong Kong**: a lieutenant summons you to Hong Kong ("... his admiral is
  still waiting for you in Hong Kong!" once you've refused him).
- **In Hong Kong**: you are asked for a donation. Early game the demand is
  `cash/2.5 * rand + 1`. After month 12 it tracks what you're worth (pypan-88):
  `base + randrange(base)`, where `base` is the larger of `time * 1000` and 3% of your
  cash position, cash + bank − debt (`LI_YUEN_SHARE`). That's 3–6% of your fortune
  once it's past about 33,000 per month played.
- **Refusing** gives him a **grudge** (`grudge`, up to 3, `LI_YUEN_MAX_GRUDGE`), and
  he warns you, more sternly each time:
  1. "Very well. I would be wary of pirates if I were you, Taipan."
  2. "Li Yuen will remember this, Taipan. His fleet is looking for you."
  3. "Li Yuen has put a price on your head, Taipan! His whole fleet is hunting you."

  While he holds a grudge, his fleet attacks if you meet it, and you meet it more
  often and it brings more ships for each refusal (§7.4). The counter doesn't move,
  so he asks again on every arrival in Hong Kong, and his lieutenant comes on every
  arrival elsewhere. Each demand is 50% larger for each refusal
  (`LI_YUEN_GRUDGE_MARKUP`), after "Li Yuen has not forgotten your refusal, Taipan."
- **Can't afford it**: Elder Brother Wu can cover the shortfall, adding it to your
  debt. Turning Wu down counts as a refusal; Wu's own pirate warning stands in for the
  first one.
- Paying sets `extorted = 1`, resetting the cycle, and clears the grudge.

---

## 9. Ship & Warehouse Upgrades (`check_upgrades`, on arrival)

- **Repairs (McHenry)**: offered when home with hull damage (and some cash or money in
  the bank). The quote
  gives the damage as a percent of ship size and a cost that scales with elapsed
  time, damage, and ship size. You pay what you choose, up to the full cost; damage
  is fixed in proportion to what you pay, and paying the full cost fixes everything.
  Cash pays first, then the bank ("The necessary funds will be sent from the bank,
  Taipan."). If you enter more than your cash and bank together, Wu can cover the
  difference (added to debt), after all your cash and bank funds are spent.
  Any repair ends with McHenry's "Aye, she'll be right as rain for ye!!"
- **New ship** (after month 6, 1-in-4): buy a larger ship (`+50` capacity,
  `SHIP_SIZE_INCREMENT`) which also clears all damage. Cost scales with time/size.
- **New gun** (after month 6, 1-in-4): buy a cannon. A gun costs
  `randrange(...) + 500`, increases `ship_guns`, and **reduces usable capacity by
  10** (`GUN_SIZE`) since guns occupy hold space.

---

## 10. Warehouse (Canton/Hong Kong) (`check_warehouse`, `transfer`)

The player has a warehouse in Hong Kong (10000 capacity) used to stockpile goods.

- **Transferring** (Hong Kong only, no fee): move a chosen good between ship's hold
  and warehouse. When only one good is in the hold and the warehouse together, there's
  no menu: it goes straight to the questions for that good. Otherwise goods in neither
  are disabled.
- **Warehouse upgrade** (home only, after month 12, 1-in-10): buy `+5000` capacity
  (`WAREHOUSE_SIZE_INCREMENT`) for a time/size-scaled cost.

---

## 11. Law & Hazards (`check_safety`, after month 12)

- **Opium confiscation** (1-in-10 if carrying opium away from home, `POLICE_CHANCE`):
  harbor police seize all opium and, if you have cash, levy a fine of up to
  ~`cash/1.8`. They seize contraband consignments the same way (§12).
- **Mugging** (1-in-20 away from home if cash > 20000, `ROBBERY_CASH_LIMIT`):
  bodyguards beaten, you lose up to ~`cash/1.4`. The same check runs on leaving
  the bank (§4.4).
- **Warehouse fire** (1-in-50 if the warehouse holds anything): a fire destroys a
  large random fraction of each stored good (each good reduced to `qty / (1.3+rand)`,
  minimum 1).

---

## 12. Special Cargo / Consignments (`check_cargo`, from month 18)

Occasionally the player is offered a one-off consignment to carry to a specific
city for a fee, occupying some hold space. A `Cargo` has a description (e.g.
"bronze statue", "party of 3", "consul's piano"), a destination
(any other city), a size (5–30% of ship size), a payout value, and a `due` month
(the month after it was offered, as `current_time`). Only one special cargo can be
carried at a time, and it can't be dumped in battle.

Consignments are a small, guaranteed boost rather than a rival to trading (pypan-48).
They're priced on the player's **money**, `cash + bank - debt` (goods don't count):

- **Odds of an offer:** 1-in-20 on each arrival; 1-in-3 if money is 0 or less (a
  life line); never if money is over 100,000 (`CONSIGNMENT_MONEY_LIMIT`).
- **Value**, fixed when offered: `CONSIGNMENT_RATE` (0.15) ± 20%, times money, times
  `size / ship_size`. It's never less than the original fee: a pay rate of 35, 350
  or 3,500 per unit of space, times the size, plus 0–99.
- **Good joss:** 1-in-15 offers pay triple, and the offer begins "Good joss!!".
- **Contraband** (pypan-83): 1-in-4 offers are illegal (`CONTRABAND_CHANCE`; the
  `Cargo`'s `illegal` flag), described as, for example, a "crate of rifles", "Taiping
  war chest" or "pirate's hoard". They pay 5 times as much
  (`CONTRABAND_PAY`, before any good joss), and the offer warns "It's contraband: the
  harbor police may seize it, and fine us." The cargo pane marks it "Contraband!".
  Like opium, it's at risk on every foreign arrival (§11), including at its
  destination, before it's delivered: 1-in-10 (`POLICE_CHANCE`), the harbor police
  seize it ("Bad joss! Harbor police have seized the ((description)) bound for
  ((city))") and, if you have cash, fine you up to ~`cash/1.8`. A seized consignment
  is gone, unpaid. Hong Kong is safe.
- **Delivery:** arriving at the destination pays out and frees the space. Each
  month past `due` takes 20% of the value off the pay
  (`CONSIGNMENT_LATE_PENALTY`). Arriving anywhere else, the compradore reminds you
  of the commitment; at 5 months late (`CONSIGNMENT_LATE_LIMIT`) the cargo is
  offloaded unpaid.

Saves from pypan.py have no `due`; on loading, such a consignment is due the month
after the save's date.

---

## 13. Persistence

- **Save**: the `Hong` state is saved to the browser's `localStorage` (key
  `pypan.save`) in the same pretty-printed JSON format the Python version wrote to
  `pypan.json`, so Python saves can be imported. It saves at the top of every port
  menu iteration. When the game ends (retiring or sinking), the save is deleted.
- **Load**: offered at startup if a save exists. A missing, corrupt, or unreadable
  save is treated as no save.
- Saves are per browser: a game started on one device isn't visible on another.
  Leaving in the middle of an event (e.g. a battle) resumes from the last port menu.

---

## 14. Numeric Constants Reference

| Constant | Value | Role |
|---|---|---|
| `START_CASH` | 400 | Starting cash (debt start) |
| `START_DEBT` | 5000 | Starting debt (debt start) |
| `START_YEAR` / `START_MONTH` | 1860 / 1 | Starting date |
| `START_GUNS` | 5 | Starting guns (guns start) |
| `START_SHIP_SIZE` | 60 | Starting cargo capacity |
| `START_WAREHOUSE_SIZE` | 10000 | Warehouse capacity |
| `GUN_SIZE` | 10 | Hold space a gun occupies |
| `LOAN_RATE` | 0.10 | Debt interest per voyage |
| `BANK_RATE` | 0.005 | Bank interest per voyage (§4.4) |
| `SHIP_SIZE_INCREMENT` | 50 | Capacity added by a new ship |
| `WAREHOUSE_SIZE_INCREMENT` | 5000 | Capacity added by a warehouse upgrade |
| `DEBT_THREAT_LEVEL` | 10000 | Debt at which Wu threatens (and can have you robbed) |
| `DEBT_MULTIPLIER` | 2 | (declared; borrow-against-cash factor) |
| `ROBBERY_CASH_LIMIT` | 20000 | Cash above which mugging can occur |
| `CONSIGNMENT_RATE` | 0.15 | Share of money a hold-filling consignment pays (§12) |
| `CONSIGNMENT_MONEY_LIMIT` | 100000 | Money above which no consignments are offered |
| `CONSIGNMENT_LATE_PENALTY` | 0.2 | Share of a consignment's pay lost per month late |
| `CONSIGNMENT_LATE_LIMIT` | 5 | Months late before a consignment is offloaded |
| `CONTRABAND_CHANCE` | 4 | 1-in-N consignments offered are contraband |
| `CONTRABAND_PAY` | 5 | Contraband pays this many times as much |
| `POLICE_CHANCE` | 10 | 1-in-N foreign arrivals on which police seize opium or contraband |
| `JADE_MIN_MONTHS` | 24 | Months before the jade expedition can be offered (§4.6) |
| `JADE_BANK_LEVEL` | 2000000 | Bank balance above which the jade expedition can be offered |
| `JADE_STAKE_SHARE` | 0.25 | The stake asked for is 1–2 times this share of the bank ... |
| `JADE_INVESTMENT` | 1000000 | ... but at least this |
| `JADE_EXPEDITION_MONTHS` | 3 | Months from the offer until the expedition resolves |
| `MINE_SHARE_MIN` / `_MAX` | 2 / 5 | A success makes the stake a mine share worth this many times as much |
| `VENTURE_QUARTER_MONTHS` | 3 | Months between a venture's returns (§4.8) |
| `VENTURE_FEE_SHARE` | 0.1 | Share of the cash position a godown or arms share (or addition) costs |
| `VENTURE_WORTH_LEVEL` | 10000 | Cash position above which they're offered |
| `REFUSAL_LOSS` | 0.5 | Share of a share lost for refusing a call for funds |
| `MINE_RETURN` | −0.1 / 0.2 | The jade mine's quarterly return, as a share of the share's value |
| `GODOWN_MIN_MONTHS` / `GODOWN_OFFER_CHANCE` | 12 / 3 | Godowns: offered after this month, 1-in-N Shanghai arrivals |
| `GODOWN_RETURN` / `GODOWN_SEIZURE_CHANCE` | −0.05 / 0.1, 60 | Godowns' quarterly return, and 1-in-N quarters seized |
| `ARMS_MIN_MONTHS` / `ARMS_OFFER_CHANCE` | 24 / 6 | Arms smuggling: offered after this month, 1-in-N foreign arrivals |
| `ARMS_RETURN` / `ARMS_SHUTDOWN_CHANCE` | −0.15 / 0.3, 30 | Arms smuggling's quarterly return, and 1-in-N quarters shut down |
| `MINE_SEIZURE_CHANCE` | 80 | 1-in-N quarters, rebels seize the mine |
| `MINE_VEIN_CHANCE` / `MINE_VEIN_PAYOUT` | 40 / 2 | 1-in-N quarters, a rich vein pays this many times the share |
| `JADE_MAX_OFFERS` | 3 | Times the expedition can be offered in a game |
| `PORCELAIN_MIN_MONTHS` | 48 | Months before the porcelain share can be offered (§4.7) |
| `PORCELAIN_WORTH_LEVEL` | 2000000 | Cash position above which it can be offered |
| `PORCELAIN_FEE_SHARE` | 0.75 | Share of the cash position it costs |
| `PORCELAIN_ODDS_START` / `_MIN` | 20 / 3 | 1-in-N per Hong Kong arrival, from first to best |
| `PORCELAIN_RAMP_MONTHS` | 3 | Months for each step from 1-in-20 toward 1-in-3 |
| `STORM_BREAKAGE` | 20–50 | Percent of the porcelain aboard a storm breaks |
| `ROUGH_SEAS_BREAKAGE` / `ROUGH_SEAS_CHANCE` | 10–30 / 3 | Rough seas: percent broken, and 1-in-N voyages without a storm |
| `VOLLEY_BREAKAGE` | 5–20 | Percent broken by each enemy volley |
| `BASED_PRICES` | true | Port-based prices (§4.1); false for fully random |
| `SCORE_DIVISOR` | 200 | The score is the final position per month played, divided by this (§1.1) |
| `ENEMY_HEALTH_START` / `_BUMP` | 20 / 10 | Pirate health base + per-year growth |
| `ENEMY_DAMAGE_START` / `_BUMP` | 0.5 / 0.5 | Pirate damage base + per-year growth |
| `LI_YUEN_MIN_SHIPS` | 5 | Smallest fleet Li Yuen sends |
| `LI_YUEN_PATIENCE` | 20 | 1-in-N arrivals that advance Li Yuen's counter (§8) |
| `LI_YUEN_SHARE` | 0.03 | Share of your cash position his demand starts from, after month 12 |
| `LI_YUEN_SIGHTING` | 20 | 1-in-N voyages without pirates that bring his fleet, divided by `1 + grudge` |
| `LI_YUEN_MAX_GRUDGE` | 3 | Refusals he remembers until you pay |
| `LI_YUEN_GRUDGE_MARKUP` | 0.5 | Share added to his demand per refusal |
| `LI_YUEN_GRUDGE_SHIPS` | 3 | Ships added to his fleet per refusal |

---

## 15. User Interface

A green-screen terminal look: phosphor-green VT323 text on black with a soft glow
and scanlines (turned off when the device asks for reduced motion), themed with
ASCII art and pidgin-flavored dialogue ("Taipan," "joss," McHenry's Scots brogue,
etc.). It is built for touch on iPhone and iPad, and also works with a keyboard.

- **Report** (the message area): the comprador's report in port, the captain's at
  sea, with the date, the current message, and any ASCII art backdrop (`STORM`,
  `PIRATES`, `BOAT`). Messages type out and can be skipped with a tap.
- **Current Status**: location, cash, debt, bank, any shares in ventures (§4.8), guns,
  repair %.
- **Canton Warehouse**: stored goods and remaining capacity.
- **Ship's Hold**: carried goods, remaining capacity, and any special cargo.

Layouts: on iPad landscape and desktop, the report is on the left with the three
panes on the right (like the curses layout). On iPad portrait, the panes sit in a row
across the top. On iPhone, a compact status strip sits at the top and the hold and
warehouse open as a drawer, with the hold on the left.

### 15.1 Input Conventions

Each prompt shows touch controls in a dock below the report:

- **Message** (`say`): a Continue button, or tap the report; any key continues.
  Some messages are **beats** in a sequence (`pause`): they move on by themselves
  0.9 seconds after they're fully shown, and a tap moves on at once. At sea, every
  message in a battle round is a beat except the last before your next choice, and a
  storm's announcement is a beat, so a round or a storm takes one tap.
- **Yes/No** (`ask_yn`): Yes and No buttons; Y/N keys.
- **Menu** (`ask_opt`): numbered buttons; select by number or by the option's first
  letter. Some menus can be cancelled (button or `Esc`). Options that can't be chosen
  right now are shown disabled rather than removed, so menus keep their shape.
- **Number** (`ask_num`): an on-screen keypad with ⌫, **ALL** (fills in the maximum)
  and OK; on a keyboard, type digits, Backspace, **A** for all, **Enter** to confirm.
  Amounts above the maximum are allowed; the game explains why they're refused (and
  for repairs, offers Wu's help).

When the game ends, the final screen shows how it ended, the score, and the ranking
table (§1.1), with a button to start a new game.

---

## 16. Known Incomplete / TODO Items

- **Escalating bailouts** — the `bailout` multiplier is never increased (pypan-39).
- **Resuming mid-event** — reloading during a battle resumes from the last port menu.

---

## 17. Changes from the Python Version

Fixes to bugs in `etc/pypan.py`:

- **Repairs** now cost money when you pay McHenry yourself (they were free), fix
  damage in proportion to what you pay (it was backwards), charge no more than the
  full cost, and quote damage as a real percent. A leftover debug message is gone.
- **Cannon fire** stops once the last pirate ship sinks (guns kept firing at phantom
  ships, so the pirate count could go negative).
- **Wu's robbery** requires that he threatened you on an earlier visit and that you
  still owe more than 10000 (it only happened if he had *not* threatened you).
- **Dumping cargo** improves escape odds by at least 1, plus 1 per 10 units (it was
  capped at 1).
- **Batavia** can be chosen as a storm diversion or cargo destination (it never was).
- **`in_range(lo, hi)`** gives lo..hi-1 (it gave lo..hi-2), so prices are 5–30× and
  shock factors 5–9 as intended; storm damage (5–20) and cargo size (5–30%) were
  adjusted to match.
- **Hazards** (police, muggers, fire) start after month 12 (they started in month 12).
- **Negative price shocks** keep the good's price granularity (a crashed silk price
  could come out as e.g. 71).
- **Storm damage** stops at 80% of ship size (it stopped at 80 raw damage points).
- **Bank interest** is 0.5% per voyage (it was 5%, which outpaced every other way of
  making money late in the game).

Additions:

- **Port-based prices** (§4.1), using the original C *Taipan!* formula. pypan.py's
  optional "based" mode drew from a wide normal distribution that washed out most of
  the port differences, and its table had each port profile attached to the wrong
  good (the magnitudes were reversed but the rows weren't). The table is now
  correctly mapped, and port-based prices are on by default.
- **Li Yuen's pirate fleet** (§7.4), which was defined but never used.
- **The jade expedition** (§4.6) replaces jade as a good: a stake of a quarter to
  half of the bank, which if it succeeds gives its backers a share in the mine worth
  2–5 times as much, paying (or calling for funds) every three months.
- **Contraband consignments** (§12), which pay five times as much but can be seized
  by the harbor police, with a fine, like opium. pypan.py's `illegal` flag was never
  set.
- **Ventures** (§4.8): shares in cargo godowns and arms smuggling replace trading
  general cargo and arms, and lead on to the jade expedition.
- **Porcelain** (§4.7), a fragile top good unlocked by buying a share in the trade
  for three-quarters of your fortune, from month 48. Storms, rough seas and cannon
  fire break it.
- **Li Yuen's demand tracks your fortune** (§8, pypan-88) rather than only the
  calendar, and refusing him earns a grudge: his fleet hunts you more often and in
  greater numbers, and his next demand is larger, until you pay.
- **Sinking** (§7.3): the ship can now be lost in battle, ending the game.
- **Retiring and scoring** (§1.1): Retire replaces Exit; the game ends with a score
  and rank, with three ranks above Ma Tsu.
- **Mugging on leaving the bank** (§4.4), at the harbor odds.
- **Elder Brother Wu** is no longer on the port menu; like McHenry, you're offered a
  visit only on arrival in Hong Kong (§4.5). The offer now comes on every arrival,
  not only when you owe him.
- **McHenry** says "Aye, she'll be right as rain for ye!!" after a repair, and when
  Wu covers a partial repair he pays only the amount you asked for (he used to pay
  the full cost).

Interface changes:

- The web UI replaces `curses` (§15), with saves in browser storage (§13).
- Market prices are shown in two columns.
- **Exit the game** is gone: progress is saved automatically, so closing the app is
  enough. **Retire** takes its place at the end of the Hong Kong menu.
- Display amounts (such as Li Yuen's demand) use thousands separators throughout.
- **Streamlined menus** (pypan-58): Sell, Transfer and the current port are disabled
  when they can't be used; selling a lone good and transferring a lone good skip the
  goods menu, and goods you can't buy, sell or transfer are disabled on its menu;
  buying and repairs can draw on the bank in Hong Kong.
- **No transfers or banking abroad**: pypan.py's lorcha (warehouse transfers from a
  foreign port, for a 5–9% fee) is gone; the warehouse and the bank are Hong Kong
  only.
