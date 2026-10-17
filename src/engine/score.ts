// Final score when the game ends, by retiring or sinking.

import { money } from "./format";
import { currentTime, type Hong } from "./hong";

/**
 * Score ranks, best first: each applies from its minimum score upward. The three
 * above Ma Tsu are pypan-85's. Ranges are short so the table fits a phone.
 */
export const RANKS = [
  { title: "Jade Emperor", min: 250000, range: "250,000+" },
  { title: "Lord of Ten Thousand Ships", min: 150000, range: "150,000+" },
  { title: "Dragon of the Strait", min: 100000, range: "100,000+" },
  { title: "Ma Tsu", min: 50000, range: "50,000+" },
  { title: "Master Taipan", min: 8000, range: "8,000+" },
  { title: "Taipan", min: 1000, range: "1,000+" },
  { title: "Compradore", min: 500, range: "500+" },
  { title: "Galley Hand", min: -Infinity, range: "below 500" },
] as const;

export type Rank = (typeof RANKS)[number]["title"];

/** Cash plus bank, less debt: the money the player can lay hands on. Goods don't count. */
export function cashPosition(h: Hong): number {
  return h.cash + h.bank - h.debt;
}

/** What the player is worth at the end: the cash position, plus any share in the jade mine (pypan-89). */
export function finalPosition(h: Hong): number {
  return cashPosition(h) + (h.mine?.value ?? 0);
}

/** Final position per month played, divided by 100, rounded down. */
export function score(h: Hong): number {
  return Math.floor(finalPosition(h) / currentTime(h) / 100);
}

export function rank(s: number): Rank {
  return RANKS.find((r) => s >= r.min)!.title;
}

/** A comment on the final cash position, if it deserves one. */
export function positionComment(position: number): string | null {
  if (position > 1000000) {
    return "You're a M I L L I O N A I R E !!!";
  }
  if (position < 0) {
    return "The crew has requested that you stay on shore for their safety!!";
  }
  if (position < 1000) {
    return "Have you considered a land-based job?";
  }
  return null;
}

/** "Your score is N" and the ranking table, with the player's rank marked. */
export function scoreReport(s: number): string {
  const mine = rank(s);
  const width = Math.max(...RANKS.map((r) => r.title.length));
  const rows = RANKS.map((r) => `${r.title === mine ? ">" : " "} ${r.title.padEnd(width)}  ${r.range}`);
  return `Your score is ${money(s)}.\n\n  ${"Rank".padEnd(width)}  Score\n${rows.join("\n")}`;
}
