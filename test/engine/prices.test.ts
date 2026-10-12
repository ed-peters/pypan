import { describe, expect, it } from "vitest";
import { CITIES, NUM_GOODS, mult } from "../../src/engine/constants";
import { setPrices } from "../../src/engine/prices";
import { ScriptedRng, SeededRng } from "../../src/engine/rng";

describe("setPrices (random mode)", () => {
  it("prices each good at 5..29 times its magnitude", () => {
    const r = new SeededRng(8);
    for (let i = 0; i < 500; i++) {
      const p = setPrices(r, i % CITIES.length);
      expect(p).toHaveLength(NUM_GOODS);
      p.forEach((price, g) => {
        expect(price % mult(g)).toBe(0);
        expect(price / mult(g)).toBeGreaterThanOrEqual(5);
        expect(price / mult(g)).toBeLessThanOrEqual(29);
      });
    }
  });

  it("uses one inRange(5, 31) roll per good", () => {
    // inRange(5, 31) = 5 + randrange(25)
    const r = new ScriptedRng([0, 1, 2, 3, 24]);
    expect(setPrices(r, 0)).toEqual([5, 60, 700, 8000, 290000]);
    expect(r.remaining).toBe(0);
  });
});

describe("setPrices (based mode)", () => {
  it("prices each good at 5..30 times its magnitude", () => {
    const r = new SeededRng(9);
    for (let i = 0; i < 200; i++) {
      const p = setPrices(r, i % CITIES.length, true);
      p.forEach((price, g) => {
        expect(price % mult(g)).toBe(0);
        expect(price / mult(g)).toBeGreaterThanOrEqual(5);
        expect(price / mult(g)).toBeLessThanOrEqual(30);
      });
    }
  });
});
