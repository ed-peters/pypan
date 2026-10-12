// Storms at sea (SPEC.md section 6).

import { city, randomOtherCity } from "./constants";
import type { Hong } from "./hong";
import { say, withArt, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** A 1-in-10 chance of a storm; returns the (possibly changed) destination. */
export function* checkStorm(h: Hong, rng: Rng, destination: number): Flow<number> {
  if (!rng.chanceOf(10)) {
    return destination;
  }

  yield* say("Storm, Taipan!");

  let msg = "We made it";
  // storms don't add damage to a ship that is already 80% damaged
  if ((h.shipDamage / h.shipSize) * 100 < 80 && rng.chanceOf(10)) {
    h.shipDamage += rng.inRange(5, 20);
    msg = `${msg}, but we took some damage!`;
  } else if (rng.chanceOf(3)) {
    destination = randomOtherCity(rng, destination);
    msg = `${msg}, but we got blown off course to ${city(destination)}!`;
  } else {
    msg = `${msg}!`;
  }
  yield* withArt("storm", say(msg));
  return destination;
}
