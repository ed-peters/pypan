import { describe, expect, it } from "vitest";
import { MANILA, SHANGHAI } from "../../src/engine/constants";
import { ScriptedRng } from "../../src/engine/rng";
import { checkStorm } from "../../src/engine/storm";
import { makeHong } from "../helpers/hong";
import { play } from "../helpers/play";

describe("checkStorm", () => {
  it("usually brings no storm", () => {
    const p = play(checkStorm(makeHong(), new ScriptedRng([1]), SHANGHAI));
    expect(p.transcript).toEqual([]);
    expect(p.game.result).toBe(SHANGHAI);
  });

  it("can damage the ship, with storm art on the outcome", () => {
    const h = makeHong();
    const p = play(checkStorm(h, new ScriptedRng([0, 0, 3]), SHANGHAI));
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "say", text: "Storm, Taipan!" },
      { kind: "say", text: "We made it, but we took some damage!", art: "storm" },
    ]);
    expect(h.shipDamage).toBe(8);
    expect(p.game.result).toBe(SHANGHAI);
  });

  it("does 5-20 points of damage", () => {
    // inRange(5, 21) = 5 + randrange(16)
    for (const [roll, damage] of [[0, 5], [15, 20], [16, 5]]) {
      const h = makeHong();
      play(checkStorm(h, new ScriptedRng([0, 0, roll!]), SHANGHAI));
      expect(h.shipDamage).toBe(damage);
    }
  });

  it("can blow the ship off course", () => {
    const p = play(checkStorm(makeHong(), new ScriptedRng([0, 1, 0, MANILA]), SHANGHAI));
    expect(p.transcript[1]?.prompt.text).toBe("We made it, but we got blown off course to Manila!");
    expect(p.game.result).toBe(MANILA);
  });

  it("won't damage a ship that is already 80% damaged", () => {
    const h = makeHong({ shipDamage: 48 }); // 48 of 60 = 80%
    // no damage roll is made; straight to the blown-off-course roll
    const p = play(checkStorm(h, new ScriptedRng([0, 1]), SHANGHAI));
    expect(p.transcript[1]?.prompt.text).toBe("We made it!");
    expect(h.shipDamage).toBe(48);
  });

  it("measures the 80% against the ship's size, not raw damage points", () => {
    const h = makeHong({ shipDamage: 80, shipSize: 210 }); // 38%
    play(checkStorm(h, new ScriptedRng([0, 0, 3]), SHANGHAI));
    expect(h.shipDamage).toBe(88);
  });

  it("breaks 10-30% of the porcelain aboard", () => {
    const h = makeHong({ shipGoods: [0, 0, 0, 0, 100] });
    // storm; no damage; not blown off course; inRange(10, 31) = 10 + 0
    const p = play(checkStorm(h, new ScriptedRng([0, 1, 1, 0]), SHANGHAI));
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "say", text: "Storm, Taipan!" },
      { kind: "say", text: "We made it!", art: "storm" },
      { kind: "say", text: "The storm broke 10 of our porcelain, Taipan!", art: "storm" },
    ]);
    expect(h.shipGoods[4]).toBe(90);
  });

  it("has rough seas 1-in-5 voyages without a storm, breaking 5-15% of the porcelain", () => {
    const h = makeHong({ shipGoods: [0, 0, 0, 0, 100] });
    // no storm; rough seas; inRange(5, 16) = 5 + 10
    const p = play(checkStorm(h, new ScriptedRng([1, 0, 10]), SHANGHAI));
    expect(p.transcript.map((e) => e.prompt)).toEqual([
      { kind: "say", text: "Rough seas, Taipan! 15 of our porcelain was broken.", art: "storm" },
    ]);
    expect([h.shipGoods[4], p.game.result]).toEqual([85, SHANGHAI]);
    // calm seas
    expect(play(checkStorm(h, new ScriptedRng([1, 1]), SHANGHAI)).transcript).toEqual([]);
  });
});
