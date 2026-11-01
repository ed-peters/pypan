import { describe, expect, it } from "vitest";
import { SHANGHAI } from "../../src/engine/constants";
import { CONCERNS, checkFramji } from "../../src/engine/framji";
import { ScriptedRng } from "../../src/engine/rng";
import { finalPosition } from "../../src/engine/score";
import { makeHong } from "../helpers/hong";
import { play, texts } from "../helpers/play";

// a player in Hong Kong worth 200,000, after month 18
const merchant = (overrides = {}) => makeHong({ cash: 50000, bank: 150000, debt: 0, time: 19, ...overrides });

const INTRO = "Taipan, Mijnheer Brouwer of De Wisselbank has introduced us to Mr. Ardeshir Framji, a Parsi merchant of Bombay. Mr. Framji invites us to put 30,000 into a pepper concern on the Malabar Coast of India, which will return in three months. Shall we invest?";
const FAREWELL = "Taipan, a last letter from Mr. Framji: he is retiring to Bombay, and thanks us for our partnership in distant lands. He wishes our hong good joss.";

describe("Mr. Framji's offers", () => {
  it("come first with Mijnheer Brouwer's introduction, for 10-20% of the cash position", () => {
    const h = merchant();
    // the 1-in-2 roll, then the stake: 200,000 * 0.1 * 1.5
    const p = play(checkFramji(h, new ScriptedRng([0, 0.5])), [true]);
    expect(texts(p)).toEqual([INTRO, "Very well, Taipan. Mr. Framji will write to us when the Malabar pepper returns."]);
    expect(h.framjiInvestment).toEqual({ concern: 0, stake: 30000, due: 22 });
    expect([h.cash, h.framjiConcern]).toEqual([20000, 1]);
    // the stake counts toward the final position
    expect(finalPosition(h)).toBe(200000);
  });

  it("scale with debt counted against us", () => {
    const h = merchant({ debt: 100000 });
    const p = play(checkFramji(h, new ScriptedRng([0, 0])), [false]);
    expect(texts(p)[0]).toContain("put 10,000 into a pepper concern");
  });

  it("are paid from the bank once cash runs out", () => {
    const h = merchant({ cash: 1000 });
    const p = play(checkFramji(h, new ScriptedRng([0, 0])), [true]);
    expect(texts(p)).toContain("Mijnheer Brouwer will send the necessary funds from De Wisselbank, Taipan.");
    expect([h.cash, h.bank]).toEqual([0, 136000]);
  });

  it("move on to the next concern when declined, and wait three months", () => {
    const h = merchant();
    const p = play(checkFramji(h, new ScriptedRng([0, 0])), [false]);
    expect(texts(p)[1]).toBe("Very well, Taipan. Mr. Framji will find other partners for the Malabar pepper.");
    expect([h.framjiConcern, h.framjiOfferDue, h.framjiInvestment]).toEqual([1, 22, null]);
    expect(play(checkFramji(merchant({ ...h, time: 21 }), new ScriptedRng())).transcript).toEqual([]);
    const later = merchant({ framjiConcern: 1, framjiOfferDue: 22, time: 22 });
    expect(texts(play(checkFramji(later, new ScriptedRng([0, 0])), [false]))[0]).toBe(
      "Taipan, Mr. Framji of Bombay invites us to put 20,000 into an indigo plantation in Bengal, which will return in three months. Shall we invest?",
    );
  });

  it.each([
    ["before we bank with De Wisselbank", { bankOpen: false }],
    ["away from Hong Kong", { location: SHANGHAI }],
    ["until after month 18", { time: 18 }],
    ["to a cash position under 100,000", { cash: 0, bank: 99999 }],
    ["while a stake is out", { framjiInvestment: { concern: 0, stake: 30000, due: 30 } }],
    ["once the series is over", { framjiConcern: CONCERNS.length }],
  ])("aren't made %s", (_, overrides) => {
    // an empty script: no roll is made
    expect(play(checkFramji(merchant(overrides), new ScriptedRng())).transcript).toEqual([]);
  });

  it("come 1-in-2 arrivals", () => {
    const h = merchant();
    expect(play(checkFramji(h, new ScriptedRng([1]))).transcript).toEqual([]);
    expect(h.framjiConcern).toBe(0);
  });
});

describe("a stake with Mr. Framji", () => {
  const out = (concern: number, overrides = {}) =>
    merchant({ location: SHANGHAI, time: 22, framjiConcern: concern + 1, framjiInvestment: { concern, stake: 40000, due: 22 }, ...overrides });

  it("waits three months", () => {
    expect(play(checkFramji(out(0, { time: 21 }), new ScriptedRng())).transcript).toEqual([]);
  });

  it("pays off into the bank, on arrival anywhere", () => {
    const h = out(0);
    // the pepper pays off 3 in 4: randrange(4) < 3
    const p = play(checkFramji(h, new ScriptedRng([2])));
    expect(texts(p)).toEqual([
      "Taipan!! A letter from Mr. Framji: the pepper harvest of the Malabar Coast is in, and has sold well. Our 40,000 has returned 60,000, which has been deposited with Mijnheer Brouwer.",
    ]);
    expect([h.bank, h.framjiInvestment, h.framjiOfferDue]).toEqual([210000, null, 25]);
  });

  it("can be lost, but never more than the stake", () => {
    const h = out(0);
    const p = play(checkFramji(h, new ScriptedRng([3])));
    expect(texts(p)).toEqual([
      "Bad joss, Taipan! A letter from Mr. Framji: the monsoon failed on the Malabar Coast, and the pepper with it. Our 40,000 is lost.",
    ]);
    expect([h.cash, h.bank, h.framjiInvestment]).toEqual([50000, 150000, null]);
  });

  it("in Ceylon cinnamon keeps half when it fails", () => {
    const h = out(2);
    const p = play(checkFramji(h, new ScriptedRng([2])));
    expect(texts(p)).toEqual([
      "Bad joss, Taipan! A letter from Mr. Framji: a blight has struck the Ceylon cinnamon. He has saved 20,000 of our 40,000, which has been deposited with Mijnheer Brouwer.",
    ]);
    expect(h.bank).toBe(170000);
  });

  it("in the pearl fishery pays five times over", () => {
    const h = out(6);
    expect(texts(play(checkFramji(h, new ScriptedRng([0]))))[0]).toMatch(/Our 40,000 has returned 200,000, /);
  });

  it("in the last concern brings his farewell", () => {
    const p = play(checkFramji(out(6), new ScriptedRng([1])));
    expect(texts(p)).toEqual([expect.stringMatching(/^Bad joss, Taipan! .*pearl beds/), FAREWELL]);
  });
});

describe("the series", () => {
  it("has seven concerns, each worth backing on average", () => {
    expect(CONCERNS).toHaveLength(7);
    for (const c of CONCERNS) {
      const [k, n] = c.odds;
      expect(k / n * c.payout + (1 - k / n) * c.salvage).toBeGreaterThan(1);
    }
  });

  it("ends with his farewell when the last concern is declined", () => {
    const h = merchant({ framjiConcern: 6 });
    const p = play(checkFramji(h, new ScriptedRng([0, 0])), [false]);
    expect(texts(p)).toEqual([
      expect.stringContaining("a pearl fishery in the Persian Gulf"),
      "Very well, Taipan. Mr. Framji will find other partners for the Persian Gulf pearls.",
      FAREWELL,
    ]);
    expect(play(checkFramji(merchant({ ...h, time: 40 }), new ScriptedRng())).transcript).toEqual([]);
  });
});
