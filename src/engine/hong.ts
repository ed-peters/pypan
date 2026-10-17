// The player's state: one Hong holds everything needed to save and resume a game
// (SPEC.md section 2.1). It is plain data; behavior lives in functions.

import {
  GOODS, HONG_KONG, NUM_GOODS, START_CASH, START_DEBT, START_GUNS, START_MONTH,
  START_SHIP_SIZE, START_WAREHOUSE_SIZE, START_YEAR,
} from "./constants";
import { setPrices } from "./prices";
import type { Rng } from "./rng";

/** A special consignment carried in the ship's hold (SPEC.md section 12). */
export interface Cargo {
  description: string;
  destination: number;
  illegal: boolean;
  size: number;
  /** Pay on delivery, fixed when offered; reduced if delivered late. */
  value: number;
  /** The month (as currentTime) it's due; later arrivals are late. */
  due: number;
}

/** The Burmese jade expedition, from its offer until it succeeds or fails (pypan-33). */
export interface Expedition {
  /** The port where it was offered. */
  port: number;
  /** The month (as currentTime) when it succeeds or fails. */
  resolves: number;
  /** What we invested in it; 0 if others backed it. */
  stake: number;
}

/** A share in the jade mine (pypan-89): what it's worth, and when it next settles. */
export interface Mine {
  value: number;
  /** The month (as currentTime) of the next quarter's return. */
  due: number;
}

export interface Hong {
  name: string;
  year: number;
  month: number;
  cash: number;
  debt: number;
  bank: number;
  shipSize: number;
  shipGoods: number[];
  shipGuns: number;
  shipDamage: number;
  shipCargo: Cargo | null;
  /** 1-in-N chance of a pirate encounter per voyage. */
  pirateChance: number;
  warehouseSize: number;
  warehouseGoods: number[];
  /** Whether Elder Brother Wu has delivered his debt threat. */
  threatened: boolean;
  /** Li Yuen extortion counter, 0..3. */
  extorted: number;
  /** Times you've refused Li Yuen since you last paid him, 0..LI_YUEN_MAX_GRUDGE. */
  grudge: number;
  /** Multiplier that inflates each successive emergency loan. */
  bailout: number;
  /** City index, or AT_SEA. */
  location: number;
  /** Warehouse transfer fee percent; -1 means transfers are unavailable here. */
  transfer: number;
  /** Whether a representative from the bank is in this (foreign) port. */
  banker: boolean;
  prices: number[];
  expedition: Expedition | null;
  /** Whether an expedition has failed, so Sir Beaumont-Finch is back after escaping. */
  expeditionFailed: boolean;
  /** How many times Sir Beaumont-Finch has sought backers, up to JADE_MAX_OFFERS. */
  jadeOffers: number;
  mine: Mine | null;
  /** Whether we own a share in the porcelain trade; until then porcelain is hidden. */
  porcelain: boolean;
}

/** A new game in Hong Kong, starting with either guns or debt. */
export function newHong(rng: Rng, guns: boolean, name: string = "Rising Sun"): Hong {
  return {
    name,
    year: START_YEAR,
    month: START_MONTH,
    cash: guns ? 0 : START_CASH,
    debt: guns ? 0 : START_DEBT,
    bank: 0,
    shipSize: START_SHIP_SIZE,
    shipGoods: new Array<number>(NUM_GOODS).fill(0),
    shipGuns: guns ? START_GUNS : 0,
    shipDamage: 0,
    shipCargo: null,
    pirateChance: guns ? 7 : 10,
    warehouseSize: START_WAREHOUSE_SIZE,
    warehouseGoods: new Array<number>(NUM_GOODS).fill(0),
    threatened: false,
    extorted: 0,
    grudge: 0,
    bailout: 1,
    location: HONG_KONG,
    transfer: 0,
    banker: false,
    prices: setPrices(rng, HONG_KONG),
    expedition: null,
    expeditionFailed: false,
    jadeOffers: 0,
    mine: null,
    porcelain: false,
  };
}

export function advanceTime(h: Hong): void {
  if (h.month === 12) {
    h.year += 1;
    h.month = 1;
  } else {
    h.month += 1;
  }
}

/** Months elapsed since the start, counting the first month as 1. */
export function currentTime(h: Hong): number {
  return (h.year - START_YEAR) * 12 + h.month;
}

/** Hull condition as a percent: 100 is undamaged. */
export function repairPercent(h: Hong): number {
  return 100 - Math.trunc((h.shipDamage / h.shipSize) * 100);
}

/** Cash plus the local value of goods aboard ship. */
export function netWorthOnHand(h: Hong): number {
  return h.shipGoods.reduce((sum, n, g) => sum + n * h.prices[g]!, h.cash);
}

/** The goods on the market: porcelain, the last, only once we've bought into it. */
export function knownGoods(h: Hong): readonly string[] {
  return h.porcelain ? GOODS : GOODS.slice(0, -1);
}

export function totalGoods(h: Hong): number {
  return sum(h.shipGoods);
}

/** Free space in the hold; negative when overloaded. */
export function shipAvailable(h: Hong): number {
  return h.shipSize - (h.shipCargo?.size ?? 0) - totalGoods(h);
}

export function isOverloaded(h: Hong): boolean {
  return shipAvailable(h) < 0;
}

export function warehouseHas(h: Hong, good: number): boolean {
  return h.warehouseGoods[good] !== 0;
}

export function warehouseUsed(h: Hong): number {
  return sum(h.warehouseGoods);
}

export function warehouseAvailable(h: Hong): number {
  return h.warehouseSize - warehouseUsed(h);
}

/** Whether any of the good is aboard ship or in the warehouse. */
export function hasAny(h: Hong, good: number): boolean {
  return h.shipGoods[good]! > 0 || h.warehouseGoods[good]! > 0;
}

/** No cash and no goods anywhere. */
export function isBroke(h: Hong): boolean {
  return h.cash === 0 && totalGoods(h) === 0 && warehouseUsed(h) === 0;
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
