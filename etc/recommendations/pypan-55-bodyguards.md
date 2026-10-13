# pypan-55: Better bodyguards

## Proposal

As with arming your ship, hire better bodyguards who might fight off Elder Brother
Wu's cutthroats or a random mugging. How much would they cost, and where would you
hire them?

## How it works today

There are three cash threats on land:

| Threat | When | Odds | Loss |
|---|---|---|---|
| Harbor mugging | Arriving abroad, after month 12, cash > 20,000 | 1-in-20 | up to ~cash / 1.4 |
| Bank mugging | Leaving the bank, after month 12, cash > 20,000 | 1-in-20 | up to ~cash / 1.4 |
| Wu's cutthroats | Hong Kong, warned on an earlier visit, debt > 10,000 | 1-in-4 | all cash |

The messages already mention bodyguards ("Your bodyguards were beaten up", "N of your
bodyguards have been killed"), but there's no bodyguard count in the game state.

## Recommendation

Make bodyguards a **number the player hires**, like guns:

- **Hiring:** in Hong Kong, an occasional offer (like the gun offer). Or as a port-menu
  item in Hong Kong only, which keeps Hong Kong important.
- **Cost:** a hiring fee per guard that grows over time, plus **monthly wages**
  charged on arrival. Wages stop players stacking guards for free.
- **Effect on muggings:** each guard lowers the chance of a successful mugging.
  - **Repelled:** "Your bodyguards drove off the thieves, Taipan!" and you may lose a
    guard.
  - **Not repelled:** the loss is reduced instead.
- **Effect on Wu:** guards lower the chance of losing everything. **Wu escalates** if
  you have many guards: more cutthroats, and guards killed. The message already counts
  dead bodyguards; it can use the real number.
- **Limit:** a maximum, or rising costs, so guards can't make you immune.

## Questions to answer before implementing

1. **Where are they hired:** Hong Kong only, any port, or through an occasional offer?
2. **What do they cost?** A one-time fee, ongoing wages, or both? What happens when you
   can't pay wages: do they leave, or does Wu add it to your debt?
3. **How many can you have?** Is there a cap, and do guards take up ship space like
   guns (`GUN_SIZE`)?
4. **Does each guard lower the odds, lower the loss, or both?** By how much per guard?
5. **Can guards die or quit?** Do Wu's cutthroats kill a real number of them?
6. **Can guards make Wu's robbery impossible,** or should debt stay dangerous whatever
   you spend?
7. **Do guards help elsewhere:** against the opium police, warehouse theft (if
   pypan-52 adds it), or boarding in battle?
8. **Display:** show the guard count in the status strip, next to guns?
9. **Saved games:** a `bodyguards` count, written only when non-zero.
10. **Balance:** should the starting choices change? For example, the debt start
    comes with a few guards.

## What changes in the code

- `src/engine/hong.ts` and `src/engine/save.ts`: a guard count.
- `src/engine/safety.ts`: `checkRobbery` with guard odds.
- `src/engine/lender.ts`: Wu's robbery.
- A hiring offer (`src/engine/shipyard.ts` or a new module).
- Wages on arrival (`src/engine/voyage.ts`).
- `src/ui/panes.ts`: the status strip.
- SPEC.md §4.5, §9 and §11.
