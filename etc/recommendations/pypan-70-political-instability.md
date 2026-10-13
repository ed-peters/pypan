# pypan-70: Political instability

Part of pypan-68 (port differentiation). Depends on pypan-64 (persistent market
model). Related to pypan-62 (squeeze) and pypan-67 (contraband).

## Proposal

Ports periodically fall under blockade, pirate control or a change of colonial
administration. Each changes prices and access rules.

## How it fits today

- **Ports never change.** Price shocks are the only port-specific events, and they last
  one visit.
- **A related mechanic exists:** a storm can blow you to a different port. That's a
  ready-made way to handle "you can't go there right now".
- **Pirates are the same everywhere:** one chance per voyage, whatever the route.

## Recommendation

**A port status,** stored in the port state alongside its market (pypan-64), that
lasts several months:

| Status | Effect | How it ends |
|---|---|---|
| **Normal** | — | — |
| **Blockade** | Can't enter. A voyage there is turned back or diverted, like a storm. Prices of goods from that port rise elsewhere. | After N months |
| **Pirate control** | Higher pirate odds on voyages to or from that port. Li Yuen's protection may or may not hold. Prices are erratic. | After N months, or if Li Yuen is paid |
| **Administration change** | The contraband table (pypan-67) is redrawn and duties change, often permanently. | Permanent until the next change |

- **When:** a small chance each month, after the first year or two. Historical events
  (pypan-77) can force specific changes.
- **Messages** on arrival anywhere: "News from Saigon, Taipan: the French have
  blockaded the port!"
- **The market report** shows a port's status when choosing where to sail.

## Questions to answer before implementing

1. **Which statuses,** and how often? Should at most one port be disrupted at a time?
2. **Blockades:** turned back (wasting a month), diverted, or a chance to run the
   blockade at a risk (with big profits)?
3. **Pirate control:** does it change which pirates attack you, how many, or how hard
   they hit? Does Li Yuen's protection hold?
4. **Administration changes:** what exactly do they change — contraband (pypan-67),
   duties, port services (the bank's representative, the lorcha)?
5. **Is Hong Kong ever affected?** A blockade of Hong Kong would cut off the bank, Wu
   and repairs.
6. **Do events affect the player's property** (pypan-52, pypan-69): seizure,
   destruction, higher rent?
7. **Random, scripted, or both?** Scripted history (pypan-77) or invented events?
8. **How is the player warned?** News on arrival, or a status on the destination menu?
9. **Saved games:** port status and months remaining.

## What changes in the code

- Port state (pypan-64): status and months remaining.
- `src/engine/voyage.ts`: blocked destinations, diversions, monthly countdown.
- `src/engine/battle.ts`: pirate odds per port.
- `src/engine/prices.ts`: price effects.
- Contraband (pypan-67): administration changes.
- SPEC.md §5–7.
