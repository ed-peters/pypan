// Li Yuen's "donations" (SPEC.md section 8).

import {
  HONG_KONG, LI_YUEN_GRUDGE_MARKUP, LI_YUEN_MAX_GRUDGE, LI_YUEN_PATIENCE, LI_YUEN_SHARE,
} from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { wuCoversShortfall } from "./lender";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { cashPosition } from "./score";

/** His warning on each refusal, by how many times you've refused since you last paid. */
const WARNINGS = [
  "Very well. I would be wary of pirates if I were you, Taipan.",
  "Li Yuen will remember this, Taipan. His fleet is looking for you.",
  "Li Yuen has put a price on your head, Taipan! His whole fleet is hunting you.",
];

export function* checkExtortion(h: Hong, rng: Rng): Flow {
  // the pirate boss gets randomly more angry over time until he boils over; once
  // you've refused him, he stays angry until you pay
  const time = currentTime(h);
  if (h.grudge === 0 && time > 1 && rng.chanceOf(LI_YUEN_PATIENCE)) {
    h.extorted = (h.extorted + 1) % 4;
  }
  if (h.extorted !== 0) {
    return;
  }

  // if you're not around when he does, he will summon you
  if (h.location !== HONG_KONG) {
    yield* say(
      h.grudge === 0
        ? "Li Yuen has sent a Lieutenant, Taipan.  He says his admiral wishes to see you in Hong Kong, posthaste!"
        : "Li Yuen has sent a Lieutenant, Taipan.  He says his admiral is still waiting for you in Hong Kong!",
    );
    return;
  }

  // if you are in Hong Kong, he will hit you up for money: after a year, a share of
  // what you're worth, or more as time goes on (the early-game roll happens even
  // when it is then replaced)
  let cost = Math.trunc((h.cash / 2.5) * rng.float()) + 1;
  if (time > 12) {
    const base = Math.max(time * 1000, Math.trunc(cashPosition(h) * LI_YUEN_SHARE));
    cost = rng.inRange(0, base) + base;
  }

  // each refusal makes the next demand bigger
  if (h.grudge > 0) {
    cost = Math.trunc(cost * (1 + h.grudge * LI_YUEN_GRUDGE_MARKUP));
    yield* say("Li Yuen has not forgotten your refusal, Taipan.");
  }

  // if you don't, you get a warning
  if (!(yield* askYn(`Li Yuen asks ${money(cost)} in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?`))) {
    yield* say(bearGrudge(h));
    return;
  }

  // if you don't have enough, EBW can make up the difference for you (and if he
  // won't, he warns you of pirates himself)
  if (h.cash < cost) {
    if (!(yield* wuCoversShortfall(h, cost, "Li Yuen"))) {
      const warning = bearGrudge(h);
      if (h.grudge > 1) {
        yield* say(warning);
      }
      return;
    }
  } else {
    h.cash -= cost;
  }

  // ... and you're good (until next time ...)
  h.extorted = 1;
  h.grudge = 0;
}

/** Li Yuen remembers a refusal; returns his warning. */
function bearGrudge(h: Hong): string {
  h.grudge = Math.min(h.grudge + 1, LI_YUEN_MAX_GRUDGE);
  return WARNINGS[h.grudge - 1]!;
}
