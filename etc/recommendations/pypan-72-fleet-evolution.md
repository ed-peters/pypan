# pypan-72: Fleet evolution (epic)

## The pitch

> **Ship specialization:** fast clippers for high-value/low-volume goods, bulk junks
> for grain and coal. Route optimization becomes genuinely complex.
>
> **Crew reputation:** named crew with skills — a navigator who shaves travel time on
> specific routes, a gunner who matters when pirates show up.

| Bead | Feature | Depends on |
|---|---|---|
| pypan-73 | Ship specialization | — (related to pypan-57, steamship) |
| pypan-74 | Named crew with skills | — |

## How the pitch fits this game

- **There's no travel time to optimize.** Every voyage takes exactly one month,
  whatever the distance. "Fast" ships and a navigator who "shaves travel time" have
  nothing to act on until **voyages have different lengths.** That's the biggest
  prerequisite here, and it's also open in pypan-57 (question 8).
- **Speed matters in only one place:** the odds of running away in battle.
- **One ship that only grows:** the player has one ship with capacity, guns and damage.
  Upgrades add 50 capacity. There are no ship types, and no fleet.
- **There's no grain or coal.** "Bulk" goods would be general cargo, or new goods from
  pypan-65.
- **Crew exist only in messages** ("Aye, we'll fire our cannons"). There are no crew
  members in the game state.

## Recommendation

- **Decide on voyage length first.** Either:
  - **Add distances,** so voyages take 1–3 months depending on route and ship; or
  - **Keep one-month voyages,** and give speed other effects: escaping pirates,
    avoiding storms, sometimes reaching a second port in the same month.
- **Stay with one ship** at a time, with a type. A **fleet** (several ships at once)
  changes the game's whole interface and is best treated as a separate, later idea.
- **Crew** are the cheaper, more flavorful half. They can be added without voyage
  lengths, as long as the navigator's skill acts on storms and diversions instead of
  time.

## Questions that cut across the epic

1. **Distances, or one month per voyage?** Distances affect interest, rent and wages
   (all monthly), the score (per month), and every "month N" rule in the game.
2. **One ship or a fleet?**
3. **How do ship types relate to the steamship** (pypan-57) and to armor (pypan-56)?
   Is the steamship just another ship type?
