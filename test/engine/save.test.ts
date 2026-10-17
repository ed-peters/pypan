import { describe, expect, it } from "vitest";
import { newHong } from "../../src/engine/hong";
import { SeededRng } from "../../src/engine/rng";
import {
  SaveFormatError, fromSave, fromSaveString, toSave, toSaveString,
} from "../../src/engine/save";
import pythonSave from "../fixtures/python-save.json";

describe("save format", () => {
  it("loads a save written by the Python version", () => {
    const h = fromSave(pythonSave);
    expect(h).toMatchObject({
      name: "Rising Sun", year: 1860, month: 1, cash: 0, debt: 0, shipGuns: 5,
      shipSize: 60, pirateChance: 7, shipCargo: null, location: 0, transfer: 0,
    });
    // jade's price is dropped with jade (pypan-86)
    expect(h.prices).toEqual([6, 170, 2200, 26000]);
  });

  it("writes the same keys as the Python version, with four goods", () => {
    const h = fromSave(pythonSave);
    expect(Object.keys(toSave(h)).sort()).toEqual(Object.keys(pythonSave).sort());
    const four = (xs: number[]) => xs.slice(0, 4);
    expect(toSave(h)).toEqual({
      ...pythonSave,
      ship_goods: four(pythonSave.ship_goods),
      warehouse_goods: four(pythonSave.warehouse_goods),
      prices: four(pythonSave.prices),
    });
  });

  it("sells the jade in older saves for 120,000 a unit", () => {
    const h = fromSave({ ...pythonSave, cash: 400, ship_goods: [1, 2, 3, 4, 2], warehouse_goods: [0, 0, 0, 5, 1] });
    expect([h.cash, h.shipGoods, h.warehouseGoods]).toEqual([400 + 3 * 120000, [1, 2, 3, 4], [0, 0, 0, 5]]);
  });

  it("round-trips through a string, including special cargo", () => {
    const h = newHong(new SeededRng(4), false);
    h.shipGoods = [1, 2, 3, 4];
    h.shipCargo = { description: "party of 3", destination: 5, illegal: false, size: 9, value: 3171, due: 20 };
    h.transfer = -1;
    expect(fromSaveString(toSaveString(h))).toEqual(h);
  });

  it("makes pypan.py consignments due on the next arrival", () => {
    const cargo = { description: "party of 3", destination: 5, illegal: false, size: 9, value: 3171 };
    const h = fromSave({ ...pythonSave, year: 1861, month: 6, ship_cargo: cargo });
    expect(h.shipCargo).toEqual({ ...cargo, due: 19 });
  });

  it("loads Python saves with no expedition", () => {
    const h = fromSave(pythonSave);
    expect([h.expedition, h.expeditionFailed, h.jadeOffers]).toEqual([null, false, 0]);
  });

  it("round-trips the jade expedition", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).not.toHaveProperty("expedition");
    expect(toSave(h)).not.toHaveProperty("expedition_failed");
    expect(toSave(h)).not.toHaveProperty("jade_offers");
    h.expedition = { port: 5, resolves: 28, stake: 1500000 };
    h.expeditionFailed = true;
    h.jadeOffers = 2;
    expect(fromSaveString(toSaveString(h))).toEqual(h);
  });

  it("loads older expeditions, and ignores jade on the market and cheap jade", () => {
    const old = (invested: boolean) => fromSave({
      ...pythonSave, jade: false, jade_deal: { port: 6, until: 31 }, expedition: { port: 5, resolves: 28, invested },
    });
    expect(old(true).expedition).toEqual({ port: 5, resolves: 28, stake: 1000000 });
    expect(old(false).expedition).toEqual({ port: 5, resolves: 28, stake: 0 });
    expect(toSave(old(true))).not.toHaveProperty("jade");
    expect(toSave(old(true))).not.toHaveProperty("jade_deal");
  });

  it("round-trips the bank's representative", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).not.toHaveProperty("banker");
    h.banker = true;
    expect(fromSaveString(toSaveString(h)).banker).toBe(true);
  });

  it("round-trips Li Yuen's grudge, written only when he holds one", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).not.toHaveProperty("grudge");
    h.grudge = 2;
    expect(fromSaveString(toSaveString(h)).grudge).toBe(2);
    expect(() => fromSave({ ...toSave(h), grudge: 4 })).toThrow(SaveFormatError);
  });

  it("copies arrays rather than sharing them", () => {
    const h = newHong(new SeededRng(4), false);
    const back = fromSave(toSave(h));
    back.shipGoods[0] = 99;
    expect(h.shipGoods[0]).toBe(0);
  });

  it("ignores unknown keys", () => {
    expect(() => fromSave({ ...pythonSave, extra: 1 })).not.toThrow();
  });

  it.each([
    ["not JSON", "{oops"],
    ["not an object", "[]"],
    ["missing field", JSON.stringify({ ...pythonSave, cash: undefined })],
    ["wrong type", JSON.stringify({ ...pythonSave, threatened: "no" })],
    ["fractional number", JSON.stringify({ ...pythonSave, cash: 1.5 })],
    ["bad month", JSON.stringify({ ...pythonSave, month: 13 })],
    ["short goods list", JSON.stringify({ ...pythonSave, ship_goods: [0, 0] })],
    ["bad cargo", JSON.stringify({ ...pythonSave, ship_cargo: { description: "x" } })],
    ["bad expedition", JSON.stringify({ ...pythonSave, expedition: { port: 5 } })],
    ["negative stake", JSON.stringify({ ...pythonSave, expedition: { port: 5, resolves: 28, stake: -1 } })],
    ["bad jade offers", JSON.stringify({ ...pythonSave, jade_offers: -1 })],
  ])("rejects a save with %s", (_, json) => {
    expect(() => fromSaveString(json)).toThrow(SaveFormatError);
  });
});
