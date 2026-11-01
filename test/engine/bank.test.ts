import { describe, expect, it } from "vitest";
import { HONG_KONG, SHANGHAI } from "../../src/engine/constants";
import { bankAvailable, accrueInterest, checkBankInvite, visitBank } from "../../src/engine/bank";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("visitBank", () => {
  it("turns you away with nothing to bank", () => {
    const p = play(visitBank(makeHong({ cash: 0 }), new ScriptedRng()));
    expect(texts(p)).toEqual(["You have no reason to call on Mijnheer Brouwer, Taipan."]);
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
      "You do not have that much at De Wisselbank, Taipan.",
    ]);
    expect([h.cash, h.bank]).toEqual([400, 100]);
  });
});

describe("bankAvailable", () => {
  it("is only in Hong Kong", () => {
    expect(bankAvailable(makeHong())).toBe(true);
    expect(bankAvailable(makeHong({ time: 13, location: SHANGHAI }))).toBe(false);
  });

  it("is closed until we've opened an account", () => {
    expect(bankAvailable(makeHong({ bankOpen: false }))).toBe(false);
  });
});

describe("checkBankInvite", () => {
  const INVITE = "Taipan, Hendrik Brouwer of De Wisselbank, a Dutch bank of good reputation, has heard of our success and invites us to open an account. Our money would be safe there from thieves, and De Wisselbank may open the way to investment opportunities in future. Shall we open an account?";
  // a player without an account, out of debt, with 20,000 on hand
  const closed = (overrides = {}) => makeHong({ bankOpen: false, cash: 20000, debt: 0, ...overrides });

  it("counts arrivals in a row with a cash position of at least 20,000", () => {
    const h = closed({ location: SHANGHAI });
    play(checkBankInvite(h));
    play(checkBankInvite(h));
    expect(h.bankStreak).toBe(2);
    h.debt = 1;
    expect(play(checkBankInvite(h)).transcript).toEqual([]);
    expect(h.bankStreak).toBe(0);
  });

  it("invites us on the third such arrival in Hong Kong, and opens the account", () => {
    const h = closed({ bankStreak: 2 });
    const p = play(checkBankInvite(h), [true]);
    expect(texts(p)).toEqual([INVITE, "Very well, Taipan. Our account at De Wisselbank is open: we may call on Mijnheer Brouwer whenever we are in Hong Kong."]);
    expect([h.bankOpen, bankAvailable(h)]).toEqual([true, true]);
  });

  it("waits for Hong Kong, while the streak holds", () => {
    const h = closed({ location: SHANGHAI, bankStreak: 2 });
    expect(play(checkBankInvite(h)).transcript).toEqual([]);
    expect(h.bankStreak).toBe(3);
    h.location = HONG_KONG;
    expect(texts(play(checkBankInvite(h), [true]))[0]).toBe(INVITE);
  });

  it("asks again after three more arrivals if we decline", () => {
    const h = closed({ bankStreak: 2 });
    expect(texts(play(checkBankInvite(h), [false]))).toEqual([INVITE, "Very well, Taipan. Perhaps Mijnheer Brouwer will ask again."]);
    expect([h.bankOpen, h.bankStreak]).toEqual([false, 0]);
    expect(play(checkBankInvite(h)).transcript).toEqual([]);
    expect(play(checkBankInvite(h)).transcript).toEqual([]);
    expect(texts(play(checkBankInvite(h), [true]))[0]).toBe(INVITE);
  });

  it("does nothing once the account is open", () => {
    const h = makeHong({ cash: 20000, debt: 0 });
    expect(play(checkBankInvite(h)).transcript).toEqual([]);
    expect(h.bankStreak).toBe(0);
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

  it("rounds debt interest up, so even a debt of 1 grows", () => {
    const h = makeHong({ debt: 1 });
    accrueInterest(h);
    expect(h.debt).toBe(2);
    h.debt = 5001;
    accrueInterest(h);
    expect(h.debt).toBe(5502);
  });

  it("doesn't round exact debt interest up on float error", () => {
    const h = makeHong({ debt: 30 });
    accrueInterest(h);
    expect(h.debt).toBe(33);
  });

  it("charges no interest on no debt", () => {
    const h = makeHong({ debt: 0 });
    accrueInterest(h);
    expect(h.debt).toBe(0);
  });
});
