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
    expect(h.prices).toEqual([6, 170, 2200, 26000, 200000]);
  });

  it("writes the same keys as the Python version", () => {
    const h = fromSave(pythonSave);
    expect(Object.keys(toSave(h)).sort()).toEqual(Object.keys(pythonSave).sort());
    expect(toSave(h)).toEqual(pythonSave);
  });

  it("round-trips through a string, including special cargo", () => {
    const h = newHong(new SeededRng(4), false);
    h.shipGoods = [1, 2, 3, 4, 5];
    h.shipCargo = { description: "party of 3", destination: 5, illegal: false, size: 9, value: 3171, due: 20 };
    h.transfer = -1;
    expect(fromSaveString(toSaveString(h))).toEqual(h);
  });

  it("makes pypan.py consignments due on the next arrival", () => {
    const cargo = { description: "party of 3", destination: 5, illegal: false, size: 9, value: 3171 };
    const h = fromSave({ ...pythonSave, year: 1861, month: 6, ship_cargo: cargo });
    expect(h.shipCargo).toEqual({ ...cargo, due: 19 });
  });

  it("loads Python saves with jade on the market", () => {
    const h = fromSave(pythonSave);
    expect([h.jade, h.expedition, h.expeditionFailed, h.jadeDeal]).toEqual([true, null, false, null]);
  });

  it("round-trips the jade expedition", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).toMatchObject({ jade: false });
    expect(toSave(h)).not.toHaveProperty("expedition");
    expect(toSave(h)).not.toHaveProperty("jade_deal");
    expect(toSave(h)).not.toHaveProperty("expedition_failed");
    h.expedition = { port: 5, resolves: 28, invested: true };
    h.expeditionFailed = true;
    h.jadeDeal = { port: 6, until: 31 };
    expect(fromSaveString(toSaveString(h))).toEqual(h);
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
    ["bad jade flag", JSON.stringify({ ...pythonSave, jade: "no" })],
    ["bad expedition", JSON.stringify({ ...pythonSave, expedition: { port: 5 } })],
    ["bad jade deal", JSON.stringify({ ...pythonSave, jade_deal: { port: 99, until: 3 } })],
  ])("rejects a save with %s", (_, json) => {
    expect(() => fromSaveString(json)).toThrow(SaveFormatError);
  });
});
