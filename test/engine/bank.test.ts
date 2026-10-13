import { describe, expect, it } from "vitest";
import { SHANGHAI } from "../../src/engine/constants";
import { bankAvailable, accrueInterest, checkBanker, visitBank } from "../../src/engine/bank";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("visitBank", () => {
  it("turns you away with nothing to bank", () => {
    const p = play(visitBank(makeHong({ cash: 0 }), new ScriptedRng()));
    expect(texts(p)).toEqual(["You have no reason to go to the bank, Taipan."]);
  });

  it("deposits, then offers a withdrawal", () => {
    const h = makeHong({ cash: 400 });
    const p = play(visitBank(h, new ScriptedRng()), [300, 100]);
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "number", text: "How much shall I deposit?", max: 400 },
      { kind: "number", text: "How much shall I withdraw?", max: 300 },
    ]);
    expect([h.cash, h.bank]).toEqual([200, 200]);
  });

  it("only offers a withdrawal when you have no cash", () => {
    const h = makeHong({ cash: 0, bank: 500 });
    play(visitBank(h, new ScriptedRng()), [500]);
    expect([h.cash, h.bank]).toEqual([500, 0]);
  });

  it("refuses to deposit or withdraw more than you have", () => {
    const h = makeHong({ cash: 400, bank: 100 });
    const p = play(visitBank(h, new ScriptedRng()), [401, 101]);
    expect(texts(p)).toEqual([
      "How much shall I deposit?",
      "You do not have that much cash on hand, Taipan.",
      "How much shall I withdraw?",
      "You do not have that much in the bank, Taipan.",
    ]);
    expect([h.cash, h.bank]).toEqual([400, 100]);
  });
});

describe("checkBanker", () => {
  it("can bring the bank's man to a foreign port, at the lorcha's 1-in-6 odds", () => {
    const h = makeHong({ time: 13, location: SHANGHAI });
    const p = play(checkBanker(h, new ScriptedRng([0])));
    expect(texts(p)).toEqual([
      "Good joss!! A representative from your bank is in Shanghai for the month. You may transact with him as normal.",
    ]);
    expect(h.banker).toBe(true);
    expect(bankAvailable(h)).toBe(true);
  });

  it("usually doesn't, and he leaves when you do", () => {
    const h = makeHong({ time: 13, location: SHANGHAI, banker: true });
    const p = play(checkBanker(h, new ScriptedRng([1])));
    expect(p.transcript).toEqual([]);
    expect(bankAvailable(h)).toBe(false);
  });

  it("never comes in the first year, or to Hong Kong", () => {
    const rng = new ScriptedRng();
    const abroad = makeHong({ time: 12, location: SHANGHAI });
    const home = makeHong({ time: 13 });
    play(checkBanker(abroad, rng));
    play(checkBanker(home, rng));
    expect([abroad.banker, home.banker]).toEqual([false, false]);
    expect(bankAvailable(home)).toBe(true);
  });
});

describe("visitBank robbery", () => {
  it("can have you robbed on the way out when carrying lots of cash", () => {
    const h = makeHong({ time: 13, cash: 0, bank: 28000 });
    const p = play(visitBank(h, new ScriptedRng([0, 0.5])), [28000]);
    expect(texts(p).at(-1)).toBe("Bad joss! Your bodyguards were beaten up and you were robbed of 10,000, Taipan!");
    expect([h.cash, h.bank]).toEqual([18000, 0]);
  });

  it("uses the harbor odds: 1 in 20", () => {
    const h = makeHong({ time: 13, cash: 0, bank: 28000 });
    const p = play(visitBank(h, new ScriptedRng([1])), [28000]);
    expect(p.transcript).toHaveLength(1);
    expect(h.cash).toBe(28000);
  });

  it("won't happen with little cash on hand, or in the first year", () => {
    const rng = new ScriptedRng();
    play(visitBank(makeHong({ time: 13, cash: 0, bank: 28000 }), rng), [20000]);
    play(visitBank(makeHong({ time: 12, cash: 0, bank: 28000 }), rng), [28000]);
    expect(rng.remaining).toBe(0);
  });
});

describe("accrueInterest", () => {
  it("adds 10% to debt and 0.5% to the bank, truncated", () => {
    const h = makeHong({ debt: 5000, bank: 3333 });
    accrueInterest(h);
    expect([h.debt, h.bank]).toEqual([5500, 3349]);
  });
});
