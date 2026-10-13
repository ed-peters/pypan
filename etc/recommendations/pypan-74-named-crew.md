# pypan-74: Named crew with skills

Part of pypan-72 (fleet evolution).

## Proposal

Named crew with skills: a navigator who shaves travel time on specific routes, a
gunner who matters when pirates show up.

## How it fits today

- **The crew exists only in messages** ("Aye, we'll fire our cannons at 'em,
  Taipan!"). There's no crew in the game state.
- **Battles:** each gun does 10–39 damage to the current pirate ship. Running away
  depends on two counters and luck.
- **Storms:** 1-in-10 per voyage. A storm can damage the ship, or blow it off course
  (1-in-3 of the remaining cases).
- **Voyages always take a month,** so "shaves travel time" has nothing to act on unless
  distances are added (pypan-72).

## Recommendation

**A small crew of officers,** one per role, each a named character with a skill from
1 to 5:

| Role | Effect |
|---|---|
| **Gunner** | more damage per gun, or a chance of an extra volley |
| **Navigator** | fewer storm diversions and less storm damage. On "their" routes (their home port), voyages are always safe. With distances, shorter voyages. |
| **Bosun** | cheaper repairs, and slower damage from storms |
| **Purser** | slightly better buying and selling prices |

- **Hiring:** an occasional offer in port: "A Portuguese navigator, Silva, seeks a
  berth. Wages 500 a month, Taipan." Wages are paid monthly.
- **Reputation:** officers gain skill with experience (battles won, safe voyages). They
  can be **killed in battle** (instead of losing a gun) or **leave** if unpaid.
- **Character:** named crew give messages a voice ("Silva says the weather looks foul,
  Taipan.").

## Questions to answer before implementing

1. **Which roles?** Gunner and navigator from the pitch, or more?
2. **How do skills work:** fixed per person, or growing with experience? What's the
   biggest effect a skill can have?
3. **Navigator's effect** with one-month voyages: storms and diversions only, or wait
   for distances?
4. **"Specific routes":** does a navigator know particular ports or seas? How is that
   represented?
5. **How are officers hired:** by offer, in which ports, and what do they cost? Wages
   or a one-time fee?
6. **Can crew be lost:** killed in battle, washed overboard, poached by rivals
   (pypan-76)? Can they desert?
7. **Does crew size matter** (sailors as well as officers), or only officers?
8. **"Crew reputation" in the pitch:** is that the officers' skill, or a reputation
   for the whole ship that affects hiring and morale?
9. **Interface:** where is the crew shown? Battle and storm messages in their voice?
10. **Saved games:** a crew list.

## What changes in the code

- A new crew module (offers, wages, experience).
- `src/engine/battle.ts`: gunner damage, officer casualties.
- `src/engine/storm.ts`: navigator.
- `src/engine/shipyard.ts`: bosun.
- `src/engine/trade.ts`: purser.
- `src/engine/hong.ts` and `src/engine/save.ts`.
- `src/ui/panes.ts`.
- SPEC.md §6–7.
