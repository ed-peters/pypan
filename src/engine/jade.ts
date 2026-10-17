// The Burmese jade expedition, a moonshot for its backers, which gives them a share
// in the mine if it succeeds (SPEC.md section 4.6). The mine settles with the other
// ventures (ventures.ts).

import {
  BATAVIA, JADE_BANK_LEVEL, JADE_EXPEDITION_MONTHS, JADE_INVESTMENT, JADE_MAX_OFFERS,
  JADE_MIN_MONTHS, JADE_STAKE_SHARE, MINE_SHARE_MAX, MINE_SHARE_MIN, SINGAPORE,
  VENTURE_QUARTER_MONTHS, city,
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
      // the stake becomes a share in the mine worth 2-5 times as much, or adds
      // that to the one we have
      const worth = Math.round(e.stake * (MINE_SHARE_MIN + (MINE_SHARE_MAX - MINE_SHARE_MIN) * rng.float()) / 1000) * 1000;
      const news = "Taipan!! Our friend Sir Beaumont-Finch reports the success of his jade mining effort.";
      if (h.mine) {
        h.mine.value += worth;
        yield* say(`${news} Our share in the jade mine has grown to ${money(h.mine.value)}.`);
      } else {
        h.mine = { value: worth, due: t + VENTURE_QUARTER_MONTHS };
        yield* say(`${news} Our ${money(e.stake)} has become a share in the jade mine worth ${money(worth)}, which will settle with us every three months.`);
      }
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

/** Whether Sir Beaumont-Finch could come looking for backers here: only once we've had godowns and arms (pypan-91). */
function offersExpedition(h: Hong): boolean {
  return h.godownsBought && h.armsBought
    && h.jadeOffers < JADE_MAX_OFFERS
    && !h.expedition
    && currentTime(h) > JADE_MIN_MONTHS
    && h.bank > JADE_BANK_LEVEL
    && (h.location === SINGAPORE || h.location === BATAVIA);
}
