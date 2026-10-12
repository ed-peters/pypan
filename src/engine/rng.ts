// Random numbers for the game engine.
//
// Every roll in the game goes through an Rng so that games are reproducible from a
// seed and tests can force specific outcomes. Engine code must never call
// Math.random() directly.
//
// The helpers mirror the ones in etc/pypan.py, including their quirks:
//   - randrange(n) truncates n toward zero (Python's int())
//   - inRange(lo, hi) returns lo..hi-2, not lo..hi

/** Largest value returned by int(); matches Python's random.randint(0, 2147483647). */
export const MAX_INT = 2147483647;

export abstract class Rng {
  /** A random integer in 0..MAX_INT (inclusive). */
  abstract int(): number;

  /** A random float in [0, 1). */
  abstract float(): number;

  /** True with probability 1-in-n. */
  chanceOf(n: number): boolean {
    return this.int() % n === 0;
  }

  /** A random integer in 0..trunc(n)-1. */
  randrange(n: number): number {
    const m = Math.trunc(n);
    if (m < 1) {
      throw new RangeError(`randrange(${n}): empty range`);
    }
    return this.int() % m;
  }

  /** A random integer in lo..hi-2 (sic: faithful to pypan.py's in_range). */
  inRange(lo: number, hi: number): number {
    return lo + this.randrange(hi - 1 - lo);
  }

  /** A random element of a non-empty list. */
  choice<T>(xs: readonly T[]): T {
    return xs[this.randrange(xs.length)]!;
  }

  /** A normally distributed float (Box-Muller); used by the "based" price mode. */
  normal(mu: number, sigma: number): number {
    const u1 = 1 - this.float(); // (0, 1], so log() is finite
    const u2 = this.float();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/** Seedable PRNG (mulberry32). Its whole state is one 32-bit integer. */
export class SeededRng extends Rng {
  private s: number;

  constructor(seed: number = Date.now()) {
    super();
    this.s = seed >>> 0;
  }

  /** Current internal state; pass to the constructor to resume the sequence. */
  get state(): number {
    return this.s;
  }

  private next32(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  int(): number {
    return this.next32() >>> 1; // 31 bits: 0..MAX_INT
  }

  float(): number {
    return this.next32() / 2 ** 32;
  }
}

/**
 * An Rng that returns scripted values, for tests. Each call to int() or float()
 * consumes the next queued value, which must be of the right kind: a whole number
 * in 0..MAX_INT for int(), or a number in [0, 1) for float().
 *
 * Since every helper is built on int() or float(), outcomes are easy to force:
 * chanceOf(n) is true for 0 and false for 1; randrange(n) returns k for k < n.
 */
export class ScriptedRng extends Rng {
  private readonly queue: number[];

  constructor(values: readonly number[] = []) {
    super();
    this.queue = [...values];
  }

  /** Append more values to the script. */
  push(...values: number[]): this {
    this.queue.push(...values);
    return this;
  }

  /** Number of scripted values not yet consumed. */
  get remaining(): number {
    return this.queue.length;
  }

  private take(kind: string): number {
    const v = this.queue.shift();
    if (v === undefined) {
      throw new Error(`ScriptedRng: script exhausted on ${kind}()`);
    }
    return v;
  }

  int(): number {
    const v = this.take("int");
    if (!Number.isInteger(v) || v < 0 || v > MAX_INT) {
      throw new Error(`ScriptedRng: int() got ${v}`);
    }
    return v;
  }

  float(): number {
    const v = this.take("float");
    if (!(v >= 0 && v < 1)) {
      throw new Error(`ScriptedRng: float() got ${v}`);
    }
    return v;
  }
}
