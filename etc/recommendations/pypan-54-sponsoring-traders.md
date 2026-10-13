# pypan-54: Sponsoring traders

## Proposal

Once the player is successful enough, other traders come to them for loans. The
player becomes their own Elder Brother Wu: lending at interest, running into
borrowers now and then, and threatening or attacking those who don't pay.

## How it works today

- **Wu as the model:** Wu lends at 10% per voyage. He lends up to twice your cash, less
  what you already owe.
- **Collecting:** he threatens once when you owe over 10,000. After that he can send
  cutthroats to take all your cash.
- **Earning interest:** the bank pays 5% per voyage on deposits. It's the only way to
  earn interest today, and it has no risk.
- **Battles:** `PirateBattle` covers only being attacked. There's nothing where the
  player is the attacker.

## Recommendation

Build it as a late-game money sink with risk, in two stages.

**Stage 1: lending.**
- **When:** after you reach a rank (for example Taipan) or a cash position, a trader
  sometimes appears in port asking for a loan.
- **Terms:** the trader offers an amount, an interest rate and a term. You accept or
  decline.
- **Repayment:** loans come due on later arrivals. The borrower repays in full, pays
  part, asks for more time, or defaults.
- **Default risk:** depends on the trader and the rate. Charging more means more
  defaults.

**Stage 2: collecting.**
- **When you meet a defaulter:** in port, or at sea instead of pirates, choose to
  forgive, threaten or attack.
  - **Threaten:** some chance they pay something.
  - **Attack:** a battle in which you're the aggressor and they fight back. You recover
    the debt plus some cargo, but risk damage.
- **Reputation:** attacking a trader angers Li Yuen, or makes the harbor police hostile
  for a while, so violence has a cost.

Stage 1 alone gives a riskier, better-paying alternative to the bank. Stage 2 is the
part that needs new battle code.

## Questions to answer before implementing

1. **What unlocks it:** a rank, a cash position, or time? Is it offered in Hong Kong
   only, or anywhere?
2. **Who are the traders?** Named people with personalities (reliable, shady), or
   anonymous? How many loans can be open at once?
3. **What are the terms?** Who sets the amount and rate, the trader or the player? Can
   you haggle? What are the terms per voyage, and how do they compare with the bank's
   5%?
4. **How does default work?** Probability, partial payment, extensions. Can a borrower
   pay you back in goods?
5. **Where do you meet borrowers?** On arrival, at sea, or by choosing to visit them?
6. **What does threatening do,** and can it fail and make things worse?
7. **Attacking:** reuse `PirateBattle` with roles reversed, or a simpler resolution?
   What do you risk (damage, guns, sinking), and what do you win?
8. **Consequences:** do Li Yuen, Wu or the police react? Can an angry trader hire
   pirates against you?
9. **Score:** do outstanding loans count toward the cash position? Today only
   cash + bank − debt counts.
10. **Interface:** where does the player see their loans? A new menu option ("Review
    loans") and a strip on the status pane?
11. **Saved games:** a list of loans in `Hong`, written only when non-empty.

## What changes in the code

- A new `src/engine/loans.ts` (offers, accrual, collection).
- `src/engine/hong.ts` and `src/engine/save.ts`: a loans list.
- `src/engine/voyage.ts`: an arrival check.
- `src/engine/battle.ts`: if you can attack.
- `src/engine/score.ts`: if loans count.
- `src/ui/panes.ts`, and a new SPEC.md section.
