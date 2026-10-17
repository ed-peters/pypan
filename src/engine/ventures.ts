// Ventures (SPEC.md section 4.8): shares that settle every three months, paying a
// return into the bank or calling for funds. The cargo godowns and the arms
// smuggling replace trading general cargo and arms (pypan-91); the jade mine comes
// from a successful expedition (section 4.6, jade.ts).

import { pay } from "./bank";
import {
  ARMS, ARMS_MIN_MONTHS, ARMS_OFFER_CHANCE, ARMS_RETURN, ARMS_SHUTDOWN_CHANCE, GENERAL,
  GODOWN_MIN_MONTHS, GODOWN_OFFER_CHANCE, GODOWN_RETURN, GODOWN_SEIZURE_CHANCE, HONG_KONG,
  MINE_RETURN, MINE_SEIZURE_CHANCE, MINE_VEIN_CHANCE, MINE_VEIN_PAYOUT, REFUSAL_LOSS, SHANGHAI,
  VENTURE_FEE_SHARE, VENTURE_QUARTER_MONTHS, VENTURE_WORTH_LEVEL,
} from "./constants";
import { money } from "./format";
import { currentTime, type Hong } from "./hong";
import { checkJade } from "./jade";
import { wuCoversShortfall } from "./lender";
import { usualPrice } from "./prices";
import { askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { cashPosition } from "./score";

type VentureKey = "godowns" | "arms" | "mine";

interface Venture {
  key: VentureKey;
  /** As in "our share in the ...". */
  name: string;
  /** Each quarter's return, as a share of the share's value. */
  returns: readonly [number, number];
  /** 1-in-N quarters the share is lost. */
  lossChance: number;
  /** The news when it's lost (with what it was worth), and any other cost. */
  lose: (h: Hong, rng: Rng, worth: string) => Flow;
  /** Whether it can strike a rich vein. */
  vein?: boolean;
}

export const VENTURES: readonly Venture[] = [
  {
    key: "godowns",
    name: "Nanking godowns",
    returns: GODOWN_RETURN,
    lossChance: GODOWN_SEIZURE_CHANCE,
    *lose(_h, _rng, worth) {
      yield* say(`Bad joss, Taipan! A rival hong has seized the Nanking godowns, and our share in them, worth ${worth}, is lost.`);
    },
  },
  {
    key: "arms",
    name: "Red Wind gang's smuggling",
    returns: ARMS_RETURN,
    lossChance: ARMS_SHUTDOWN_CHANCE,
    *lose(h, rng, worth) {
      const news = `Bad joss, Taipan! The authorities have shut down the Red Wind gang's smuggling. Our share, worth ${worth}, is lost`;
      // a fine like the harbor police's, if we have cash
      if (h.cash > 0) {
        const fine = Math.trunc((h.cash / 1.8) * rng.float()) + 1;
        h.cash -= fine;
        yield* say(`${news}, and they have fined us ${money(fine)}!`);
      } else {
        yield* say(`${news}!`);
      }
    },
  },
  {
    key: "mine",
    name: "jade mine",
    returns: MINE_RETURN,
    lossChance: MINE_SEIZURE_CHANCE,
    *lose(_h, _rng, worth) {
      yield* say(`Bad joss, Taipan! Rebels have seized the jade mine, and our share in it, worth ${worth}, is lost.`);
    },
    vein: true,
  },
];

/** On arrival: settle any ventures that are due, maybe offer one, then the jade expedition. */
export function* checkVentures(h: Hong, rng: Rng): Flow {
  for (const v of VENTURES) {
    yield* settle(h, rng, v);
  }
  yield* offer(h, rng, GODOWNS);
  yield* offer(h, rng, ARMS_VENTURE);
  yield* checkJade(h, rng);
}

/** The value of all our shares. */
export function sharesValue(h: Hong): number {
  return VENTURES.reduce((sum, v) => sum + (h[v.key]?.value ?? 0), 0);
}

/**
 * Every three months a share settles: it may be lost (and the mine may strike a
 * rich vein); otherwise it returns a share of its value. A gain goes into the
 * bank; a loss is a call for funds, and refusing it costs half the share.
 */
function* settle(h: Hong, rng: Rng, v: Venture): Flow {
  const s = h[v.key];
  if (!s || currentTime(h) < s.due) {
    return;
  }
  s.due = currentTime(h) + VENTURE_QUARTER_MONTHS;

  if (rng.chanceOf(v.lossChance)) {
    h[v.key] = null;
    yield* v.lose(h, rng, money(s.value));
    return;
  }
  if (v.vein && rng.chanceOf(MINE_VEIN_CHANCE)) {
    const pay = s.value * MINE_VEIN_PAYOUT;
    yield* say(`Taipan!! The jade mine has struck a rich vein! Our share of ${money(pay)} has been deposited in the bank.`);
    h.bank += pay;
    return;
  }

  const [lo, hi] = v.returns;
  const r = lo + (hi - lo) * rng.float();
  const amount = Math.round(s.value * Math.abs(r) / 1000) * 1000;
  if (amount === 0) {
    yield* say(`Our share in the ${v.name} has broken even this quarter, Taipan.`);
  } else if (r > 0) {
    yield* say(`Our share in the ${v.name} has paid us ${money(amount)} this quarter, Taipan. It has been deposited in the bank.`);
    h.bank += amount;
  } else if (!(yield* askYn(`Taipan, it has been a bad quarter for the ${v.name}, and the backers must put in ${money(amount)} more. Shall we pay our part?`))
    || !(yield* payCall(h, amount))) {
    s.value = Math.round(s.value * (1 - REFUSAL_LOSS) / 1000) * 1000;
    yield* say(`The other backers have taken half of our share in the ${v.name}, Taipan. It is now worth ${money(s.value)}.`);
  }
}

/**
 * Pay a call for funds from the bank, then cash (arranged from Hong Kong, as the
 * stake was). Wu can make up a shortfall. Returns whether it was paid.
 */
function* payCall(h: Hong, amount: number): Flow<boolean> {
  if (h.bank + h.cash >= amount) {
    const fromBank = Math.min(h.bank, amount);
    h.bank -= fromBank;
    h.cash -= amount - fromBank;
    return true;
  }
  // everything we have goes toward it, and Wu may lend the rest
  const bank = h.bank;
  h.cash += bank;
  h.bank = 0;
  if (yield* wuCoversShortfall(h, amount, "the backers")) {
    return true;
  }
  h.cash -= bank;
  h.bank = bank;
  return false;
}

// ------------------------------------------------------------------------------------
// The godowns and the arms smuggling

interface Offer {
  key: "godowns" | "arms";
  /** Where it's offered; null for any port but Hong Kong. */
  port: number | null;
  months: number;
  chance: number;
  /** Whether it can be offered yet (the arms smuggling needs godowns first). */
  ready: (h: Hong) => boolean;
  /** The good it replaces. */
  good: number;
  /** The offer: a first share, a share again after losing one, or more for the share we hold. */
  pitch: (kind: "first" | "again" | "more", fee: string) => string;
  /** On buying in: the share's worth, and a note on any goods that went into it. */
  welcome: (worth: string, units: number) => string;
}

const GODOWNS: Offer = {
  key: "godowns",
  port: SHANGHAI,
  months: GODOWN_MIN_MONTHS,
  chance: GODOWN_OFFER_CHANCE,
  ready: () => true,
  good: GENERAL,
  pitch: (kind, fee) => ({
    first: `Taipan, a merchant of Nanking offers us a share in his cargo godowns for ${fee}. We would leave the general cargo trade to him. Shall we buy in?`,
    again: `Taipan, the merchant of Nanking has new godowns, and offers us a share again for ${fee}. Shall we buy back in?`,
    more: `Taipan, the merchant of Nanking is building more godowns, and offers to add ${fee} to our share. Shall we?`,
  })[kind],
  welcome: (worth, units) =>
    `Very well, Taipan. Our share in the Nanking godowns is worth ${worth}, and will settle with us every three months.${units > 0 ? ` Our ${money(units)} general cargo has gone into them too.` : ""}`,
};

const ARMS_VENTURE: Offer = {
  key: "arms",
  port: null,
  months: ARMS_MIN_MONTHS,
  chance: ARMS_OFFER_CHANCE,
  ready: (h) => h.godownsBought,
  good: ARMS,
  pitch: (kind, fee) => ({
    first: `Taipan, the Red Wind gang offers us a share in their arms smuggling for ${fee}. We would leave the arms trade to them. Shall we join them?`,
    again: `Taipan, the Red Wind gang is back in business, and offers us a share again for ${fee}. Shall we join them?`,
    more: `Taipan, the Red Wind gang is expanding, and offers to add ${fee} to our share. Shall we?`,
  })[kind],
  welcome: (worth, units) =>
    `Very well, Taipan. Our share in the Red Wind gang's smuggling is worth ${worth}, and will settle with us every three months.${units > 0 ? ` Our ${money(units)} arms have gone to them too.` : ""}`,
};

/**
 * Offer a share in the godowns or the arms smuggling, for a quarter of our cash
 * position (paid as the jade stake is, arranged from Hong Kong). Buying in puts any
 * of the good it replaces into the share, at its usual Hong Kong price, and ends our
 * trade in that good for good. While we hold a share, the offer is to add to it,
 * once it's worth less than the fee.
 */
function* offer(h: Hong, rng: Rng, o: Offer): Flow {
  const here = o.port === null ? h.location !== HONG_KONG : h.location === o.port;
  if (!here || !o.ready(h) || currentTime(h) <= o.months || cashPosition(h) <= VENTURE_WORTH_LEVEL) {
    return;
  }
  const fee = Math.round(cashPosition(h) * VENTURE_FEE_SHARE / 1000) * 1000;
  const held = h[o.key];
  if ((held && held.value >= fee) || !rng.chanceOf(o.chance)) {
    return;
  }
  const bought = o.key === "godowns" ? h.godownsBought : h.armsBought;
  if (!(yield* askYn(o.pitch(held ? "more" : bought ? "again" : "first", money(fee))))) {
    return;
  }
  yield* pay(h, fee);
  if (held) {
    held.value += fee;
    yield* say(`Very well, Taipan. Our share is now worth ${money(held.value)}.`);
    return;
  }
  const units = h.shipGoods[o.good]! + h.warehouseGoods[o.good]!;
  h.shipGoods[o.good] = 0;
  h.warehouseGoods[o.good] = 0;
  const share = { value: fee + units * usualPrice(o.good, HONG_KONG), due: currentTime(h) + VENTURE_QUARTER_MONTHS };
  h[o.key] = share;
  if (o.key === "godowns") {
    h.godownsBought = true;
  } else {
    h.armsBought = true;
  }
  yield* say(o.welcome(money(share.value), units));
}
