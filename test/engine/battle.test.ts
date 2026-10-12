import { describe, expect, it } from "vitest";
import { GENERAL, SILK } from "../../src/engine/constants";
import { PIRATE_KING, PirateBattle, checkPirates } from "../../src/engine/battle";
import { newHong, type Hong } from "../../src/engine/hong";
import { ScriptedRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// Battle setup rolls: pirate count randrange(shipSize/10 + guns), health float,
// booty randrange(1000). With these, at time 1: 3 pirates, health 30, booty
// trunc(1/4 * 1000 * 3 + 100 + 250) = 1100.
const SETUP = [2, 0.5, 100];

function gunHong(overrides: Partial<Hong> = {}): Hong {
  return Object.assign(newHong(new ScriptedRng([0, 0, 0, 0, 0]), true), { cash: 0 }, overrides);
}

function battle(h: Hong, rolls: number[]): { b: PirateBattle; rng: ScriptedRng } {
  const rng = new ScriptedRng([...SETUP, ...rolls]);
  return { b: new PirateBattle(h, rng), rng };
}

describe("PirateBattle setup", () => {
  it("rolls pirates, health and booty", () => {
    const { b } = battle(gunHong(), []);
    expect(b.pirates).toBe(3);
    expect(b.currHealth).toBe(30);
    expect(b.booty).toBe(1100);
    expect(b.enemyDamage).toBe(0.5);
  });

  it("gets tougher in later years", () => {
    const { b } = battle(gunHong({ year: 1862, month: 1 }), []);
    expect(b.baseHealth).toBe(40);
    expect(b.enemyDamage).toBe(1.5);
    // time 25: 25/4 * 1000 * 3 + 350
    expect(b.booty).toBe(19100);
  });

  it("offers only the actions that make sense", () => {
    const labels = (h: Hong) => battle(h, []).b.getOpts().map(([l]) => l);
    expect(labels(gunHong())).toEqual(["Fire cannons", "Run away"]);
    expect(labels(makeHong({ shipGoods: [1, 0, 0, 0, 0] }))).toEqual(["Dump cargo", "Run away"]);
    expect(labels(makeHong())).toEqual(["Run away"]);
  });
});

describe("fighting", () => {
  it("wins by sinking every ship, and takes the booty", () => {
    const h = gunHong();
    // three 39-point hits each sink a ship (new ships at health 20), then two misses
    const { b } = battle(h, [29, 0, 29, 0, 29, 0, 0, 0]);
    const p = play(b.execute(), [0]);
    expect(p.transcript.map((e) => [e.prompt.text, e.prompt.art])).toEqual([
      ["3 hostile ships approaching, Taipan!", undefined],
      ["3 enemies remaining ... What shall we do, Taipan?", "pirates"],
      ["Aye, we'll fire our cannons at 'em, Taipan!", "pirates"],
      ["Aye, we'll fire our cannons at 'em, Taipan!\n\nWe got all of the buggers!", "pirates"],
      ["We won the battle, Taipan, and we captured some booty worth 1,100!", "pirates"],
    ]);
    expect(h.cash).toBe(1100);
  });

  it("holds fire once every ship is sunk", () => {
    const h = gunHong({ shipGuns: 2 });
    // one ship, sunk by the first gun; the second gun doesn't fire
    const rng = new ScriptedRng([0, 0.5, 100, 29, 0]);
    const b = new PirateBattle(h, rng);
    expect(b.pirates).toBe(1);
    const p = play(b.execute(), [0]);
    expect(b.pirates).toBe(0);
    expect(texts(p)).toContain("Aye, we'll fire our cannons at 'em, Taipan!\n\nWe got all of the buggers!");
    expect(texts(p).at(-1)).toMatch(/We won the battle/);
    expect(rng.remaining).toBe(0);
  });

  it("takes return fire after a miss", () => {
    const h = gunHong({ shipGuns: 1 });
    // one 10-point hit; gun-hit roll 50 (no); damage = trunc(0.5 * 3 * 1 * 0.5 + 1.5)
    const rng = new ScriptedRng([2, 0.5, 100, 0, 50, 0.5]);
    const p = play(new PirateBattle(h, rng).execute(), [0]);
    expect(texts(p).slice(3)).toEqual([
      "Aye, we'll fire our cannons at 'em, Taipan!\n\nThey're still after us!",
      "They're firing on us, Taipan!",
      "They're firing on us, Taipan!\n\nThey hit us!",
      "3 enemies remaining ... What shall we do, Taipan?",
    ]);
    expect(h.shipDamage).toBe(2);
  });

  it("always hits a gun when the ship is over 80% damaged", () => {
    const h = gunHong({ shipGuns: 1, shipDamage: 50 });
    // no gun-hit roll needed
    const rng = new ScriptedRng([2, 0.5, 100, 0, 0.5]);
    const p = play(new PirateBattle(h, rng).execute(), [0]);
    expect(texts(p)).toContain("They're firing on us, Taipan!\n\nThe buggers hit a gun!");
    expect([h.shipGuns, h.shipSize]).toEqual([0, 70]);
  });
});

describe("running", () => {
  it("can escape, with no booty", () => {
    const h = makeHong({ cash: 0 });
    const { b } = battle(h, [4, 0]);
    const p = play(b.execute(), [0]);
    expect(texts(p).slice(2)).toEqual([
      "Aye, we'll set sails and run, Taipan!",
      "We got away from 'em, Taipan!",
    ]);
    expect(b.fled).toBe(true);
    expect(h.cash).toBe(0);
  });

  it("can shake off some of the pirates", () => {
    const h = makeHong();
    // fail (0 > 2 is false); partial 1-in-5; lost = randrange(1) + 1; then return fire
    const { b } = battle(h, [0, 2, 0, 0, 0.5]);
    const p = play(b.execute(), [0]);
    expect(texts(p)).toContain("Couldn't lose 'em, Taipan, but we escaped from 1 of 'em!");
    expect(b.pirates).toBe(2);
  });

  it("gets better odds with each attempt", () => {
    const h = makeHong();
    const { b } = battle(h, [0, 2, 1, 0.5, 0, 2, 1, 0.5]);
    const p = play(b.execute(), [0, 0]);
    expect(texts(p).filter((t) => t === "Couldn't lose 'em, Taipan!")).toHaveLength(2);
    // 3 + 2 + 3
    expect(b.runOk).toBe(8);
  });
});

describe("dumping cargo", () => {
  it("throws goods overboard, improving escape odds by 1 per 10 units", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const { b } = battle(h, [0.5]);
    const p = play(b.execute(), [0, GENERAL, 50]);
    expect(p.transcript[3]?.prompt).toEqual({
      kind: "number", text: "How much General shall I toss overboard, Taipan?", max: 50, art: "pirates",
    });
    expect(h.shipGoods[GENERAL]).toBe(0);
    expect(b.runOk).toBe(3 + 5);
  });

  it("helps escape odds by at least 1 for any cargo dumped", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const { b } = battle(h, [0.5]);
    play(b.execute(), [0, GENERAL, 3]);
    expect(b.runOk).toBe(3 + 1);
  });

  it("does nothing when dumping none", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const { b } = battle(h, [0.5]);
    play(b.execute(), [0, GENERAL, 0]);
    expect(b.runOk).toBe(3);
    expect(h.shipGoods[GENERAL]).toBe(50);
  });

  it("won't dump what isn't aboard", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const p = play(battle(h, [0.5]).b.execute(), [0, SILK]);
    expect(texts(p)).toContain("We don't have any, Taipan!");
  });

  it("won't dump more than is aboard", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const p = play(battle(h, [0.5]).b.execute(), [0, GENERAL, 51]);
    expect(texts(p)).toContain("We don't have enough on board, Taipan!");
    expect(h.shipGoods[GENERAL]).toBe(50);
  });
});

describe("checkPirates", () => {
  it("attacks 1-in-pirateChance voyages", () => {
    expect(play(checkPirates(makeHong(), new ScriptedRng([1]))).transcript).toEqual([]);
    const p = play(checkPirates(makeHong(), new ScriptedRng([0, ...SETUP])));
    expect(texts(p)[0]).toBe("3 hostile ships approaching, Taipan!");
  });
});

it("Li Yuen's ships hit twice as hard", () => {
  const rng = new ScriptedRng([...SETUP, 0.5]);
  const b = new PirateBattle(gunHong(), rng, PIRATE_KING);
  // trunc(0.5 * 3 * 2 * 0.5 + 1.5)
  expect(b.calculateDamage()).toBe(3);
});
