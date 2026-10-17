import { describe, expect, it } from "vitest";
import { GENERAL, OPIUM, SHANGHAI, SILK } from "../../src/engine/constants";
import { ScriptedRng } from "../../src/engine/rng";
import { checkSafety } from "../../src/engine/safety";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("checkSafety", () => {
  it("is safe through the first year, including month 12", () => {
    const h = makeHong({ time: 12, location: SHANGHAI, cash: 50000, shipGoods: [0, 0, 0, 5], warehouseGoods: [1, 0, 0, 0] });
    const rng = new ScriptedRng();
    expect(play(checkSafety(h, rng)).transcript).toEqual([]);
  });

  it("starts in month 13", () => {
    const h = makeHong({ time: 13, location: SHANGHAI, shipGoods: [0, 0, 0, 5] });
    const p = play(checkSafety(h, new ScriptedRng([0, 0.5])));
    expect(p.transcript).toHaveLength(1);
  });

  it("lets police seize opium and fine you away from home", () => {
    const h = makeHong({ time: 13, location: SHANGHAI, cash: 1800, shipGoods: [0, 0, 0, 5] });
    // fine = trunc(1800 / 1.8 * 0.5) + 1
    const p = play(checkSafety(h, new ScriptedRng([0, 0.5])));
    expect(texts(p)).toEqual([
      "Bad joss! Harbor police have confiscated your opium and fined you an additional 501, Taipan!",
    ]);
    expect([h.cash, h.shipGoods[OPIUM]]).toEqual([1299, 0]);
  });

  it("seizes opium without a fine when you have no cash", () => {
    const h = makeHong({ time: 13, location: SHANGHAI, cash: 0, shipGoods: [0, 0, 0, 5] });
    const p = play(checkSafety(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual(["Bad joss! Harbor police have confiscated your opium, Taipan!"]);
    expect(h.shipGoods[OPIUM]).toBe(0);
  });

  it("keeps you safe from police and muggers in Hong Kong", () => {
    const h = makeHong({ time: 13, cash: 50000, shipGoods: [0, 0, 0, 5] });
    expect(play(checkSafety(h, new ScriptedRng())).transcript).toEqual([]);
  });

  it("can have you mugged when carrying lots of cash", () => {
    const h = makeHong({ time: 13, location: SHANGHAI, cash: 28000 });
    const p = play(checkSafety(h, new ScriptedRng([0, 0.5])));
    expect(texts(p)).toEqual(["Bad joss! Your bodyguards were beaten up and you were robbed of 10,000, Taipan!"]);
    expect(h.cash).toBe(18000);
  });

  it("can burn down part of the warehouse, leaving at least 1 of each good", () => {
    const h = makeHong({ time: 13, warehouseGoods: [100, 0, 3, 0] });
    // general: 100 / 2.0; silk: 3 / 2.29
    const p = play(checkSafety(h, new ScriptedRng([0, 0.7, 0.99])));
    expect(texts(p)).toEqual(["Messenger reports a large warehouse fire, Taipan!"]);
    expect(h.warehouseGoods[GENERAL]).toBe(50);
    expect(h.warehouseGoods[SILK]).toBe(1);
  });

  it("can't burn an empty warehouse", () => {
    const h = makeHong({ time: 13 });
    expect(play(checkSafety(h, new ScriptedRng())).transcript).toEqual([]);
  });
});
