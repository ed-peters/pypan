// Storms at sea (SPEC.md section 6).

import {
  PORCELAIN, ROUGH_SEAS_BREAKAGE, ROUGH_SEAS_CHANCE, STORM_BREAKAGE, city, randomOtherCity,
} from "./constants";
import { money } from "./format";
import type { Hong } from "./hong";
import { breakPorcelain } from "./porcelain";
import { beat, say, withArt, type Flow } from "./prompts";
import type { Rng } from "./rng";

/**
 * A 1-in-10 chance of a storm; returns the (possibly changed) destination. With
 * porcelain aboard, a storm breaks some, and so (more often) do rough seas.
 */
export function* checkStorm(h: Hong, rng: Rng, destination: number): Flow<number> {
  if (!rng.chanceOf(10)) {
    if (h.shipGoods[PORCELAIN]! > 0 && rng.chanceOf(ROUGH_SEAS_CHANCE)) {
      const n = breakPorcelain(h, rng, ROUGH_SEAS_BREAKAGE);
      yield* withArt("storm", say(`Rough seas, Taipan! ${money(n)} of our porcelain was broken.`));
    }
    return destination;
  }

  yield* beat("Storm, Taipan!");

  let msg = "We made it";
  // storms don't add damage to a ship that is already 80% damaged
  if ((h.shipDamage / h.shipSize) * 100 < 80 && rng.chanceOf(10)) {
    h.shipDamage += rng.inRange(5, 21);
    msg = `${msg}, but we took some damage!`;
  } else if (rng.chanceOf(3)) {
    destination = randomOtherCity(rng, destination);
    msg = `${msg}, but we got blown off course to ${city(destination)}!`;
  } else {
    msg = `${msg}!`;
  }
  // one tap for the storm: its outcome waits, unless porcelain news follows
  const aboard = h.shipGoods[PORCELAIN]! > 0;
  yield* withArt("storm", aboard ? beat(msg) : say(msg));
  if (aboard) {
    const n = breakPorcelain(h, rng, STORM_BREAKAGE);
    yield* withArt("storm", say(`The storm broke ${money(n)} of our porcelain, Taipan!`));
  }
  return destination;
}
