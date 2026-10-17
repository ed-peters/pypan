// Porcelain: a share in the trade unlocks it, and it breaks at sea (SPEC.md section 4.7).

import { pay } from "./bank";
import {
  HONG_KONG, PORCELAIN, PORCELAIN_FEE_SHARE, PORCELAIN_MIN_MONTHS, PORCELAIN_ODDS_MIN,
  PORCELAIN_ODDS_START, PORCELAIN_RAMP_MONTHS, PORCELAIN_WORTH_LEVEL,
} from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { cashPosition } from "./score";

/** On arrival in Hong Kong: maybe offer a share in the porcelain trade. */
export function* checkPorcelain(h: Hong, rng: Rng): Flow {
  const odds = porcelainOdds(h);
  if (odds === null || !rng.chanceOf(odds)) {
    return;
  }
  const fee = Math.round(cashPosition(h) * PORCELAIN_FEE_SHARE / 1000) * 1000;
  if (!(yield* askYn(`Taipan, a merchant house from Jingdezhen offers us a share in the porcelain trade for ${money(fee)}. With it we may buy and sell porcelain in every port. Shall we buy in?`))) {
    return;
  }
  yield* pay(h, fee);
  h.porcelain = true;
  yield* say("Very well, Taipan. We are in the porcelain trade. Mind how it's stowed: it breaks!");
}

/**
 * The offer comes 1-in-N arrivals: 1-in-20 after month 24, one better every three
 * months, down to 1-in-3. Null when it can't be offered at all.
 */
export function porcelainOdds(h: Hong): number | null {
  const t = currentTime(h);
  if (h.porcelain || h.location !== HONG_KONG || t <= PORCELAIN_MIN_MONTHS || cashPosition(h) <= PORCELAIN_WORTH_LEVEL) {
    return null;
  }
  const better = Math.trunc((t - PORCELAIN_MIN_MONTHS - 1) / PORCELAIN_RAMP_MONTHS);
  return Math.max(PORCELAIN_ODDS_MIN, PORCELAIN_ODDS_START - better);
}

/** Break lo..hi percent of the porcelain aboard (at least one); returns how many. */
export function breakPorcelain(h: Hong, rng: Rng, [lo, hi]: readonly [number, number]): number {
  const aboard = h.shipGoods[PORCELAIN]!;
  if (aboard === 0) {
    return 0;
  }
  const n = Math.min(aboard, Math.max(1, Math.trunc(aboard * rng.inRange(lo, hi + 1) / 100)));
  h.shipGoods[PORCELAIN] = aboard - n;
  return n;
}
