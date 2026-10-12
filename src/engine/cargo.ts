// Special consignments (SPEC.md section 12).

import { NUM_GOODS, city, randomOtherCity } from "./constants";
import { money } from "./format";
import { currentTime, type Cargo, type Hong } from "./hong";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

export const CARGO_DESCRIPTIONS = [
  "bronze statue",
  "jade statue",
  "iron chest",
  "party of 3",
  "secret document",
  "crate of spices",
] as const;

/** On arrival: deliver any consignment bound here, then maybe offer a new one. */
export function* checkCargo(h: Hong, rng: Rng): Flow {
  // cargo doesn't show up until later in the game
  if (currentTime(h) < 18) {
    return;
  }

  // if you have cargo, it's automatically offloaded
  if (h.shipCargo && h.location === h.shipCargo.destination) {
    yield* say(`We have successfully delivered the ${h.shipCargo.description} that was bound for ${city(h.location)}, Taipan.`);
    h.cash += h.shipCargo.value;
    h.shipCargo = null;
  }

  // if we don't have cargo, we might get offered to carry some
  if (!h.shipCargo && rng.chanceOf(20)) {
    const c = randomCargo(h, rng);
    if (yield* askYn(`Should I accept a special consignment of a ${c.description} to transport to ${city(c.destination)} for ${money(c.value)}, Taipan? (It will take up ${c.size} space in the ship's hold.)`)) {
      h.shipCargo = c;
    }
  }
}

export function randomCargo(h: Hong, rng: Rng): Cargo {
  const description = rng.choice(CARGO_DESCRIPTIONS);
  const unit = Math.trunc(35 * 10 ** rng.randrange(NUM_GOODS - 2));
  const destination = randomOtherCity(rng, h.location);
  const size = Math.trunc(h.shipSize * rng.inRange(5, 31) / 100);
  return { description, destination, illegal: false, size, value: unit * size + rng.randrange(100) };
}
