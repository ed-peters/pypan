// Li Yuen's "donations" (SPEC.md section 8).

import { HONG_KONG } from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { wuCoversShortfall } from "./lender";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

export function* checkExtortion(h: Hong, rng: Rng): Flow {
  // the pirate boss gets randomly more angry over time until he boils over
  const time = currentTime(h);
  if (time > 1 && rng.chanceOf(20)) {
    h.extorted = (h.extorted + 1) % 4;
  }
  if (h.extorted !== 0) {
    return;
  }

  // if you're not around when he does, he will summon you
  if (h.location !== HONG_KONG) {
    yield* say("Li Yuen has sent a Lieutenant, Taipan.  He says his admiral wishes to see you in Hong Kong, posthaste!");
    return;
  }

  // if you are in Hong Kong, he will hit you up for money
  // (the early-game roll happens even when it is then replaced)
  let cost = Math.trunc((h.cash / 2.5) * rng.float()) + 1;
  if (time > 12) {
    cost = rng.inRange(0, time * 1000) + time * 1000;
  }

  // if you don't, you get a warning
  if (!(yield* askYn(`Li Yuen asks ${money(cost)} in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?`))) {
    yield* say("Very well. I would be wary of pirates if I were you, Taipan.");
    return;
  }

  // if you don't have enough, EBW can make up the difference for you
  if (h.cash < cost) {
    if (!(yield* wuCoversShortfall(h, cost, "Li Yuen"))) {
      return;
    }
  } else {
    h.cash -= cost;
  }

  // ... and you're good (until next time ...)
  h.extorted = 1;
}
