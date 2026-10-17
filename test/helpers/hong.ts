import { newHong, type Hong } from "../../src/engine/hong";
import { SeededRng } from "../../src/engine/rng";

/** Fixed prices so tests don't depend on the starting roll. */
export const PRICES = [10, 100, 1000, 10000];

/**
 * A debt-start Hong in Hong Kong with known prices, plus
 * overrides. `time` sets year and month so that currentTime() returns it.
 */
export function makeHong(overrides: Partial<Hong> & { time?: number } = {}): Hong {
  const { time, ...rest } = overrides;
  const h = newHong(new SeededRng(0), false);
  h.prices = [...PRICES];
  if (time !== undefined) {
    h.year = 1860 + Math.floor((time - 1) / 12);
    h.month = ((time - 1) % 12) + 1;
  }
  return Object.assign(h, rest);
}
