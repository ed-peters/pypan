import { describe, expect, it } from "vitest";
import { BATAVIA, HONG_KONG, JADE, SHANGHAI, SINGAPORE } from "../../src/engine/constants";
import { applyJadeDeal, checkJade } from "../../src/engine/jade";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

const OFFER = "Taipan, the East India Company man Sir Beaumont-Finch is gathering backers for an expedition to establish a jade mine. Would you like to invest 1,000,000?";
const FAILED = "Taipan, regrettably our friend Sir Beaumont-Finch has been captured by rebels. It appears there will be no jade forthcoming.";

// month 25, in Singapore with 3,000,000 in the bank and no jade yet
const rich = (overrides = {}) =>
  makeHong({ time: 25, location: SINGAPORE, bank: 3000000, jade: false, ...overrides });

// offered (1-in-3), then an amount of exactly 1,000,000
const OFFER_ROLLS = [0, 0.5];

describe("checkJade", () => {
  it("offers a rich player a share in the expedition", () => {
    const h = rich();
    const p = play(checkJade(h, new ScriptedRng(OFFER_ROLLS)), [true]);
    expect(texts(p)).toEqual([
      OFFER,
      "Very well, Taipan. We will arrange for funds from Hong Kong and our friend Sir Beaumont-Finch will proceed from Singapore forthwith.",
    ]);
    expect([h.bank, h.cash]).toEqual([2000000, 400]);
    expect(h.expedition).toEqual({ port: SINGAPORE, resolves: 28, invested: true });
  });

  it("starts the expedition without us if we decline", () => {
    const h = rich({ location: BATAVIA });
    const p = play(checkJade(h, new ScriptedRng(OFFER_ROLLS)), [false]);
    expect(texts(p)).toEqual([OFFER]);
    expect(h.bank).toBe(3000000);
    expect(h.expedition).toEqual({ port: BATAVIA, resolves: 28, invested: false });
  });

  it("asks for 1,000,000 give or take 10%", () => {
    const ask = (f: number) => texts(play(checkJade(rich(), new ScriptedRng([0, f]))))[0];
    expect(ask(0)).toMatch(/invest 900,000\?$/);
    expect(ask(0.999)).toMatch(/invest 1,100,000\?$/);
  });

  it("is offered only 1-in-3", () => {
    const h = rich();
    const p = play(checkJade(h, new ScriptedRng([1])));
    expect([p.transcript, h.expedition]).toEqual([[], null]);
  });

  it.each([
    ["before month 25", { time: 24 }],
    ["without over 2,000,000 in the bank", { bank: 2000000 }],
    ["for cash on hand", { bank: 0, cash: 3000000 }],
    ["outside Singapore and Batavia", { location: HONG_KONG }],
    ["once there's jade", { jade: true }],
    ["while an expedition is out", { expedition: { port: SINGAPORE, resolves: 27, invested: false } }],
  ])("isn't offered %s", (_, overrides) => {
    // an empty script: any roll would throw
    const p = play(checkJade(rich(overrides), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("succeeds 1-in-3 after 3 months, with cheap jade for backers", () => {
    const h = rich({ time: 28, location: SHANGHAI, expedition: { port: SINGAPORE, resolves: 28, invested: true } });
    const p = play(checkJade(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual([
      "Taipan!! Our friend Sir Beaumont-Finch reports the success of his jade mining effort. We will be offered low-price jade for a time in thanks.",
    ]);
    expect([h.jade, h.expedition, h.jadeDeal]).toEqual([true, null, { port: SINGAPORE, until: 31 }]);
  });

  it("brings jade to market even if we didn't invest", () => {
    const h = rich({ time: 28, location: SHANGHAI, expedition: { port: SINGAPORE, resolves: 28, invested: false } });
    const p = play(checkJade(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual([
      "Taipan, rumor has reached us of a new Burmese jade mine. It appears our friend Sir Beaumont-Finch was met with success.",
    ]);
    expect([h.jade, h.expedition, h.jadeDeal]).toEqual([true, null, null]);
  });

  it("otherwise fails, and Sir Beaumont-Finch may escape to try again", () => {
    const h = rich({ time: 28, expedition: { port: SINGAPORE, resolves: 28, invested: true } });
    const p = play(checkJade(h, new ScriptedRng([1, ...OFFER_ROLLS])), [false]);
    expect(texts(p)).toEqual([
      FAILED,
      "Taipan!! Sir Beaumont-Finch has escaped the Burmese rebels and is back seeking investment in another expedition to establish a jade mine. Would you like to invest 1,000,000?",
    ]);
    expect([h.jade, h.expeditionFailed, h.expedition])
      .toEqual([false, true, { port: SINGAPORE, resolves: 31, invested: false }]);
  });

  it("waits until the expedition is due", () => {
    const h = rich({ time: 27, expedition: { port: SINGAPORE, resolves: 28, invested: true } });
    const p = play(checkJade(h, new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });
});

describe("applyJadeDeal", () => {
  const deal = { port: SINGAPORE, until: 31 };

  it("sells backers jade at a fifth of the price, in its granularity", () => {
    const h = makeHong({ time: 31, location: SINGAPORE, jadeDeal: deal });
    h.prices[JADE] = 160000;
    applyJadeDeal(h);
    expect(h.prices[JADE]).toBe(30000);
    h.prices[JADE] = 40000;
    applyJadeDeal(h);
    expect(h.prices[JADE]).toBe(10000);
  });

  it("applies only at the expedition's port", () => {
    const h = makeHong({ time: 29, location: SHANGHAI, jadeDeal: deal });
    applyJadeDeal(h);
    expect([h.prices[JADE], h.jadeDeal]).toEqual([100000, deal]);
  });

  it("ends after 3 months", () => {
    const h = makeHong({ time: 32, location: SINGAPORE, jadeDeal: deal });
    applyJadeDeal(h);
    expect([h.prices[JADE], h.jadeDeal]).toEqual([100000, null]);
  });
});
