import { describe, expect, it } from "vitest";
import { AT_SEA, GUN_SIZE, HONG_KONG, OPIUM, SILK } from "../../src/engine/constants";
import {
  advanceTime, currentTime, hasAny, isBroke, isOverloaded, netWorthOnHand, newHong,
  repairPercent, shipAvailable, totalGoods, warehouseAvailable, warehouseHas, warehouseUsed,
} from "../../src/engine/hong";
import { SeededRng } from "../../src/engine/rng";

const rng = () => new SeededRng(1);

describe("newHong", () => {
  it("starts with debt and no guns", () => {
    const h = newHong(rng(), false);
    expect(h).toMatchObject({
      name: "Rising Sun", year: 1860, month: 1, cash: 400, debt: 5000, bank: 0,
      shipSize: 60, shipGuns: 0, pirateChance: 10, warehouseSize: 10000,
      location: HONG_KONG, transfer: 0, shipCargo: null,
    });
    expect(h.shipGoods).toEqual([0, 0, 0, 0]);
    expect(h.warehouseGoods).toEqual([0, 0, 0, 0]);
    expect(h.prices).toHaveLength(4);
  });

  it("starts with guns and no debt", () => {
    const h = newHong(rng(), true);
    expect(h).toMatchObject({ cash: 0, debt: 0, shipGuns: 5, pirateChance: 7 });
  });

  it("does not share goods arrays between games", () => {
    const a = newHong(rng(), false);
    const b = newHong(rng(), false);
    a.shipGoods[0] = 5;
    expect(b.shipGoods[0]).toBe(0);
  });
});

describe("time", () => {
  it("counts months from 1 and rolls over the year", () => {
    const h = newHong(rng(), false);
    expect(currentTime(h)).toBe(1);
    for (let i = 0; i < 11; i++) advanceTime(h);
    expect([h.year, h.month, currentTime(h)]).toEqual([1860, 12, 12]);
    advanceTime(h);
    expect([h.year, h.month, currentTime(h)]).toEqual([1861, 1, 13]);
  });
});

describe("ship and warehouse", () => {
  it("computes hold space including special cargo", () => {
    const h = newHong(rng(), false);
    h.shipGoods = [10, 0, 5, 0, 0];
    expect(totalGoods(h)).toBe(15);
    expect(shipAvailable(h)).toBe(45);
    h.shipCargo = { description: "iron chest", destination: 2, illegal: false, size: 20, value: 1, due: 1 };
    expect(shipAvailable(h)).toBe(25);
    h.shipGoods[0] = 40;
    expect(isOverloaded(h)).toBe(true);
  });

  it("reports guns as reduced capacity via shipSize, as the Python does", () => {
    // Buying a gun lowers shipSize by GUN_SIZE; losing one in battle raises it.
    const h = newHong(rng(), true);
    h.shipSize -= GUN_SIZE;
    expect(shipAvailable(h)).toBe(50);
  });

  it("computes warehouse usage", () => {
    const h = newHong(rng(), false);
    h.warehouseGoods[SILK] = 300;
    expect(warehouseUsed(h)).toBe(300);
    expect(warehouseAvailable(h)).toBe(9700);
    expect(warehouseHas(h, SILK)).toBe(true);
    expect(warehouseHas(h, OPIUM)).toBe(false);
  });

  it("computes repair percent", () => {
    const h = newHong(rng(), false);
    expect(repairPercent(h)).toBe(100);
    h.shipDamage = 15;
    expect(repairPercent(h)).toBe(75);
    h.shipDamage = 7; // 11.67% damage truncates to 11
    expect(repairPercent(h)).toBe(89);
  });
});

describe("wealth", () => {
  it("values goods aboard at local prices", () => {
    const h = newHong(rng(), false);
    h.prices = [10, 100, 1000, 10000];
    h.shipGoods = [1, 0, 2, 0];
    expect(netWorthOnHand(h)).toBe(400 + 10 + 2000);
  });

  it("is broke only with no cash and no goods anywhere", () => {
    const h = newHong(rng(), true);
    h.location = AT_SEA;
    expect(isBroke(h)).toBe(true);
    h.warehouseGoods[OPIUM] = 1;
    expect(isBroke(h)).toBe(false);
    expect(hasAny(h, OPIUM)).toBe(true);
    expect(hasAny(h, SILK)).toBe(false);
  });
});
