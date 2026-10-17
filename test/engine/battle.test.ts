import { describe, expect, it } from "vitest";
import { GENERAL, SILK } from "../../src/engine/constants";
import { PIRATE_KING, PIRATE_NAMES, PirateBattle, checkPirates, liYuenSighting } from "../../src/engine/battle";
import { newHong, type Hong } from "../../src/engine/hong";
import { ScriptedRng, SeededRng } from "../../src/engine/rng";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// Battle setup rolls: pirate count randrange(shipSize/10 + guns), health float,
// booty randrange(1000). With these, at time 1: 3 pirates, health 30, booty
// trunc(1/4 * 1000 * 3 + 100 + 250) = 1100.
// The last setup roll picks who the pirates are: 0 is "hostile ships". Li Yuen's
// fleet doesn't roll for it.
const SETUP = [2, 0.5, 100, 0];
const KING_SETUP = [2, 0.5, 100];

// Each round of a regular battle starts with a 1-in-20 roll for Li Yuen to interrupt.
const NO_LI_YUEN = 1;
const LI_YUEN = 0;

function gunHong(overrides: Partial<Hong> = {}): Hong {
  return Object.assign(newHong(new ScriptedRng([0, 0, 0, 0, 0]), true), { cash: 0 }, overrides);
}

function battle(h: Hong, rolls: number[], against?: number): { b: PirateBattle; rng: ScriptedRng } {
  const rng = new ScriptedRng([...(against === PIRATE_KING ? KING_SETUP : SETUP), ...rolls]);
  return { b: new PirateBattle(h, rng, against), rng };
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
    // three 39-point hits each sink a ship (new ships at health 20); the rest hold fire
    const { b, rng } = battle(h, [NO_LI_YUEN, 29, 0, 29, 0, 29, 0]);
    const p = play(b.execute(), [0]);
    expect(p.transcript.map((e) => [e.prompt.text, e.prompt.art])).toEqual([
      ["3 hostile ships approaching, Taipan!", undefined],
      ["3 enemies remaining ... What shall we do, Taipan?", "pirates"],
      ["Aye, we'll fire our cannons at 'em, Taipan!", "pirates"],
      ["Aye, we'll fire our cannons at 'em, Taipan!\n\nWe got all of the buggers!", "pirates"],
      ["We won the battle, Taipan, and we captured some booty worth 1,100!", "pirates"],
    ]);
    expect(h.cash).toBe(1100);
    expect(p.game.result).toBe("won");
    expect(rng.remaining).toBe(0);
  });

  it("holds fire once every ship is sunk", () => {
    const h = gunHong({ shipGuns: 2 });
    // one ship, sunk by the first gun; the second gun doesn't fire
    const rng = new ScriptedRng([0, 0.5, 100, 0, NO_LI_YUEN, 29, 0]);
    const b = new PirateBattle(h, rng);
    expect(b.pirates).toBe(1);
    const p = play(b.execute(), [0]);
    expect(b.pirates).toBe(0);
    expect(texts(p)).toContain("Aye, we'll fire our cannons at 'em, Taipan!\n\nWe got all of the buggers!");
    expect(texts(p).at(-1)).toMatch(/We won the battle/);
    expect(rng.remaining).toBe(0);
  });

  it("names the pirates at random, one ship or several", () => {
    const named = (pirates: number, name: number) =>
      // stops at the first choice, after the announcement
      texts(play(new PirateBattle(makeHong(), new ScriptedRng([pirates - 1, 0.5, 100, name, NO_LI_YUEN])).execute()))[0];
    expect(PIRATE_NAMES).toHaveLength(6);
    expect(named(3, 0)).toBe("3 hostile ships approaching, Taipan!");
    expect(named(1, 0)).toBe("1 hostile ship approaching, Taipan!");
    expect(named(4, 1)).toBe("4 war junks of the Black Hand approaching, Taipan!");
    expect(named(1, 5)).toBe("1 snake boat of the Widow Ching's fleet approaching, Taipan!");
  });

  it("takes one tap a round: every message is a beat but the last before our next choice", () => {
    const h = gunHong({ shipGuns: 1 });
    // as below: we fire and miss, they hit us
    const rng = new ScriptedRng([2, 0.5, 100, 0, NO_LI_YUEN, 0, 50, 0.5, NO_LI_YUEN]);
    const p = play(new PirateBattle(h, rng).execute(), [0]);
    // we fire; we missed; they fire; they hit us
    const round = p.transcript.slice(2).filter((e) => e.prompt.kind === "say");
    expect(round.map((e) => e.prompt.kind === "say" && e.prompt.pause === true)).toEqual([true, true, true, false]);
  });

  it("goes down in beats, ending on one tap", () => {
    const h = makeHong({ shipDamage: 59 });
    const { b } = battle(h, [NO_LI_YUEN, 0, 2, 1, 0.5]);
    const p = play(b.execute(), [0]);
    const pauses = p.transcript.slice(-3).map((e) => e.prompt.kind === "say" && e.prompt.pause === true);
    expect(pauses).toEqual([true, true, false]);
  });

  it("takes return fire after a miss", () => {
    const h = gunHong({ shipGuns: 1 });
    // one 10-point hit; gun-hit roll 50 (no); damage = trunc(0.5 * 3 * 1 * 0.5 + 1.5)
    const rng = new ScriptedRng([2, 0.5, 100, 0, NO_LI_YUEN, 0, 50, 0.5, NO_LI_YUEN]);
    const p = play(new PirateBattle(h, rng).execute(), [0]);
    expect(texts(p).slice(3)).toEqual([
      "Aye, we'll fire our cannons at 'em, Taipan!\n\nThey're still after us!",
      "They're firing on us, Taipan!",
      "They're firing on us, Taipan!\n\nThey hit us!",
      "3 enemies remaining ... What shall we do, Taipan?",
    ]);
    expect(h.shipDamage).toBe(2);
  });

  it("smashes 5-20% of the porcelain aboard with every volley", () => {
    const h = gunHong({ shipGuns: 1, shipGoods: [0, 0, 0, 0, 50] });
    // as above, then inRange(5, 21) = 5 + 0: 5% of 50
    const rng = new ScriptedRng([2, 0.5, 100, 0, NO_LI_YUEN, 0, 50, 0.5, 0, NO_LI_YUEN]);
    const p = play(new PirateBattle(h, rng).execute(), [0]);
    expect(texts(p)).toContain("They're firing on us, Taipan!\n\nThey hit us!\n\nThey smashed 2 of our porcelain!");
    expect(h.shipGoods[4]).toBe(48);
  });

  it("always hits a gun when the ship is over 80% damaged", () => {
    const h = gunHong({ shipGuns: 1, shipDamage: 50 });
    // no gun-hit roll needed
    const rng = new ScriptedRng([2, 0.5, 100, 0, NO_LI_YUEN, 0, 0.5, NO_LI_YUEN]);
    const p = play(new PirateBattle(h, rng).execute(), [0]);
    expect(texts(p)).toContain("They're firing on us, Taipan!\n\nThe buggers hit a gun!");
    expect([h.shipGuns, h.shipSize]).toEqual([0, 70]);
  });
});

describe("sinking", () => {
  it("sinks the ship when damage reaches its size", () => {
    const h = makeHong({ shipDamage: 59 });
    // run fails (0 > 2 is false); no partial escape; damage 2 -> 61 of 60
    const { b, rng } = battle(h, [NO_LI_YUEN, 0, 2, 1, 0.5]);
    const p = play(b.execute(), [0]);
    expect(texts(p).slice(-3)).toEqual([
      "They're firing on us, Taipan!\n\nThey hit us!",
      "The buggers got us, Taipan!!",
      "It's all over now!!",
    ]);
    expect(p.game.result).toBe("sunk");
    expect(rng.remaining).toBe(0);
  });

  it("keeps fighting while the ship is still afloat", () => {
    const h = makeHong({ shipDamage: 57 });
    const { b } = battle(h, [NO_LI_YUEN, 0, 2, 1, 0.5, NO_LI_YUEN]);
    const p = play(b.execute(), [0]);
    expect(h.shipDamage).toBe(59);
    expect(p.game.done).toBe(false);
  });
});

describe("Li Yuen interrupting", () => {
  it("can drive the pirates off at the start of a round, ending the battle with no booty", () => {
    const h = gunHong();
    const { b, rng } = battle(h, [LI_YUEN]);
    const p = play(b.execute());
    expect(texts(p)).toEqual([
      "3 hostile ships approaching, Taipan!",
      "Li Yuen's fleet drove them off, Taipan!!",
    ]);
    expect(p.game.result).toBe("interrupted");
    expect(h.cash).toBe(0);
    expect(rng.remaining).toBe(0);
  });

  it("can interrupt in a later round", () => {
    const h = gunHong({ shipGuns: 1 });
    const { b } = battle(h, [NO_LI_YUEN, 0, 50, 0.5, LI_YUEN]);
    const p = play(b.execute(), [0]);
    expect(texts(p).at(-1)).toBe("Li Yuen's fleet drove them off, Taipan!!");
    expect(p.game.result).toBe("interrupted");
  });
});

describe("running", () => {
  it("can escape, with no booty", () => {
    const h = makeHong({ cash: 0 });
    const { b } = battle(h, [NO_LI_YUEN, 4, 0]);
    const p = play(b.execute(), [0]);
    expect(texts(p).slice(2)).toEqual([
      "Aye, we'll set sails and run, Taipan!",
      "We got away from 'em, Taipan!",
    ]);
    expect(b.fled).toBe(true);
    expect(p.game.result).toBe("fled");
    expect(h.cash).toBe(0);
  });

  it("can shake off some of the pirates", () => {
    const h = makeHong();
    // fail (0 > 2 is false); partial 1-in-5; lost = randrange(1) + 1; then return fire
    const { b } = battle(h, [NO_LI_YUEN, 0, 2, 0, 0, 0.5, NO_LI_YUEN]);
    const p = play(b.execute(), [0]);
    expect(texts(p)).toContain("Couldn't lose 'em, Taipan, but we escaped from 1 of 'em!");
    expect(b.pirates).toBe(2);
  });

  it("gets better odds with each attempt", () => {
    const h = makeHong();
    const { b } = battle(h, [NO_LI_YUEN, 0, 2, 1, 0.5, NO_LI_YUEN, 0, 2, 1, 0.5, NO_LI_YUEN]);
    const p = play(b.execute(), [0, 0]);
    expect(texts(p).filter((t) => t === "Couldn't lose 'em, Taipan!")).toHaveLength(2);
    // 3 + 2 + 3
    expect(b.runOk).toBe(8);
  });
});

describe("dumping cargo", () => {
  // dump, then return fire (no guns, so just the damage roll), then the next round
  const ROUND = [NO_LI_YUEN, 0.5, NO_LI_YUEN];

  it("throws goods overboard, improving escape odds by 1 per 10 units", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const { b } = battle(h, ROUND);
    const p = play(b.execute(), [0, GENERAL, 50]);
    expect(p.transcript[3]?.prompt).toEqual({
      kind: "number", text: "How much General shall I toss overboard, Taipan?", max: 50, art: "pirates",
    });
    expect(h.shipGoods[GENERAL]).toBe(0);
    expect(b.runOk).toBe(3 + 5);
  });

  it("helps escape odds by at least 1 for any cargo dumped", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const { b } = battle(h, ROUND);
    play(b.execute(), [0, GENERAL, 3]);
    expect(b.runOk).toBe(3 + 1);
  });

  it("does nothing when dumping none", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const { b } = battle(h, ROUND);
    play(b.execute(), [0, GENERAL, 0]);
    expect(b.runOk).toBe(3);
    expect(h.shipGoods[GENERAL]).toBe(50);
  });

  it("won't dump what isn't aboard", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const p = play(battle(h, ROUND).b.execute(), [0, SILK]);
    expect(texts(p)).toContain("We don't have any, Taipan!");
  });

  it("won't dump more than is aboard", () => {
    const h = makeHong({ shipGoods: [50, 0, 0, 0, 0] });
    const p = play(battle(h, ROUND).b.execute(), [0, GENERAL, 51]);
    expect(texts(p)).toContain("We don't have enough on board, Taipan!");
    expect(h.shipGoods[GENERAL]).toBe(50);
  });
});

describe("Li Yuen's fleet", () => {
  it("has 5 to (capacity / 5 + guns) ships", () => {
    // capacity 60, no guns: 5 + randrange(8)
    const count = (h: Hong, roll: number) => new PirateBattle(h, new ScriptedRng([roll, 0.5, 100]), PIRATE_KING).pirates;
    expect(count(makeHong(), 0)).toBe(5);
    expect(count(makeHong(), 7)).toBe(12);
    expect(count(makeHong(), 8)).toBe(5);
    // capacity 60 with 5 guns: up to 17
    expect(count(gunHong(), 12)).toBe(17);
  });

  it("brings 3 more ships for each refusal", () => {
    const count = (roll: number) => new PirateBattle(makeHong({ grudge: 2 }), new ScriptedRng([roll, 0.5, 100]), PIRATE_KING).pirates;
    // 11 + randrange(8)
    expect(count(0)).toBe(11);
    expect(count(7)).toBe(18);
  });

  it("always has at least 5 ships, even against a tiny ship", () => {
    const b = new PirateBattle(makeHong({ shipSize: 10 }), new ScriptedRng([0, 0.5, 100]), PIRATE_KING);
    expect(b.pirates).toBe(5);
  });

  it("announces itself, and never interrupts its own battle", () => {
    const h = makeHong();
    // 5 + randrange(8) = 7 ships; run: randrange(5) = 4 > randrange(7) = 0, so we escape
    const { b, rng } = battle(h, [4, 0], PIRATE_KING);
    const p = play(b.execute(), [0]);
    expect(texts(p)[0]).toBe("7 ships of Li Yuen's pirate fleet, Taipan!!!");
    expect(p.game.result).toBe("fled");
    expect(rng.remaining).toBe(0);
  });

  it("hits twice as hard", () => {
    const rng = new ScriptedRng([...KING_SETUP, 0.5]);
    const b = new PirateBattle(gunHong(), rng, PIRATE_KING);
    // 7 ships: trunc(0.5 * 7 * 2 * 0.5 + 3.5)
    expect(b.calculateDamage()).toBe(7);
  });
});

describe("checkPirates", () => {
  it("usually brings no pirates at all", () => {
    const rng = new ScriptedRng([1, 1]);
    const p = play(checkPirates(makeHong(), rng));
    expect(p.transcript).toEqual([]);
    expect(p.game.result).toBeNull();
    expect(rng.remaining).toBe(0);
  });

  it("attacks with regular pirates 1-in-pirateChance voyages", () => {
    const p = play(checkPirates(makeHong(), new ScriptedRng([0, ...SETUP, NO_LI_YUEN])));
    expect(texts(p)[0]).toBe("3 hostile ships approaching, Taipan!");
  });

  it("doesn't send Li Yuen after a regular battle that ends normally", () => {
    const rng = new ScriptedRng([0, ...SETUP, NO_LI_YUEN, 4, 0]);
    const p = play(checkPirates(makeHong(), rng), [0]);
    expect(p.game.result).toBe("fled");
    expect(rng.remaining).toBe(0);
  });

  it("can send Li Yuen when there are no regular pirates; he lets you be if you've paid", () => {
    const p = play(checkPirates(makeHong({ extorted: 1 }), new ScriptedRng([1, 0])));
    expect(texts(p)).toEqual(["Li Yuen's pirates, Taipan!!!", "Good joss!! They let us be!!"]);
    expect(p.game.result).toBeNull();
  });

  it("has Li Yuen attack if you haven't paid", () => {
    const p = play(checkPirates(makeHong({ extorted: 0 }), new ScriptedRng([1, 0, 0, 0.5, 100])));
    expect(texts(p)).toEqual([
      "Li Yuen's pirates, Taipan!!!",
      "5 ships of Li Yuen's pirate fleet, Taipan!!!",
      "5 enemies remaining ... What shall we do, Taipan?",
    ]);
  });

  it("sends Li Yuen more often the more you've refused him", () => {
    expect([0, 1, 2, 3].map((grudge) => liYuenSighting(makeHong({ grudge })))).toEqual([20, 10, 6, 5]);
    // a roll of 10 brings him 1-in-10 but not 1-in-20
    expect(play(checkPirates(makeHong(), new ScriptedRng([1, 10]))).transcript).toEqual([]);
    const p = play(checkPirates(makeHong({ grudge: 1 }), new ScriptedRng([1, 10, 0, 0.5, 100])));
    expect(texts(p).slice(0, 2)).toEqual(["Li Yuen's pirates, Taipan!!!", "8 ships of Li Yuen's pirate fleet, Taipan!!!"]);
  });

  it("brings Li Yuen's fleet on after it drives off the pirates", () => {
    const p = play(checkPirates(makeHong({ extorted: 1 }), new ScriptedRng([0, ...SETUP, LI_YUEN])));
    expect(texts(p)).toEqual([
      "3 hostile ships approaching, Taipan!",
      "Li Yuen's fleet drove them off, Taipan!!",
      "Li Yuen's pirates, Taipan!!!",
      "Good joss!! They let us be!!",
    ]);
    expect(p.game.result).toBe("interrupted");
  });

  it("reports a sinking", () => {
    const h = makeHong({ shipDamage: 59 });
    const p = play(checkPirates(h, new ScriptedRng([0, ...SETUP, NO_LI_YUEN, 0, 2, 1, 0.5])), [0]);
    expect(p.game.result).toBe("sunk");
  });
});

describe("cannon fire", () => {
  // average ships sunk by one volley against an endless fleet
  function killsPerVolley(guns: number, time: number): number {
    const rng = new SeededRng(42);
    const n = 1000;
    let kills = 0;
    for (let t = 0; t < n; t++) {
      const b = new PirateBattle(makeHong({ shipGuns: guns, shipSize: 1000, time }), rng);
      b.pirates = 1000;
      const [, fire] = b.getOpts().find(([l]) => l === "Fire cannons")!;
      play(fire());
      kills += 1000 - b.pirates;
    }
    return kills / n;
  }

  it("sinks ships in proportion to the number of guns", () => {
    for (const time of [1, 37]) {
      const k10 = killsPerVolley(10, time);
      const k20 = killsPerVolley(20, time);
      const k40 = killsPerVolley(40, time);
      expect(k20 / k10).toBeGreaterThan(1.9);
      expect(k20 / k10).toBeLessThan(2.2);
      expect(k40 / k20).toBeGreaterThan(1.9);
      expect(k40 / k20).toBeLessThan(2.2);
    }
  });
});
