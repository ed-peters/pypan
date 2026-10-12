// Local market prices (SPEC.md section 4.1). Price shocks live with trading.

import { BASE_PRICES, BASED_PRICES, NUM_GOODS, PRICE_SIGMA, mult } from "./constants";
import type { Rng } from "./rng";

/** Fresh prices for the given city. */
export function setPrices(rng: Rng, city: number, based: boolean = BASED_PRICES): number[] {
  const p: number[] = [];
  for (let g = 0; g < NUM_GOODS; g++) {
    if (based) {
      const row = BASE_PRICES[g]!;
      let x = 100;
      while (x < 0 || x > 25) {
        x = rng.normal(row[city + 1]!, PRICE_SIGMA);
      }
      p.push(Math.trunc(5 + x) * row[0]!);
    } else {
      p.push(Math.trunc(rng.inRange(5, 31) * mult(g)));
    }
  }
  return p;
}
