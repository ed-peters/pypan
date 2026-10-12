// Local market prices (SPEC.md section 4.1). Price shocks live with trading.

import { BASE_PRICES, BASED_PRICES, NUM_GOODS, mult } from "./constants";
import type { Rng } from "./rng";

/** Fresh prices for the given city. */
export function setPrices(rng: Rng, city: number, based: boolean = BASED_PRICES): number[] {
  const p: number[] = [];
  for (let g = 0; g < NUM_GOODS; g++) {
    if (based) {
      // as in taipan.c: the city's level for this good (its base, halved and
      // rounded down, so 5-8), times 1, 2 or 3, times the good's magnitude
      const row = BASE_PRICES[g]!;
      const level = Math.trunc(row[city + 1]! / 2);
      p.push(level * (rng.randrange(3) + 1) * row[0]!);
    } else {
      p.push(Math.trunc(rng.inRange(5, 31) * mult(g)));
    }
  }
  return p;
}
