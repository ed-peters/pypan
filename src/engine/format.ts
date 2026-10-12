// Text formatting shared by game messages and the UI.

import type { Hong } from "./hong";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** A whole amount with thousands separators (pypan.py's i2a, stripped). */
export function money(n: number): string {
  const t = Math.trunc(n);
  const s = Math.abs(t).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return t < 0 ? `-${s}` : s;
}

/** The in-game date, e.g. "January 1860" (pypan.py's d2a). */
export function gameDate(h: Pick<Hong, "year" | "month">): string {
  return `${MONTHS[h.month - 1]} ${h.year}`;
}
