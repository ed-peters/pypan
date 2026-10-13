// Harbor police, muggers and warehouse fires (SPEC.md section 11).

import { HONG_KONG, NUM_GOODS, OPIUM, ROBBERY_CASH_LIMIT } from "./constants";
import { money } from "./format";
import { currentTime, warehouseAvailable, type Hong } from "./hong";
import { say, type Flow } from "./prompts";
import type { Rng } from "./rng";

export function* checkSafety(h: Hong, rng: Rng): Flow {
  // hazards don't begin until after the first year
  if (currentTime(h) <= 12) {
    return;
  }

  // the police might confiscate your opium
  if (h.location !== HONG_KONG && h.shipGoods[OPIUM]! > 0 && rng.chanceOf(10)) {
    if (h.cash > 0) {
      const fine = Math.trunc((h.cash / 1.8) * rng.float()) + 1;
      yield* say(`Bad joss! Harbor police have confiscated your opium and fined you an additional ${money(fine)}, Taipan!`);
      h.cash -= fine;
    } else {
      yield* say("Bad joss! Harbor police have confiscated your opium, Taipan!");
    }
    h.shipGoods[OPIUM] = 0;
  }

  // you might get beat up and robbed
  if (h.location !== HONG_KONG) {
    yield* checkRobbery(h, rng);
  }

  // your warehouse might catch fire
  if (warehouseAvailable(h) < h.warehouseSize && rng.chanceOf(50)) {
    yield* say("Messenger reports a large warehouse fire, Taipan!");
    for (let g = 0; g < NUM_GOODS; g++) {
      if (h.warehouseGoods[g]! > 0) {
        const f = 1.3 + rng.float();
        h.warehouseGoods[g] = Math.max(Math.trunc(h.warehouseGoods[g]! / f), 1);
      }
    }
  }
}

/**
 * A 1-in-20 chance of being robbed when carrying lots of cash, after the first
 * year. Checked on arriving at a foreign harbor, and on leaving the bank.
 */
export function* checkRobbery(h: Hong, rng: Rng): Flow {
  if (currentTime(h) > 12 && h.cash > ROBBERY_CASH_LIMIT && rng.chanceOf(20)) {
    const cost = Math.trunc((h.cash / 1.4) * rng.float());
    if (cost > 0) {
      yield* say(`Bad joss! Your bodyguards were beaten up and you were robbed of ${money(cost)}, Taipan!`);
      h.cash -= cost;
    }
  }
}
