// Special consignments (SPEC.md section 12).

import {
  CONSIGNMENT_LATE_LIMIT, CONSIGNMENT_LATE_PENALTY, CONSIGNMENT_MONEY_LIMIT, CONSIGNMENT_RATE,
  city, randomOtherCity,
} from "./constants";
import { money } from "./format";
import { currentTime, type Cargo, type Hong } from "./hong";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

export const CARGO_DESCRIPTIONS = [
  "bronze statue",
  "iron chest",
  "party of 3",
  "secret document",
  "crate of spices",
] as const;

/** On arrival: deliver (or chase up) any consignment aboard, then maybe offer a new one. */
export function* checkCargo(h: Hong, rng: Rng): Flow {
  // cargo doesn't show up until later in the game
  if (currentTime(h) < 18) {
    return;
  }

  const c = h.shipCargo;
  if (c) {
    const late = Math.max(0, currentTime(h) - c.due);
    if (late >= CONSIGNMENT_LATE_LIMIT) {
      yield* say(`Taipan, we have missed the delivery window, and offloaded the ${c.description} that was bound for ${city(c.destination)}.`);
      h.shipCargo = null;
    } else if (h.location === c.destination) {
      // if you have cargo, it's automatically offloaded
      const pay = latePay(c, late);
      if (late > 0) {
        yield* say(`We have delivered the ${c.description} that was bound for ${city(h.location)}, Taipan, but ${late} ${late === 1 ? "month" : "months"} late, so we were paid only ${money(pay)}.`);
      } else {
        yield* say(`We have successfully delivered the ${c.description} that was bound for ${city(h.location)}, Taipan.`);
      }
      h.cash += pay;
      h.shipCargo = null;
    } else {
      yield* say(`Taipan, we are still committed to deliver the ${c.description} to ${city(c.destination)}.`);
    }
  }

  // if we don't have cargo, we might get offered to carry some
  const odds = offerOdds(h);
  if (!h.shipCargo && odds !== null && rng.chanceOf(odds)) {
    const c = randomCargo(h, rng);
    const joss = rng.chanceOf(15);
    if (joss) {
      c.value *= 3;
    }
    if (yield* askYn(`${joss ? "Good joss!! " : ""}Should I accept a special consignment of a ${c.description} to transport to ${city(c.destination)} for ${money(c.value)}, Taipan? (It will take up ${c.size} space in the ship's hold.)`)) {
      h.shipCargo = c;
    }
  }
}

/** The money consignments are priced on: cash plus bank, less debt (goods don't count). */
export function consignmentMoney(h: Hong): number {
  return h.cash + h.bank - h.debt;
}

/** 1-in-N odds of an offer: none for the rich, a life line for the broke. */
export function offerOdds(h: Hong): number | null {
  const m = consignmentMoney(h);
  if (m > CONSIGNMENT_MONEY_LIMIT) {
    return null;
  }
  return m <= 0 ? 3 : 20;
}

/** What a consignment pays when delivered some months late. */
export function latePay(c: Cargo, late: number): number {
  return Math.round(c.value * Math.max(0, 1 - CONSIGNMENT_LATE_PENALTY * late));
}

/**
 * A new consignment, due next month. It pays CONSIGNMENT_RATE (+/- 20%) of your
 * money, scaled by its share of the hold, but never less than the old per-space fee.
 */
export function randomCargo(h: Hong, rng: Rng): Cargo {
  const description = rng.choice(CARGO_DESCRIPTIONS);
  // the old per-space fee: 35, 350 or 3500
  const unit = Math.trunc(35 * 10 ** rng.randrange(3));
  const destination = randomOtherCity(rng, h.location);
  const size = Math.trunc(h.shipSize * rng.inRange(5, 31) / 100);
  const minimum = unit * size + rng.randrange(100);
  const rate = CONSIGNMENT_RATE * (0.8 + 0.4 * rng.float());
  const value = Math.max(minimum, Math.trunc(rate * consignmentMoney(h) * size / h.shipSize));
  return { description, destination, illegal: false, size, value, due: currentTime(h) + 1 };
}
