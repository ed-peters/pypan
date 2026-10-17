// What the side panes show, as plain rows (pypan.py's StatusWindow and GoodsWindow).

import { AT_SEA, GOODS, city } from "../engine/constants";
import { gameDate, money } from "../engine/format";
import {
  knownGoods, repairPercent, shipAvailable, warehouseAvailable, type Hong,
} from "../engine/hong";

export type Row = [label: string, value: string];

/** The heading over the message area. */
export function reportTitle(h: Hong | null): string {
  if (!h) {
    return "PYPAN";
  }
  const who = h.location === AT_SEA ? "CAPTAIN" : "COMPRADOR";
  return `${who}'S REPORT - ${gameDate(h)}`;
}

export function statusRows(h: Hong | null): Row[] {
  return [
    ["Location", h ? city(h.location) : "-"],
    ["Cash", h ? money(h.cash) : "-"],
    ["Debt", h ? money(h.debt) : "-"],
    ["Bank", h ? money(h.bank) : "-"],
    ["Guns", h ? money(h.shipGuns) : "-"],
    ["Repair", h ? `${repairPercent(h)}%` : "-"],
  ];
}

/** Before a game, show the goods a new game starts with: no porcelain. */
function goodsRows(h: Hong | null, goods: readonly number[] | undefined, capacity: number | undefined): Row[] {
  const names = h ? knownGoods(h) : GOODS.slice(0, -1);
  const rows: Row[] = names.map((g, i) => [g, goods ? money(goods[i]!) : "-"]);
  const cap = capacity === undefined ? "-" : capacity < 0 ? "Overloaded" : money(capacity);
  rows.push(["Capacity", cap]);
  return rows;
}

export function warehouseRows(h: Hong | null): Row[] {
  return goodsRows(h, h?.warehouseGoods, h ? warehouseAvailable(h) : undefined);
}

export function holdRows(h: Hong | null): Row[] {
  return goodsRows(h, h?.shipGoods, h ? shipAvailable(h) : undefined);
}

/** The special consignment aboard, as display lines. */
export function cargoLines(h: Hong | null): string[] {
  const c = h?.shipCargo;
  if (!c) {
    return ["(none)"];
  }
  const title = c.description.replace(/\b\w/g, (ch) => ch.toUpperCase());
  return [title, `Bound for ${city(c.destination)}`];
}

/** One-line summary of hold and warehouse for the collapsed mobile view. */
export function cargoSummary(h: Hong | null): string {
  if (!h) {
    return "HOLD - · WAREHOUSE -";
  }
  const hold = shipAvailable(h) < 0 ? "OVERLOADED" : `${money(shipAvailable(h))} free`;
  return `HOLD ${hold} · WAREHOUSE ${money(warehouseAvailable(h))} free`;
}
