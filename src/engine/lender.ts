// Elder Brother Wu, the moneylender (SPEC.md section 4.5). Hong Kong only.

import { DEBT_THREAT_LEVEL, HONG_KONG } from "./constants";
import { money } from "./format";
import { currentTime, isBroke, type Hong } from "./hong";
import { askNum, askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** On arrival in Hong Kong: Wu's threat, an offer to visit him, and robbery. */
export function* checkLender(h: Hong, rng: Rng): Flow {
  // EBW is only in Hong Kong
  if (h.location !== HONG_KONG) {
    return;
  }

  // up-front action only happens if you owe money
  if (h.debt <= 0) {
    return;
  }

  // if you owe him too much he might remind you of it
  const warnedBefore = h.threatened;
  if (h.debt > DEBT_THREAT_LEVEL && !h.threatened) {
    yield* say(`Elder Brother Wu has sent ${rng.inRange(17, 39)} braves to escort you to the Wu mansion, Taipan.`);
    yield* say("Elder Brother Wu reminds you of the Confucian ideal of personal worthiness, and how this applies to paying one's debts.");
    yield* say("He is reminded of a fabled barbarian who came to a bad end, after not caring for his obligations.");
    yield* say("He hopes no such fate awaits you, his friend, Taipan.");
    h.threatened = true;
  }

  // if you owe him, you can visit him before doing anything else if you want
  if (yield* askYn("Do you have business with Elder Brother Wu, the moneylender, Taipan?")) {
    yield* visitWu(h, rng);
  }

  // if you were warned on an earlier visit and still owe too much, he might rob you
  if (currentTime(h) > 12 && warnedBefore && h.debt > DEBT_THREAT_LEVEL && rng.chanceOf(4)) {
    yield* say(`Bad joss!! ${rng.inRange(3, 9)} of your bodyguards have been killed by cutthroats and you have been robbed of all of your cash, Taipan!!`);
    h.cash = 0;
  }
}

/** Borrow from or repay Wu; if you have no cash, ask for a bailout. */
export function* visitWu(h: Hong, rng: Rng): Flow {
  // if you have no cash when you visit him, he will assume you want a bailout
  if (h.cash === 0) {
    // if you're truly broke, he will offer you a lifeline
    if (currentTime(h) > 1 && isBroke(h)) {
      const loan = rng.randrange(1500) + 1500;
      const cost = rng.randrange(2000) * h.bailout + 1500;
      if (yield* askYn(`Elder Brother is aware of your plight, Taipan. He is willing to loan you an additional ${money(loan)} if you will pay back ${money(cost)}. Are you willing, Taipan?`)) {
        h.cash += loan;
        h.debt += cost;
      }
    } else {
      // otherwise, he's not interested
      yield* say("Elder Brother is aware of your plight, Taipan. He urges you to exercise all the means at your disposal to correct it.");
    }
    return;
  }

  // he will only accept repayment up to the amount of the loan
  let x = Math.min(h.cash, h.debt);
  if (x > 0) {
    const n = yield* askNum("How much will you repay, Taipan?", x);
    if (n <= x) {
      h.cash -= n;
      h.debt -= n;
    } else {
      yield* say(`Taipan, you owe only ${money(h.debt)}.`);
    }
  }

  // he's willing to loan you up to 2 x the amount of free cash you have
  x = Math.max(0, h.cash * 2 - h.debt);
  if (x > 0) {
    const n = yield* askNum("How much will you borrow, Taipan?", x);
    if (n <= x) {
      h.cash += n;
      h.debt += n;
    } else {
      yield* say("Elder Brother Wu will not loan you so much, Taipan.");
    }
  }
}

/**
 * Offer to have Wu pay `payee` the part of `cost` you can't cover. If accepted, all
 * your cash goes toward the cost, the rest is added to your debt, and this returns
 * true: the cost has been paid in full. Used by repairs and Li Yuen's extortion.
 */
export function* wuCoversShortfall(h: Hong, cost: number, payee: string): Flow<boolean> {
  if (!(yield* askYn("You do not have enough cash on hand, Taipan! Do you want Elder Brother Wu to make up the difference for you?"))) {
    yield* say("Very well. Elder Brother Wu will not assist you. I would be wary of pirates if I were you, Taipan.");
    return false;
  }
  yield* say(`Elder Brother Wu has given ${payee} the difference and added the same amount to your debt.`);
  h.debt += cost - h.cash;
  h.cash = 0;
  return true;
}
