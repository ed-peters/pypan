import { describe, expect, it } from "vitest";
import { HONG_KONG, NAGASAKI, SHANGHAI } from "../../src/engine/constants";
import { CARGO_DESCRIPTIONS, checkCargo, latePay, offerOdds, randomCargo } from "../../src/engine/cargo";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// description = "party of 3"; unit = 35 * 10^0; destination rolls Hong Kong
// (rejected) then Nagasaki; size = trunc(60 * (5 + 10) / 100) = 9; minimum = 35 * 9 + 7;
// rate = 0.15 * (0.8 + 0.4 * 0.75) = 0.165
const CARGO_ROLLS = [2, 0, HONG_KONG, NAGASAKI, 10, 7, 0.75];
const NO_JOSS = 1;
const JOSS = 0;

// money = 50,000, so value = trunc(0.165 * 50000 * 9 / 60) = 1237
const MIDDLING = { cash: 30000, bank: 25000, debt: 5000 };

const cargo = (due: number) =>
  ({ description: "iron chest", destination: NAGASAKI, illegal: false, size: 9, value: 5000, due });

describe("checkCargo", () => {
  it("doesn't start until month 18", () => {
    const p = play(checkCargo(makeHong({ time: 17 }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("offers a consignment due next month", () => {
    const h = makeHong({ time: 18, ...MIDDLING });
    const p = play(checkCargo(h, new ScriptedRng([0, ...CARGO_ROLLS, NO_JOSS])), [true]);
    expect(texts(p)).toEqual([
      "Should I accept a special consignment of a party of 3 to transport to Nagasaki for 1,237, Taipan? (It will take up 9 space in the ship's hold.)",
    ]);
    expect(h.shipCargo).toEqual({
      description: "party of 3", destination: NAGASAKI, illegal: false, size: 9, value: 1237, due: 19,
    });
  });

  it("triples the value on good joss", () => {
    const h = makeHong({ time: 18, ...MIDDLING });
    const p = play(checkCargo(h, new ScriptedRng([0, ...CARGO_ROLLS, JOSS])), [true]);
    expect(texts(p)[0]).toMatch(/^Good joss!! Should I accept .* for 3,711, Taipan\?/);
    expect(h.shipCargo?.value).toBe(3711);
  });

  it("can be declined", () => {
    const h = makeHong({ time: 18, ...MIDDLING });
    play(checkCargo(h, new ScriptedRng([0, ...CARGO_ROLLS, NO_JOSS])), [false]);
    expect(h.shipCargo).toBeNull();
  });

  it("delivers cargo at its destination, then may offer another", () => {
    const h = makeHong({ time: 19, location: NAGASAKI, shipCargo: cargo(19) });
    const p = play(checkCargo(h, new ScriptedRng([1])));
    expect(texts(p)).toEqual(["We have successfully delivered the iron chest that was bound for Nagasaki, Taipan."]);
    expect([h.cash, h.shipCargo]).toEqual([5400, null]);
  });

  it("pays 20% less for each month late", () => {
    const h = makeHong({ time: 21, location: NAGASAKI, shipCargo: cargo(19) });
    const p = play(checkCargo(h, new ScriptedRng([1])));
    expect(texts(p)).toEqual([
      "We have delivered the iron chest that was bound for Nagasaki, Taipan, but 2 months late, so we were paid only 3,000.",
    ]);
    expect([h.cash, h.shipCargo]).toEqual([3400, null]);
  });

  it("reminds you of the commitment at other ports", () => {
    const h = makeHong({ time: 20, location: SHANGHAI, shipCargo: cargo(19) });
    const p = play(checkCargo(h, new ScriptedRng()));
    expect(texts(p)).toEqual(["Taipan, we are still committed to deliver the iron chest to Nagasaki."]);
    expect(h.shipCargo).not.toBeNull();
  });

  it("offloads the cargo after 5 months late, then may offer another", () => {
    const h = makeHong({ time: 24, location: SHANGHAI, shipCargo: cargo(19) });
    const p = play(checkCargo(h, new ScriptedRng([1])));
    expect(texts(p)).toEqual([
      "Taipan, we have missed the delivery window, and offloaded the iron chest that was bound for Nagasaki.",
    ]);
    expect([h.cash, h.shipCargo]).toEqual([400, null]);
  });

  it("carries only one consignment at a time", () => {
    const h = makeHong({ time: 19, location: SHANGHAI, shipCargo: cargo(19) });
    const p = play(checkCargo(h, new ScriptedRng()));
    expect(texts(p)).toEqual(["Taipan, we are still committed to deliver the iron chest to Nagasaki."]);
  });

  it("offers nothing to the rich", () => {
    const p = play(checkCargo(makeHong({ time: 18, cash: 100001, debt: 0 }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });
});

describe("offerOdds", () => {
  it("counts cash and bank less debt", () => {
    expect(offerOdds(makeHong({ cash: 1, debt: 0 }))).toBe(20);
    expect(offerOdds(makeHong({ cash: 50000, bank: 50000, debt: 0 }))).toBe(20);
    expect(offerOdds(makeHong({ cash: 50000, bank: 50001, debt: 0 }))).toBeNull();
    expect(offerOdds(makeHong({ cash: 200000, debt: 100000 }))).toBe(20);
  });

  it("is a life line for the broke", () => {
    expect(offerOdds(makeHong({ cash: 0, debt: 0 }))).toBe(3);
    expect(offerOdds(makeHong({ cash: 400, debt: 5000 }))).toBe(3);
  });
});

describe("latePay", () => {
  it("drops 20% of the value per month", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => latePay(cargo(0), n))).toEqual([5000, 4000, 3000, 2000, 1000, 0, 0]);
  });
});

describe("randomCargo", () => {
  it("is 5-30% of the ship's size and never bound for here", () => {
    const h = makeHong();
    for (let i = 0; i < 26; i++) {
      const c = randomCargo(h, new ScriptedRng([0, 0, NAGASAKI, i, 0, 0]));
      expect(c.size).toBe(Math.trunc(60 * (5 + i) / 100));
      expect(c.destination).toBe(NAGASAKI);
    }
  });

  it("has no jade statues, now jade isn't traded", () => {
    expect(CARGO_DESCRIPTIONS).not.toContain("jade statue");
    const c = randomCargo(makeHong(), new ScriptedRng([1, 0, NAGASAKI, 0, 0, 0]));
    expect(c.description).toBe("iron chest");
  });

  it("scales with money and share of the hold, +/- 20%", () => {
    const h = makeHong({ cash: 100000, debt: 0 });
    // size = trunc(60 * 30 / 100) = 18, a 30% share: 15% * 100,000 * 30% = 4,500
    const value = (f: number) => randomCargo(h, new ScriptedRng([0, 0, NAGASAKI, 25, 0, f])).value;
    expect(value(0.5)).toBe(4500);
    expect(value(0)).toBe(3600);
    expect(value(0.999)).toBeGreaterThan(5390);
  });

  it("never pays less than the old per-space fee", () => {
    // unit = 3,500, size = 9: 31,500 + 7, whatever the player's money
    const c = randomCargo(makeHong({ cash: 400, debt: 5000 }), new ScriptedRng([3, 2, NAGASAKI, 10, 7, 0.5]));
    expect(c.value).toBe(31507);
  });
});
