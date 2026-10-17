import { describe, expect, it } from "vitest";
import { SHANGHAI, SILK } from "../../src/engine/constants";
import { ScriptedRng } from "../../src/engine/rng";
import { checkWarehouse, transfer } from "../../src/engine/warehouse";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("checkWarehouse", () => {
  it("makes transfers free at home", () => {
    const h = makeHong({ transfer: -1 });
    play(checkWarehouse(h, new ScriptedRng()));
    expect(h.transfer).toBe(0);
  });

  it("makes transfers unavailable away from home in the first year", () => {
    const h = makeHong({ location: SHANGHAI, time: 12 });
    play(checkWarehouse(h, new ScriptedRng()));
    expect(h.transfer).toBe(-1);
  });

  it("sometimes has a lorcha away from home after a year", () => {
    const h = makeHong({ location: SHANGHAI, time: 13 });
    const p = play(checkWarehouse(h, new ScriptedRng([0, 2])));
    expect(texts(p)).toEqual([
      "Good joss! A lorcha is waiting nearby and can transfer goods with your warehouse in Hong Kong for 7%, Taipan.",
    ]);
    expect(h.transfer).toBe(7);
  });

  it("usually has no lorcha", () => {
    const h = makeHong({ location: SHANGHAI, time: 13 });
    play(checkWarehouse(h, new ScriptedRng([1])));
    expect(h.transfer).toBe(-1);
  });

  it("sometimes offers a bigger warehouse at home after a year", () => {
    const h = makeHong({ time: 13, cash: 5000 });
    // cost = randrange(3000) * trunc(10000 / 500) + 1000
    const p = play(checkWarehouse(h, new ScriptedRng([0, 100])), [true]);
    expect(texts(p)).toEqual([
      "A new warehouse with an additional 5000 capacity is available for 3,000. Would like to upgrade, Taipan?",
    ]);
    expect([h.cash, h.warehouseSize]).toEqual([2000, 15000]);
  });

  it("doesn't offer a warehouse you can't afford", () => {
    const p = play(checkWarehouse(makeHong({ time: 13, cash: 2999 }), new ScriptedRng([0, 100])));
    expect(p.transcript).toEqual([]);
  });
});

describe("transfer", () => {
  it("offers the four goods", () => {
    const p = play(transfer(makeHong()));
    expect(p.transcript[0]!.prompt).toMatchObject({ options: ["General", "Arms", "Silk", "Opium"] });
  });

  it("can be cancelled", () => {
    expect(play(transfer(makeHong()), [null]).game.done).toBe(true);
  });

  it("disables goods you have none of, aboard or in the warehouse", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0], warehouseGoods: [5, 0, 0, 0] });
    const p = play(transfer(h));
    expect(p.transcript[0]!.prompt).toMatchObject({ kind: "choose", disabled: [1, 3] });
    expect(() => p.game.answer(1)).toThrow();
  });

  it("asks which good when there's more than one to transfer", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0], warehouseGoods: [5, 0, 0, 0] });
    const p = play(transfer(h), [SILK, 0]);
    expect(p.transcript[0]!.prompt).toMatchObject({ kind: "choose", text: "What shall I transfer, Taipan?" });
    expect(texts(p)[1]).toBe("How much Silk should I send to the warehouse, Taipan?");
  });

  it("goes straight to the questions when there's only one good to transfer", () => {
    const h = makeHong({ warehouseGoods: [0, 0, 0, 7] });
    const p = play(transfer(h), [7]);
    expect(texts(p)).toEqual(["How much Opium should I bring onto the ship, Taipan?"]);
    expect(h.shipGoods[3]).toBe(7);
  });

  it("moves goods to the warehouse, then offers to bring them back", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0] });
    const p = play(transfer(h), [10, 4]);
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "number", text: "How much Silk should I send to the warehouse, Taipan?", max: 10 },
      { kind: "number", text: "How much Silk should I bring onto the ship, Taipan?", max: 10 },
    ]);
    expect(h.shipGoods[SILK]).toBe(4);
    expect(h.warehouseGoods[SILK]).toBe(6);
  });

  it("limits what can be sent to the space in the warehouse", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0], warehouseSize: 3 });
    const p = play(transfer(h), [4]);
    expect(p.transcript[0]?.prompt).toMatchObject({ max: 3 });
    expect(texts(p)[1]).toBe("You have no space in the warehouse, Taipan.");
  });

  it("refuses to move more than you have", () => {
    const h = makeHong({ shipGoods: [0, 0, 2, 0], warehouseGoods: [0, 0, 1, 0] });
    const p = play(transfer(h), [3, 2]);
    expect(texts(p)).toContain("You do not have that much in your ship's hold, Taipan.");
    expect(texts(p)).toContain("You do not have that much in your warehouse, Taipan.");
  });

  it("charges the lorcha's fee on goods in transit, both ways", () => {
    const h = makeHong({ location: SHANGHAI, transfer: 7, shipGoods: [0, 0, 100, 0] });
    play(transfer(h), [100, 50]);
    // 100 sent, 93 arrive; 50 brought back, 47 arrive
    expect(h.warehouseGoods[SILK]).toBe(43);
    expect(h.shipGoods[SILK]).toBe(47);
  });
});
