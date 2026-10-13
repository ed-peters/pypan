// Game constants and fixed tables, ported from etc/pypan.py (see SPEC.md section 14).

import type { Rng } from "./rng";

// ------------------------------------------------------------------------------------
// Tuning

export const BASED_PRICES = true;
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
/** A consignment filling the whole hold pays this share of your money (pypan-48). */
export const CONSIGNMENT_RATE = 0.15;
/** No consignments are offered once your money is over this. */
export const CONSIGNMENT_MONEY_LIMIT = 100000;
/** Each month late takes this share off a consignment's pay. */
export const CONSIGNMENT_LATE_PENALTY = 0.2;
/** Months late before a consignment is offloaded unpaid. */
export const CONSIGNMENT_LATE_LIMIT = 5;
/** The jade expedition is offered only after this many months (pypan-33). */
export const JADE_MIN_MONTHS = 24;
/** ... and only to a player with more than this much in the bank. */
export const JADE_BANK_LEVEL = 2000000;
/** The investment asked for, give or take 10%. */
export const JADE_INVESTMENT = 1000000;
/** Months from the offer until the expedition succeeds or fails. */
export const JADE_EXPEDITION_MONTHS = 3;
/** Months that backers get jade cheaply at the expedition's port. */
export const JADE_DISCOUNT_MONTHS = 3;
/** Backers' jade costs this fraction of the market price. */
export const JADE_DISCOUNT = 0.2;
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

export const NUM_CITIES = CITIES.length;

export function city(n: number): string {
  return CITIES[n] ?? "At Sea";
}

/** A random city other than n. */
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
 * Per-good base prices for the "based" pricing mode, from taipan.c. Column 0 is the
 * good's magnitude; columns 1..7 are how dear the good is in each city (indexed by
 * city + 1: Hong Kong, Shanghai, Nagasaki, Saigon, Manila, Singapore, Batavia).
 * taipan.c has no Jade; its row is our own.
 */
export const BASE_PRICES: readonly (readonly number[])[] = [
  // magnitude, HK  Sha Nag Sai Man Sin Bat
  [1,           10, 11, 12, 13, 14, 15, 16], // General: dearer the further from Hong Kong
  [10,          12, 16, 10, 11, 13, 14, 15], // Arms: cheap in Nagasaki/Saigon, dear in Shanghai
  [100,         11, 14, 15, 16, 10, 13, 12], // Silk: cheap in Hong Kong/Manila, dear in Saigon
  [1000,        11, 16, 15, 14, 12, 10, 13], // Opium: cheap in Hong Kong/Singapore, dear in Shanghai
  [10000,       13, 15, 16, 12, 14, 10, 11], // Jade: cheap in Singapore/Batavia, dear in Nagasaki
];
