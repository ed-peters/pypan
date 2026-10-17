import { describe, expect, it } from "vitest";
import { AT_SEA, NAGASAKI } from "../../src/engine/constants";
import {
  cargoLines, cargoSummary, holdRows, reportTitle, statusRows, warehouseRows,
} from "../../src/ui/panes";
import { makeHong } from "../helpers/hong";

describe("panes", () => {
  it("titles the report by who is reporting", () => {
    expect(reportTitle(null)).toBe("PYPAN");
    expect(reportTitle(makeHong())).toBe("COMPRADOR'S REPORT - January 1860");
    expect(reportTitle(makeHong({ location: AT_SEA, time: 14 }))).toBe("CAPTAIN'S REPORT - February 1861");
  });

  it("shows status", () => {
    expect(statusRows(makeHong({ cash: 12345, shipDamage: 15 }))).toEqual([
      ["Location", "Hong Kong"], ["Cash", "12,345"], ["Debt", "5,000"],
      ["Bank", "0"], ["Guns", "0"], ["Repair", "75%"],
    ]);
  });

  it("shows placeholders before the game starts", () => {
    expect(statusRows(null).every(([, v]) => v === "-")).toBe(true);
    expect(holdRows(null).every(([, v]) => v === "-")).toBe(true);
    expect(holdRows(null).map(([g]) => g)).toEqual(["General", "Arms", "Silk", "Opium", "Capacity"]);
    expect(cargoLines(null)).toEqual(["(none)"]);
  });

  it("shows goods and free space", () => {
    const h = makeHong({ shipGoods: [10, 0, 2, 0, 0], warehouseGoods: [0, 0, 0, 1500, 0] });
    expect(holdRows(h)).toEqual([
      ["General", "10"], ["Arms", "0"], ["Silk", "2"], ["Opium", "0"], ["Capacity", "48"],
    ]);
    expect(warehouseRows(h).at(-1)).toEqual(["Capacity", "8,500"]);
    expect(cargoSummary(h)).toBe("HOLD 48 free · WAREHOUSE 8,500 free");
  });

  it("shows porcelain once we're in the porcelain trade", () => {
    const h = makeHong({ porcelain: true, shipGoods: [0, 0, 0, 0, 4] });
    expect(holdRows(h).at(-2)).toEqual(["Porcelain", "4"]);
    expect(warehouseRows(makeHong()).map(([g]) => g)).toEqual(["General", "Arms", "Silk", "Opium", "Capacity"]);
  });

  it("flags an overloaded hold", () => {
    const h = makeHong({ shipGoods: [61, 0, 0, 0, 0] });
    expect(holdRows(h).at(-1)).toEqual(["Capacity", "Overloaded"]);
    expect(cargoSummary(h)).toMatch(/^HOLD OVERLOADED/);
  });

  it("describes special cargo", () => {
    const h = makeHong({
      shipCargo: { description: "party of 3", destination: NAGASAKI, illegal: false, size: 9, value: 1, due: 19 },
    });
    expect(cargoLines(h)).toEqual(["Party Of 3", "Bound for Nagasaki"]);
  });

  it("marks contraband", () => {
    const h = makeHong({
      shipCargo: { description: "crate of rifles", destination: NAGASAKI, illegal: true, size: 9, value: 1, due: 19 },
    });
    expect(cargoLines(h)).toEqual(["Crate Of Rifles", "Bound for Nagasaki", "Contraband!"]);
  });

  it("capitalizes each word, but not after an apostrophe", () => {
    const h = makeHong({
      shipCargo: { description: "consul's piano", destination: NAGASAKI, illegal: false, size: 9, value: 1, due: 19 },
    });
    expect(cargoLines(h)[0]).toBe("Consul's Piano");
  });
});
