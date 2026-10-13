// Jade comes onto the market through a Burmese mining expedition (SPEC.md section 4.6).

import {
  BATAVIA, JADE, JADE_BANK_LEVEL, JADE_DISCOUNT, JADE_DISCOUNT_MONTHS, JADE_EXPEDITION_MONTHS,
  JADE_INVESTMENT, JADE_MIN_MONTHS, SINGAPORE, city, mult,
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
      yield* say("Taipan, regrettably our friend Fat Monkey Ren has been captured by rebels. It appears there will be no jade forthcoming.");
    } else if (e.invested) {
      yield* say("Taipan!! Our friend Fat Monkey Ren reports the success of his jade mining effort. We will be offered low-price jade for a time in thanks.");
      h.jade = true;
      h.jadeDeal = { port: e.port, until: t + JADE_DISCOUNT_MONTHS };
    } else {
      yield* say("Taipan, rumor has reached us of a new Burmese jade mine. It appears our friend Fat Monkey Ren was met with success.");
      h.jade = true;
    }
  }

  if (offersExpedition(h) && rng.chanceOf(3)) {
    const amount = Math.round(JADE_INVESTMENT * (0.9 + 0.2 * rng.float()) / 1000) * 1000;
    const pitch = h.expeditionFailed
      ? "Taipan!! Fat Monkey Ren has escaped the Burmese rebels and is back seeking investment in another expedition to establish a jade mine."
      : "Taipan, the Burmese merchant Fat Monkey Ren is gathering backers for an expedition to establish a jade mine.";
    const invested = yield* askYn(`${pitch} Would you like to invest ${money(amount)}?`);
    if (invested) {
      yield* say(`Very well, Taipan. We will arrange for funds from Hong Kong and our friend Fat Monkey Ren will proceed from ${city(h.location)} forthwith.`);
      h.bank -= amount;
    }
    // others back it if we don't
    h.expedition = { port: h.location, resolves: t + JADE_EXPEDITION_MONTHS, invested };
  }
}

/** Whether a merchant could come looking for backers here. */
function offersExpedition(h: Hong): boolean {
  return !h.jade
    && !h.expedition
    && currentTime(h) > JADE_MIN_MONTHS
    && h.bank > JADE_BANK_LEVEL
    && (h.location === SINGAPORE || h.location === BATAVIA);
}

/** Backers' cheap jade, applied after the day's prices are set. */
export function applyJadeDeal(h: Hong): void {
  const d = h.jadeDeal;
  if (!d) {
    return;
  }
  if (currentTime(h) > d.until) {
    h.jadeDeal = null;
  } else if (h.location === d.port) {
    const m = mult(JADE);
    h.prices[JADE] = Math.max(m, Math.trunc(h.prices[JADE]! * JADE_DISCOUNT / m) * m);
  }
}
