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
    play(checkExtortion(h, new ScriptedRng([0])));
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

  it("stays unpaid if you won't take Wu's help", () => {
    const h = makeHong({ time: 13 });
    play(checkExtortion(h, new ScriptedRng([1, 0.5, 500])), [true, false]);
    expect([h.cash, h.debt, h.extorted]).toEqual([400, 5000, 0]);
  });
});
