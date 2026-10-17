import { describe, expect, it } from "vitest";
import { SHANGHAI } from "../../src/engine/constants";
import { checkExtortion } from "../../src/engine/extortion";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

describe("checkExtortion", () => {
  it("demands a donation at the very start of the game", () => {
    const h = makeHong({ time: 1 });
    // cost = trunc(400 / 2.5 * 0.5) + 1
    const p = play(checkExtortion(h, new ScriptedRng([0.5])), [true]);
    expect(texts(p)).toEqual([
      "Li Yuen asks 81 in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?",
    ]);
    expect([h.cash, h.extorted]).toEqual([319, 1]);
  });

  it("warns you if you refuse, and asks again next time", () => {
    const h = makeHong({ time: 1 });
    const p = play(checkExtortion(h, new ScriptedRng([0.5])), [false]);
    expect(texts(p).at(-1)).toBe("Very well. I would be wary of pirates if I were you, Taipan.");
    expect([h.cash, h.extorted]).toEqual([400, 0]);
  });

  it("leaves you alone while the counter is non-zero", () => {
    const h = makeHong({ time: 5, extorted: 1 });
    const p = play(checkExtortion(h, new ScriptedRng([1])));
    expect(p.transcript).toEqual([]);
    expect(h.extorted).toBe(1);
  });

  it("advances the counter 1-in-20, wrapping back to a demand", () => {
    const h = makeHong({ time: 5, extorted: 2 });
    play(checkExtortion(h, new ScriptedRng([20])));
    expect(h.extorted).toBe(3);
    const p = play(checkExtortion(h, new ScriptedRng([0, 0.5])), [false]);
    expect(h.extorted).toBe(0);
    expect(texts(p)[0]).toMatch(/^Li Yuen asks/);
  });

  it("summons you to Hong Kong when you're away", () => {
    const h = makeHong({ time: 5, location: SHANGHAI });
    const p = play(checkExtortion(h, new ScriptedRng([1])));
    expect(texts(p)).toEqual([
      "Li Yuen has sent a Lieutenant, Taipan.  He says his admiral wishes to see you in Hong Kong, posthaste!",
    ]);
  });

  it("asks for much more after a year, and Wu can cover it", () => {
    const h = makeHong({ time: 13, cash: 400, debt: 5000 });
    // no counter change; early roll (discarded); 13000 + randrange(13000)
    const p = play(checkExtortion(h, new ScriptedRng([1, 0.5, 500])), [true, true]);
    expect(texts(p)[0]).toBe(
      "Li Yuen asks 13,500 in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?",
    );
    expect(texts(p).at(-1)).toBe(
      "Elder Brother Wu has given Li Yuen the difference and added the same amount to your debt.",
    );
    expect([h.cash, h.debt, h.extorted]).toEqual([0, 18100, 1]);
  });

  it("asks a share of your cash position once that's more than time x 1000", () => {
    const h = makeHong({ time: 13, cash: 1000000, bank: 1500000, debt: 500000 });
    // 3% of 2,000,000 = 60000, plus randrange(60000)
    const p = play(checkExtortion(h, new ScriptedRng([1, 0.5, 500])), [true]);
    expect(texts(p)[0]).toBe(
      "Li Yuen asks 60,500 in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?",
    );
    expect([h.cash, h.bank, h.extorted]).toEqual([939500, 1500000, 1]);
  });

  it("stays unpaid if you won't take Wu's help, and holds it against you", () => {
    const h = makeHong({ time: 13 });
    const p = play(checkExtortion(h, new ScriptedRng([1, 0.5, 500])), [true, false]);
    expect([h.cash, h.debt, h.extorted, h.grudge]).toEqual([400, 5000, 0, 1]);
    // Wu's refusal carries the first warning
    expect(texts(p).at(-1)).toBe(
      "Very well. Elder Brother Wu will not assist you. I would be wary of pirates if I were you, Taipan.",
    );
    const again = play(checkExtortion(h, new ScriptedRng([0.5, 500])), [true, false]);
    expect(texts(again).at(-1)).toBe("Li Yuen will remember this, Taipan. His fleet is looking for you.");
    expect(h.grudge).toBe(2);
  });
});

describe("Li Yuen's grudge", () => {
  it("grows with each refusal: a bigger demand and a sterner warning, up to a limit", () => {
    const h = makeHong({ time: 13 });
    const seen = [];
    for (let i = 0; i < 4; i++) {
      // the counter only rolls before the first refusal; then 13000 + randrange(13000)
      const rolls = i === 0 ? [1, 0.5, 0] : [0.5, 0];
      seen.push([...texts(play(checkExtortion(h, new ScriptedRng(rolls)), [false])), h.grudge]);
    }
    const ask = (n: string) => `Li Yuen asks ${n} in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?`;
    const reminder = "Li Yuen has not forgotten your refusal, Taipan.";
    const hunted = "Li Yuen has put a price on your head, Taipan! His whole fleet is hunting you.";
    expect(seen).toEqual([
      [ask("13,000"), "Very well. I would be wary of pirates if I were you, Taipan.", 1],
      [reminder, ask("19,500"), "Li Yuen will remember this, Taipan. His fleet is looking for you.", 2],
      [reminder, ask("26,000"), hunted, 3],
      [reminder, ask("32,500"), hunted, 3],
    ]);
    expect(h.extorted).toBe(0);
  });

  it("is forgotten once you pay", () => {
    const h = makeHong({ time: 13, cash: 100000, grudge: 2 });
    play(checkExtortion(h, new ScriptedRng([0.5, 0])), [true]);
    expect([h.cash, h.extorted, h.grudge]).toEqual([74000, 1, 0]);
  });

  it("keeps him from cooling off, and his lieutenant comes every time", () => {
    const h = makeHong({ time: 5, location: SHANGHAI, grudge: 1 });
    const p = play(checkExtortion(h, new ScriptedRng([])));
    expect(texts(p)).toEqual([
      "Li Yuen has sent a Lieutenant, Taipan.  He says his admiral is still waiting for you in Hong Kong!",
    ]);
    expect(h.extorted).toBe(0);
  });
});
