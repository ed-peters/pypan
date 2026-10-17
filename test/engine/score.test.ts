import { describe, expect, it } from "vitest";
import { cashPosition, finalPosition, positionComment, rank, score, scoreReport } from "../../src/engine/score";
import { makeHong } from "../helpers/hong";

describe("cashPosition", () => {
  it("is cash plus bank, less debt, ignoring goods", () => {
    const h = makeHong({ cash: 1000, bank: 5000, debt: 2500, shipGoods: [100, 0, 0, 0, 0] });
    expect(cashPosition(h)).toBe(3500);
  });
});

describe("finalPosition", () => {
  it("adds any share in the jade mine to the cash position", () => {
    expect(finalPosition(makeHong({ cash: 1000, debt: 0 }))).toBe(1000);
    expect(finalPosition(makeHong({ cash: 1000, debt: 0, mine: { value: 50000, due: 9 } }))).toBe(51000);
    expect(cashPosition(makeHong({ cash: 1000, debt: 0, mine: { value: 50000, due: 9 } }))).toBe(1000);
  });
});

describe("score", () => {
  it("counts a share in the jade mine", () => {
    expect(score(makeHong({ cash: 0, debt: 0, time: 12, mine: { value: 2400000, due: 15 } }))).toBe(1000);
  });

  it("is cash position per month played, divided by 200", () => {
    // 2,400,000 over 12 months
    expect(score(makeHong({ cash: 2400000, debt: 0, time: 12 }))).toBe(1000);
  });

  it("rounds down, including below zero", () => {
    expect(score(makeHong({ cash: 3999, debt: 0, time: 1 }))).toBe(19);
    expect(score(makeHong({ cash: 0, debt: 300, time: 1 }))).toBe(-2);
  });
});

describe("rank", () => {
  it.each([
    [1000000, "Jade Emperor"], [250000, "Jade Emperor"],
    [249999, "Lord of Ten Thousand Ships"], [150000, "Lord of Ten Thousand Ships"],
    [149999, "Dragon of the Strait"], [100000, "Dragon of the Strait"],
    [99999, "Ma Tsu"], [50000, "Ma Tsu"],
    [49999, "Master Taipan"], [8000, "Master Taipan"],
    [7999, "Taipan"], [1000, "Taipan"],
    [999, "Compradore"], [500, "Compradore"],
    [499, "Galley Hand"], [0, "Galley Hand"], [-50, "Galley Hand"],
  ])("ranks %d as %s", (s, title) => {
    expect(rank(s)).toBe(title);
  });
});

describe("positionComment", () => {
  it.each([
    [1000001, "You're a M I L L I O N A I R E !!!"],
    [1000000, null],
    [1000, null],
    [999, "Have you considered a land-based job?"],
    [0, "Have you considered a land-based job?"],
    [-1, "The crew has requested that you stay on shore for their safety!!"],
  ])("comments on %d", (position, comment) => {
    expect(positionComment(position)).toBe(comment);
  });
});

describe("scoreReport", () => {
  it("announces the score and marks the player's rank in the table", () => {
    expect(scoreReport(1234)).toBe(
      "Your score is 1,234.\n\n" +
      "  Rank                        Score\n" +
      "  Jade Emperor                250,000+\n" +
      "  Lord of Ten Thousand Ships  150,000+\n" +
      "  Dragon of the Strait        100,000+\n" +
      "  Ma Tsu                      50,000+\n" +
      "  Master Taipan               8,000+\n" +
      "> Taipan                      1,000+\n" +
      "  Compradore                  500+\n" +
      "  Galley Hand                 below 500",
    );
  });

  it("fits a phone: no row is over 40 characters", () => {
    const rows = scoreReport(300000).split("\n").slice(2);
    expect(Math.max(...rows.map((r) => r.length))).toBeLessThanOrEqual(40);
    expect(rows).toContain(">".padEnd(2) + "Jade Emperor".padEnd(26) + "  250,000+");
  });

  it("shows negative scores", () => {
    expect(scoreReport(-2)).toMatch(/^Your score is -2\./);
    expect(scoreReport(-2)).toContain("> Galley Hand");
  });
});
