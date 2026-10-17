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

  it("succeeds 1-in-3 after 3 months, paying backers 2-5 times their stake", () => {
    const h = backed();
    // success; 2 + 3 x 0.5 = 3.5 times the stake
    const p = play(checkJade(h, new ScriptedRng([0, 0.5])));
    expect(texts(p)).toEqual([
      "Taipan!! Our friend Sir Beaumont-Finch reports the success of his jade mining effort. His jade has fetched a fine price in London, and our share of 5,250,000 has been deposited in the bank.",
    ]);
    expect([h.bank, h.cash, h.expedition]).toEqual([4000000 + 5250000, 400, null]);
    const pays = (f: number) => {
      const g = backed();
      play(checkJade(g, new ScriptedRng([0, f])));
      return g.bank - 4000000;
    };
    expect([pays(0), pays(0.999)]).toEqual([3000000, 7496000]);
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
