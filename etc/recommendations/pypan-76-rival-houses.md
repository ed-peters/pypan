# pypan-76: Named rival trading houses

Part of pypan-75 (macro-scale play). Foundation for pypan-61 (rivals strike back),
pypan-62 (squeeze), pypan-54 (sponsoring traders) and pypan-71 (exclusive
relationships).

## Proposal

Two or three named AI trading houses compete for the same routes. They respond to your
moves: cornering the silk market angers the Jardine & Matheson analog.

## How it fits today

- **The player is the only trader.** Prices are random per port and don't react to
  anyone.
- **Characters exist, but don't compete:**
  - **Li Yuen:** a counter that rises at random; paying resets it.
  - **Wu:** reacts to your debt.
- **Rivals are the missing piece in four beads:** pypan-61, pypan-62, pypan-54 and
  pypan-71. Each would otherwise invent its own version of "other merchants".

## Recommendation

**Abstract rivals, not simulated fleets.** Each house has:

- **A name and personality.** For example:
  - **Dent & Sons:** aggressive, British, opium and silk.
  - **Russell & Co.:** American, tea and silk.
  - **A Parsee house:** cautious, cotton and opium.

  (Close analogs of the real firms; see question 1.)
- **A home port and favorite goods.**
- **Wealth,** which grows each month, faster when you're not competing.
- **Attitude toward you,** from −100 to +100, moved by your actions:
  - **Worse:** trading heavily in its goods or ports, holdings (pypan-60), a squeeze
    (pypan-62).
  - **Better:** gifts, favors, staying out of its markets.

**What rivals do each month:**
- **Move markets:** a rival's favorite good gets cheaper to buy in its home port and
  sells less well where it's dumping it (using pypan-64 and pypan-66).
- **Act on their attitude:**
  - **Hostile:** sabotage (pypan-61), bribing police, hiring pirates.
  - **Friendly:** tips, offers, loans from you (pypan-54).
- **News:** "Dent & Sons have bought up the silk crop in Shanghai, Taipan!"

## Questions to answer before implementing

1. **Real names, or analogs?** Jardine Matheson, Dent, Russell were real. Analogs avoid
   any implication of history that's inaccurate.
2. **How many houses,** and are they always the same, or drawn at random each game?
3. **How simulated?** An abstract monthly turn (recommended), or ships actually
   sailing and trading?
4. **Do they affect prices,** and how strongly? Without pypan-64 there's nowhere for
   that to live.
5. **What moves their attitude,** and does it decay over time?
6. **What can they do to you,** and what can you do to them (buy them out, ruin them,
   ally with them)?
7. **Can a rival win or be eliminated?** Should the final score compare you with them?
8. **How does the player see them?** A rivals screen, news only, or a line in the
   status strip?
9. **Saved games:** each house's wealth, attitude and state.

## What changes in the code

- A new `src/engine/rivals.ts` (model, monthly turn, news).
- `src/engine/voyage.ts`: the monthly turn.
- Market state (pypan-64): price effects.
- Attitude hooks wherever the player acts: trading, holdings, squeezes.
- `src/engine/hong.ts` and `src/engine/save.ts`.
- `src/ui/panes.ts`.
- A new SPEC.md section.
