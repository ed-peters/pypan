// The bank (SPEC.md section 4.4), in Hong Kong once it has invited us; interest is
// applied on arrival.

import { BANK_INVITE_LEVEL, BANK_INVITE_VOYAGES, BANK_RATE, HONG_KONG, LOAN_RATE } from "./constants";
import type { Hong } from "./hong";
import { askNum, askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { checkRobbery } from "./safety";
import { cashPosition } from "./score";

/** Whether the bank can be visited here: only in Hong Kong, once we have an account. */
export function bankAvailable(h: Hong): boolean {
  return h.bankOpen && h.location === HONG_KONG;
}

/**
 * On arrival, until we have an account: count arrivals in a row with a cash position
 * of at least BANK_INVITE_LEVEL, and once there have been BANK_INVITE_VOYAGES, invite
 * us to open one in Hong Kong (pypan-94). Declining starts the count again.
 */
export function* checkBankInvite(h: Hong): Flow {
  if (h.bankOpen) {
    return;
  }
  h.bankStreak = cashPosition(h) >= BANK_INVITE_LEVEL ? Math.min(h.bankStreak + 1, BANK_INVITE_VOYAGES) : 0;
  if (h.bankStreak < BANK_INVITE_VOYAGES || h.location !== HONG_KONG) {
    return;
  }
  h.bankStreak = 0;
  if (!(yield* askYn("Taipan, Hendrik Brouwer of De Wisselbank, a Dutch bank of good reputation, has heard of our success and invites us to open an account. Our money would be safe there from thieves, and De Wisselbank may open the way to investment opportunities in future. Shall we open an account?"))) {
    yield* say("Very well, Taipan. Perhaps Mijnheer Brouwer will ask again.");
    return;
  }
  h.bankOpen = true;
  yield* say("Very well, Taipan. Our account at De Wisselbank is open: we may call on Mijnheer Brouwer whenever we are in Hong Kong.");
}

export function* visitBank(h: Hong, rng: Rng): Flow {
  if (h.cash === 0 && h.bank === 0) {
    yield* say("You have no reason to call on Mijnheer Brouwer, Taipan.");
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
      yield* say("You do not have that much at De Wisselbank, Taipan.");
    } else {
      h.cash += n;
      h.bank -= n;
    }
  }

  // walking out of the bank with lots of cash invites trouble
  yield* checkRobbery(h, rng);
}

/** What can be spent here: cash, plus the bank in Hong Kong (pypan-58). */
export function spendable(h: Hong): number {
  return h.cash + (bankAvailable(h) ? h.bank : 0);
}

/** Pay n from cash, then from the bank; n must be no more than spendable(h). */
export function* pay(h: Hong, n: number): Flow {
  if (n <= h.cash) {
    h.cash -= n;
    return;
  }
  h.bank -= n - h.cash;
  h.cash = 0;
  yield* say("Mijnheer Brouwer will send the necessary funds from De Wisselbank, Taipan.");
}

/** Debt and bank interest for one voyage. */
export function accrueInterest(h: Hong): void {
  // add the interest, rather than rounding balance * (1 + rate), which can lose a
  // unit to float error (1000 * 1.005 is 1004.999...); debt interest rounds up so
  // even a tiny debt grows, bank interest is truncated
  h.debt += Math.ceil(withoutFloatError(h.debt * LOAN_RATE));
  h.bank += Math.trunc(h.bank * BANK_RATE);
}

/** Rounds away float error, so e.g. 30 * 0.1 (3.0000000000000004) is exactly 3. */
function withoutFloatError(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
