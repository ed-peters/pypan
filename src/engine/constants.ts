// Game constants and fixed tables, ported from etc/pypan.py (see SPEC.md section 14).

import type { Rng } from "./rng";

// ------------------------------------------------------------------------------------
// Tuning

export const BASED_PRICES = false;
export const START_CASH = 400;
export const START_DEBT = 5000;
export const START_YEAR = 1860;
export const START_MONTH = 1;
export const START_GUNS = 5;
export const START_SHIP_SIZE = 60;
export const START_WAREHOUSE_SIZE = 10000;
export const GUN_SIZE = 10;
export const LOAN_RATE = 0.1;
export const BANK_RATE = 0.05;
export const SHIP_SIZE_INCREMENT = 50;
export const WAREHOUSE_SIZE_INCREMENT = 5000;
export const DEBT_THREAT_LEVEL = 10000;
export const DEBT_MULTIPLIER = 2;
export const ROBBERY_CASH_LIMIT = 20000;
export const PRICE_SIGMA = 15.0;
export const ENEMY_HEALTH_START = 20;
export const ENEMY_HEALTH_BUMP = 10;
export const ENEMY_DAMAGE_START = 0.5;
export const ENEMY_DAMAGE_BUMP = 0.5;

// ------------------------------------------------------------------------------------
// Cities

export const CITIES = [
  "Hong Kong", "Shanghai", "Nagasaki",
  "Saigon", "Manila", "Singapore", "Batavia",
] as const;

export const HONG_KONG = 0;
export const SHANGHAI = 1;
export const NAGASAKI = 2;
export const SAIGON = 3;
export const MANILA = 4;
export const SINGAPORE = 5;
export const BATAVIA = 6;
export const AT_SEA = 7;

// Sic: one less than the number of cities, so randomOtherCity never picks Batavia.
export const NUM_CITIES = CITIES.length - 1;

export function city(n: number): string {
  return CITIES[n] ?? "At Sea";
}

/** A random city other than n (never Batavia; see NUM_CITIES). */
export function randomOtherCity(rng: Rng, n: number): number {
  for (;;) {
    const o = rng.randrange(NUM_CITIES);
    if (o !== n) {
      return o;
    }
  }
}

// ------------------------------------------------------------------------------------
// Goods

export const GOODS = ["General", "Arms", "Silk", "Opium", "Jade"] as const;

export const GENERAL = 0;
export const ARMS = 1;
export const SILK = 2;
export const OPIUM = 3;
export const JADE = 4;
export const NUM_GOODS = GOODS.length;

export function good(n: number): string {
  const g = GOODS[n];
  if (g === undefined) {
    throw new RangeError(`no such good: ${n}`);
  }
  return g;
}

/** Price magnitude for a good: 10^n. */
export function mult(n: number): number {
  return 10 ** n;
}

/**
 * Per-good base prices for the "based" pricing mode. Column 0 is the good's
 * magnitude; columns 1..7 are the base for each city (indexed by city + 1).
 */
export const BASE_PRICES: readonly (readonly number[])[] = [
  [1, 11, 16, 15, 14, 12, 10, 13],
  [10, 11, 14, 15, 16, 10, 13, 12],
  [100, 12, 16, 10, 11, 13, 14, 15],
  [1000, 10, 11, 12, 13, 14, 15, 16],
  [10000, 10, 11, 12, 13, 14, 15, 16],
];
