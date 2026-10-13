// The bank (SPEC.md section 4.4). In Hong Kong, or wherever its representative
// turns up; interest is applied on arrival.

import { BANK_RATE, HONG_KONG, LOAN_RATE, city } from "./constants";
import { currentTime, type Hong } from "./hong";
import { askNum, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { checkRobbery } from "./safety";

/** On arrival abroad: the same odds as a lorcha that the bank's man is in port. */
export function* checkBanker(h: Hong, rng: Rng): Flow {
  h.banker = h.location !== HONG_KONG && currentTime(h) > 12 && rng.chanceOf(6);
  if (h.banker) {
    yield* say(`Good joss!! A representative from your bank is in ${city(h.location)} for the month. You may transact with him as normal.`);
  }
}

/** Whether the bank can be visited here. */
export function bankAvailable(h: Hong): boolean {
  return h.location === HONG_KONG || h.banker;
}

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
