import { describe, expect, it } from "vitest";
import { BATAVIA, HONG_KONG, SHANGHAI, SINGAPORE } from "../../src/engine/constants";
import { checkJade } from "../../src/engine/jade";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

const OFFER = "Taipan, the East India Company man Sir Beaumont-Finch is gathering backers for an expedition to establish a jade mine. Would you like to invest 1,500,000?";
const FAILED = "Taipan, regrettably our friend Sir Beaumont-Finch has been captured by rebels. It appears there will be no jade forthcoming.";

// month 25, in Singapore with 4,000,000 in the bank
const rich = (overrides = {}) =>
  makeHong({ time: 25, location: SINGAPORE, bank: 4000000, ...overrides });

// offered (1-in-3), then a stake of 25% x 1.5 = 37.5% of the bank: 1,500,000
const OFFER_ROLLS = [0, 0.5];

// an expedition we backed with 1,500,000, due this month
const backed = (overrides = {}) =>
  rich({ time: 28, location: SHANGHAI, expedition: { port: SINGAPORE, resolves: 28, stake: 1500000 }, jadeOffers: 1, ...overrides });

describe("checkJade", () => {
  it("offers a rich player a share in the expedition", () => {
    const h = rich();
    const p = play(checkJade(h, new ScriptedRng(OFFER_ROLLS)), [true]);
    expect(texts(p)).toEqual([
      OFFER,
      "Very well, Taipan. We will arrange for funds from Hong Kong and our friend Sir Beaumont-Finch will proceed from Singapore forthwith.",
    ]);
    expect([h.bank, h.cash, h.jadeOffers]).toEqual([2500000, 400, 1]);
    expect(h.expedition).toEqual({ port: SINGAPORE, resolves: 28, stake: 1500000 });
  });

  it("starts the expedition without us if we decline", () => {
    const h = rich({ location: BATAVIA });
    const p = play(checkJade(h, new ScriptedRng(OFFER_ROLLS)), [false]);
    expect(texts(p)).toEqual([OFFER]);
    expect([h.bank, h.jadeOffers]).toEqual([4000000, 1]);
    expect(h.expedition).toEqual({ port: BATAVIA, resolves: 28, stake: 0 });
  });

  it("asks for a quarter to half of the bank, but at least 1,000,000", () => {
    const ask = (f: number, bank = 4000000) => texts(play(checkJade(rich({ bank }), new ScriptedRng([0, f]))))[0];
    expect(ask(0)).toMatch(/invest 1,000,000\?$/);
    expect(ask(0.999)).toMatch(/invest 1,999,000\?$/);
    expect(ask(0.5, 20000000)).toMatch(/invest 7,500,000\?$/);
    expect(ask(0, 3000000)).toMatch(/invest 1,000,000\?$/);
  });

  it("is offered only 1-in-3", () => {
    const h = rich();
    const p = play(checkJade(h, new ScriptedRng([1])));
    expect([p.transcript, h.expedition, h.jadeOffers]).toEqual([[], null, 0]);
  });

  it.each([
    ["before month 25", { time: 24 }],
    ["without over 2,000,000 in the bank", { bank: 2000000 }],
    ["for cash on hand", { bank: 0, cash: 3000000 }],
    ["outside Singapore and Batavia", { location: HONG_KONG }],
    ["while an expedition is out", { expedition: { port: SINGAPORE, resolves: 27, stake: 0 } }],
    ["more than three times", { jadeOffers: 3 }],
  ])("isn't offered %s", (_, overrides) => {
    // an empty script: any roll would throw
    const p = play(checkJade(rich(overrides), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("succeeds 1-in-3 after 3 months, making the stake a share in the mine worth 2-5 times as much", () => {
    const h = backed();
    // success; 2 + 3 x 0.5 = 3.5 times the stake
    const p = play(checkJade(h, new ScriptedRng([0, 0.5])));
    expect(texts(p)).toEqual([
      "Taipan!! Our friend Sir Beaumont-Finch reports the success of his jade mining effort. Our 1,500,000 has become a share in the jade mine worth 5,250,000, which will settle with us every three months.",
    ]);
    expect([h.bank, h.cash, h.expedition, h.mine]).toEqual([4000000, 400, null, { value: 5250000, due: 31 }]);
    const worth = (f: number) => {
      const g = backed();
      play(checkJade(g, new ScriptedRng([0, f])));
      return g.mine?.value;
    };
    expect([worth(0), worth(0.999)]).toEqual([3000000, 7496000]);
  });

  it("adds a later success to the share we have", () => {
    const h = backed({ mine: { value: 2000000, due: 30 } });
    const p = play(checkJade(h, new ScriptedRng([0, 0])));
    expect(texts(p)[0]).toMatch(/Our share in the jade mine has grown to 5,000,000\.$/);
    expect(h.mine).toEqual({ value: 5000000, due: 30 });
  });

  it("pays nothing if we didn't invest", () => {
    const h = backed({ expedition: { port: SINGAPORE, resolves: 28, stake: 0 } });
    const p = play(checkJade(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual([
      "Taipan, rumor has reached us of a new Burmese jade mine. It appears our friend Sir Beaumont-Finch was met with success, and his backers in London have done very well.",
    ]);
    expect([h.bank, h.cash, h.expedition]).toEqual([4000000, 400, null]);
  });

  it("otherwise fails, and Sir Beaumont-Finch may escape to try again", () => {
    const h = backed({ location: SINGAPORE });
    const p = play(checkJade(h, new ScriptedRng([1, ...OFFER_ROLLS])), [false]);
    expect(texts(p)).toEqual([
      FAILED,
      "Taipan!! Sir Beaumont-Finch has escaped the Burmese rebels and is back seeking investment in another expedition to establish a jade mine. Would you like to invest 1,500,000?",
    ]);
    expect([h.bank, h.expeditionFailed, h.jadeOffers, h.expedition])
      .toEqual([4000000, true, 2, { port: SINGAPORE, resolves: 31, stake: 0 }]);
  });

  it("is offered again after a success, up to three times in all", () => {
    const h = backed({ location: SINGAPORE, jadeOffers: 2 });
    play(checkJade(h, new ScriptedRng([0, 0, ...OFFER_ROLLS])), [false]);
    expect(h.jadeOffers).toBe(3);
    h.expedition = null;
    expect(play(checkJade(h, new ScriptedRng())).transcript).toEqual([]);
  });

  it("waits until the expedition is due", () => {
    const h = backed({ time: 27 });
    const p = play(checkJade(h, new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });
});

describe("the jade mine", () => {
  // a 1,000,000 share, due this month; rolls: no seizure, no rich vein, then the return
  const owner = (overrides = {}) =>
    makeHong({ time: 30, location: SHANGHAI, bank: 500000, debt: 0, mine: { value: 1000000, due: 30 }, ...overrides });
  const QUARTER = [1, 1];
  // a return of -10% + 30% x f
  const settle = (h: ReturnType<typeof owner>, f: number, answers: unknown[] = []) =>
    play(checkJade(h, new ScriptedRng([...QUARTER, f])), answers);

  it("waits for its quarter", () => {
    const h = owner({ time: 29 });
    expect(play(checkJade(h, new ScriptedRng())).transcript).toEqual([]);
  });

  it("pays a good quarter into the bank, and settles again in three months", () => {
    const h = owner();
    // 2 + 3 x 0.5: +5%
    const p = settle(h, 0.5);
    expect(texts(p)).toEqual(["The jade mine has paid us 50,000 this quarter, Taipan. It has been deposited in the bank."]);
    expect([h.bank, h.mine]).toEqual([550000, { value: 1000000, due: 33 }]);
  });

  it("returns at most +20%", () => {
    const h = owner();
    settle(h, 0.9999);
    expect(h.bank).toBe(700000);
  });

  it("can break even", () => {
    const h = owner();
    expect(texts(settle(h, 1 / 3))).toEqual(["The jade mine has broken even this quarter, Taipan."]);
    expect(h.bank).toBe(500000);
  });

  it("calls for funds after a bad quarter, paid from the bank, then cash", () => {
    const h = owner({ bank: 60000, cash: 50000 });
    // -10%: 100,000
    const p = settle(h, 0, [true]);
    expect(texts(p)).toEqual([
      "Taipan, the jade mine has had a bad quarter, and needs 100,000 more from its backers. Shall we pay our part?",
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
    const p = play(checkJade(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual(["Bad joss, Taipan! Rebels have seized the jade mine, and our share in it is lost."]);
    expect([h.mine, h.bank]).toEqual([null, 500000]);
  });

  it("can strike a rich vein, 1-in-40 quarters, paying twice the share", () => {
    const h = owner();
    const p = play(checkJade(h, new ScriptedRng([1, 0])));
    expect(texts(p)).toEqual(["Taipan!! The jade mine has struck a rich vein! Our share of 2,000,000 has been deposited in the bank."]);
    expect([h.bank, h.mine]).toEqual([2500000, { value: 1000000, due: 33 }]);
  });
});
