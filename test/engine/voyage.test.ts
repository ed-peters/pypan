import { describe, expect, it } from "vitest";
import { AT_SEA, HONG_KONG, MANILA, SHANGHAI } from "../../src/engine/constants";
import { Game } from "../../src/engine/game";
import { ScriptedRng } from "../../src/engine/rng";
import { sailAway } from "../../src/engine/voyage";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// Five price rolls of 0 (x1) give each port's lowest prices; then no price shock.
const PRICES = [0, 0, 0, 0, 0, 1];

describe("sailAway", () => {
  it("won't sail overloaded", () => {
    const h = makeHong({ shipGoods: [61, 0, 0, 0, 0] });
    const p = play(sailAway(h, new ScriptedRng()));
    expect(texts(p)).toEqual(["Your ship is overloaded, Taipan."]);
    expect(h.location).toBe(HONG_KONG);
  });

  it("can be cancelled", () => {
    const h = makeHong();
    play(sailAway(h, new ScriptedRng()), [null]);
    expect([h.location, h.month]).toEqual([HONG_KONG, 1]);
  });

  it("won't sail to where you already are, and puts Never mind before Batavia", () => {
    const p = play(sailAway(makeHong({ location: MANILA }), new ScriptedRng()));
    expect(p.transcript[0]?.prompt).toMatchObject({ kind: "choose", disabled: [MANILA], cancelAt: 6 });
    expect(() => p.game.answer(MANILA)).toThrow();
  });

  it("makes a quiet voyage: a month passes, interest accrues, prices change", () => {
    const h = makeHong({ extorted: 1, bank: 1000 });
    // no pirates; no Li Yuen; no storm; extortion counter unchanged; prices
    const rng = new ScriptedRng([1, 1, 1, 1, ...PRICES]);
    const p = play(sailAway(h, rng), [SHANGHAI]);
    expect(p.transcript.map((e) => [e.prompt.text, e.prompt.art])).toEqual([
      ["Where shall we sail to, Taipan?", undefined],
      ["Arriving at Shanghai ... ", "boat"],
    ]);
    expect(h).toMatchObject({ location: SHANGHAI, month: 2, debt: 5500, bank: 1005, transfer: -1 });
    expect(h.prices).toEqual([5, 80, 700, 8000, 50000]); // Shanghai
    expect(rng.remaining).toBe(0);
  });

  it("is at sea, a month later, until the arrival message is acknowledged", () => {
    const h = makeHong({ extorted: 1 });
    const game = new Game(sailAway(h, new ScriptedRng([1, 1, 1])));
    game.answer(SHANGHAI);
    expect(game.prompt?.text).toBe("Arriving at Shanghai ... ");
    expect([h.location, h.month, h.debt]).toEqual([AT_SEA, 2, 5000]);
  });

  it("can be blown off course", () => {
    const h = makeHong({ extorted: 1 });
    // no pirates; no Li Yuen; storm, no damage, blown off course to Manila
    const rng = new ScriptedRng([1, 1, 0, 1, 0, MANILA, 1, ...PRICES]);
    const p = play(sailAway(h, rng), [SHANGHAI]);
    expect(texts(p).slice(1)).toEqual([
      "Storm, Taipan!",
      "We made it, but we got blown off course to Manila!",
      "Arriving at Manila ... ",
    ]);
    expect(p.transcript.slice(1).map((e) => e.prompt.art)).toEqual(["boat", "storm", "boat"]);
    expect(h.location).toBe(MANILA);
  });

  it("can meet pirates, fought under pirate art", () => {
    const h = makeHong({ extorted: 1 });
    // pirates attack: 1 ship, "hostile"; no Li Yuen; we run and escape (randrange(5) > randrange(1))
    const rng = new ScriptedRng([0, 0, 0.5, 100, 0, 1, 4, 0, 1, 1, ...PRICES]);
    const p = play(sailAway(h, rng), [SHANGHAI, 0]);
    expect(p.transcript.slice(1).map((e) => [e.prompt.text, e.prompt.art])).toEqual([
      ["1 hostile ship approaching, Taipan!", "boat"],
      ["1 enemies remaining ... What shall we do, Taipan?", "pirates"],
      ["Aye, we'll set sails and run, Taipan!", "pirates"],
      ["We got away from 'em, Taipan!", "pirates"],
      ["Arriving at Shanghai ... ", "boat"],
    ]);
    expect(rng.remaining).toBe(0);
  });

  it("can meet Li Yuen's fleet at sea, which lets you be if you've paid", () => {
    const h = makeHong({ extorted: 1 });
    // no pirates; Li Yuen; no storm; extortion counter unchanged; prices
    const rng = new ScriptedRng([1, 0, 1, 1, ...PRICES]);
    const p = play(sailAway(h, rng), [SHANGHAI]);
    expect(p.transcript.slice(1).map((e) => [e.prompt.text, e.prompt.art])).toEqual([
      ["Li Yuen's pirates, Taipan!!!", "boat"],
      ["Good joss!! They let us be!!", "boat"],
      ["Arriving at Shanghai ... ", "boat"],
    ]);
    expect(rng.remaining).toBe(0);
  });

  it("ends the voyage if the ship sinks", () => {
    const h = makeHong({ extorted: 1, shipDamage: 59 });
    // pirates: 3 ships; no Li Yuen; run fails, no partial escape; 2 damage sinks us
    const rng = new ScriptedRng([0, 2, 0.5, 100, 0, 1, 0, 2, 1, 0.5]);
    const p = play(sailAway(h, rng), [SHANGHAI, 0]);
    expect(texts(p).at(-1)).toBe("It's all over now!!");
    expect(p.game.result).toBe("sunk");
    expect([h.location, h.debt]).toEqual([AT_SEA, 5000]);
    expect(rng.remaining).toBe(0);
  });

  it("runs the Hong Kong arrival events", () => {
    const h = makeHong({ location: SHANGHAI, extorted: 1, transfer: -1 });
    // no pirates; no Li Yuen; no storm; (Wu: no rolls); extortion counter unchanged; prices
    const rng = new ScriptedRng([1, 1, 1, 1, ...PRICES]);
    const p = play(sailAway(h, rng), [HONG_KONG, false]);
    expect(texts(p).slice(1)).toEqual([
      "Arriving at Hong Kong ... ",
      "Do you have business with Elder Brother Wu, the moneylender, Taipan?",
    ]);
    expect(h.transfer).toBe(0);
    expect(h.location).not.toBe(AT_SEA);
  });
});
