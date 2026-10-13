// Trading: local prices, price shocks, buying and selling (SPEC.md sections 4.1-4.3).

import { pay, spendable } from "./bank";
import { good, mult } from "./constants";
import { money } from "./format";
import { currentTime, knownGoods, type Hong } from "./hong";
import { applyJadeDeal } from "./jade";
import { setPrices } from "./prices";
import { askNum, askOptOrCancel, askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

export const MSG_POS_SHOCK = [
  "Famine in South China, Taipan! General cargo prices have risen to the heavens!",
  "An agent for the Moro rebels has been spotted in the area, Taipan! Arms are sky-high here!",
  "Taipan! The wharves here have been burned by rebel samurai! All the silk was destroyed!",
  "Taipan! A fire has swept the area! The price of opium has leaped because of hospital use!",
  "A British trading company has been buying all the local jade, Taipan! Prices are sky-high!",
] as const;

export const MSG_NEG_SHOCK = [
  "Malay pirates have flooded the area with cheap general cargo from their booty, Taipan!",
  "Taipan! A period of relative peace has resulted in surplus arms being made available on the local market!",
  "A rival hong has dumped surplus silk on the market here, Taipan! Prices have crashed!",
  "Taipan, a Yankee captain is selling Turkish opium at below-market prices here!",
  "Taipan! Burmese jade from a newly-discovered mine has been flooding the market here!",
] as const;

/**
 * Current prices followed by a message (pypan.py's get_condition_report). Prices
 * are in two columns to leave room for the menu below on small screens.
 */
export function conditionReport(h: Hong, message: string): string {
  const entries = knownGoods(h).map((g, i) => [g, money(h.prices[i]!)] as const);
  const rows = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, rows), entries.slice(rows)].map((col, c) => {
    const lw = Math.max(...col.map(([g]) => g.length));
    // only the left column's prices need padding, to line up the right column
    const vw = c === 0 ? Math.max(...col.map(([, v]) => v.length)) : 0;
    return col.map(([g, v]) => `${g.padStart(lw)} - ${v.padEnd(vw)}`);
  });
  const lines = columns[0]!.map((left, r) => {
    const right = columns[1]![r];
    return right ? `${left}  ${right}` : left.trimEnd();
  });
  return `Current market conditions are as follows:\n\n${lines.join("\n")}\n\n${message}`;
}

/**
 * Set prices on arrival, with a 1-in-10 chance of a shock after the first month to
 * a good on the market, then any cheap jade for the jade expedition's backers.
 */
export function* establishPrices(h: Hong, rng: Rng): Flow {
  h.prices = setPrices(rng, h.location);

  if (currentTime(h) > 1 && rng.chanceOf(10)) {
    const g = rng.randrange(knownGoods(h).length);
    const f = rng.inRange(0, 5) + 5;
    if (rng.chanceOf(2)) {
      yield* say(MSG_POS_SHOCK[g]!);
      h.prices[g]! *= f;
    } else {
      yield* say(MSG_NEG_SHOCK[g]!);
      h.prices[g] = h.prices[g]! / f;
    }
    // keep the good's usual granularity: whole, tens, hundreds, ...
    const m = mult(g);
    h.prices[g] = Math.max(m, Math.trunc(h.prices[g]! / m) * m);
  }

  applyJadeDeal(h);
}

/** How much of a good you can afford; the bank can pay too, wherever it's open. */
function affordable(h: Hong, g: number): number {
  return Math.floor(spendable(h) / h.prices[g]!);
}

export function* buyGoods(h: Hong): Flow {
  // goods you can't afford any of are disabled
  const goods = knownGoods(h);
  const g = yield* askOptOrCancel(conditionReport(h, "What shall I buy, Taipan?"), goods, {
    disabled: goods.flatMap((_, g) => (affordable(h, g) === 0 ? [g] : [])),
  });
  if (g === null) {
    return;
  }

  const x = affordable(h, g);

  const n = yield* askNum(conditionReport(h, `How much ${good(g).toLowerCase()} shall I buy, Taipan?`), x);
  if (n > x) {
    yield* say("You do not have enough cash on hand, Taipan.");
  } else {
    h.shipGoods[g]! += n;
    yield* pay(h, n * h.prices[g]!);
  }
}

/** The goods aboard ship. */
export function goodsAboard(h: Hong): number[] {
  return knownGoods(h).flatMap((_, g) => (h.shipGoods[g]! > 0 ? [g] : []));
}

export function* sellGoods(h: Hong): Flow {
  const aboard = goodsAboard(h);
  let g: number | null;
  if (aboard.length === 1) {
    // with only one good aboard, offer to sell the lot
    g = aboard[0]!;
    if (yield* askYn(conditionReport(h, `Would you like to sell all of your ${good(g).toLowerCase()}, Taipan?`))) {
      h.cash += h.shipGoods[g]! * h.prices[g]!;
      h.shipGoods[g] = 0;
      return;
    }
  } else {
    // you can't sell something you don't have
    g = yield* askOptOrCancel(conditionReport(h, "What shall I sell, Taipan?"), knownGoods(h), {
      disabled: knownGoods(h).flatMap((_, g) => (aboard.includes(g) ? [] : [g])),
    });
    if (g === null) {
      return;
    }
  }

  const x = h.shipGoods[g]!;

  const n = yield* askNum(conditionReport(h, `How much ${good(g).toLowerCase()} shall I sell, Taipan?`), x);
  if (n > x) {
    yield* say("You do not have that much in your ship's hold, Taipan.");
  } else {
    h.cash += n * h.prices[g]!;
    h.shipGoods[g]! -= n;
  }
}
