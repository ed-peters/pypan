import { describe, expect, it } from "vitest";
import { HONG_KONG, NAGASAKI } from "../../src/engine/constants";
import { checkCargo, randomCargo } from "../../src/engine/cargo";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// description = "party of 3"; unit = 35 * 10^1; destination rolls Hong Kong
// (rejected) then Nagasaki; size = trunc(60 * (5 + 10) / 100) = 9; value = 350 * 9 + 7
const CARGO_ROLLS = [3, 1, HONG_KONG, NAGASAKI, 10, 7];

describe("checkCargo", () => {
  it("doesn't start until month 18", () => {
    const p = play(checkCargo(makeHong({ time: 17 }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("offers a consignment", () => {
    const h = makeHong({ time: 18 });
    const p = play(checkCargo(h, new ScriptedRng([0, ...CARGO_ROLLS])), [true]);
    expect(texts(p)).toEqual([
      "Should I accept a special consignment of a party of 3 to transport to Nagasaki for 3,157, Taipan? (It will take up 9 space in the ship's hold.)",
    ]);
    expect(h.shipCargo).toEqual({
      description: "party of 3", destination: NAGASAKI, illegal: false, size: 9, value: 3157,
    });
  });

  it("can be declined", () => {
    const h = makeHong({ time: 18 });
    play(checkCargo(h, new ScriptedRng([0, ...CARGO_ROLLS])), [false]);
    expect(h.shipCargo).toBeNull();
  });

  it("delivers cargo at its destination, then may offer another", () => {
    const cargo = { description: "iron chest", destination: NAGASAKI, illegal: false, size: 9, value: 5000 };
    const h = makeHong({ time: 18, location: NAGASAKI, shipCargo: cargo });
    const p = play(checkCargo(h, new ScriptedRng([1])));
    expect(texts(p)).toEqual(["We have successfully delivered the iron chest that was bound for Nagasaki, Taipan."]);
    expect([h.cash, h.shipCargo]).toEqual([5400, null]);
  });

  it("carries only one consignment at a time", () => {
    const cargo = { description: "iron chest", destination: NAGASAKI, illegal: false, size: 9, value: 5000 };
    const rng = new ScriptedRng();
    const p = play(checkCargo(makeHong({ time: 18, shipCargo: cargo }), rng));
    expect(p.transcript).toEqual([]);
  });
});

describe("randomCargo", () => {
  it("is 5-28% of the ship's size and never bound for here", () => {
    const h = makeHong();
    for (let i = 0; i < 24; i++) {
      const c = randomCargo(h, new ScriptedRng([0, 0, NAGASAKI, i, 0]));
      expect(c.size).toBe(Math.trunc(60 * (5 + i) / 100));
      expect(c.destination).toBe(NAGASAKI);
    }
  });
});
