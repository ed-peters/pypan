# pypan-56: Ship armor

## Proposal

Now and then, offer armor for the ship. It reduces hold space, and in return it
absorbs cannon fire in battle, being destroyed in the process.

## How it works today

- **Guns:** offered after month 6 (1-in-4). Each gun costs hold space (`GUN_SIZE` =
  10) and can be knocked out in battle, which frees its space.
- **Enemy fire** (`theirTurn` in `src/engine/battle.ts`):
  - **Gun hits:** a shot may hit a gun. The chance rises with hull damage, and it's
    certain above 80%.
  - **Hull damage:** `enemyDamage × min(15, pirates) × fleet × random + pirates / 2`.
  - **Li Yuen's fleet** (fleet = 2) does double damage.
- **Sinking:** the ship sinks at 100% damage.
- **Other damage:** storms also cause damage, and McHenry repairs it in Hong Kong.

## Recommendation

Model armor as **plates**, like guns: a count, each taking hold space.

- **Offer:** after month 6, with the same odds as guns (or 1-in-6, so it's rarer).
  Pricing is similar to guns. Each plate takes 5–10 units of hold space.
- **In battle:** each enemy volley first hits the armor.
  - **Absorbing:** each plate absorbs up to a fixed amount of damage, then is
    destroyed and its hold space is freed, as with a lost gun. Any leftover damage
    goes to the hull.
  - **Protecting guns:** while you have plates, gun hits are rarer.
- **Message:** "Our armor took the brunt of it, Taipan!" (plus "We lost N plates").
- **Trade-off:** hold space versus survival, like guns. Guns help you win; armor helps
  you survive and run.

## Questions to answer before implementing

1. **Plates or one armor rating?** Plates fit "destroyed in the process" and mirror
   guns. A rating that wears down is simpler to show.
2. **How much does it absorb?** A fixed amount per plate, a percentage of each volley,
   or a chance to block the whole volley?
3. **Does it protect guns,** lowering the chance of a gun hit, or only the hull?
4. **Does it help against storms,** or only cannon fire?
5. **Hold space and cost per plate.** Should the space cost match guns (10), or be
   cheaper to make it attractive?
6. **Is there a maximum,** for example scaled to ship size?
7. **Does armor slow you down,** lowering the odds of running away? That gives it a
   real cost beyond space.
8. **Can McHenry repair or restore armor,** or must it be bought again?
9. **What happens to armor when you buy a new ship?** Today a new ship keeps your guns.
10. **Display:** show armor in the status strip next to guns and in the battle
    messages.
11. **Saved games:** an `armor` count, written only when non-zero.

## What changes in the code

- `src/engine/hong.ts` and `src/engine/save.ts`: armor count.
- `src/engine/shipyard.ts`: the offer.
- `src/engine/battle.ts`: absorbing damage, gun-hit odds, possibly run odds.
- `src/engine/constants.ts`: plate size and absorb amount.
- `src/ui/panes.ts`, and SPEC.md §7 and §9.
