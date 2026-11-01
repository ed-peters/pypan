// Mr. Ardeshir Framji, a Parsi merchant of Bombay, and his series of one-time
// investments in concerns in distant lands (SPEC.md section 4.9, pypan-101).
// Mijnheer Brouwer introduces him (pypan-100), so he comes only once we bank with
// De Wisselbank. Each concern is offered once, in order; a stake returns, or is lost,
// three months later, and after the last he writes to say farewell.

import { canIntroduce, introduction, pay } from "./bank";
import {
  FRAMJI_GAP_MONTHS, FRAMJI_MIN_MONTHS, FRAMJI_OFFER_CHANCE, FRAMJI_RETURN_MONTHS,
  FRAMJI_STAKE_SHARE, FRAMJI_WORTH_LEVEL, HONG_KONG,
} from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { cashPosition } from "./score";

export interface Concern {
  /** As in "invites us to put 40,000 into ...". */
  pitch: string;
  /** As in "when the ... returns". */
  name: string;
  /** It pays off `odds[0]` in `odds[1]`. */
  odds: readonly [number, number];
  /** What a stake that pays off returns, as a multiple of the stake. */
  payout: number;
  /** What a stake that fails returns: 0 (lost) or a share of it. */
  salvage: number;
  /** Mr. Framji's news when it pays off, and when it fails. */
  won: string;
  lost: string;
}

/** The series, in the order offered: riskier and richer as it goes. */
export const CONCERNS: readonly Concern[] = [
  {
    pitch: "a pepper concern on the Malabar Coast of India",
    name: "Malabar pepper",
    odds: [3, 4], payout: 1.5, salvage: 0,
    won: "the pepper harvest of the Malabar Coast is in, and has sold well",
    lost: "the monsoon failed on the Malabar Coast, and the pepper with it",
  },
  {
    pitch: "an indigo plantation in Bengal",
    name: "Bengal indigo",
    odds: [2, 3], payout: 1.75, salvage: 0,
    won: "the Bengal indigo has fetched a fine price in London",
    lost: "the ryots of Bengal have refused to sow indigo, and the plantation has failed",
  },
  {
    pitch: "a cinnamon estate in Ceylon",
    name: "Ceylon cinnamon",
    odds: [2, 3], payout: 1.5, salvage: 0.5,
    won: "the Ceylon cinnamon has come in sweet and plentiful",
    lost: "a blight has struck the Ceylon cinnamon",
  },
  {
    pitch: "a coffee caravan from Mocha in Arabia",
    name: "Mocha coffee",
    odds: [3, 5], payout: 2, salvage: 0,
    won: "the Mocha coffee caravan has reached the coast safely",
    lost: "Bedouin raiders have taken the Mocha coffee caravan",
  },
  {
    pitch: "a clove plantation on Zanzibar",
    name: "Zanzibar cloves",
    odds: [1, 2], payout: 2.25, salvage: 0,
    won: "the cloves of Zanzibar have sold at a handsome price",
    lost: "a hurricane has flattened the clove trees of Zanzibar",
  },
  {
    pitch: "a tea garden in Assam",
    name: "Assam tea",
    odds: [1, 2], payout: 2.5, salvage: 0,
    won: "the Assam tea garden's first flush has sold well in Calcutta",
    lost: "fever has emptied the Assam tea garden of its workers, and it has failed",
  },
  {
    pitch: "a pearl fishery in the Persian Gulf",
    name: "Persian Gulf pearls",
    odds: [1, 4], payout: 5, salvage: 0,
    won: "the divers of the Persian Gulf have brought up a fortune in pearls",
    lost: "the pearl beds of the Persian Gulf have yielded nothing this season",
  },
];

/** On arrival: hear how an investment has done, then maybe be offered the next concern. */
export function* checkFramji(h: Hong, rng: Rng): Flow {
  yield* settle(h, rng);
  yield* offer(h, rng);
}

/**
 * On the first arrival anywhere once it's due, an investment pays off (into the
 * bank) or fails, losing the stake or all but its salvage. At most the stake is lost.
 */
function* settle(h: Hong, rng: Rng): Flow {
  const inv = h.framjiInvestment;
  const t = currentTime(h);
  if (!inv || t < inv.due) {
    return;
  }
  h.framjiInvestment = null;
  h.framjiOfferDue = t + FRAMJI_GAP_MONTHS;
  const c = CONCERNS[inv.concern]!;
  const [k, n] = c.odds;
  if (rng.randrange(n) < k) {
    const back = thousands(inv.stake * c.payout);
    h.bank += back;
    yield* say(`Taipan!! A letter from Mr. Framji: ${c.won}. Our ${money(inv.stake)} has returned ${money(back)}, which has been deposited with Mijnheer Brouwer.`);
  } else if (c.salvage > 0) {
    const back = thousands(inv.stake * c.salvage);
    h.bank += back;
    yield* say(`Bad joss, Taipan! A letter from Mr. Framji: ${c.lost}. He has saved ${money(back)} of our ${money(inv.stake)}, which has been deposited with Mijnheer Brouwer.`);
  } else {
    yield* say(`Bad joss, Taipan! A letter from Mr. Framji: ${c.lost}. Our ${money(inv.stake)} is lost.`);
  }
  yield* farewellIfDone(h);
}

/**
 * In Hong Kong, once we bank with De Wisselbank and nothing is out with him, 1-in-2
 * arrivals: the next concern, for 10-20% of our cash position. The first comes with
 * Mijnheer Brouwer's introduction. Declined or not, the series moves on.
 */
function* offer(h: Hong, rng: Rng): Flow {
  const t = currentTime(h);
  if (!canIntroduce(h) || h.location !== HONG_KONG || h.framjiInvestment
    || h.framjiConcern >= CONCERNS.length
    || t <= FRAMJI_MIN_MONTHS || t < h.framjiOfferDue
    || cashPosition(h) < FRAMJI_WORTH_LEVEL
    || !rng.chanceOf(FRAMJI_OFFER_CHANCE)) {
    return;
  }
  const concern = h.framjiConcern;
  const c = CONCERNS[concern]!;
  // spendable here (cash + bank) is never less than the cash position, so we can pay
  const stake = thousands(cashPosition(h) * FRAMJI_STAKE_SHARE * (1 + rng.float()));
  const terms = `invites us to put ${money(stake)} into ${c.pitch}, which will return in three months. Shall we invest?`;
  const pitch = concern === 0
    ? introduction("Mr. Ardeshir Framji", "a Parsi merchant of Bombay", `Mr. Framji ${terms}`)
    : `Taipan, Mr. Framji of Bombay ${terms}`;
  h.framjiConcern += 1;
  if (yield* askYn(pitch)) {
    yield* pay(h, stake);
    h.framjiInvestment = { concern, stake, due: t + FRAMJI_RETURN_MONTHS };
    yield* say(`Very well, Taipan. Mr. Framji will write to us when the ${c.name} returns.`);
    return;
  }
  h.framjiOfferDue = t + FRAMJI_GAP_MONTHS;
  yield* say(`Very well, Taipan. Mr. Framji will find other partners for the ${c.name}.`);
  yield* farewellIfDone(h);
}

/** After the last concern, his farewell. */
function* farewellIfDone(h: Hong): Flow {
  if (h.framjiConcern >= CONCERNS.length && !h.framjiInvestment) {
    yield* say("Taipan, a last letter from Mr. Framji: he is retiring to Bombay, and thanks us for our partnership in distant lands. He wishes our hong good joss.");
  }
}

function thousands(n: number): number {
  return Math.round(n / 1000) * 1000;
}
