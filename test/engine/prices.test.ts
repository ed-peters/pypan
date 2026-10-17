import { describe, expect, it } from "vitest";
import {
  ARMS, BATAVIA, CITIES, GENERAL, HONG_KONG, NUM_GOODS, OPIUM, SHANGHAI,
  SILK, SINGAPORE, mult,
} from "../../src/engine/constants";
import { setPrices } from "../../src/engine/prices";
import { ScriptedRng, SeededRng } from "../../src/engine/rng";

describe("setPrices (based mode, the default)", () => {
  it("prices each good at its city level times 1, 2 or 3, times its magnitude", () => {
    // Hong Kong levels: general 10/2, arms 12/2, silk 11/2, opium 11/2
    expect(setPrices(new ScriptedRng([0, 0, 0, 0]), HONG_KONG)).toEqual([5, 60, 500, 5000]);
    expect(setPrices(new ScriptedRng([2, 2, 2, 2]), HONG_KONG)).toEqual([15, 180, 1500, 15000]);
    expect(setPrices(new ScriptedRng([0, 1, 2, 1]), HONG_KONG)).toEqual([5, 120, 1500, 10000]);
  });

  it("gives each good exactly three possible prices in a city", () => {
    const r = new SeededRng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      seen.add(setPrices(r, SHANGHAI)[OPIUM]!);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([8000, 16000, 24000]);
  });

  it("makes goods cheaper in some cities than others", () => {
    const base = (city: number) => setPrices(new ScriptedRng([0, 0, 0, 0]), city);
    // opium: cheap in Hong Kong and Singapore, dear in Shanghai
    expect(base(HONG_KONG)[OPIUM]).toBe(5000);
    expect(base(SINGAPORE)[OPIUM]).toBe(5000);
    expect(base(SHANGHAI)[OPIUM]).toBe(8000);
    // general cargo: dearer the further from Hong Kong
    expect(base(HONG_KONG)[GENERAL]).toBe(5);
    expect(base(BATAVIA)[GENERAL]).toBe(8);
    // arms: dear in Shanghai; silk: cheap in Hong Kong
    expect(base(SHANGHAI)[ARMS]).toBe(80);
    expect(base(HONG_KONG)[SILK]).toBe(500);
  });

  it("prices every good at 5..24 times its magnitude", () => {
    const r = new SeededRng(10);
    for (let i = 0; i < 500; i++) {
      const p = setPrices(r, i % CITIES.length);
      expect(p).toHaveLength(NUM_GOODS);
      p.forEach((price, g) => {
        expect(price % mult(g)).toBe(0);
        expect(price / mult(g)).toBeGreaterThanOrEqual(5);
        expect(price / mult(g)).toBeLessThanOrEqual(24);
      });
    }
  });

  it("uses one roll per good", () => {
    const r = new ScriptedRng([0, 0, 0, 0]);
    setPrices(r, HONG_KONG);
    expect(r.remaining).toBe(0);
  });
});

describe("setPrices (random mode)", () => {
  it("prices each good at 5..30 times its magnitude", () => {
    const r = new SeededRng(8);
    for (let i = 0; i < 500; i++) {
      const p = setPrices(r, i % CITIES.length, false);
      expect(p).toHaveLength(NUM_GOODS);
      p.forEach((price, g) => {
        expect(price % mult(g)).toBe(0);
        expect(price / mult(g)).toBeGreaterThanOrEqual(5);
        expect(price / mult(g)).toBeLessThanOrEqual(30);
      });
    }
  });

  it("uses one inRange(5, 31) roll per good, up to 30x", () => {
    // inRange(5, 31) = 5 + randrange(26)
    const r = new ScriptedRng([0, 1, 2, 25]);
    expect(setPrices(r, 0, false)).toEqual([5, 60, 700, 30000]);
    expect(r.remaining).toBe(0);
  });
});
