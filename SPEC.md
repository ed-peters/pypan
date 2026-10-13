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

When the game ends, the **final cash position** is cash + bank − debt (goods don't
count). The captain comments on it, if it deserves a comment (only the first that
applies):

- Over 1,000,000: "You're a M I L L I O N A I R E !!!"
- Below 0: "The crew has requested that you stay on shore for their safety!!"
- Below 1,000: "Have you considered a land-based job?"

The **score** is `cash position / months played / 100`, rounded down (it can be
negative). The final screen says "Your score is N." and shows the ranking table with
the player's rank marked:

| Rank | Score |
|---|---|
| Ma Tsu | 50,000 and over |
| Master Taipan | 8,000 to 49,999 |
| Taipan | 1,000 to 7,999 |
| Compradore | 500 to 999 |
| Galley Hand | less than 500 |

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
| `bailout` | Multiplier for emergency loan cost (see §4.5) | 1 |
| `location` | Current city index (or AT_SEA) | Hong Kong |
| `transfer` | Warehouse transfer fee %; `-1` means unavailable | 0 |
| `banker` | Whether the bank's representative is in this foreign port (§4.4); saved only when true | false |
| `prices[5]` | Current local price of each good | set for Hong Kong |

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
the home port**: it is the only place with a bank (barring a visit from its
representative, §4.4), the moneylender (Elder Brother Wu),
ship repair (McHenry), warehouse upgrades, and free warehouse transfers.

### 2.4 Goods

Five tradeable commodities, indexed 0–4, each in a different price tier (the tier
sets the order of magnitude via `mult(n) = 10^n`):

| Index | Good | Price magnitude |
|---|---|---|
| 0 | General | ~1× (tens) |
| 1 | Arms | ~10× (hundreds) |
| 2 | Silk | ~100× (thousands) |
| 3 | Opium | ~1000× (tens of thousands) |
| 4 | Jade | ~10000× (hundreds of thousands) |

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
  warehouse transfers and the bank's representative (away from home), and
  harbor-police / mugging / fire events.
- **>= 18 months**: special cargo consignments begin to appear.

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
| Jade (×10000) | 6 | 7 | 8 | 6 | 7 | 5 | 5 |

The General, Arms, Silk and Opium rows are taipan.c's. It has no Jade, so Jade's row
is our own: cheap in Singapore and Batavia, dear in Nagasaki.

With the `BASED_PRICES` flag turned off, prices are fully random instead:
`in_range(5, 31) * 10^good_index`, i.e. 5–30× the magnitude in every port.

### 4.2 Price Shocks

After month 1, there is a 1-in-10 chance per arrival of a market shock on a random
good. A coin flip decides direction:

- **Positive shock** (e.g. famine, rebellion): price multiplied by a factor of 5–9.
- **Negative shock** (e.g. a glut, dumping): price divided by that factor.

Either way the result keeps the good's usual granularity: it is rounded down to a
multiple of its magnitude (General 1, Arms 10, Silk 100, ...), and is at least one
magnitude.

Each shock prints a themed flavor message (see `MSG_POS_SHOCK` / `MSG_NEG_SHOCK`).

### 4.3 Buying and Selling

- **Buy**: limited by cash (`floor(cash / price)`). Goods go into the ship's hold.
  No explicit capacity check at purchase time — overload is caught when sailing.
- **Sell**: limited by the quantity in the ship's hold. Proceeds added to cash.

Both show a condition report listing the current price of all five goods, in two
columns.

### 4.4 Banking (Hong Kong, or with the bank's representative)

Deposit cash into or withdraw from the bank. The bank is in Hong Kong, but on
arrival at a foreign port after month 12 there is a 1-in-6 chance (the lorcha's
odds) that a representative from the bank is there for the month: "Good joss!! A
representative from your bank is in Shanghai for the month. You may transact with
him as normal." While he's in port, the menu offers **Visit the bank**. The bank balance **earns 5% interest
per voyage** (`BANK_RATE`), applied on arrival at any port.

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

---

## 5. The Voyage Loop

The game is driven by `compradors_loop`, which (in Hong Kong) first checks extortion
and the lender, then repeatedly presents the port action menu. The menu
(`establish_opts`) offers, in order:

- **Buy goods**
- **Sell goods**
- **Transfer goods** (only if `transfer >= 0`)
- In Hong Kong, or abroad when the bank's representative is in port: **Visit the bank**
- **Leave port**
- In Hong Kong only, and only when out of debt: **Retire**. It asks "Are you sure you
  want to retire, Taipan?" before ending the game (§1.1).

The game auto-saves at the top of every menu iteration.

### 5.1 Sailing (`sail_away`)

1. Refuses to sail if the ship is **overloaded** (`ship_available() < 0`).
2. Prompts for a destination (cannot be the current city; can be cancelled).
3. Sets location to **At Sea**, advances the clock one month, shows the boat art.
4. **Pirate check**, including Li Yuen's fleet (see §7). If the ship sinks, the game
   ends here.
5. **Storm check** (see §6).
6. Arrives; **debt and bank interest are applied**.
7. Runs the arrival event sequence:
   `check_lender` → `check_extortion` → `check_upgrades` → `check_warehouse`
   → `check_banker` → `check_cargo` → `check_safety` → `establish_prices`.

---

## 6. Storms (`check_storm`)

A 1-in-10 chance per voyage. When a storm hits, one of three outcomes:

- **Damage**: if hull damage is under 80% of ship size, a 1-in-10 chance of taking
  5–20 additional damage.
- **Blown off course**: else 1-in-3 chance of being diverted to a different random
  city than intended (any of the other six).
- **Safe passage**: otherwise, "We made it!"

Storms can't sink the ship.

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

The battle opens with "N hostile ships approaching, Taipan!" (regular fleet) or
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
hull. Gun-hit probability rises with existing damage (certain above 80%).

### 7.3 Resolution

- **Won**: booty is added to cash.
- **Fled** or **interrupted**: no reward.
- **Sunk**: in any battle, once hull damage reaches 100% of ship size the captain
  says "The buggers got us, Taipan!!" and "It's all over now!!", and the game is
  over and scored (§1.1). The saved game is deleted so it can't be restored.

### 7.4 Li Yuen's Fleet

Li Yuen's fleet shows up in one of two ways:

- It interrupts a regular battle (§7.2), or
- No regular pirates attacked this voyage, and a further 1-in-20 chance comes up.

(After a regular battle that ends normally — won or fled — Li Yuen doesn't appear.)

The captain says "Li Yuen's pirates, Taipan!!!". If `extorted` is not 0 (you've paid
Li Yuen's "donation" recently, §8), the captain says "Good joss!! They let us be!!"
and the voyage continues. Otherwise Li Yuen attacks with a fleet of 5 to
`(ship_size / 5) + ship_guns` ships (random, at least 5), which do double damage. The
player either flees, wins (taking the booty), or sinks.

---

## 8. Li Yuen Extortion (`check_extortion`)

Li Yuen is the pirate admiral who demands "donations." A counter (`extorted`, 0–3)
randomly increments over time (1-in-20 per arrival after month 1); extortion only
triggers when the counter wraps back to 0. Since it starts at 0, Li Yuen asks at the
very start of a game that begins with cash (the debt start).

- **Away from Hong Kong**: a lieutenant summons you to Hong Kong.
- **In Hong Kong**: you are asked for a donation. Early game the demand is
  `cash/2.5 * rand + 1`; after month 12 it is `in_range(0, time*1000) + time*1000`
  (much larger).
- **Refusing**: you get a pirate warning, and his fleet will attack if you meet it
  (§7.4).
- **Can't afford it**: Elder Brother Wu can cover the shortfall, adding it to your debt.
- Paying sets `extorted = 1`, resetting the cycle.

---

## 9. Ship & Warehouse Upgrades (`check_upgrades`, on arrival)

- **Repairs (McHenry)**: offered when home with hull damage (and some cash). The quote
  gives the damage as a percent of ship size and a cost that scales with elapsed
  time, damage, and ship size. You pay what you choose, up to the full cost; damage
  is fixed in proportion to what you pay, and paying the full cost fixes everything.
  If you enter more than your cash, Wu can cover the difference (added to debt).
  Any repair ends with McHenry's "Aye, she'll be right as rain for ye!!"
- **New ship** (after month 6, 1-in-4): buy a larger ship (`+50` capacity,
  `SHIP_SIZE_INCREMENT`) which also clears all damage. Cost scales with time/size.
- **New gun** (after month 6, 1-in-4): buy a cannon. A gun costs
  `randrange(...) + 500`, increases `ship_guns`, and **reduces usable capacity by
  10** (`GUN_SIZE`) since guns occupy hold space.

---

## 10. Warehouse (Canton/Hong Kong) (`check_warehouse`, `transfer`)

The player has a warehouse in Hong Kong (10000 capacity) used to stockpile goods.

- **Transfer fee**: 0% in Hong Kong. Away from home, after month 12, a 1-in-6 chance
  that a "lorcha" lets you transfer goods to/from the Hong Kong warehouse for a 5–9%
  fee; otherwise transfers are unavailable away from home (`transfer = -1`).
- **Transferring**: move a chosen good between ship's hold and warehouse. The
  transfer fee skims a percentage off the quantity that actually arrives.
- **Warehouse upgrade** (home only, after month 12, 1-in-10): buy `+5000` capacity
  (`WAREHOUSE_SIZE_INCREMENT`) for a time/size-scaled cost.

---

## 11. Law & Hazards (`check_safety`, after month 12)

- **Opium confiscation** (1-in-10 if carrying opium away from home): harbor police
  seize all opium and, if you have cash, levy a fine of up to ~`cash/1.8`.
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
"bronze statue", "jade statue", "party of 3", "secret document"), a destination
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
| `BANK_RATE` | 0.05 | Bank interest per voyage |
| `SHIP_SIZE_INCREMENT` | 50 | Capacity added by a new ship |
| `WAREHOUSE_SIZE_INCREMENT` | 5000 | Capacity added by a warehouse upgrade |
| `DEBT_THREAT_LEVEL` | 10000 | Debt at which Wu threatens (and can have you robbed) |
| `DEBT_MULTIPLIER` | 2 | (declared; borrow-against-cash factor) |
| `ROBBERY_CASH_LIMIT` | 20000 | Cash above which mugging can occur |
| `CONSIGNMENT_RATE` | 0.15 | Share of money a hold-filling consignment pays (§12) |
| `CONSIGNMENT_MONEY_LIMIT` | 100000 | Money above which no consignments are offered |
| `CONSIGNMENT_LATE_PENALTY` | 0.2 | Share of a consignment's pay lost per month late |
| `CONSIGNMENT_LATE_LIMIT` | 5 | Months late before a consignment is offloaded |
| `BASED_PRICES` | true | Port-based prices (§4.1); false for fully random |
| `ENEMY_HEALTH_START` / `_BUMP` | 20 / 10 | Pirate health base + per-year growth |
| `ENEMY_DAMAGE_START` / `_BUMP` | 0.5 / 0.5 | Pirate damage base + per-year growth |
| `LI_YUEN_MIN_SHIPS` | 5 | Smallest fleet Li Yuen sends |

---

## 15. User Interface

A green-screen terminal look: phosphor-green VT323 text on black with a soft glow
and scanlines (turned off when the device asks for reduced motion), themed with
ASCII art and pidgin-flavored dialogue ("Taipan," "joss," McHenry's Scots brogue,
etc.). It is built for touch on iPhone and iPad, and also works with a keyboard.

- **Report** (the message area): the comprador's report in port, the captain's at
  sea, with the date, the current message, and any ASCII art backdrop (`STORM`,
  `PIRATES`, `BOAT`). Messages type out and can be skipped with a tap.
- **Current Status**: location, cash, debt, bank, guns, repair %.
- **Canton Warehouse**: stored goods and remaining capacity.
- **Ship's Hold**: carried goods, remaining capacity, and any special cargo.

Layouts: on iPad landscape and desktop, the report is on the left with the three
panes on the right (like the curses layout). On iPad portrait, the panes sit in a row
across the top. On iPhone, a compact status strip sits at the top and the hold and
warehouse open as a drawer.

### 15.1 Input Conventions

Each prompt shows touch controls in a dock below the report:

- **Message** (`say`): a Continue button, or tap the report; any key continues.
- **Yes/No** (`ask_yn`): Yes and No buttons; Y/N keys.
- **Menu** (`ask_opt`): numbered buttons; select by number or by the option's first
  letter. Some menus can be cancelled (button or `Esc`).
- **Number** (`ask_num`): an on-screen keypad with ⌫, **ALL** (fills in the maximum)
  and OK; on a keyboard, type digits, Backspace, **A** for all, **Enter** to confirm.
  Amounts above the maximum are allowed; the game explains why they're refused (and
  for repairs, offers Wu's help).

When the game ends, the final screen shows how it ended, the score, and the ranking
table (§1.1), with a button to start a new game.

---

## 16. Known Incomplete / TODO Items

- **Escalating bailouts** — the `bailout` multiplier is never increased (pypan-39).
- **Make jade an event** — jade exists as a tradeable good but has no special event.
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

Additions:

- **Port-based prices** (§4.1), using the original C *Taipan!* formula. pypan.py's
  optional "based" mode drew from a wide normal distribution that washed out most of
  the port differences, and its table had each port profile attached to the wrong
  good (the magnitudes were reversed but the rows weren't). The table is now
  correctly mapped, with a new row for Jade, and port-based prices are on by default.
- **Li Yuen's pirate fleet** (§7.4), which was defined but never used.
- **Sinking** (§7.3): the ship can now be lost in battle, ending the game.
- **Retiring and scoring** (§1.1): Retire replaces Exit; the game ends with a score
  and rank.
- **Mugging on leaving the bank** (§4.4), at the harbor odds.
- **The bank's representative** (§4.4) can turn up in foreign ports.
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
