// Harbor police, muggers and warehouse fires (SPEC.md section 11).

import { HONG_KONG, NUM_GOODS, OPIUM, POLICE_CHANCE, ROBBERY_CASH_LIMIT, city } from "./constants";
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
  if (h.location !== HONG_KONG && h.shipGoods[OPIUM]! > 0 && rng.chanceOf(POLICE_CHANCE)) {
    yield* fined(h, rng, "Bad joss! Harbor police have confiscated your opium");
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
 * On arrival abroad, before any delivery: the police might seize a contraband
 * consignment, as they do opium (pypan-83). Returns whether they did.
 */
export function* checkContraband(h: Hong, rng: Rng): Flow<boolean> {
  const c = h.shipCargo;
  if (!c?.illegal || h.location === HONG_KONG || !rng.chanceOf(POLICE_CHANCE)) {
    return false;
  }
  yield* fined(h, rng, `Bad joss! Harbor police have seized the ${c.description} bound for ${city(c.destination)}`);
  h.shipCargo = null;
  return true;
}

/** The police's news, with a fine of up to cash / 1.8 if you have any cash. */
function* fined(h: Hong, rng: Rng, news: string): Flow {
  if (h.cash > 0) {
    const fine = Math.trunc((h.cash / 1.8) * rng.float()) + 1;
    yield* say(`${news} and fined you an additional ${money(fine)}, Taipan!`);
    h.cash -= fine;
  } else {
    yield* say(`${news}, Taipan!`);
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
