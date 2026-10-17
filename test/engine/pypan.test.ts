import { describe, expect, it } from "vitest";
import { GENERAL, HONG_KONG, SHANGHAI } from "../../src/engine/constants";
import type { Hong } from "../../src/engine/hong";
import { establishOpts, newGame } from "../../src/engine/pypan";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";

const MIN_PRICES = [0, 0, 0, 0, 0];

/** Answer prompts in order, continuing past says; returns the prompt texts seen. */
function drive(game: ReturnType<typeof newGame>["game"], answers: unknown[]): string[] {
  const seen: string[] = [];
  const queue = [...answers];
  while (game.prompt) {
    seen.push(game.prompt.text);
    if (game.prompt.kind === "say") {
      game.answer();
    } else if (queue.length > 0) {
      game.answer(queue.shift());
    } else {
      break;
    }
  }
  expect(queue).toEqual([]);
  return seen;
}

describe("starting a game", () => {
  it("offers guns or debt", () => {
    const { game, session } = newGame({ rng: new ScriptedRng(MIN_PRICES) });
    expect(game.prompt).toEqual({
      kind: "choose",
      text: "Would you like to start with:",
      options: ["Guns (and no debt)", "Debt (and no guns)"],
      cancellable: false,
    });
    expect(session.hong).toBeNull();
  });

  it("starts with guns: no extortion (no cash), then Wu offers business", () => {
    const saves: Hong[] = [];
    const { game, session } = newGame({ rng: new ScriptedRng(MIN_PRICES), onSave: (h) => saves.push(h) });
    game.answer(0);
    expect(session.hong).toMatchObject({ shipGuns: 5, cash: 0, debt: 0 });
    expect(game.prompt?.text).toBe("Do you have business with Elder Brother Wu, the moneylender, Taipan?");
    game.answer(false);
    expect(game.prompt?.text).toMatch(/What shall I do, Taipan\?$/);
    expect(saves).toEqual([session.hong]);
  });

  it("starts with debt: Li Yuen asks for a donation, then Wu offers business", () => {
    const { game, session } = newGame({ rng: new ScriptedRng([...MIN_PRICES, 0.5]) });
    const seen = drive(game, [1, false, false]);
    expect(seen).toEqual([
      "Would you like to start with:",
      "Li Yuen asks 81 in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?",
      "Very well. I would be wary of pirates if I were you, Taipan.",
      "Do you have business with Elder Brother Wu, the moneylender, Taipan?",
      expect.stringMatching(/What shall I do, Taipan\?$/),
    ]);
    expect(session.hong).toMatchObject({ cash: 400, debt: 5000 });
  });

  it("offers to restore a saved game", () => {
    const saved = makeHong({ cash: 0, debt: 0, location: HONG_KONG });
    const { game, session } = newGame({ rng: new ScriptedRng(), saved });
    expect(game.prompt).toMatchObject({ options: expect.arrayContaining(["Your last game restored"]) });
    game.answer(2);
    expect(session.hong).toBe(saved);
  });
});

describe("the port menu", () => {
  const labels = (h: Hong) => establishOpts(h, new ScriptedRng()).map(([l]) => l);

  it("offers everything in Hong Kong, including retiring when out of debt", () => {
    expect(labels(makeHong({ debt: 0 }))).toEqual([
      "Buy goods", "Sell goods", "Transfer goods", "Visit the bank", "Leave port", "Retire",
    ]);
  });

  it("won't let you retire while in debt", () => {
    expect(labels(makeHong({ debt: 1 }))).not.toContain("Retire");
  });

  it("only lets you retire in Hong Kong", () => {
    expect(labels(makeHong({ location: SHANGHAI, debt: 0 }))).not.toContain("Retire");
  });

  it("offers only trading and sailing elsewhere", () => {
    expect(labels(makeHong({ location: SHANGHAI }))).toEqual(["Buy goods", "Sell goods", "Leave port"]);
  });

  it("disables selling and transferring when there's nothing to move", () => {
    const enabled = (h: Hong) => establishOpts(h, new ScriptedRng()).map(([l, , e]) => [l, e]);
    expect(enabled(makeHong())).toEqual([
      ["Buy goods", true], ["Sell goods", false], ["Transfer goods", false],
      ["Visit the bank", true], ["Leave port", true],
    ]);
    expect(enabled(makeHong({ warehouseGoods: [1, 0, 0, 0, 0] }))).toContainEqual(["Transfer goods", true]);
    expect(enabled(makeHong({ shipGoods: [1, 0, 0, 0, 0] }))).toEqual(expect.arrayContaining([
      ["Sell goods", true], ["Transfer goods", true],
    ]));
  });
});

describe("game endings", () => {
  // a restored game in Hong Kong, out of debt; the extortion counter doesn't change
  const retiree = (overrides: Parameters<typeof makeHong>[0]) =>
    newGame({ rng: new ScriptedRng([1]), saved: makeHong({ debt: 0, extorted: 1, ...overrides }) });
  const RETIRE = 5;

  it("asks before retiring, and carries on if you change your mind", () => {
    const { game } = retiree({ cash: 5000, time: 12 });
    const seen = drive(game, [2, false, RETIRE, false]);
    expect(seen.slice(-2)).toEqual([
      "Are you sure you want to retire, Taipan?",
      expect.stringMatching(/What shall I do, Taipan\?$/),
    ]);
    expect(game.done).toBe(false);
  });

  it("scores a retirement: cash plus bank, less debt, per month, over 100", () => {
    const { game } = retiree({ cash: 700000, bank: 500000, time: 12 });
    const seen = drive(game, [2, false, RETIRE, true]);
    expect(seen.at(-1)).toBe("You're a M I L L I O N A I R E !!!");
    expect(game.result).toEqual({
      ending: "retired",
      position: 1200000,
      score: 1000,
      rank: "Taipan",
      report: expect.stringMatching(/^Your score is 1,000\./),
    });
  });

  it("makes no comment on a middling fortune", () => {
    const { game } = retiree({ cash: 5000, time: 12 });
    const seen = drive(game, [2, false, RETIRE, true]);
    expect(seen.at(-1)).toBe("Are you sure you want to retire, Taipan?");
    expect(game.result).toMatchObject({ ending: "retired", position: 5000, score: 4, rank: "Galley Hand" });
  });

  it("ends with 'sunk' when the ship sinks, without saving afterwards", () => {
    const saved = makeHong({ cash: 0, debt: 0, extorted: 1, shipDamage: 59 });
    const saves: Hong[] = [];
    // pirates: 3 ships; no Li Yuen; run fails, no partial escape; 2 damage sinks us
    const rng = new ScriptedRng([0, 2, 0.5, 100, 0, 1, 0, 2, 1, 0.5]);
    const { game } = newGame({ rng, saved, onSave: (h) => saves.push(h) });
    const seen = drive(game, [2, false, 4, SHANGHAI, 0]);
    expect(seen.slice(-3)).toEqual([
      "The buggers got us, Taipan!!",
      "It's all over now!!",
      "Have you considered a land-based job?",
    ]);
    expect(game.result).toMatchObject({ ending: "sunk", position: 0, score: 0, rank: "Galley Hand" });
    expect(saves).toHaveLength(1); // only the menu checkpoint before sailing
  });

});

describe("a whole game", () => {
  it("starts, buys, sails, sells, sails home and pays Li Yuen after refusing him", () => {
    const rng = new ScriptedRng([
      ...MIN_PRICES, //            starting prices: general at 5
      0.5, //                      Li Yuen asks 81
      1, 1, 1, //                  to Shanghai: no pirates, no Li Yuen (1-in-10), no storm
      //                           (he holds a grudge, so no counter roll) -> lieutenant
      2, 0, 0, 0, 0, 1, //         Shanghai prices: general at 5 x 3 = 15; no shock
      1, 1, 1, //                  back home: no pirates, no Li Yuen, no storm
      0.5, //                      Li Yuen asks 201 x 1.5 = 301
      ...MIN_PRICES, 1, //         Hong Kong prices; no shock
    ]);
    const saves: number[] = [];
    const { game, session } = newGame({ rng, onSave: (h) => saves.push(h.cash) });

    const seen = drive(game, [
      1, false, false, //          debt start; refuse Li Yuen; no business with Wu
      0, GENERAL, 60, //           buy 60 general for 300
      4, SHANGHAI, //              leave port for Shanghai
      1, true, //                  sell all 60 general for 900
      2, HONG_KONG, //             leave port for Hong Kong
      false, true, //              no business with Wu; pay Li Yuen
    ]);

    expect(seen).toContain("Li Yuen has sent a Lieutenant, Taipan.  He says his admiral is still waiting for you in Hong Kong!");
    expect(seen).toContain("Li Yuen has not forgotten your refusal, Taipan.");
    expect(seen).toContain("Li Yuen asks 301 in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?");
    // back at the menu, still in debt, so no retiring yet
    expect(game.prompt).toMatchObject({ kind: "choose" });
    expect(game.prompt?.kind === "choose" && game.prompt.options).not.toContain("Retire");
    expect(rng.remaining).toBe(0);
    expect(session.hong).toMatchObject({
      location: HONG_KONG, month: 3, cash: 699, debt: 6050, extorted: 1, grudge: 0,
      shipGoods: [0, 0, 0, 0, 0],
    });
    // saved at each menu: HK, HK, Shanghai, Shanghai, HK
    expect(saves).toEqual([400, 100, 100, 1000, 699]);
  });
});
