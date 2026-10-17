// Trading: local prices, price shocks, buying and selling (SPEC.md sections 4.1-4.3).

import { pay, spendable } from "./bank";
import { GOODS, PORCELAIN, good, mult } from "./constants";
import { money } from "./format";
import { currentTime, marketGoods, type Hong } from "./hong";
import { setPrices } from "./prices";
import { askNum, askOptOrCancel, askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** Price rises, by good: one is picked at random for each shock. */
export const MSG_POS_SHOCK: readonly (readonly string[])[] = [
  [
    "Famine in South China, Taipan! General cargo prices have risen to the heavens!",
    "Taipan! A typhoon has sunk the junks bound here, and general cargo is fetching a fortune!",
    "The Viceroy has ordered supplies for his army, Taipan! General cargo prices have soared!",
  ],
  [
    "An agent for the Moro rebels has been spotted in the area, Taipan! Arms are sky-high here!",
    "Taiping rebels are buying every musket they can find, Taipan! Arms prices are sky-high!",
    "Taipan! War has broken out up the coast, and arms are fetching a fortune here!",
  ],
  [
    "Taipan! The wharves here have been burned by rebel samurai! All the silk was destroyed!",
    "Blight has struck the silkworms, Taipan! Silk prices have soared!",
    "The Empress of the French has made silk the fashion in Paris, Taipan! Prices here are sky-high!",
  ],
  [
    "Taipan! A fire has swept the area! The price of opium has leaped because of hospital use!",
    "Taipan! The mandarins have burned the local opium stocks! Prices have gone through the roof!",
    "A cholera outbreak has the doctors buying up all the opium, Taipan! Prices are sky-high!",
  ],
  [
    "European buyers have been paying a fortune for porcelain here, Taipan! Prices are sky-high!",
    "Taipan! A Dutch collector is buying up every piece of porcelain in port! Prices are sky-high!",
    "Rebels have overrun the kilns at Jingdezhen, Taipan! Porcelain is fetching a fortune!",
  ],
];

/** Price crashes, by good: one is picked at random for each shock. */
export const MSG_NEG_SHOCK: readonly (readonly string[])[] = [
  [
    "Malay pirates have flooded the area with cheap general cargo from their booty, Taipan!",
    "Taipan! A convoy of junks has just unloaded, and the market is glutted with general cargo!",
    "A bumper harvest has filled every godown here, Taipan! General cargo is going for a song!",
  ],
  [
    "Taipan! A period of relative peace has resulted in surplus arms being made available on the local market!",
    "Taipan! The rebels have been routed, and their muskets are being sold off for a pittance!",
    "A British gunrunner has flooded the market with cheap rifles, Taipan! Arms prices have collapsed!",
  ],
  [
    "A rival hong has dumped surplus silk on the market here, Taipan! Prices have crashed!",
    "Taipan! A record silk harvest has flooded the market! Prices have crashed!",
    "The French fashion for silk has passed, Taipan! Merchants here can't give it away!",
  ],
  [
    "Taipan, a Yankee captain is selling Turkish opium at below-market prices here!",
    "Taipan! A smugglers' fleet has slipped past the customs men, and opium is everywhere! Prices have crashed!",
    "Indian opium has flooded the market here, Taipan! Prices are at rock bottom!",
  ],
  [
    "Taipan! A Jingdezhen kiln has flooded the market here with cheap porcelain!",
    "A shipwreck's cargo of porcelain has been salvaged and sold off cheap, Taipan!",
    "Taipan! The European craze for porcelain has cooled, and prices here have collapsed!",
  ],
];

/**
 * Current prices followed by a message (pypan.py's get_condition_report). Prices
 * are in two columns to leave room for the menu below on small screens.
 */
export function conditionReport(h: Hong, message: string): string {
  const entries = marketGoods(h).map((g) => [GOODS[g]!, money(h.prices[g]!)] as const);
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
 * Set prices on arrival, with a 1-in-10 chance of a shock after the first month.
 * Shocks hit any good traded in the port (porcelain once we're in its trade), even
 * one a venture has taken off our own market: that one changes quietly. Otherwise
 * losing the cheap goods would put every shock on the dear ones (pypan-91).
 */
export function* establishPrices(h: Hong, rng: Rng): Flow {
  h.prices = setPrices(rng, h.location);

  if (currentTime(h) > 1 && rng.chanceOf(10)) {
    const goods = GOODS.flatMap((_, g) => (g !== PORCELAIN || h.porcelain ? [g] : []));
    const g = goods[rng.randrange(goods.length)]!;
    const f = rng.inRange(0, 5) + 5;
    // rising or falling, with one of that good's messages at random
    const up = rng.chanceOf(2);
    const message = rng.choice((up ? MSG_POS_SHOCK : MSG_NEG_SHOCK)[g]!);
    if (marketGoods(h).includes(g)) {
      yield* say(message);
    }
    if (up) {
      h.prices[g]! *= f;
    } else {
      h.prices[g] = h.prices[g]! / f;
    }
    // keep the good's usual granularity: whole, tens, hundreds, ...
    const m = mult(g);
    h.prices[g] = Math.max(m, Math.trunc(h.prices[g]! / m) * m);
  }
}

/** How much of a good you can afford; the bank can pay too, wherever it's open. */
function affordable(h: Hong, g: number): number {
  return Math.floor(spendable(h) / h.prices[g]!);
}

export function* buyGoods(h: Hong): Flow {
  // goods you can't afford any of are disabled
  const goods = marketGoods(h);
  const i = yield* askOptOrCancel(conditionReport(h, "What shall I buy, Taipan?"), goods.map((g) => GOODS[g]!), {
    disabled: goods.flatMap((g, i) => (affordable(h, g) === 0 ? [i] : [])),
  });
  if (i === null) {
    return;
  }
  const g = goods[i]!;

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
  return marketGoods(h).filter((g) => h.shipGoods[g]! > 0);
}

export function* sellGoods(h: Hong): Flow {
  const aboard = goodsAboard(h);
  let g: number;
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
    const goods = marketGoods(h);
    const i = yield* askOptOrCancel(conditionReport(h, "What shall I sell, Taipan?"), goods.map((g) => GOODS[g]!), {
      disabled: goods.flatMap((g, i) => (aboard.includes(g) ? [] : [i])),
    });
    if (i === null) {
      return;
    }
    g = goods[i]!;
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
