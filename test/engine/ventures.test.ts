import { describe, expect, it } from "vitest";
import { ARMS, GENERAL, HONG_KONG, MANILA, NAGASAKI, SHANGHAI } from "../../src/engine/constants";
import { marketGoods } from "../../src/engine/hong";
import { ScriptedRng } from "../../src/engine/rng";
import { finalPosition } from "../../src/engine/score";
import { checkVentures, sharesValue } from "../../src/engine/ventures";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("the jade mine", () => {
  // a 1,000,000 share, due this month; rolls: no seizure, no rich vein, then the return
  const owner = (overrides = {}) =>
    makeHong({ time: 30, location: NAGASAKI, bank: 500000, debt: 0, mine: { value: 1000000, due: 30 }, ...overrides });
  const QUARTER = [1, 1];
  // a return of -10% + 30% x f
  const settle = (h: ReturnType<typeof owner>, f: number, answers: unknown[] = []) =>
    play(checkVentures(h, new ScriptedRng([...QUARTER, f])), answers);

  it("waits for its quarter", () => {
    const h = owner({ time: 29 });
    expect(play(checkVentures(h, new ScriptedRng())).transcript).toEqual([]);
  });

  it("pays a good quarter into the bank, and settles again in three months", () => {
    const h = owner();
    // 2 + 3 x 0.5: +5%
    const p = settle(h, 0.5);
    expect(texts(p)).toEqual(["Our share in the jade mine has paid us 50,000 this quarter, Taipan. It has been deposited in the bank."]);
    expect([h.bank, h.mine]).toEqual([550000, { value: 1000000, due: 33 }]);
  });

  it("returns at most +20%", () => {
    const h = owner();
    settle(h, 0.9999);
    expect(h.bank).toBe(700000);
  });

  it("can break even", () => {
    const h = owner();
    expect(texts(settle(h, 1 / 3))).toEqual(["Our share in the jade mine has broken even this quarter, Taipan."]);
    expect(h.bank).toBe(500000);
  });

  it("calls for funds after a bad quarter, paid from the bank, then cash", () => {
    const h = owner({ bank: 60000, cash: 50000 });
    // -10%: 100,000
    const p = settle(h, 0, [true]);
    expect(texts(p)).toEqual([
      "Taipan, it has been a bad quarter for the jade mine, and the backers must put in 100,000 more. Shall we pay our part?",
    ]);
    expect([h.bank, h.cash, h.mine?.value]).toEqual([0, 10000, 1000000]);
  });

  it("takes half our share if we won't pay", () => {
    const h = owner();
    const p = settle(h, 0, [false]);
    expect(texts(p).at(-1)).toBe("The other backers have taken half of our share in the jade mine, Taipan. It is now worth 500,000.");
    expect([h.bank, h.mine]).toEqual([500000, { value: 500000, due: 33 }]);
  });

  it("lets Wu make up a call we can't cover", () => {
    const h = owner({ bank: 30000, cash: 20000 });
    settle(h, 0, [true, true]);
    expect([h.bank, h.cash, h.debt, h.mine?.value]).toEqual([0, 0, 50000, 1000000]);
  });

  it("takes half our share if Wu won't help either, leaving our money alone", () => {
    const h = owner({ bank: 30000, cash: 20000 });
    settle(h, 0, [true, false]);
    expect([h.bank, h.cash, h.debt, h.mine?.value]).toEqual([30000, 20000, 0, 500000]);
  });

  it("can be seized by rebels, 1-in-80 quarters", () => {
    const h = owner();
    const p = play(checkVentures(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual(["Bad joss, Taipan! Rebels have seized the jade mine, and our share in it, worth 1,000,000, is lost."]);
    expect([h.mine, h.bank]).toEqual([null, 500000]);
  });

  it("can strike a rich vein, 1-in-40 quarters, paying twice the share", () => {
    const h = owner();
    const p = play(checkVentures(h, new ScriptedRng([1, 0])));
    expect(texts(p)).toEqual(["Taipan!! The jade mine has struck a rich vein! Our share of 2,000,000 has been deposited in the bank."]);
    expect([h.bank, h.mine]).toEqual([2500000, { value: 1000000, due: 33 }]);
  });
});

describe("the Nanking godowns", () => {
  // month 13 in Shanghai, out of debt and worth 140,000
  const trader = (overrides = {}) =>
    makeHong({ time: 13, location: SHANGHAI, cash: 40000, bank: 100000, debt: 0, ...overrides });
  const PITCH = "Taipan, a merchant of Nanking offers us a share in his cargo godowns for 14,000. We would leave the general cargo trade to him. Shall we buy in?";

  it("are offered in Shanghai for a tenth of our cash position, and end our general cargo trade", () => {
    const h = trader({ shipGoods: [10, 0, 0, 0, 0], warehouseGoods: [5, 0, 0, 0, 0] });
    const p = play(checkVentures(h, new ScriptedRng([0])), [true]);
    // our 15 general cargo go in at Hong Kong's usual price, 10
    expect(texts(p)).toEqual([
      PITCH,
      "Very well, Taipan. Our share in the Nanking godowns is worth 14,150, and will settle with us every three months. Our 15 general cargo has gone into them too.",
    ]);
    expect([h.cash, h.bank, h.godowns, h.godownsBought]).toEqual([26000, 100000, { value: 14150, due: 16 }, true]);
    expect([h.shipGoods[GENERAL], h.warehouseGoods[GENERAL]]).toEqual([0, 0]);
    expect(marketGoods(h)).not.toContain(GENERAL);
  });

  it("can be declined, and are offered again", () => {
    const h = trader();
    expect(texts(play(checkVentures(h, new ScriptedRng([0])), [false]))).toEqual([PITCH]);
    expect([h.godowns, h.godownsBought, h.cash]).toEqual([null, false, 40000]);
    expect(marketGoods(h)).toContain(GENERAL);
    expect(texts(play(checkVentures(h, new ScriptedRng([0])), [false]))).toEqual([PITCH]);
  });

  it.each([
    ["in the first year", { time: 12 }],
    ["outside Shanghai", { location: HONG_KONG }],
    ["while we hold a share worth the fee or more", { godowns: { value: 35000, due: 99 }, godownsBought: true }],
    ["to a player worth 10,000 or less", { cash: 10000, bank: 0 }],
  ])("aren't offered %s", (_, overrides) => {
    // an empty script: any roll would throw
    expect(play(checkVentures(trader(overrides), new ScriptedRng())).transcript).toEqual([]);
  });

  it("are offered only 1-in-3", () => {
    expect(play(checkVentures(trader(), new ScriptedRng([1]))).transcript).toEqual([]);
  });

  it("offer to add to a share that has fallen behind our fortune", () => {
    const h = trader({ godowns: { value: 13000, due: 99 }, godownsBought: true });
    const p = play(checkVentures(h, new ScriptedRng([0])), [true]);
    expect(texts(p)).toEqual([
      "Taipan, the merchant of Nanking is building more godowns, and offers to add 14,000 to our share. Shall we?",
      "Very well, Taipan. Our share is now worth 27,000.",
    ]);
    expect([h.cash, h.godowns]).toEqual([26000, { value: 27000, due: 99 }]);
  });

  it("can be seized by a rival hong, and offered again later; general cargo stays gone", () => {
    const h = trader({ location: NAGASAKI, time: 16, godowns: { value: 35000, due: 16 }, godownsBought: true });
    const p = play(checkVentures(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual(["Bad joss, Taipan! A rival hong has seized the Nanking godowns, and our share in them, worth 35,000, is lost."]);
    expect([h.godowns, h.godownsBought]).toEqual([null, true]);
    expect(marketGoods(h)).not.toContain(GENERAL);
    h.location = SHANGHAI;
    const again = play(checkVentures(h, new ScriptedRng([0])), [false]);
    expect(texts(again)).toEqual([
      "Taipan, the merchant of Nanking has new godowns, and offers us a share again for 14,000. Shall we buy back in?",
    ]);
  });

  it("return -5% to +10% a quarter", () => {
    const owner = () => trader({ location: NAGASAKI, time: 16, godowns: { value: 1000000, due: 16 }, godownsBought: true });
    const h = owner();
    // not seized; -5% + 15% x 0.5 = +2.5%
    expect(texts(play(checkVentures(h, new ScriptedRng([1, 0.5]))))).toEqual([
      "Our share in the Nanking godowns has paid us 25,000 this quarter, Taipan. It has been deposited in the bank.",
    ]);
    expect([h.bank, h.godowns]).toEqual([125000, { value: 1000000, due: 19 }]);
    const best = owner();
    play(checkVentures(best, new ScriptedRng([1, 0.9999])));
    expect(best.bank).toBe(200000);
    const worst = owner();
    expect(texts(play(checkVentures(worst, new ScriptedRng([1, 0])), [true]))).toEqual([
      "Taipan, it has been a bad quarter for the Nanking godowns, and the backers must put in 50,000 more. Shall we pay our part?",
    ]);
    expect(worst.bank).toBe(50000);
  });
});

describe("the Red Wind gang's arms smuggling", () => {
  // month 25 in Manila, having had godowns, out of debt and worth 140,000
  const smuggler = (overrides = {}) =>
    makeHong({ time: 25, location: MANILA, cash: 40000, bank: 100000, debt: 0, godownsBought: true, ...overrides });

  it("is offered in any port but Hong Kong once we've had godowns, and ends our arms trade", () => {
    const h = smuggler({ shipGoods: [0, 2, 0, 0, 0] });
    const p = play(checkVentures(h, new ScriptedRng([0])), [true]);
    // our 2 arms go in at Hong Kong's usual price, 120
    expect(texts(p)).toEqual([
      "Taipan, the Red Wind gang offers us a share in their arms smuggling for 14,000. We would leave the arms trade to them. Shall we join them?",
      "Very well, Taipan. Our share in the Red Wind gang's smuggling is worth 14,240, and will settle with us every three months. Our 2 arms have gone to them too.",
    ]);
    expect([h.arms, h.armsBought, h.shipGoods[ARMS]]).toEqual([{ value: 14240, due: 28 }, true, 0]);
    expect(marketGoods(h)).not.toContain(ARMS);
  });

  it("is offered 1-in-6", () => {
    expect(play(checkVentures(smuggler({ location: NAGASAKI }), new ScriptedRng([5]))).transcript).toEqual([]);
    expect(texts(play(checkVentures(smuggler({ location: NAGASAKI }), new ScriptedRng([6])), [false]))).toHaveLength(1);
  });

  it.each([
    ["before we've had godowns", { godownsBought: false }],
    ["before month 25", { time: 24 }],
    ["in Hong Kong", { location: HONG_KONG }],
  ])("isn't offered %s", (_, overrides) => {
    expect(play(checkVentures(smuggler(overrides), new ScriptedRng())).transcript).toEqual([]);
  });

  it("can be shut down by the authorities, with a fine, and offered again later", () => {
    const h = smuggler({ location: NAGASAKI, time: 28, cash: 1000, arms: { value: 35000, due: 28 }, armsBought: true });
    // shut down (1-in-30); fine = trunc(1000 / 1.8 * 0.5) + 1; no new offer this time
    const p = play(checkVentures(h, new ScriptedRng([0, 0.5, 1])));
    expect(texts(p)).toEqual([
      "Bad joss, Taipan! The authorities have shut down the Red Wind gang's smuggling. Our share, worth 35,000, is lost, and they have fined us 278!",
    ]);
    expect([h.arms, h.armsBought, h.cash]).toEqual([null, true, 722]);
    h.location = MANILA;
    expect(texts(play(checkVentures(h, new ScriptedRng([0])), [false]))[0]).toMatch(/^Taipan, the Red Wind gang is back in business/);
  });

  it("returns -15% to +30% a quarter", () => {
    const owner = () => smuggler({ location: NAGASAKI, time: 28, arms: { value: 1000000, due: 28 }, armsBought: true });
    const best = owner();
    play(checkVentures(best, new ScriptedRng([1, 0.9999])));
    expect(best.bank).toBe(400000);
    // -15%: a call for 150,000, from the bank
    const worst = owner();
    worst.bank = 200000;
    play(checkVentures(worst, new ScriptedRng([1, 0])), [true]);
    expect([worst.bank, worst.cash]).toEqual([50000, 40000]);
  });
});

describe("shares", () => {
  it("settle in turn on the same arrival: godowns, arms, then the jade mine", () => {
    const h = makeHong({
      time: 30, location: NAGASAKI, debt: 0,
      godowns: { value: 100000, due: 30 }, arms: { value: 100000, due: 30 }, mine: { value: 100000, due: 30 },
      godownsBought: true, armsBought: true,
    });
    const p = play(checkVentures(h, new ScriptedRng([1, 0.5, 1, 0.5, 1, 1, 0.5])));
    expect(texts(p).map((t) => t.match(/in the (.*) has paid/)?.[1])).toEqual([
      "Nanking godowns", "Red Wind gang's smuggling", "jade mine",
    ]);
  });

  it("all count toward the final position", () => {
    const h = makeHong({ cash: 1000, debt: 0, godowns: { value: 10, due: 1 }, arms: { value: 100, due: 1 }, mine: { value: 1000, due: 1 } });
    expect([sharesValue(h), finalPosition(h)]).toEqual([1110, 2110]);
  });
});
