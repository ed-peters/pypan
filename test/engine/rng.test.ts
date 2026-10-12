import { describe, expect, it } from "vitest";
import { MAX_INT, ScriptedRng, SeededRng } from "../../src/engine/rng";

describe("SeededRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 20 }, () => a.int());
    const seqB = Array.from({ length: 20 }, () => b.int());
    expect(seqA).toEqual(seqB);
  });

  it("gives different sequences for different seeds", () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.int()).not.toEqual(b.int());
  });

  it("can resume from its saved state", () => {
    const a = new SeededRng(7);
    a.int();
    a.int();
    const b = new SeededRng(a.state);
    expect(b.int()).toEqual(a.int());
  });

  it("produces ints in 0..MAX_INT and floats in [0, 1)", () => {
    const r = new SeededRng(123);
    for (let i = 0; i < 10000; i++) {
      const n = r.int();
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(MAX_INT);
      const f = r.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it("covers the full range of randrange", () => {
    const r = new SeededRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(r.randrange(10));
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("hits chanceOf(n) about 1-in-n of the time", () => {
    const r = new SeededRng(5);
    let hits = 0;
    for (let i = 0; i < 100000; i++) {
      if (r.chanceOf(10)) hits++;
    }
    expect(hits).toBeGreaterThan(9000);
    expect(hits).toBeLessThan(11000);
  });

  it("produces a roughly normal distribution", () => {
    const r = new SeededRng(11);
    const xs = Array.from({ length: 20000 }, () => r.normal(10, 15));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(mean).toBeCloseTo(10, 0);
    expect(sd).toBeGreaterThan(14);
    expect(sd).toBeLessThan(16);
  });
});

describe("Rng helpers (Python semantics)", () => {
  it("randrange truncates its argument like Python's int()", () => {
    // pypan.py calls e.g. randrange(ship_size / 10 + guns), which can be fractional
    const r = new ScriptedRng([7]);
    expect(r.randrange(6.9)).toBe(1); // 7 % 6
  });

  it("randrange rejects an empty range", () => {
    const r = new ScriptedRng([0]);
    expect(() => r.randrange(0.5)).toThrow(RangeError);
    expect(() => r.randrange(0)).toThrow(RangeError);
  });

  it("chanceOf is true exactly when int() is a multiple of n", () => {
    const r = new ScriptedRng([0, 1, 20, 21]);
    expect(r.chanceOf(10)).toBe(true);
    expect(r.chanceOf(10)).toBe(false);
    expect(r.chanceOf(10)).toBe(true);
    expect(r.chanceOf(10)).toBe(false);
  });

  it("inRange(lo, hi) spans lo..hi-1", () => {
    // inRange(5, 31) is used for prices, which SPEC gives as 5-30
    const r = new SeededRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      seen.add(r.inRange(5, 31));
    }
    expect(Math.min(...seen)).toBe(5);
    expect(Math.max(...seen)).toBe(30);
    expect(seen.size).toBe(26);
  });
});

describe("ScriptedRng", () => {
  it("returns queued values in order", () => {
    const r = new ScriptedRng([3, 0.5]).push(9);
    expect(r.randrange(10)).toBe(3);
    expect(r.float()).toBe(0.5);
    expect(r.int()).toBe(9);
    expect(r.remaining).toBe(0);
  });

  it("throws when the script runs out", () => {
    expect(() => new ScriptedRng().int()).toThrow(/exhausted/);
  });

  it("throws when a value is the wrong kind", () => {
    expect(() => new ScriptedRng([0.5]).int()).toThrow();
    expect(() => new ScriptedRng([3]).float()).toThrow();
  });
});
