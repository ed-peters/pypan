// Save format: the same JSON shape that etc/pypan.py writes to pypan.json, so saves
// from the Python version can be imported. Keys are snake_case on disk.

import { CITIES, NUM_GOODS } from "./constants";
import type { Cargo, Hong } from "./hong";

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
    prices: [...h.prices],
  };
}

export function toSaveString(h: Hong): string {
  return JSON.stringify(toSave(h), null, 4);
}

/** Parse and validate a pypan.json-format object. Unknown keys are ignored. */
export function fromSave(data: unknown): Hong {
  const d = record(data, "save");
  return {
    name: str(d, "name"),
    year: int(d, "year"),
    month: int(d, "month", 1, 12),
    cash: int(d, "cash"),
    debt: int(d, "debt"),
    bank: int(d, "bank"),
    shipSize: int(d, "ship_size", 0),
    shipGoods: goods(d, "ship_goods"),
    shipGuns: int(d, "ship_guns", 0),
    shipDamage: int(d, "ship_damage"),
    shipCargo: d.ship_cargo == null ? null : cargo(d.ship_cargo),
    pirateChance: int(d, "pirate_chance", 1),
    warehouseSize: int(d, "warehouse_size", 0),
    warehouseGoods: goods(d, "warehouse_goods"),
    threatened: bool(d, "threatened"),
    extorted: int(d, "extorted"),
    bailout: int(d, "bailout"),
    location: int(d, "location", 0, CITIES.length),
    transfer: int(d, "transfer", -1),
    prices: goods(d, "prices"),
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

function goods(d: Rec, key: string): number[] {
  const v = d[key];
  if (!Array.isArray(v) || v.length !== NUM_GOODS || !v.every((x) => Number.isInteger(x))) {
    throw new SaveFormatError(`${key} must be a list of ${NUM_GOODS} integers`);
  }
  return [...(v as number[])];
}

function cargo(v: unknown): Cargo {
  const c = record(v, "ship_cargo");
  return {
    description: str(c, "description"),
    destination: int(c, "destination", 0, CITIES.length - 1),
    illegal: bool(c, "illegal"),
    size: int(c, "size", 0),
    value: int(c, "value"),
  };
}
