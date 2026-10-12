import { describe, expect, it } from "vitest";
import { accrueInterest, visitBank } from "../../src/engine/bank";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("visitBank", () => {
  it("turns you away with nothing to bank", () => {
    const p = play(visitBank(makeHong({ cash: 0 })));
    expect(texts(p)).toEqual(["You have no reason to go to the bank, Taipan."]);
  });

  it("deposits, then offers a withdrawal", () => {
    const h = makeHong({ cash: 400 });
    const p = play(visitBank(h), [300, 100]);
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "number", text: "How much shall I deposit?", max: 400 },
      { kind: "number", text: "How much shall I withdraw?", max: 300 },
    ]);
    expect([h.cash, h.bank]).toEqual([200, 200]);
  });

  it("only offers a withdrawal when you have no cash", () => {
    const h = makeHong({ cash: 0, bank: 500 });
    play(visitBank(h), [500]);
    expect([h.cash, h.bank]).toEqual([500, 0]);
  });

  it("refuses to deposit or withdraw more than you have", () => {
    const h = makeHong({ cash: 400, bank: 100 });
    const p = play(visitBank(h), [401, 101]);
    expect(texts(p)).toEqual([
      "How much shall I deposit?",
      "You do not have that much cash on hand, Taipan.",
      "How much shall I withdraw?",
      "You do not have that much in the bank, Taipan.",
    ]);
    expect([h.cash, h.bank]).toEqual([400, 100]);
  });
});

describe("accrueInterest", () => {
  it("adds 10% to debt and 5% to the bank, truncated", () => {
    const h = makeHong({ debt: 5000, bank: 333 });
    accrueInterest(h);
    expect([h.debt, h.bank]).toEqual([5500, 349]);
  });
});
