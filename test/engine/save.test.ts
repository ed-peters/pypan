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
      shipSize: 60, pirateChance: 7, shipCargo: null, location: 0,
    });
    // the fifth price was jade's: porcelain's now, but hidden until we buy in
    expect(h.prices).toEqual([6, 170, 2200, 26000, 200000]);
    expect(h.porcelain).toBe(false);
  });

  it("writes the same keys as the Python version", () => {
    const h = fromSave(pythonSave);
    expect(Object.keys(toSave(h)).sort()).toEqual(Object.keys(pythonSave).sort());
    expect(toSave(h)).toEqual(pythonSave);
  });

  it("sells the jade in older saves for 120,000 a unit", () => {
    const h = fromSave({ ...pythonSave, cash: 400, ship_goods: [1, 2, 3, 4, 2], warehouse_goods: [0, 0, 0, 5, 1] });
    expect([h.cash, h.shipGoods, h.warehouseGoods]).toEqual([400 + 3 * 120000, [1, 2, 3, 4, 0], [0, 0, 0, 5, 0]]);
  });

  it("loads four-good saves (before porcelain), pricing porcelain at its usual price", () => {
    const four = (xs: number[]) => xs.slice(0, 4);
    const h = fromSave({
      ...pythonSave, location: 5, ship_goods: [1, 2, 3, 4], warehouse_goods: four(pythonSave.warehouse_goods), prices: four(pythonSave.prices),
    });
    // Singapore: level 16/2 = 8, times 2, times 10000
    expect([h.shipGoods, h.warehouseGoods, h.prices]).toEqual([[1, 2, 3, 4, 0], [0, 0, 0, 0, 0], [6, 170, 2200, 26000, 160000]]);
    expect(h.cash).toBe(0);
  });

  it("round-trips the porcelain share and porcelain aboard, written only once we've bought in", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).not.toHaveProperty("porcelain");
    h.porcelain = true;
    h.shipGoods = [0, 0, 0, 0, 7];
    h.warehouseGoods = [0, 0, 0, 0, 3];
    expect(toSave(h)).toMatchObject({ porcelain: true, ship_goods: [0, 0, 0, 0, 7] });
    expect(fromSaveString(toSaveString(h))).toEqual(h);
  });

  it("round-trips a share in the jade mine, written only when held", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).not.toHaveProperty("mine");
    h.mine = { value: 1500000, due: 31 };
    expect(toSave(h)).toMatchObject({ mine: { value: 1500000, due: 31 } });
    expect(fromSaveString(toSaveString(h))).toEqual(h);
    expect(() => fromSave({ ...pythonSave, mine: { value: -1, due: 3 } })).toThrow(SaveFormatError);
  });

  it("round-trips through a string, including special cargo", () => {
    const h = newHong(new SeededRng(4), false);
    h.shipGoods = [1, 2, 3, 4, 0];
    h.shipCargo = { description: "party of 3", destination: 5, illegal: false, size: 9, value: 3171, due: 20 };
    h.location = 5;
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

  it("writes pypan.py's transfer fee from the port, and ignores it (and the banker) on loading", () => {
    const h = newHong(new SeededRng(4), false);
    expect(toSave(h)).toMatchObject({ transfer: 0 });
    h.location = 5;
    expect(toSave(h)).toMatchObject({ transfer: -1 });
    const loaded = fromSave({ ...pythonSave, location: 5, transfer: 7, banker: true });
    expect(loaded).not.toHaveProperty("transfer");
    expect(loaded).not.toHaveProperty("banker");
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
    ["four goods with porcelain", JSON.stringify({ ...pythonSave, porcelain: true, ship_goods: [0, 0, 0, 0] })],
    ["bad porcelain flag", JSON.stringify({ ...pythonSave, porcelain: "yes" })],
    ["bad cargo", JSON.stringify({ ...pythonSave, ship_cargo: { description: "x" } })],
    ["bad expedition", JSON.stringify({ ...pythonSave, expedition: { port: 5 } })],
    ["negative stake", JSON.stringify({ ...pythonSave, expedition: { port: 5, resolves: 28, stake: -1 } })],
    ["bad jade offers", JSON.stringify({ ...pythonSave, jade_offers: -1 })],
  ])("rejects a save with %s", (_, json) => {
    expect(() => fromSaveString(json)).toThrow(SaveFormatError);
  });
});
