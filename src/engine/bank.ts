// The bank (SPEC.md section 4.4). Hong Kong only; interest is applied on arrival.

import { BANK_RATE, LOAN_RATE } from "./constants";
import type { Hong } from "./hong";
import { askNum, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { checkRobbery } from "./safety";

export function* visitBank(h: Hong, rng: Rng): Flow {
  if (h.cash === 0 && h.bank === 0) {
    yield* say("You have no reason to go to the bank, Taipan.");
    return;
  }

  if (h.cash > 0) {
    const n = yield* askNum("How much shall I deposit?", h.cash);
    if (n > h.cash) {
      yield* say("You do not have that much cash on hand, Taipan.");
    } else {
      h.cash -= n;
      h.bank += n;
    }
  }

  if (h.bank > 0) {
    const n = yield* askNum("How much shall I withdraw?", h.bank);
    if (n > h.bank) {
      yield* say("You do not have that much in the bank, Taipan.");
    } else {
      h.cash += n;
      h.bank -= n;
    }
  }

  // walking out of the bank with lots of cash invites trouble
  yield* checkRobbery(h, rng);
}

/** Debt and bank interest for one voyage. */
export function accrueInterest(h: Hong): void {
  h.debt = Math.trunc(h.debt * (1 + LOAN_RATE));
  h.bank = Math.trunc(h.bank * (1 + BANK_RATE));
}
