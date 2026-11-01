import { describe, expect, it } from "vitest";
import { SHANGHAI, SILK } from "../../src/engine/constants";
import { ScriptedRng } from "../../src/engine/rng";
import { checkWarehouse, transfer } from "../../src/engine/warehouse";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("checkWarehouse", () => {
  it("does nothing away from home, even after a year", () => {
    // an empty script: any roll would throw
    const p = play(checkWarehouse(makeHong({ location: SHANGHAI, time: 13 }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("sometimes offers a bigger warehouse at home after a year", () => {
    const h = makeHong({ time: 13, cash: 5000 });
    // cost = randrange(3000) * trunc(10000 / 500) + 1000
    const p = play(checkWarehouse(h, new ScriptedRng([0, 100])), [true]);
    expect(texts(p)).toEqual([
      "Senhor Remedios has a new warehouse with an additional 5000 capacity for 3,000. Would you like to upgrade, Taipan?",
    ]);
    expect([h.cash, h.warehouseSize]).toEqual([2000, 15000]);
  });

  it("doesn't offer a warehouse you can't afford", () => {
    const p = play(checkWarehouse(makeHong({ time: 13, cash: 2999 }), new ScriptedRng([0, 100])));
    expect(p.transcript).toEqual([]);
  });
});

describe("the first warehouse", () => {
  const PITCH = (fee: string) => `Taipan, Senhor Jacinto Remedios, who owns much of the Hong Kong waterfront, offers to sell us a warehouse with room for 10,000 goods for ${fee}. We could keep there what our new ship can't sell. Shall we buy it?`;
  // a player with no warehouse and a bigger ship, home in Hong Kong
  const owner = (overrides = {}) => makeHong({ warehouseSize: 0, shipSize: 110, cash: 80000, debt: 0, time: 8, ...overrides });

  it("is offered once our ship is bigger than the first, for a tenth of our cash position", () => {
    const h = owner();
    // an empty script: the offer takes no rolls
    const p = play(checkWarehouse(h, new ScriptedRng()), [true]);
    expect(texts(p)).toEqual([PITCH("8,000"), "Very well, Taipan. Senhor Remedios has given us the keys to our warehouse."]);
    expect([h.cash, h.warehouseSize]).toEqual([72000, 10000]);
  });

  it("costs at least 5,000, and can be paid from the bank", () => {
    const h = owner({ cash: 1000, bank: 10000 });
    expect(texts(play(checkWarehouse(h, new ScriptedRng()), [true]))[0]).toBe(PITCH("5,000"));
    expect([h.cash, h.bank, h.warehouseSize]).toEqual([0, 6000, 10000]);
  });

  it.each([
    ["with the first ship", { shipSize: 60 }],
    ["away from Hong Kong", { location: SHANGHAI }],
    ["when we can't pay", { cash: 4999 }],
  ])("isn't offered %s", (_, overrides) => {
    expect(play(checkWarehouse(owner(overrides), new ScriptedRng())).transcript).toEqual([]);
  });

  it("is offered again six months after we decline", () => {
    const h = owner();
    expect(texts(play(checkWarehouse(h, new ScriptedRng()), [false]))).toEqual([
      PITCH("8,000"), "Very well, Taipan. Senhor Remedios says the offer will keep.",
    ]);
    expect([h.warehouseSize, h.warehouseOfferDue]).toEqual([0, 14]);
    Object.assign(h, { year: 1861, month: 1 }); // month 13
    expect(play(checkWarehouse(h, new ScriptedRng())).transcript).toEqual([]);
    h.month = 2; // month 14
    expect(texts(play(checkWarehouse(h, new ScriptedRng()), [true]))[0]).toBe(PITCH("8,000"));
  });

  it("comes before any bigger warehouse", () => {
    // no upgrade roll is made without a warehouse, even after a year
    expect(play(checkWarehouse(owner({ time: 13, shipSize: 60 }), new ScriptedRng())).transcript).toEqual([]);
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
    const h = makeHong({ shipGoods: [0, 0, 10, 0, 0], warehouseGoods: [5, 0, 0, 0, 0] });
    const p = play(transfer(h));
    expect(p.transcript[0]!.prompt).toMatchObject({ kind: "choose", disabled: [1, 3] });
    expect(() => p.game.answer(1)).toThrow();
  });

  it("asks which good when there's more than one to transfer", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0, 0], warehouseGoods: [5, 0, 0, 0, 0] });
    const p = play(transfer(h), [SILK, 0]);
    expect(p.transcript[0]!.prompt).toMatchObject({ kind: "choose", text: "What shall I transfer, Taipan?" });
    expect(texts(p)[1]).toBe("How much Silk should I send to the warehouse, Taipan?");
  });

  it("goes straight to the questions when there's only one good to transfer", () => {
    const h = makeHong({ warehouseGoods: [0, 0, 0, 7, 0] });
    const p = play(transfer(h), [7]);
    expect(texts(p)).toEqual(["How much Opium should I bring onto the ship, Taipan?"]);
    expect(h.shipGoods[3]).toBe(7);
  });

  it("moves goods to the warehouse, then offers to bring them back", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0, 0] });
    const p = play(transfer(h), [10, 4]);
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "number", text: "How much Silk should I send to the warehouse, Taipan?", max: 10 },
      { kind: "number", text: "How much Silk should I bring onto the ship, Taipan?", max: 10 },
    ]);
    expect(h.shipGoods[SILK]).toBe(4);
    expect(h.warehouseGoods[SILK]).toBe(6);
  });

  it("limits what can be sent to the space in the warehouse", () => {
    const h = makeHong({ shipGoods: [0, 0, 10, 0, 0], warehouseSize: 3 });
    const p = play(transfer(h), [4]);
    expect(p.transcript[0]?.prompt).toMatchObject({ max: 3 });
    expect(texts(p)[1]).toBe("You have no space in the warehouse, Taipan.");
  });

  it("refuses to move more than you have", () => {
    const h = makeHong({ shipGoods: [0, 0, 2, 0, 0], warehouseGoods: [0, 0, 1, 0, 0] });
    const p = play(transfer(h), [3, 2]);
    expect(texts(p)).toContain("You do not have that much in your ship's hold, Taipan.");
    expect(texts(p)).toContain("You do not have that much in your warehouse, Taipan.");
  });

  it("moves goods without a fee, both ways", () => {
    const h = makeHong({ shipGoods: [0, 0, 100, 0, 0] });
    play(transfer(h), [100, 50]);
    expect([h.warehouseGoods[SILK], h.shipGoods[SILK]]).toEqual([50, 50]);
  });
});
