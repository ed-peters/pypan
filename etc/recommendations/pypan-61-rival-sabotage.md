# pypan-61: Rivals strike back at your holdings

Part of pypan-59 (corner the market). Depends on pypan-60 (supply holdings).

## Proposal

Rival merchant houses hate your holdings and try to undercut you. They bribe your
suppliers, fund competing supply and hire pirates to raid you. The late game becomes
"defend your economic empire while it prints money".

## How it fits today

- **There are no rivals.** Opposition today is Li Yuen (extortion and his fleet), Wu
  (debt and cutthroats), the harbor police and anonymous pirates. Rivals need a simple
  model of their own.
- **Templates for losses:** warehouse fires and muggings show the existing pattern: a
  chance per arrival of losing a share of something, with a message.
- **Battles happen only at sea,** against pirates attacking you. Defending a holding
  in port would be new.

## Recommendation

Model rivals as **hostility per good**, a number from 0 to 100, instead of as
individual characters.

**What raises hostility:**
- the value of your holdings in that good (jade far more than general cargo)
- your share of control of that good
- squeezes (pypan-62)

**What lowers it:**
- slowly, over time
- paying off the rival houses (a "donation", like Li Yuen's)
- selling holdings

**What happens each month:** for each good you hold, a chance of trouble that rises
with hostility:

| Event | Effect |
|---|---|
| **Bribed suppliers** | That holding pays nothing this month. |
| **Competing supply** | A rival funds a competitor in that port. The holding's yield drops for several months, or for good until you buy the competitor out. |
| **Pirate raid** | A holding loses shares or value, unless it's defended. If you're in that port, you may be offered a fight, using the existing battle code with the pirates attacking your godowns. |
| **Arson** | Like a warehouse fire, against a holding. |

**Defense:**
- **Guards:** guards for a holding cost monthly wages and lower the odds of raids and
  arson. This could share code with pypan-55 (bodyguards).
- **Fortifying:** a one-time fee that permanently lowers raid odds in that port.
- **Li Yuen's protection:** if you're paid up with Li Yuen, his pirates won't raid you,
  but rivals can still hire others. That gives Li Yuen's donations a new purpose.

**The general cargo rule:** hostility for general cargo grows very slowly, because
nobody cares about it. That makes the pitch's "corner rice because it was beneath
everyone's notice" a real strategy.

## Questions to answer before implementing

1. **Anonymous hostility or named rival houses?** Named houses ("Jardine Matheson",
   or invented names) are more memorable, but are the bigger addition. Could they be
   the same characters as the traders in pypan-54 (sponsoring traders)?
2. **How should hostility be measured:** per good, per port, per rival, or one global
   number?
3. **Which events,** at what odds, and how much do they cost you? How often should a
   well-defended empire still lose something?
4. **Defense:** guards, fortifying, Li Yuen's protection, or something else? What do
   they cost, and is it ongoing or one-time?
5. **Can you fight back?** Attack the rivals' holdings, or bribe their suppliers, as an
   active option rather than just defending?
6. **Is there an interactive element?** Today all events on land are messages. Should
   a raid in your port lead to a battle, reusing `PirateBattle`?
7. **Can you lose a holding entirely,** or does it only get damaged? How do you
   recover?
8. **Should rivals trigger only from holdings,** or also react to a player who simply
   gets very rich trading?
9. **Saved games:** hostility per good (and per rival, if named), and any competitors'
   state.

## What changes in the code

- `src/engine/holdings.ts` (from pypan-60): hostility, monthly events and defense.
- `src/engine/hong.ts` and `src/engine/save.ts`: hostility and defenses.
- `src/engine/voyage.ts`: the events run in the arrival sequence.
- Possibly `src/engine/battle.ts`, to defend a holding.
- Possibly shared code with pypan-55.
- SPEC.md.
