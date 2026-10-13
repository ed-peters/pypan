# pypan-78: Legacy goals

Part of pypan-75 (macro-scale play).

## Proposal

Beyond money, pursue political influence, a merchant fleet legacy, or control of a
specific commodity. That gives the late game something to be *for*, rather than just
more numbers going up.

## How it fits today

- **The only measure is the score:** (cash + bank − debt) ÷ months ÷ 100, with ranks
  from Galley Hand to Ma Tsu.
- **Retiring:** allowed only in Hong Kong and out of debt. It ends the game with the
  score.
- **The score ignores everything that isn't cash:** goods aboard, the warehouse, the
  ship. Nothing else counts.
- **What a legacy could be about** mostly doesn't exist yet: influence (no politics),
  a fleet (one ship), commodity control (pypan-59).

## Recommendation

**Goals chosen at the start, or adopted mid-game,** each with milestones and a reward
at retirement:

| Goal | Measured by | Needs |
|---|---|---|
| **Merchant prince** (today's game) | the score | — |
| **Commodity king** | share of a good's supply (pypan-60) held at retirement | pypan-59 |
| **Shipping line** | ships and facilities owned (pypan-69, pypan-73) | fleet or facilities |
| **Influence** | standing with houses (pypan-71) and officials | pypan-71, pypan-76 |
| **Respectability** | retiring debt-free, never having been seized for contraband, Li Yuen always paid | nothing new |

- **The final screen** shows the score *and* each goal's result, with its own rank
  ("Silk King of the East").
- **Start with what exists:** "Respectability" (and goals like "own the biggest ship" or
  "retire before 1870") need nothing new. They could ship first, as **achievements**.

## Questions to answer before implementing

1. **Chosen goals, or achievements?** A goal chosen at the start shapes the whole game.
   Achievements are earned whatever you do.
2. **Do goals replace the score, or sit beside it?**
3. **Can you fail a goal?** Does choosing one cost anything?
4. **Which goals,** and which need features that don't exist yet?
5. **Does a goal end the game early,** like a victory condition?
6. **Persistence across games:** should achievements be remembered between games
   (a trophy shelf), which means storing more than the save file?
7. **Influence:** what is it, mechanically? Standing with houses, officials, or a new
   number?
8. **Interface:** where are goals shown during play, and on the final screen?
9. **Saved games:** the chosen goal and progress; achievements stored separately if
   they persist across games.

## What changes in the code

- A new goals module (definitions, progress, results).
- `src/engine/score.ts` and `src/engine/pypan.ts`: final results.
- The start-of-game choice (if goals are chosen).
- `src/storage/index.ts`: achievements across games.
- `src/ui/panes.ts` and the final screen in `src/ui/terminal.ts`.
- SPEC.md §1.
