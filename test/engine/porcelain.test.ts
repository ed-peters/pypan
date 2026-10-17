import { describe, expect, it } from "vitest";
import { HONG_KONG, PORCELAIN, SHANGHAI } from "../../src/engine/constants";
import { marketGoods } from "../../src/engine/hong";
import { breakPorcelain, checkPorcelain, porcelainOdds } from "../../src/engine/porcelain";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// month 49 in Hong Kong, out of debt, worth 5,000,400
const rich = (overrides = {}) => makeHong({ time: 49, debt: 0, bank: 5000000, ...overrides });

const OFFER = "Taipan, a merchant house from Jingdezhen offers us a share in the porcelain trade for 3,750,000. With it we may buy and sell porcelain in every port. Shall we buy in?";

describe("porcelainOdds", () => {
  it("starts at 1-in-20 after month 48 and gets better every three months, to 1-in-3", () => {
    const odds = (time: number) => porcelainOdds(rich({ time }));
    expect([49, 51, 52, 55, 76, 99, 100, 150].map(odds)).toEqual([20, 20, 19, 18, 11, 4, 3, 3]);
  });

  it.each([
    ["before month 49", { time: 48 }],
    ["outside Hong Kong", { location: SHANGHAI }],
    ["to a player worth 2,000,000 or less", { bank: 1999600 }],
    ["counting debt against worth", { debt: 3000401 }],
    ["once we're in the trade", { porcelain: true }],
  ])("isn't offered %s", (_, overrides) => {
    expect(porcelainOdds(rich(overrides))).toBeNull();
    // an empty script: any roll would throw
    expect(play(checkPorcelain(rich(overrides), new ScriptedRng())).transcript).toEqual([]);
  });
});

describe("checkPorcelain", () => {
  it("offers a share for three-quarters of our cash position, paid from cash and then the bank", () => {
    const h = rich();
    const p = play(checkPorcelain(h, new ScriptedRng([0])), [true]);
    expect(texts(p)).toEqual([
      OFFER,
      "The necessary funds will be sent from the bank, Taipan.",
      "Very well, Taipan. We are in the porcelain trade. Mind how it's stowed: it breaks!",
    ]);
    expect([h.cash, h.bank, h.porcelain]).toEqual([0, 1250400, true]);
    expect(marketGoods(h)).toContain(PORCELAIN);
  });

  it("leaves porcelain hidden if we decline, to be offered again", () => {
    const h = rich();
    const p = play(checkPorcelain(h, new ScriptedRng([0])), [false]);
    expect(texts(p)).toEqual([OFFER]);
    expect([h.cash, h.bank, h.porcelain]).toEqual([400, 5000000, false]);
    expect(marketGoods(h)).not.toContain(PORCELAIN);
    expect(texts(play(checkPorcelain(h, new ScriptedRng([0])), [false]))).toEqual([OFFER]);
  });

  it("comes only 1-in-N", () => {
    const h = rich({ time: 100, location: HONG_KONG });
    // 1-in-3: a roll of 3 brings it, 1 doesn't
    expect(play(checkPorcelain(h, new ScriptedRng([1]))).transcript).toEqual([]);
    expect(texts(play(checkPorcelain(h, new ScriptedRng([3])), [false]))).toHaveLength(1);
  });
});

describe("breakPorcelain", () => {
  it("breaks lo..hi percent of the porcelain aboard", () => {
    const broken = (roll: number) => {
      const h = makeHong({ shipGoods: [5, 0, 0, 0, 100] });
      const n = breakPorcelain(h, new ScriptedRng([roll]), [10, 30]);
      expect(h.shipGoods).toEqual([5, 0, 0, 0, 100 - n]);
      return n;
    };
    // inRange(10, 31) = 10 + randrange(21)
    expect([broken(0), broken(20)]).toEqual([10, 30]);
  });

  it("always breaks at least one, and never more than there is", () => {
    const h = makeHong({ shipGoods: [0, 0, 0, 0, 3] });
    expect(breakPorcelain(h, new ScriptedRng([0]), [10, 30])).toBe(1);
    expect(h.shipGoods[PORCELAIN]).toBe(2);
  });

  it("does nothing, and rolls nothing, without porcelain aboard", () => {
    const h = makeHong({ warehouseGoods: [0, 0, 0, 0, 50] });
    expect(breakPorcelain(h, new ScriptedRng(), [10, 30])).toBe(0);
    expect(h.warehouseGoods[PORCELAIN]).toBe(50);
  });
});
