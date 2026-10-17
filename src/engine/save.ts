// Save format: the same JSON shape that etc/pypan.py writes to pypan.json, so saves
// from the Python version can be imported. Keys are snake_case on disk.

import {
  BASE_PRICES, CITIES, HONG_KONG, JADE_INVESTMENT, LI_YUEN_MAX_GRUDGE, NUM_GOODS, PORCELAIN,
  START_YEAR,
} from "./constants";
import type { Cargo, Expedition, Hong, Mine } from "./hong";

/**
 * Saves from before pypan-87 have no porcelain. Those written between pypan-86 and
 * pypan-87 have four goods. Older ones (and pypan.py's) have five, but the fifth is
 * jade, which pypan-86 took off the market: any jade aboard or in the warehouse is
 * sold for its usual Hong Kong price.
 */
const JADE_SALVAGE_PRICE = 120000;

export class SaveFormatError extends Error {
  override name = "SaveFormatError";
}

/** Serialize to the pypan.json format. */
export function toSave(h: Hong): Record<string, unknown> {
  return {
    name: h.name,
    year: h.year,
    month: h.month,
    cash: h.cash,
    debt: h.debt,
    bank: h.bank,
    ship_size: h.shipSize,
    ship_goods: [...h.shipGoods],
    ship_guns: h.shipGuns,
    ship_damage: h.shipDamage,
    ship_cargo: h.shipCargo ? { ...h.shipCargo } : null,
    pirate_chance: h.pirateChance,
    warehouse_size: h.warehouseSize,
    warehouse_goods: [...h.warehouseGoods],
    threatened: h.threatened,
    extorted: h.extorted,
    bailout: h.bailout,
    location: h.location,
    transfer: h.transfer,
    // our own additions, written only when they differ from pypan.py's game, so saves
    // otherwise match pypan.py's
    ...(h.banker ? { banker: true } : {}),
    ...(h.grudge ? { grudge: h.grudge } : {}),
    prices: [...h.prices],
    ...(h.expedition ? { expedition: { ...h.expedition } } : {}),
    ...(h.expeditionFailed ? { expedition_failed: true } : {}),
    ...(h.jadeOffers ? { jade_offers: h.jadeOffers } : {}),
    ...(h.porcelain ? { porcelain: true } : {}),
    ...(h.mine ? { mine: { ...h.mine } } : {}),
  };
}

export function toSaveString(h: Hong): string {
  return JSON.stringify(toSave(h), null, 4);
}

/** Parse and validate a pypan.json-format object. Unknown keys are ignored. */
export function fromSave(data: unknown): Hong {
  const d = record(data, "save");
  const porcelain = d.porcelain === undefined ? false : bool(d, "porcelain");
  const location = int(d, "location", 0, CITIES.length);
  const [shipGoods, shipJade] = goods(d, "ship_goods", porcelain);
  const [warehouseGoods, warehouseJade] = goods(d, "warehouse_goods", porcelain);
  const prices = goods(d, "prices", true, true)[0];
  if (prices.length < NUM_GOODS) {
    // a four-good save: porcelain is hidden, and priced afresh on the next arrival
    prices.push(usualPorcelainPrice(location));
  }
  return {
    name: str(d, "name"),
    year: int(d, "year"),
    month: int(d, "month", 1, 12),
    cash: int(d, "cash") + (shipJade + warehouseJade) * JADE_SALVAGE_PRICE,
    debt: int(d, "debt"),
    bank: int(d, "bank"),
    shipSize: int(d, "ship_size", 0),
    shipGoods,
    shipGuns: int(d, "ship_guns", 0),
    shipDamage: int(d, "ship_damage"),
    shipCargo: d.ship_cargo == null ? null : cargo(d.ship_cargo, d),
    pirateChance: int(d, "pirate_chance", 1),
    warehouseSize: int(d, "warehouse_size", 0),
    warehouseGoods,
    threatened: bool(d, "threatened"),
    extorted: int(d, "extorted"),
    bailout: int(d, "bailout"),
    location,
    transfer: int(d, "transfer", -1),
    // not in pypan.py saves
    banker: d.banker === undefined ? false : bool(d, "banker"),
    grudge: d.grudge === undefined ? 0 : int(d, "grudge", 0, LI_YUEN_MAX_GRUDGE),
    prices,
    expedition: d.expedition == null ? null : expedition(d.expedition),
    expeditionFailed: d.expedition_failed === undefined ? false : bool(d, "expedition_failed"),
    jadeOffers: d.jade_offers === undefined ? 0 : int(d, "jade_offers", 0),
    porcelain,
    mine: d.mine == null ? null : mine(d.mine),
  };
}

export function fromSaveString(json: string): Hong {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new SaveFormatError(`save is not valid JSON: ${(e as Error).message}`);
  }
  return fromSave(data);
}

// ------------------------------------------------------------------------------------
// Validation helpers

type Rec = Record<string, unknown>;

function record(v: unknown, what: string): Rec {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new SaveFormatError(`${what} must be an object`);
  }
  return v as Rec;
}

function int(d: Rec, key: string, min = -Infinity, max = Infinity): number {
  const v = d[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new SaveFormatError(`${key} must be an integer in ${min}..${max}, got ${JSON.stringify(v)}`);
  }
  return v;
}

function str(d: Rec, key: string): string {
  const v = d[key];
  if (typeof v !== "string") {
    throw new SaveFormatError(`${key} must be a string`);
  }
  return v;
}

function bool(d: Rec, key: string): boolean {
  const v = d[key];
  if (typeof v !== "boolean") {
    throw new SaveFormatError(`${key} must be a boolean`);
  }
  return v;
}

/**
 * A list of goods, with porcelain last, and the jade in it. Without porcelain, the
 * fifth entry of a five-good list is jade from an older save: it's taken out and
 * returned separately. `short` keeps a four-good list as it is (for prices).
 */
function goods(d: Rec, key: string, porcelain: boolean, short = false): [number[], number] {
  const v = d[key];
  const ok = porcelain && !short ? [NUM_GOODS] : [NUM_GOODS - 1, NUM_GOODS];
  if (!Array.isArray(v) || !ok.includes(v.length) || !v.every((x) => Number.isInteger(x))) {
    throw new SaveFormatError(`${key} must be a list of ${NUM_GOODS} integers`);
  }
  const all = [...(v as number[])];
  if (porcelain) {
    return [all, 0];
  }
  const jade = all[PORCELAIN] ?? 0;
  all[PORCELAIN] = 0;
  return [all, jade];
}

/** Porcelain's usual price at a port (Hong Kong's at sea): its level times 2. */
function usualPorcelainPrice(location: number): number {
  const row = BASE_PRICES[PORCELAIN]!;
  const port = location < CITIES.length ? location : HONG_KONG;
  return Math.trunc(row[port + 1]! / 2) * 2 * row[0]!;
}

function cargo(v: unknown, d: Rec): Cargo {
  const c = record(v, "ship_cargo");
  // pypan.py consignments have no deadline: make them due on the next arrival
  const due = c.due === undefined ? (int(d, "year") - START_YEAR) * 12 + int(d, "month") + 1 : int(c, "due");
  return {
    description: str(c, "description"),
    destination: int(c, "destination", 0, CITIES.length - 1),
    illegal: bool(c, "illegal"),
    size: int(c, "size", 0),
    value: int(c, "value"),
    due,
  };
}

function expedition(v: unknown): Expedition {
  const e = record(v, "expedition");
  // older saves only say whether we invested, and the stake was about JADE_INVESTMENT
  const stake = e.stake === undefined ? (bool(e, "invested") ? JADE_INVESTMENT : 0) : int(e, "stake", 0);
  return {
    port: int(e, "port", 0, CITIES.length - 1),
    resolves: int(e, "resolves"),
    stake,
  };
}

function mine(v: unknown): Mine {
  const m = record(v, "mine");
  return { value: int(m, "value", 0), due: int(m, "due") };
}
