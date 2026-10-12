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

  it("can blow the ship off course", () => {
    const p = play(checkStorm(makeHong(), new ScriptedRng([0, 1, 0, MANILA]), SHANGHAI));
    expect(p.transcript[1]?.prompt.text).toBe("We made it, but we got blown off course to Manila!");
    expect(p.game.result).toBe(MANILA);
  });

  it("can't add damage past 80 points", () => {
    const h = makeHong({ shipDamage: 80 });
    // no damage roll is made; straight to the blown-off-course roll
    const p = play(checkStorm(h, new ScriptedRng([0, 1]), SHANGHAI));
    expect(p.transcript[1]?.prompt.text).toBe("We made it!");
    expect(h.shipDamage).toBe(80);
  });
});
