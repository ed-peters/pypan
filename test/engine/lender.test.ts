import { describe, expect, it } from "vitest";
import { SHANGHAI } from "../../src/engine/constants";
import { checkLender, visitWu, wuCoversShortfall } from "../../src/engine/lender";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

const ROBBED = /robbed of all of your cash/;

describe("checkLender", () => {
  it("does nothing away from Hong Kong", () => {
    const p = play(checkLender(makeHong({ location: SHANGHAI }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("does nothing when you owe nothing", () => {
    const p = play(checkLender(makeHong({ debt: 0, time: 20 }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("offers a visit when you owe money", () => {
    const h = makeHong({ cash: 1000 });
    const p = play(checkLender(h, new ScriptedRng()), [true, 0]);
    expect(texts(p)).toEqual([
      "Do you have business with Elder Brother Wu, the moneylender, Taipan?",
      "How much will you repay, Taipan?",
    ]);
  });

  it("threatens you once when you owe too much", () => {
    const h = makeHong({ debt: 10001 });
    // braves = 17 + randrange(21)
    const rng = new ScriptedRng([4]);
    const p = play(checkLender(h, rng), [false]);
    expect(texts(p)).toEqual([
      "Elder Brother Wu has sent 21 braves to escort you to the Wu mansion, Taipan.",
      "Elder Brother Wu reminds you of the Confucian ideal of personal worthiness, and how this applies to paying one's debts.",
      "He is reminded of a fabled barbarian who came to a bad end, after not caring for his obligations.",
      "He hopes no such fate awaits you, his friend, Taipan.",
      "Do you have business with Elder Brother Wu, the moneylender, Taipan?",
    ]);
    expect(h.threatened).toBe(true);

    const again = play(checkLender(h, new ScriptedRng()), [false]);
    expect(texts(again)).toHaveLength(1);
  });

  it("can have you robbed after a year if you haven't been threatened", () => {
    const h = makeHong({ time: 13, cash: 5000 });
    // chanceOf(4) hits; bodyguards = 3 + randrange(5)
    const p = play(checkLender(h, new ScriptedRng([0, 2])), [false]);
    expect(texts(p).at(-1)).toBe(
      "Bad joss!! 5 of your bodyguards have been killed by cutthroats and you have been robbed of all of your cash, Taipan!!",
    );
    expect(h.cash).toBe(0);
  });

  it("doesn't rob you in the first year", () => {
    const h = makeHong({ time: 12 });
    const rng = new ScriptedRng();
    const p = play(checkLender(h, rng), [false]);
    expect(texts(p).some((t) => ROBBED.test(t))).toBe(false);
  });

  it("doesn't rob you once you've been threatened (faithful quirk)", () => {
    const h = makeHong({ time: 13, threatened: true });
    const p = play(checkLender(h, new ScriptedRng()), [false]);
    expect(texts(p).some((t) => ROBBED.test(t))).toBe(false);
    expect(h.cash).toBe(400);
  });

  it("usually doesn't rob you", () => {
    const h = makeHong({ time: 13 });
    play(checkLender(h, new ScriptedRng([1])), [false]);
    expect(h.cash).toBe(400);
  });
});

describe("visitWu", () => {
  it("lets you repay up to what you owe or have", () => {
    const h = makeHong({ cash: 1000, debt: 5000 });
    const p = play(visitWu(h, new ScriptedRng()), [400]);
    expect(p.transcript[0]?.prompt).toMatchObject({ kind: "number", max: 1000 });
    expect([h.cash, h.debt]).toEqual([600, 4600]);
    // then 2 * 600 - 4600 < 0, so no offer to borrow
    expect(p.game.done).toBe(true);
  });

  it("refuses repayment beyond the limit", () => {
    const h = makeHong({ cash: 1000, debt: 500 });
    const p = play(visitWu(h, new ScriptedRng()), [501, 0]);
    expect(texts(p)).toContain("Taipan, you owe only 500.");
    expect([h.cash, h.debt]).toEqual([1000, 500]);
  });

  it("lends up to twice your cash, less what you owe", () => {
    const h = makeHong({ cash: 5000, debt: 1000 });
    const p = play(visitWu(h, new ScriptedRng()), [0, 9000]);
    expect(p.transcript[1]?.prompt).toMatchObject({ text: "How much will you borrow, Taipan?", max: 9000 });
    expect([h.cash, h.debt]).toEqual([14000, 10000]);
  });

  it("refuses to lend beyond the limit", () => {
    const h = makeHong({ cash: 5000, debt: 0 });
    const p = play(visitWu(h, new ScriptedRng()), [10001]);
    expect(texts(p).at(-1)).toBe("Elder Brother Wu will not loan you so much, Taipan.");
    expect([h.cash, h.debt]).toEqual([5000, 0]);
  });

  it("brushes you off if you have no cash but still have goods", () => {
    const h = makeHong({ time: 5, cash: 0, shipGoods: [1, 0, 0, 0, 0] });
    const p = play(visitWu(h, new ScriptedRng()));
    expect(texts(p)).toEqual([
      "Elder Brother is aware of your plight, Taipan. He urges you to exercise all the means at your disposal to correct it.",
    ]);
  });

  it("brushes you off in the first month even if you're broke", () => {
    const h = makeHong({ time: 1, cash: 0 });
    const p = play(visitWu(h, new ScriptedRng()));
    expect(texts(p)[0]).toMatch(/urges you/);
  });

  it("offers a bailout when you're broke", () => {
    const h = makeHong({ time: 2, cash: 0, debt: 100, bailout: 2 });
    // loan = randrange(1500) + 1500; cost = randrange(2000) * bailout + 1500
    const p = play(visitWu(h, new ScriptedRng([100, 200])), [true]);
    expect(texts(p)).toEqual([
      "Elder Brother is aware of your plight, Taipan. He is willing to loan you an additional 1,600 if you will pay back 1,900. Are you willing, Taipan?",
    ]);
    expect([h.cash, h.debt]).toEqual([1600, 2000]);
  });

  it("never raises the bailout multiplier (faithful quirk)", () => {
    const h = makeHong({ time: 2, cash: 0, debt: 100 });
    play(visitWu(h, new ScriptedRng([100, 200])), [true]);
    expect(h.bailout).toBe(1);
  });

  it("does nothing if you decline the bailout", () => {
    const h = makeHong({ time: 2, cash: 0, debt: 100 });
    play(visitWu(h, new ScriptedRng([100, 200])), [false]);
    expect([h.cash, h.debt]).toEqual([0, 100]);
  });
});

describe("wuCoversShortfall", () => {
  it("pays the difference and adds it to your debt", () => {
    const h = makeHong({ cash: 300, debt: 1000 });
    const p = play(wuCoversShortfall(h, 1000, "McHenry"), [true]);
    expect(texts(p).at(-1)).toBe("Elder Brother Wu has given McHenry the difference and added the same amount to your debt.");
    expect([h.cash, h.debt]).toEqual([0, 1700]);
    expect(p.game.result).toBe(true);
  });

  it("can be declined", () => {
    const h = makeHong({ cash: 300, debt: 1000 });
    const p = play(wuCoversShortfall(h, 1000, "Li Yuen"), [false]);
    expect(texts(p).at(-1)).toBe("Very well. Elder Brother Wu will not assist you. I would be wary of pirates if I were you, Taipan.");
    expect([h.cash, h.debt]).toEqual([300, 1000]);
    expect(p.game.result).toBe(false);
  });
});
