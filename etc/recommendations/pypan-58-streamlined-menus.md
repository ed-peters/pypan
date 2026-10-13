# pypan-58: Streamlined menu flows

## Proposal

The game is menu-heavy. Find the places where a shorter flow would improve
playability. For example:

- **Selling a single good:** if the player chooses Sell and the ship holds only one
  good, just ask whether to sell all of it.
- **Transferring a good kept in both places:** if the player chooses Transfer and the
  ship and the warehouse hold the same good, ask "How much ((good)) do you want in your
  ship's hold?"

## How it works today

**The prompt types** (`src/engine/prompts.ts`):

| Prompt | What the player does |
|---|---|
| `say` | taps Continue |
| `yn` | taps Y or N |
| `choose` | taps a numbered menu option, or Esc to cancel |
| `number` | uses a keypad with ALL and OK |

Entering a number is never fewer than 2 taps (ALL then OK), and usually more.

**Flows that waste taps:**
- **Buy and Sell** list all five goods even when you can't buy or sell most of them.
  Picking one of those just produces an error message.
- **Transfer** lists all five goods. It always asks two separate questions: how much
  to send to the warehouse, then how much to bring aboard.
- **The bank** always asks how much to deposit, then how much to withdraw.
- **Elder Brother Wu** always asks how much to repay, then how much to borrow. He's now
  offered on every arrival in Hong Kong, even when there's nothing you could do with
  him.
- **Leave port** lists the port you're already in, and picking it produces an error
  message.
- **Repairs** ask yes or no, then how much.

## Recommendation

Apply one rule throughout: **don't ask a question whose answer is already known, and
don't offer a choice that can only fail.**

Tap counts below are for the typical case.

| Flow | Today | Streamlined | Taps |
|---|---|---|---|
| **Sell**, one good aboard | Sell → good → ALL → OK | Sell → "Sell all 60 general for 900, Taipan?" Y. On N, fall back to the number keypad. | 4 → 2 |
| **Sell**, several goods | menu of all 5 goods | menu of only the goods aboard, with amounts ("Silk (12)") | fewer errors |
| **Buy** | menu of all 5 goods | only goods you can afford, with the most you can buy ("Arms (max 8)") | fewer errors |
| **Transfer**, one good anywhere | Transfer → good → warehouse amount → ship amount | Transfer → "How much general do you want in your ship's hold?" (0 up to the total, limited by free space) | 6 → 3 |
| **Transfer**, several goods | menu of all 5 goods | menu of only goods you have, then the single "in your hold" question | 6 → 4 |
| **Bank** | deposit amount, then withdrawal amount | "How much do you want in the bank, Taipan?" (0 up to cash + bank). The difference is deposited or withdrawn. | 5 → 3 |
| **Wu** | repay amount, then borrow amount | menu: Repay / Borrow / Never mind, showing only the options that are possible. Skip his arrival prompt entirely when nothing is possible. | 5 → 3, and fewer prompts on arrival |
| **Repairs** | Y/N, then amount | menu: "Full repair (301)" / "Partial repair" / "No thanks" | 3 → 1 |
| **Leave port** | all 7 ports | the other 6 ports | fewer errors |
| **Several messages in a row** (Wu's threat is 4 Continues) | one Continue each | one screen, one Continue | 4 → 1 |

**Keep as they are:**
- **Battle menus.** Each round is a real decision, and the pacing matters.
- **The confirmation before retiring.** It ends the game, so it should take a deliberate tap.
- **Random events** (Li Yuen, ship and gun offers).

**Suggested order:**
1. Sell, Buy and Leave port. These only filter or pre-fill choices; the game rules
   don't change.
2. Transfer and the bank, which turn two questions into one.
3. Wu, repairs and combined messages.

## Questions to answer before implementing

1. **Should menus change shape?** Hiding goods you can't trade changes the option
   numbers and positions from one visit to the next. That breaks muscle memory and
   number-key habits. Is it better to **grey out** those options (still visible, can't
   be selected)? Greying out needs a "disabled option" in the choose prompt.
2. **Should one-tap answers still confirm?** "Sell all?" with Y/N is still a
   confirmation. Should a single possible action just happen (selling with no
   question), with an undo or a summary message? Or is the confirmation part of the
   feel?
3. **How do the transfer fees appear** in the single "in your hold" question? With a
   lorcha, a 7% fee is taken from whatever moves. Should the prompt show the fee
   ("Lorcha fee 7%"), and should the maximum allow for it?
4. **Partial amounts in the short flows:** when the player answers N to "Sell all?",
   fall back to the number keypad, or cancel? Same for "Full repair".
5. **Bank wording:** "How much do you want in the bank?" is shorter, but less clear
   than deposit and withdraw. Would a menu (Deposit / Withdraw) plus one amount be
   clearer, at one more tap?
6. **Skipping Wu:** should his arrival prompt be skipped silently when you can neither
   repay, borrow nor get a bailout? Or should he say a line so the player knows he was
   there?
7. **Combined messages:** combine every run of messages, or only the "story" ones
   (Wu's threat, storms)? Battle messages like "They're firing on us!" then "They hit
   us!" may work better as separate beats.
8. **Is this an option?** Should streamlining be a "Quick mode" setting, with the
   original flows kept for players who want the classic feel? Or should it simply be
   the new behavior?
9. **Keyboard players:** do the first-letter shortcuts still make sense when menu items
   become things like "Silk (12)"?
10. **Tests:** many scripted tests pick menu options by position, and the end-to-end
    test walks whole flows. Is it acceptable to rewrite them, or should the old flows
    stay available behind an option to keep the tests stable?

## What changes in the code

- `src/engine/trade.ts`: Buy and Sell menus, the "sell all" shortcut.
- `src/engine/warehouse.ts`: one-question transfer.
- `src/engine/bank.ts` and `src/engine/lender.ts`: one amount or a menu, and skipping
  Wu when nothing is possible.
- `src/engine/shipyard.ts`: repairs menu.
- `src/engine/voyage.ts`: filtering the destination list.
- `src/engine/prompts.ts`: a disabled-option flag on the choose prompt, if greying out
  is chosen.
- `src/ui/terminal.ts` and `src/ui/keys.ts`: disabled buttons and keys.
- Tests for each flow, plus SPEC.md §4, §5 and §9–10.
