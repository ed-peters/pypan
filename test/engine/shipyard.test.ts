import { describe, expect, it } from "vitest";
import { SHANGHAI } from "../../src/engine/constants";
import { ScriptedRng } from "../../src/engine/rng";
import { checkUpgrades, offerGun, offerRepair, offerShip } from "../../src/engine/shipyard";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// At time 1 with shipSize 60 and a float roll of 0, the repair rate is
// trunc((25 * 4 / 4) * 60 / 50) = 30 per point, so 10 damage costs 301.
const REPAIR_ROLL = [0];

describe("checkUpgrades", () => {
  it("does nothing early in the game away from home", () => {
    const rng = new ScriptedRng();
    const p = play(checkUpgrades(makeHong({ location: SHANGHAI, shipDamage: 10 }), rng));
    expect(p.transcript).toEqual([]);
  });

  it("offers repairs at home when damaged", () => {
    const p = play(checkUpgrades(makeHong({ shipDamage: 10 }), new ScriptedRng()), [false]);
    expect(texts(p)[0]).toMatch(/Mc Henry/);
  });

  it("rolls for a new ship and a new gun after six months", () => {
    const h = makeHong({ time: 7, cash: 5000 });
    // ship offered at randrange(2000) = 500 -> 1500; gun not offered
    const p = play(checkUpgrades(h, new ScriptedRng([0, 500, 1])), [false]);
    expect(texts(p)).toEqual([
      "Would you like to replace your fine ship with another one that has 50 more capacity by paying an additional 1,500, Taipan?",
    ]);
  });
});

describe("offerRepair", () => {
  it("skips repairs when you have no cash", () => {
    const p = play(offerRepair(makeHong({ cash: 0, shipDamage: 10 }), new ScriptedRng()));
    expect(p.transcript).toEqual([]);
  });

  it("can be declined", () => {
    const h = makeHong({ shipDamage: 10 });
    play(offerRepair(h, new ScriptedRng()), [false]);
    expect(h.shipDamage).toBe(10);
  });

  it("quotes the damage as a percent of the ship, and the cost", () => {
    const h = makeHong({ shipDamage: 10 });
    const p = play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 301]);
    expect(p.transcript[1]?.prompt).toEqual({
      kind: "number",
      text: "Och, 'tis a pity to be 16% damaged. We can fix yer whole ship for 301, or make partial repairs if you wish. How much will ye spend?",
      max: 301,
    });
    expect(texts(p).at(-1)).toBe("Aye, she'll be right as rain for ye!!");
    expect(p.transcript).toHaveLength(3);
  });

  it("charges you for repairs and fixes everything when paid in full", () => {
    const h = makeHong({ shipDamage: 10 });
    play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 301]);
    expect([h.cash, h.shipDamage]).toEqual([99, 0]);
  });

  it("fixes damage in proportion to what you pay", () => {
    const h = makeHong({ shipDamage: 10 });
    play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 150]);
    // paid 49.8% of the cost: 4 of 10 points fixed
    expect([h.cash, h.shipDamage]).toEqual([250, 6]);
  });

  it("charges no more than the full cost", () => {
    const h = makeHong({ shipDamage: 10 });
    const p = play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 350]);
    expect([h.cash, h.shipDamage]).toEqual([99, 0]);
    expect(p.game.done).toBe(true);
  });

  it("fixes nothing if you pay nothing", () => {
    const h = makeHong({ shipDamage: 10 });
    const p = play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 0]);
    expect([h.cash, h.shipDamage]).toEqual([400, 10]);
    expect(texts(p)).not.toContain("Aye, she'll be right as rain for ye!!");
  });

  it("charges Wu only for the partial repair you asked for", () => {
    const h = makeHong({ cash: 100, debt: 5000, shipDamage: 10 });
    play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 150, true]);
    // 150 spent: 100 cash plus 50 from Wu; 4 of 10 points fixed
    expect([h.cash, h.debt, h.shipDamage]).toEqual([0, 5050, 6]);
  });

  it("lets Wu pay the difference", () => {
    const h = makeHong({ cash: 100, debt: 5000, shipDamage: 10 });
    play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 301, true]);
    expect([h.cash, h.debt, h.shipDamage]).toEqual([0, 5201, 0]);
  });

  it("leaves the ship damaged if you won't take Wu's help", () => {
    const h = makeHong({ cash: 100, shipDamage: 10 });
    const p = play(offerRepair(h, new ScriptedRng(REPAIR_ROLL)), [true, 301, false]);
    expect(texts(p).at(-1)).toMatch(/will not assist you/);
    expect([h.cash, h.shipDamage]).toEqual([100, 10]);
  });
});

describe("offerShip", () => {
  it("replaces the ship with a bigger, undamaged one", () => {
    const h = makeHong({ time: 7, cash: 2000, shipDamage: 20 });
    const p = play(offerShip(h, new ScriptedRng([500])), [true]);
    expect(texts(p)[0]).toMatch(/replace your damaged ship/);
    expect([h.cash, h.shipSize, h.shipDamage]).toEqual([500, 110, 0]);
  });

  it("scales the cost with ship size", () => {
    const h = makeHong({ time: 7, cash: 5000, shipSize: 110 });
    const p = play(offerShip(h, new ScriptedRng([500])), [false]);
    expect(texts(p)[0]).toMatch(/additional 2,000,/);
  });

  it("isn't offered if you can't afford it", () => {
    const p = play(offerShip(makeHong({ time: 7, cash: 1499 }), new ScriptedRng([500])));
    expect(p.transcript).toEqual([]);
  });
});

describe("offerGun", () => {
  it("adds a gun, which takes up hold space", () => {
    const h = makeHong({ time: 7, cash: 601 });
    const p = play(offerGun(h, new ScriptedRng([100])), [true]);
    expect(texts(p)).toEqual(["Would you like to buy a ship's gun for 600, Taipan?"]);
    expect([h.cash, h.shipGuns, h.shipSize]).toEqual([1, 1, 50]);
  });

  it("needs more cash than the cost, not just enough", () => {
    const p = play(offerGun(makeHong({ time: 7, cash: 600 }), new ScriptedRng([100])));
    expect(p.transcript).toEqual([]);
  });
});
