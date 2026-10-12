import { describe, expect, it } from "vitest";
import {
  AT_SEA, BASE_PRICES, BATAVIA, CITIES, GOODS, HONG_KONG, JADE, NUM_GOODS,
  city, good, mult, randomOtherCity,
} from "../../src/engine/constants";
import { ScriptedRng, SeededRng } from "../../src/engine/rng";

describe("cities", () => {
  it("names cities, with At Sea for the pseudo-location", () => {
    expect(CITIES).toHaveLength(7);
    expect(city(HONG_KONG)).toBe("Hong Kong");
    expect(city(BATAVIA)).toBe("Batavia");
    expect(city(AT_SEA)).toBe("At Sea");
  });

  it("randomOtherCity skips the given city", () => {
    const r = new ScriptedRng([2, 2, 4]);
    expect(randomOtherCity(r, 2)).toBe(4);
  });

  it("randomOtherCity can pick any other city, including Batavia", () => {
    const r = new SeededRng(17);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      seen.add(randomOtherCity(r, HONG_KONG));
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, BATAVIA]);
  });
});

describe("goods", () => {
  it("has five goods with increasing magnitudes", () => {
    expect(GOODS).toHaveLength(NUM_GOODS);
    expect(good(JADE)).toBe("Jade");
    expect([0, 1, 2, 3, 4].map(mult)).toEqual([1, 10, 100, 1000, 10000]);
    expect(() => good(5)).toThrow(RangeError);
  });

  it("has a base price row per good, with a column per city", () => {
    expect(BASE_PRICES).toHaveLength(NUM_GOODS);
    BASE_PRICES.forEach((row, g) => {
      expect(row).toHaveLength(CITIES.length + 1);
      expect(row[0]).toBe(mult(g));
    });
  });
});
