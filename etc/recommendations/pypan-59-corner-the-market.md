# pypan-59: Corner the market (epic)

## The pitch

> Not trade the goods — own the supply chain. ... Early game you are the trader. Late
> game you own the traders.

The pitch has three parts:

1. **Ownership:** buy a good's supply in a region. Every shipment of that good then
   pays you, whether or not you're there.
2. **Opposition:** rivals undercut you by bribing suppliers, funding competition and
   hiring pirates. The late game becomes defending an empire.
3. **The squeeze:** with enough control, restrict supply and spike the good's price
   everywhere. You make big money, but ports starve and the merchant houses turn
   against you.

Each part is filed separately, because each stands on its own and has its own design
questions:

| Bead | Feature | Depends on |
|---|---|---|
| pypan-60 | Supply holdings and royalties | — |
| pypan-61 | Rivals strike back at your holdings | pypan-60 |
| pypan-62 | The squeeze | pypan-60 |

## How the pitch fits this game

**What already fits:**
- **The goods have a natural ladder.** General cargo (price magnitude 1), arms (10),
  silk (100), opium (1,000), jade (10,000). The pitch's "rice" and "tea" are
  **general cargo** here: the good nobody bothers with, because it earns about 3 per
  unit per voyage against about 32,000 for jade.
- **The monthly tick exists.** Every voyage takes a month, and `accrueInterest` already
  pays bank interest and charges Wu's interest on arrival. Royalties can be paid at the
  same point.
- **Event templates exist.** Warehouse fires, opium seizures and muggings are all "a
  chance per arrival of losing a share of something". Raids on holdings can use the
  same shape.
- **Late game needs something new.** pypan-57 (new ports) starts from "after a couple
  hundred rounds the game gets stale". This epic answers the same problem a different
  way.

**What's missing:**
- **There are no rivals or merchant houses.** The only other people in the game are Wu,
  Li Yuen, McHenry, the police and anonymous pirates. pypan-61 and pypan-62 need at
  least a simple model of "the merchant houses".
- **There's no shared market.** Prices are rolled fresh for one port on each arrival
  (`setPrices`). Nothing remembers prices across ports or months. A squeeze needs
  state that every port's prices read.
- **General cargo is nearly worthless in absolute terms.** A royalty proportional to
  general cargo's trade would be pennies. **The return on a holding must not depend on
  the good's unit price.** See pypan-60.
- **Passive income barely exists.** The bank pays **0.5% a month with no risk**, which
  doubles your money only every 11½ years. Late in the game, trading is limited by
  the hold rather than by money, so money piles up in the bank (about 7–12M for the
  middling player after 5 years, and 300–440M after 10; see `etc/wealth-curve.md`).
  Holdings compete with that idle money, not with trading, so a modest return is
  already attractive.

## Recommendation

Build it in three phases, each playable on its own:

1. **pypan-60, holdings.** Buy a holding (good × port). It pays a monthly return on its
   price. Cheap holdings for low-value goods, expensive ones for high-value goods.
   Unlocked late (for example at rank Taipan, or a cash position of 1,000,000). The
   middling player has 1,000,000 by about month 30–36, and the low player by about
   month 42–50.
2. **pypan-61, rivals.** A **hostility** level per good. It grows with the value and
   number of holdings you own, and drives raid, bribery and competition events.
   Defense comes from guards, which can share work with pypan-55 (bodyguards).
3. **pypan-62, the squeeze.** Once you control most of a good, you can squeeze it for a
   few months. Its price multiplies in every port, and your holdings pay more. In
   return, hostility jumps, a port may close to you, and the police and Li Yuen get
   harsher.

**The key balance principle:** low-value goods should be **cheap to corner and ignored
by rivals**. High-value goods should be **expensive and fiercely contested**. That keeps
the pitch's best idea, cornering rice because it was beneath everyone's notice, as an
actual strategy rather than flavor.

## Questions that cut across all three

1. **Is this the late game, or a parallel path?** Should it unlock by rank, cash
   position or year, so it's clearly "late game"?
2. **What's the target pace?** Holdings that are too good make trading pointless.
   Holdings that are too weak make them a curiosity. Measured paces
   (`etc/wealth-curve.md`) and a suggested target:
   - trading: about 30% a month in year 2 and 13% in year 3, settling to about 6% a
     month from year 5 on, as the hold fills
   - holdings, after losses: about 2–4% a month (suggested)
   - bank: 0.5% a month
3. **Who are the "merchant houses"?** Anonymous ("a rival hong"), a few named houses, or
   the traders from pypan-54 (sponsoring traders)? Named houses give the squeeze's
   "enemies you've cultivated for years" real meaning. They are also the biggest
   addition here.
4. **How does this affect the score?** Holdings aren't cash. Do they count toward the
   cash position at a sale value, or must you sell them before retiring?
5. **Interface:** where does the player see their empire? A new menu option ("Review
   holdings"), a summary line in the status strip, or a pane that toggles like the
   cargo pane on small screens?
6. **Saved games:** holdings, hostility and squeeze state all have to be saved. That's
   likely a new nested section in the save file, written only when present, so Python
   saves still load.
7. **How does this interact with other beads?** pypan-52 (foreign warehouses) for
   stockpiling a squeezed good, pypan-54 (sponsoring traders) for merchant relations,
   pypan-55 (bodyguards) for defense, and pypan-57 (new ports) for regions.
