import { describe, expect, it } from "vitest";
import { ARMS, GENERAL, JADE, SILK } from "../../src/engine/constants";
import { currentTime } from "../../src/engine/hong";
import { ScriptedRng } from "../../src/engine/rng";
import {
  MSG_NEG_SHOCK, MSG_POS_SHOCK, buyGoods, conditionReport, establishPrices, sellGoods,
} from "../../src/engine/trade";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// Five price rolls of 0 (x1) give the Hong Kong prices [5, 60, 500, 5000, 60000].
const MIN_PRICES = [0, 0, 0, 0, 0];

describe("conditionReport", () => {
  it("lists every price in two aligned columns, then the message", () => {
    const text = conditionReport(makeHong(), "What shall I buy, Taipan?");
    expect(text).toBe(
      "Current market conditions are as follows:\n\n" +
      "General - 10     Opium - 10,000\n" +
      "   Arms - 100     Jade - 100,000\n" +
      "   Silk - 1,000\n\n" +
      "What shall I buy, Taipan?",
    );
  });
});

describe("establishPrices", () => {
  it("keeps a crashed price at its good's granularity", () => {
    const h = makeHong({ time: 2 });
    // shock; silk; factor = 7; negative: 500 / 7 = 71.4 -> 0 -> at least 100
    play(establishPrices(h, new ScriptedRng([...MIN_PRICES, 0, SILK, 2, 1])));
    expect(h.prices[SILK]).toBe(100);
  });

  it("rounds a crashed price down to its good's granularity", () => {
    const h = makeHong({ time: 2 });
    // jade rolled x3 = 180000; shock; jade; factor = 7; negative: 25714 -> 20000
    play(establishPrices(h, new ScriptedRng([0, 0, 0, 0, 2, 0, JADE, 2, 1])));
    expect(h.prices[JADE]).toBe(20000);
  });

  it("keeps every shocked price a whole multiple of its granularity", () => {
    for (let g = GENERAL; g <= JADE; g++) {
      for (let f = 0; f < 5; f++) {
        for (const dir of [0, 1]) {
          const h = makeHong({ time: 2 });
          play(establishPrices(h, new ScriptedRng([2, 2, 2, 2, 2, 0, g, f, dir])));
          const m = 10 ** g;
          expect(h.prices[g]! % m).toBe(0);
          expect(h.prices[g]!).toBeGreaterThanOrEqual(m);
        }
      }
    }
  });

  it("never shocks prices in the first month", () => {
    const h = makeHong({ time: 1 });
    const rng = new ScriptedRng(MIN_PRICES);
    const p = play(establishPrices(h, rng));
    expect(h.prices).toEqual([5, 60, 500, 5000, 60000]);
    expect(p.transcript).toEqual([]);
    expect(rng.remaining).toBe(0);
  });

  it("usually leaves new prices alone after the first month", () => {
    const h = makeHong({ time: 2 });
    const p = play(establishPrices(h, new ScriptedRng([...MIN_PRICES, 1])));
    expect(h.prices).toEqual([5, 60, 500, 5000, 60000]);
    expect(p.transcript).toEqual([]);
  });

  it("can multiply a price by 5-9", () => {
    const h = makeHong({ time: 2 });
    // shock; silk; factor = 5 + randrange(5) = 9; positive
    const p = play(establishPrices(h, new ScriptedRng([...MIN_PRICES, 0, SILK, 4, 0])));
    expect(texts(p)).toEqual([MSG_POS_SHOCK[SILK]]);
    expect(h.prices).toEqual([5, 60, 4500, 5000, 60000]);
  });

  it("can divide a price by 5-9, but not below 1", () => {
    const h = makeHong({ time: 2 });
    // shock; general; factor = 5; negative
    const p = play(establishPrices(h, new ScriptedRng([...MIN_PRICES, 0, GENERAL, 0, 1])));
    expect(texts(p)).toEqual([MSG_NEG_SHOCK[GENERAL]]);
    expect(h.prices).toEqual([1, 60, 500, 5000, 60000]);
  });
});

describe("buyGoods", () => {
  it("can be cancelled", () => {
    const h = makeHong();
    play(buyGoods(h), [null]);
    expect(h.cash).toBe(400);
  });

  it("won't ask how much when you can't afford any", () => {
    const h = makeHong();
    const p = play(buyGoods(h), [SILK]);
    expect(texts(p).at(-1)).toBe("You cannot afford any silk at these prices, Taipan.");
    expect(p.game.done).toBe(true);
  });

  it("buys goods into the hold", () => {
    const h = makeHong();
    const p = play(buyGoods(h), [GENERAL, 25]);
    expect(p.transcript[1]?.prompt).toMatchObject({ kind: "number", max: 40 });
    expect(p.transcript[1]?.prompt.text).toMatch(/How much general shall I buy, Taipan\?$/);
    expect(h.cash).toBe(150);
    expect(h.shipGoods[GENERAL]).toBe(25);
  });

  it("refuses to buy more than cash allows", () => {
    const h = makeHong();
    const p = play(buyGoods(h), [GENERAL, 41]);
    expect(texts(p).at(-1)).toBe("You do not have enough cash on hand, Taipan.");
    expect(h.cash).toBe(400);
    expect(h.shipGoods[GENERAL]).toBe(0);
  });

  it("does not check hold space (overloading is caught when sailing)", () => {
    const h = makeHong({ cash: 10000 });
    play(buyGoods(h), [GENERAL, 1000]);
    expect(h.shipGoods[GENERAL]).toBe(1000);
  });
});

describe("sellGoods", () => {
  it("can be cancelled", () => {
    const h = makeHong();
    play(sellGoods(h), [null]);
    expect(h.cash).toBe(400);
  });

  it("won't sell what isn't aboard", () => {
    const p = play(sellGoods(makeHong()), [SILK]);
    expect(texts(p).at(-1)).toBe("You have no silk in your ship's hold, Taipan.");
  });

  it("sells goods from the hold", () => {
    const h = makeHong({ shipGoods: [0, 0, 3, 0, 0] });
    const p = play(sellGoods(h), [SILK, 2]);
    expect(p.transcript[1]?.prompt).toMatchObject({ kind: "number", max: 3 });
    expect(h.cash).toBe(2400);
    expect(h.shipGoods[SILK]).toBe(1);
  });

  it("refuses to sell more than is aboard", () => {
    const h = makeHong({ shipGoods: [0, 0, 3, 0, 0] });
    const p = play(sellGoods(h), [SILK, 4]);
    expect(texts(p).at(-1)).toBe("You do not have that much in your ship's hold, Taipan.");
    expect(h.shipGoods[SILK]).toBe(3);
  });
});

it("makeHong sets the elapsed time", () => {
  expect(currentTime(makeHong({ time: 13 }))).toBe(13);
});
