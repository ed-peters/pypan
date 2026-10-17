// The Burmese jade expedition, a moonshot for its backers, and the share in the
// mine it gives them if it succeeds (SPEC.md section 4.6).

import {
  BATAVIA, JADE_BANK_LEVEL, JADE_EXPEDITION_MONTHS, JADE_INVESTMENT, JADE_MAX_OFFERS,
  JADE_MIN_MONTHS, JADE_STAKE_SHARE, MINE_QUARTER_MONTHS, MINE_REFUSAL_LOSS, MINE_RETURN_MAX,
  MINE_RETURN_MIN, MINE_SEIZURE_CHANCE, MINE_SHARE_MAX, MINE_SHARE_MIN, MINE_VEIN_CHANCE,
  MINE_VEIN_PAYOUT, SINGAPORE, city,
} from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { wuCoversShortfall } from "./lender";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** On arrival: settle the mine's quarter, and an expedition that's due, then maybe offer a new one. */
export function* checkJade(h: Hong, rng: Rng): Flow {
  const t = currentTime(h);
  yield* settleMine(h, rng);

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
        h.mine = { value: worth, due: t + MINE_QUARTER_MONTHS };
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

/** Whether Sir Beaumont-Finch could come looking for backers here. */
function offersExpedition(h: Hong): boolean {
  return h.jadeOffers < JADE_MAX_OFFERS
    && !h.expedition
    && currentTime(h) > JADE_MIN_MONTHS
    && h.bank > JADE_BANK_LEVEL
    && (h.location === SINGAPORE || h.location === BATAVIA);
}

/**
 * Every three months the mine settles with its backers: rarely it's seized or
 * strikes a rich vein; otherwise it returns -10% to +20% of the share's value. A
 * gain goes into the bank; a loss is a call for funds, and refusing it costs half
 * the share.
 */
function* settleMine(h: Hong, rng: Rng): Flow {
  const m = h.mine;
  if (!m || currentTime(h) < m.due) {
    return;
  }
  m.due = currentTime(h) + MINE_QUARTER_MONTHS;

  if (rng.chanceOf(MINE_SEIZURE_CHANCE)) {
    yield* say("Bad joss, Taipan! Rebels have seized the jade mine, and our share in it is lost.");
    h.mine = null;
    return;
  }
  if (rng.chanceOf(MINE_VEIN_CHANCE)) {
    const pay = m.value * MINE_VEIN_PAYOUT;
    yield* say(`Taipan!! The jade mine has struck a rich vein! Our share of ${money(pay)} has been deposited in the bank.`);
    h.bank += pay;
    return;
  }

  const r = MINE_RETURN_MIN + (MINE_RETURN_MAX - MINE_RETURN_MIN) * rng.float();
  const amount = Math.round(m.value * Math.abs(r) / 1000) * 1000;
  if (amount === 0) {
    yield* say("The jade mine has broken even this quarter, Taipan.");
  } else if (r > 0) {
    yield* say(`The jade mine has paid us ${money(amount)} this quarter, Taipan. It has been deposited in the bank.`);
    h.bank += amount;
  } else if (!(yield* askYn(`Taipan, the jade mine has had a bad quarter, and needs ${money(amount)} more from its backers. Shall we pay our part?`))
    || !(yield* payCall(h, amount))) {
    m.value = Math.round(m.value * (1 - MINE_REFUSAL_LOSS) / 1000) * 1000;
    yield* say(`The other backers have taken half of our share in the jade mine, Taipan. It is now worth ${money(m.value)}.`);
  }
}

/**
 * Pay a call for funds from the bank, then cash (arranged from Hong Kong, as the
 * stake was). Wu can make up a shortfall. Returns whether it was paid.
 */
function* payCall(h: Hong, amount: number): Flow<boolean> {
  if (h.bank + h.cash >= amount) {
    const fromBank = Math.min(h.bank, amount);
    h.bank -= fromBank;
    h.cash -= amount - fromBank;
    return true;
  }
  // everything we have goes toward it, and Wu may lend the rest
  const bank = h.bank;
  h.cash += bank;
  h.bank = 0;
  if (yield* wuCoversShortfall(h, amount, "the mine")) {
    return true;
  }
  h.cash -= bank;
  h.bank = bank;
  return false;
}
