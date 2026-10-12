import { describe, expect, it } from "vitest";
import { gameDate, money } from "../../src/engine/format";

describe("money", () => {
  it.each([
    [0, "0"], [999, "999"], [1000, "1,000"], [200000, "200,000"],
    [1234567, "1,234,567"], [-5000, "-5,000"], [12.9, "12"], [-0.5, "0"],
  ])("formats %d as %s", (n, s) => {
    expect(money(n)).toBe(s);
  });
});

describe("gameDate", () => {
  it("names the month and year", () => {
    expect(gameDate({ year: 1860, month: 1 })).toBe("January 1860");
    expect(gameDate({ year: 1861, month: 12 })).toBe("December 1861");
  });
});
