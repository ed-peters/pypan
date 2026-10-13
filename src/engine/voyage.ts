// Sailing between ports (SPEC.md section 5.1).

import { checkPirates } from "./battle";
import { accrueInterest, checkBanker } from "./bank";
import { AT_SEA, CITIES, city } from "./constants";
import { checkCargo } from "./cargo";
import { checkExtortion } from "./extortion";
import { advanceTime, isOverloaded, type Hong } from "./hong";
import { checkLender } from "./lender";
import { askOptOrCancel, say, withArt, type Flow } from "./prompts";
import { checkSafety } from "./safety";
import { checkUpgrades } from "./shipyard";
import { checkStorm } from "./storm";
import { establishPrices } from "./trade";
import { checkWarehouse } from "./warehouse";
import type { Rng } from "./rng";

/** Sail to another port. Returns "sunk" if the ship is lost on the way. */
export function* sailAway(h: Hong, rng: Rng): Flow<"sunk" | void> {
  if (isOverloaded(h)) {
    yield* say("Your ship is overloaded, Taipan.");
    return;
  }

  const destination = yield* askOptOrCancel("Where shall we sail to, Taipan?", CITIES);
  if (destination === null) {
    return;
  }

  // can't go somewhere if you're already there
  if (h.location === destination) {
    yield* say(`You are already in ${city(h.location)}, Taipan.`);
    return;
  }

  // make it seem like it's a trip ...
  h.location = AT_SEA;
  advanceTime(h);
  const arrival = yield* withArt("boat", atSea(h, rng, destination));
  if (arrival === null) {
    return "sunk";
  }

  // set location and accrue interest
  h.location = arrival;
  accrueInterest(h);

  // check local events
  yield* checkLender(h, rng);
  yield* checkExtortion(h, rng);
  yield* checkUpgrades(h, rng);
  yield* checkWarehouse(h, rng);
  yield* checkBanker(h, rng);
  yield* checkCargo(h, rng);
  yield* checkSafety(h, rng);
  yield* establishPrices(h, rng);
}

/** Pirates and storms en route; returns where we actually arrive, or null if sunk. */
function* atSea(h: Hong, rng: Rng, destination: number): Flow<number | null> {
  if ((yield* checkPirates(h, rng)) === "sunk") {
    return null;
  }
  const arrival = yield* checkStorm(h, rng, destination);

  // .. and we're there
  yield* say(`Arriving at ${city(arrival)} ... `);
  return arrival;
}
