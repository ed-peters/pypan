// The Burmese jade expedition: a moonshot for its backers (SPEC.md section 4.6).

import {
  BATAVIA, JADE_BANK_LEVEL, JADE_EXPEDITION_MONTHS, JADE_INVESTMENT, JADE_MAX_OFFERS,
  JADE_MIN_MONTHS, JADE_PAYOUT_MAX, JADE_PAYOUT_MIN, JADE_STAKE_SHARE, SINGAPORE, city,
} from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** On arrival: settle an expedition that's due, then maybe offer a new one. */
export function* checkJade(h: Hong, rng: Rng): Flow {
  const t = currentTime(h);

  const e = h.expedition;
  if (e && t >= e.resolves) {
    h.expedition = null;
    if (!rng.chanceOf(3)) {
      h.expeditionFailed = true;
      yield* say("Taipan, regrettably our friend Sir Beaumont-Finch has been captured by rebels. It appears there will be no jade forthcoming.");
    } else if (e.stake > 0) {
      // backers get 2-5 times their stake, into the bank
      const share = Math.round(e.stake * (JADE_PAYOUT_MIN + (JADE_PAYOUT_MAX - JADE_PAYOUT_MIN) * rng.float()) / 1000) * 1000;
      yield* say(`Taipan!! Our friend Sir Beaumont-Finch reports the success of his jade mining effort. His jade has fetched a fine price in London, and our share of ${money(share)} has been deposited in the bank.`);
      h.bank += share;
    } else {
      yield* say("Taipan, rumor has reached us of a new Burmese jade mine. It appears our friend Sir Beaumont-Finch was met with success, and his backers in London have done very well.");
    }
  }

  if (offersExpedition(h) && rng.chanceOf(3)) {
    h.jadeOffers += 1;
    // a quarter to half of the bank, but at least JADE_INVESTMENT
    const share = JADE_STAKE_SHARE * (1 + rng.float());
    const amount = Math.round(Math.max(JADE_INVESTMENT, h.bank * share) / 1000) * 1000;
    const pitch = h.expeditionFailed
      ? "Taipan!! Sir Beaumont-Finch has escaped the Burmese rebels and is back seeking investment in another expedition to establish a jade mine."
      : "Taipan, the East India Company man Sir Beaumont-Finch is gathering backers for an expedition to establish a jade mine.";
    const invested = yield* askYn(`${pitch} Would you like to invest ${money(amount)}?`);
    if (invested) {
      yield* say(`Very well, Taipan. We will arrange for funds from Hong Kong and our friend Sir Beaumont-Finch will proceed from ${city(h.location)} forthwith.`);
      h.bank -= amount;
    }
    // others back it if we don't
    h.expedition = { port: h.location, resolves: t + JADE_EXPEDITION_MONTHS, stake: invested ? amount : 0 };
  }
}

/** Whether Sir Beaumont-Finch could come looking for backers here. */
function offersExpedition(h: Hong): boolean {
  return h.jadeOffers < JADE_MAX_OFFERS
    && !h.expedition
    && currentTime(h) > JADE_MIN_MONTHS
    && h.bank > JADE_BANK_LEVEL
    && (h.location === SINGAPORE || h.location === BATAVIA);
}
