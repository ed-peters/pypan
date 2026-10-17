// A "decent player" for the wealth simulation (scripts/sim/simulate.ts).
//
// The bot answers each prompt from the game state, as a player reading the screen
// would. It knows the port price table (BASE_PRICES), so it knows what each good
// usually costs where, but not today's prices elsewhere. Its play:
//
// - Sells a good once the local price is at least what it expects anywhere else.
// - Buys for the destination with the best expected profit, using the bank where
//   it can, and sails there (or delivers a consignment, which it always takes
//   when it fits).
// - Repays Wu on each visit and keeps enough cash to repay the rest next time;
//   never borrows except for a bailout when broke.
// - Banks everything above that, and enough cash to afford a new ship.
// - Pays Li Yuen, repairs fully, buys bigger ships, and guns up to a target.
// - Fights when it has guns to match the pirates, otherwise runs.
//
// Any prompt it doesn't recognize is an error, so new game events can't quietly
// skew the results.
//
// Price shocks: the gain from a shock is measured against the good's usual price at
// that port. Selling into a rising shock gains (price - usual) per unit, at once.
// Buying in a crash gains (usual - price) per unit, counted when those goods are
// sold. Both are also part of tradeProfit.

import { bankAvailable, spendable } from "../../src/engine/bank";
import {
  BANK_RATE, BASE_PRICES, CITIES, GOODS, HONG_KONG, LOAN_RATE, OPIUM,
} from "../../src/engine/constants";
import {
  currentTime, isBroke, knownGoods, repairPercent, shipAvailable, type Hong,
} from "../../src/engine/hong";
import type { Prompt } from "../../src/engine/prompts";
import { MSG_NEG_SHOCK, MSG_POS_SHOCK } from "../../src/engine/trade";

/** Running totals of where money came from and went, for one game. */
export interface Ledger {
  tradeProfit: number;
  /** Trade profit per good, in GOODS order. */
  byGood: number[];
  consignments: number;
  booty: number;
  bankInterest: number;
  debtInterest: number;
  liYuen: number;
  robbery: number;
  fines: number;
  /** What was paid for opium the police confiscated. */
  seized: number;
  repairs: number;
  ships: number;
  guns: number;
  bailouts: number;
  /** Profit from price shocks (part of tradeProfit). */
  shockGain: number;
  /** Shocks seen: rises, rises we sold into, crashes, crashes we bought into. */
  shocksUp: number;
  shocksUpSold: number;
  shocksDown: number;
  shocksDownBought: number;
  /** The biggest single windfall (shock sale or booty) as a share of worth at cost. */
  biggestWindfall: number;
  /** The same, after the first five years. */
  biggestLateWindfall: number;
  /** The jade expedition: offers, the stake if we backed one, and how it ended. */
  jadeOffers: number;
  jadeStake: number;
  /** The biggest stake as a share of worth at cost when it was made. */
  jadeStakeShare: number;
  jadeOutcome: "success" | "failure" | null;
  /** Expeditions backed, and how many succeeded. */
  jadeBacked: number;
  jadeWins: number;
  /** What successes paid beyond their stakes, and the stakes lost on failures. */
  jadeGain: number;
  jadeLost: number;
}

export function newLedger(): Ledger {
  return {
    tradeProfit: 0, byGood: GOODS.map(() => 0), consignments: 0, booty: 0, bankInterest: 0, debtInterest: 0, liYuen: 0,
    robbery: 0, fines: 0, seized: 0, repairs: 0, ships: 0, guns: 0, bailouts: 0,
    shockGain: 0, shocksUp: 0, shocksUpSold: 0, shocksDown: 0, shocksDownBought: 0,
    biggestWindfall: 0, biggestLateWindfall: 0, jadeOffers: 0, jadeStake: 0, jadeStakeShare: 0, jadeOutcome: null, jadeBacked: 0, jadeWins: 0,
    jadeGain: 0, jadeLost: 0,
  };
}

/** What a good usually costs at a port: its level times the mean multiplier (2). */
export function expectedPrice(port: number, g: number): number {
  const row = BASE_PRICES[g]!;
  return Math.trunc(row[port + 1]! / 2) * 2 * row[0]!;
}

type Step =
  | { kind: "sell"; good: number }
  | { kind: "buy"; good: number; qty: number }
  | { kind: "bank" }
  | { kind: "leave"; to: number };

export class Bot {
  readonly ledger = newLedger();
  private plan: Step[] = [];
  private visit = "";
  private step: Step | null = null;
  /** What the bot paid for the goods aboard, per good, for trade profit. */
  private cost: number[] = GOODS.map(() => 0);
  /** Pay for the consignment aboard, if any. */
  private consignment = 0;
  /** Shock discounts on goods aboard, per good, counted when they're sold. */
  private discount: number[] = GOODS.map(() => 0);
  /** A shock announced on arrival, and the one at the port we're visiting. */
  private pendingShock: { good: number; up: boolean } | null = null;
  private shock: { good: number; up: boolean } | null = null;
  /** Whether we've counted the current shock as sold into or bought into. */
  private shockUsed = false;
  /** Whether we backed the expedition that's under way. */
  /** Our stake in the expedition under way; 0 if we didn't back it. */
  private backing = 0;

  constructor(private readonly start: "guns" | "debt") {}

  answer(p: Prompt, h: Hong | null): unknown {
    const text = p.text;
    if (p.kind === "say") {
      if (h) this.observe(text, h);
      return undefined;
    }
    if (!h) {
      // the opening choice
      return this.start === "guns" ? 0 : 1;
    }
    const last = text.split("\n").at(-1)!;

    // ---------------------------------------------------------------- port menu
    if (last === "What shall I do, Taipan?") {
      return this.portMenu(p, h);
    }
    if (last === "What shall I sell, Taipan?") {
      return (this.step as { good: number }).good;
    }
    if (/^Would you like to sell all of your/.test(last)) {
      const g = (this.step as { good: number }).good;
      this.recordSale(h, g, h.shipGoods[g]!);
      return true;
    }
    if (/^How much \w+ shall I sell, Taipan\?$/.test(last)) {
      const g = (this.step as { good: number }).good;
      this.recordSale(h, g, h.shipGoods[g]!);
      return h.shipGoods[g];
    }
    if (last === "What shall I buy, Taipan?") {
      return (this.step as { good: number }).good;
    }
    if (/^How much \w+ shall I buy, Taipan\?$/.test(last)) {
      const s = this.step as { good: number; qty: number };
      this.cost[s.good]! += s.qty * h.prices[s.good]!;
      if (this.shock && !this.shock.up && this.shock.good === s.good) {
        this.discount[s.good]! += s.qty * Math.max(0, expectedPrice(h.location, s.good) - h.prices[s.good]!);
        if (!this.shockUsed) this.ledger.shocksDownBought += 1;
        this.shockUsed = true;
      }
      return s.qty;
    }
    if (text === "How much shall I deposit?") {
      return Math.max(0, h.cash - this.keep(h));
    }
    if (text === "How much shall I withdraw?") {
      return Math.min(h.bank, Math.max(0, this.keep(h) - h.cash));
    }
    if (text === "Where shall we sail to, Taipan?") {
      const to = (this.step as { to: number }).to;
      // what accrueInterest will add on arrival (unless we sink)
      this.ledger.bankInterest += Math.trunc(h.bank * BANK_RATE);
      this.ledger.debtInterest += Math.trunc(h.debt * LOAN_RATE);
      return to;
    }

    // ---------------------------------------------------------------- Wu
    if (text === "Do you have business with Elder Brother Wu, the moneylender, Taipan?") {
      return (h.debt > 0 && this.repayment(h) > 0) || (h.cash === 0 && isBroke(h) && currentTime(h) > 1);
    }
    if (text === "How much will you repay, Taipan?") {
      return Math.min(this.repayment(h), p.kind === "number" ? p.max : 0);
    }
    if (text === "How much will you borrow, Taipan?") {
      return 0;
    }
    let m = /He is willing to loan you an additional ([\d,]+) if you will pay back/.exec(text);
    if (m) {
      this.ledger.bailouts += 1;
      return true;
    }
    if (/^You do not have enough cash on hand, Taipan! Do you want Elder Brother Wu/.test(text)) {
      // only reached when paying Li Yuen beyond our cash, which keep() allows for
      return true;
    }

    // ---------------------------------------------------------------- Li Yuen
    m = /^Li Yuen asks ([\d,]+) in donation/.exec(text);
    if (m) {
      const cost = num(m[1]!);
      const pay = cost <= h.cash + h.bank;
      if (pay) this.ledger.liYuen += cost;
      return pay;
    }

    // ---------------------------------------------------------------- McHenry, ships, guns, warehouse
    if (/^Taipan, Mc Henry from the Hong Kong shipyards has arrived!/.test(text)) {
      return true;
    }
    m = /We can fix yer whole ship for ([\d,]+)/.exec(text);
    if (m && p.kind === "number") {
      const n = Math.min(num(m[1]!), spendable(h));
      this.ledger.repairs += n;
      return n;
    }
    m = /^Would you like to replace your \w+ ship with another one .* paying an additional ([\d,]+), Taipan\?$/.exec(text);
    if (m) {
      const cost = num(m[1]!);
      const buy = cost <= 0.5 * worth(h);
      if (buy) this.ledger.ships += cost;
      return buy;
    }
    m = /^Would you like to buy a ship's gun for ([\d,]+), Taipan\?$/.exec(text);
    if (m) {
      const cost = num(m[1]!);
      const buy = h.shipGuns < targetGuns(h) && cost <= 0.1 * worth(h) && shipAvailable(h) >= 10;
      if (buy) this.ledger.guns += cost;
      return buy;
    }
    if (/^A new warehouse with an additional/.test(text)) {
      return false;
    }

    // ---------------------------------------------------------------- consignments, jade
    m = /^(?:Good joss!! )?Should I accept a special consignment of a .* to transport to (.+) for ([\d,]+), Taipan\? \(It will take up (\d+) space/.exec(text);
    if (m) {
      const take = shipAvailable(h) >= Number(m[3]);
      if (take) this.consignment = num(m[2]!);
      return take;
    }
    m = /Would you like to invest ([\d,]+)\?$/.exec(text);
    if (m) {
      this.ledger.jadeOffers += 1;
      const stake = num(m[1]!);
      this.backing = h.bank > 2 * stake ? stake : 0;
      if (this.backing) {
        this.ledger.jadeBacked += 1;
        this.ledger.jadeStake += stake;
        this.ledger.jadeStakeShare = Math.max(this.ledger.jadeStakeShare, stake / this.worthAtCost(h));
      }
      return this.backing > 0;
    }

    // ---------------------------------------------------------------- battle
    m = /^(\d+) enemies remaining \.\.\. What shall we do, Taipan\?$/.exec(text);
    if (m && p.kind === "choose") {
      const pirates = Number(m[1]);
      const fire = p.options.indexOf("Fire cannons");
      if (fire >= 0 && pirates <= 2 * h.shipGuns) {
        return fire;
      }
      return p.options.indexOf("Run away");
    }

    throw new Error(`bot doesn't know how to answer: ${JSON.stringify(text)}`);
  }

  // ----------------------------------------------------------------------------------

  private portMenu(p: Prompt, h: Hong): number {
    if (p.kind !== "choose") throw new Error("port menu isn't a menu");
    const key = `${currentTime(h)}/${h.location}`;
    if (key !== this.visit) {
      this.shock = this.pendingShock;
      this.pendingShock = null;
      this.shockUsed = false;
    }
    if (key !== this.visit || this.plan.length === 0) {
      this.visit = key;
      this.plan = this.makePlan(h);
    }
    this.step = this.plan.shift()!;
    const label = {
      sell: "Sell goods", buy: "Buy goods", bank: "Visit the bank", leave: "Leave port",
    }[this.step.kind];
    const i = p.options.indexOf(label);
    if (i < 0 || p.disabled?.includes(i)) {
      throw new Error(`can't ${label} at ${CITIES[h.location]}`);
    }
    return i;
  }

  /** Sell, buy, bank, then sail. */
  private makePlan(h: Hong): Step[] {
    const here = h.location;
    const goods = knownGoods(h).map((_, g) => g);
    const others = CITIES.map((_, q) => q).filter((q) => q !== here);
    const plan: Step[] = [];

    // sell what's dearer here than we'd expect anywhere else, and anything at all
    // if overloaded
    const kept = [...h.shipGoods];
    for (const g of goods) {
      const best = Math.max(...others.map((q) => expectedPrice(q, g)));
      if (kept[g]! > 0 && (h.prices[g]! >= best || shipAvailable(h) < 0)) {
        plan.push({ kind: "sell", good: g });
        kept[g] = 0;
      }
    }
    const proceeds = goods.reduce((s, g) => s + (h.shipGoods[g]! - kept[g]!) * h.prices[g]!, 0);

    // what we can spend: cash and (where it's open) the bank, less what we keep
    const cargoSpace = h.shipSize - (h.shipCargo?.size ?? 0) - kept.reduce((a, b) => a + b, 0);
    const funds = Math.max(0, spendable(h) + proceeds - this.keep(h));

    // pick the destination with the best expected value for what's kept plus what
    // we'd buy for it; a consignment decides the destination for us
    const destinations = h.shipCargo ? [h.shipCargo.destination] : others;
    let bestTo = -1;
    let bestValue = -Infinity;
    let bestBuys: Step[] = [];
    for (const q of destinations) {
      let space = cargoSpace;
      let money = funds;
      let value = goods.reduce((s, g) => s + kept[g]! * expectedPrice(q, g), 0);
      const buys: Step[] = [];
      // greedily fill the hold with the best margin per unit of space
      const ranked = goods
        .map((g) => ({ g, margin: expectedPrice(q, g) - h.prices[g]! }))
        .filter(({ g, margin }) => margin > 0.25 * h.prices[g]!)
        .sort((a, b) => b.margin - a.margin);
      for (const { g, margin } of ranked) {
        const qty = Math.min(space, Math.floor(money / h.prices[g]!));
        if (qty > 0) {
          buys.push({ kind: "buy", good: g, qty });
          space -= qty;
          money -= qty * h.prices[g]!;
          value += qty * margin;
        }
      }
      // home pulls when the ship needs repairs or there's debt to pay
      if (q === HONG_KONG && (repairPercent(h) < 75 || h.debt > 0)) {
        value = value * 1.25 + 1;
      }
      if (value > bestValue) {
        bestValue = value;
        bestTo = q;
        bestBuys = buys;
      }
    }
    // nothing worth carrying and nothing to spend: go home to the bank (or Wu)
    if (bestValue <= 0 && !h.shipCargo && here !== HONG_KONG) {
      bestTo = HONG_KONG;
      bestBuys = [];
    }

    plan.push(...bestBuys);
    if (bankAvailable(h)) {
      plan.push({ kind: "bank" });
    }
    plan.push({ kind: "leave", to: bestTo });
    return plan;
  }

  /**
   * Cash to keep on hand rather than spend or bank: enough to repay Wu next time
   * in Hong Kong, and to afford the dearest new ship we might be offered.
   */
  private keep(h: Hong): number {
    const t = currentTime(h);
    const ship = Math.trunc(1000 * (t + 5) / 6) * Math.trunc(h.shipSize / 50) + 1000;
    const keep = Math.ceil(h.debt * (1 + LOAN_RATE)) + ship;
    // early on, all our money is working capital
    return Math.max(0, Math.min(keep, Math.trunc(worth(h) / 4)));
  }

  /** What to repay Wu: everything we can, less what we need to fill the hold. */
  private repayment(h: Hong): number {
    // prices here are from the last port, so estimate the cost of a hold of the
    // best good we can afford at Hong Kong's usual prices
    const reserve = Math.min(h.cash, shipAvailable(h) * expectedPrice(HONG_KONG, 0));
    return Math.max(0, Math.min(h.debt, h.cash - reserve));
  }

  private recordSale(h: Hong, g: number, n: number): void {
    const aboard = h.shipGoods[g]!;
    const share = aboard > 0 ? n / aboard : 0;
    const paid = this.cost[g]! * share;
    const worth = this.worthAtCost(h);
    this.ledger.tradeProfit += n * h.prices[g]! - paid;
    this.ledger.byGood[g]! += n * h.prices[g]! - paid;
    this.cost[g]! -= paid;

    // selling into a rise, or selling what we bought in a crash
    let gain = this.discount[g]! * share;
    this.discount[g]! -= gain;
    if (this.shock?.up && this.shock.good === g) {
      gain += n * Math.max(0, h.prices[g]! - expectedPrice(h.location, g));
      if (!this.shockUsed) this.ledger.shocksUpSold += 1;
      this.shockUsed = true;
    }
    this.ledger.shockGain += gain;
    this.windfall(gain, worth, h);
  }

  private windfall(gain: number, worth: number, h: Hong): void {
    // early on, when worth is a few hundred, any gain is a multiple of it
    if (worth >= 10000) {
      this.ledger.biggestWindfall = Math.max(this.ledger.biggestWindfall, gain / worth);
      if (currentTime(h) > 61) {
        this.ledger.biggestLateWindfall = Math.max(this.ledger.biggestLateWindfall, gain / worth);
      }
    }
  }

  /** Cash plus bank, less debt, plus what we paid for the goods aboard. */
  worthAtCost(h: Hong): number {
    return h.cash + h.bank - h.debt + this.cost.reduce((a, b) => a + b, 0);
  }

  /** Track money from messages: booty, consignments, robbery, fines, shocks, jade. */
  private observe(text: string, h: Hong): void {
    let m = /captured some booty worth ([\d,]+)/.exec(text);
    if (m) {
      this.ledger.booty += num(m[1]!);
      this.windfall(num(m[1]!), this.worthAtCost(h), h);
    }
    const up = (MSG_POS_SHOCK as readonly string[]).indexOf(text);
    const down = (MSG_NEG_SHOCK as readonly string[]).indexOf(text);
    if (up >= 0) {
      this.pendingShock = { good: up, up: true };
      this.ledger.shocksUp += 1;
    } else if (down >= 0) {
      this.pendingShock = { good: down, up: false };
      this.ledger.shocksDown += 1;
    }
    m = /reports the success of his jade mining effort.* our share of ([\d,]+) has been deposited/.exec(text);
    if (m) {
      this.ledger.jadeOutcome = "success";
      this.ledger.jadeWins += 1;
      this.ledger.jadeGain += num(m[1]!) - this.backing;
      this.windfall(num(m[1]!) - this.backing, this.worthAtCost(h), h);
      this.backing = 0;
    } else if (/has been captured by rebels/.test(text) && this.backing) {
      this.ledger.jadeOutcome = "failure";
      this.ledger.jadeLost += this.backing;
      this.backing = 0;
    } else if (/met with success/.test(text)) {
      this.backing = 0;
    }
    m = /so we were paid only ([\d,]+)/.exec(text);
    if (m) this.ledger.consignments += num(m[1]!);
    if (/^We have successfully delivered/.test(text)) this.ledger.consignments += this.consignment;
    m = /you were robbed of ([\d,]+)/.exec(text);
    if (m) this.ledger.robbery += num(m[1]!);
    m = /fined you an additional ([\d,]+)/.exec(text);
    if (m) this.ledger.fines += num(m[1]!);
    if (/confiscated your opium/.test(text)) {
      this.ledger.seized += this.cost[OPIUM]!;
      this.cost[OPIUM] = 0;
      this.discount[OPIUM] = 0;
    }
  }
}

/** Cash plus bank, less debt, plus goods at local prices. */
export function worth(h: Hong): number {
  const goods = h.shipGoods.reduce((s, n, g) => s + n * h.prices[g]!, 0)
    + h.warehouseGoods.reduce((s, n, g) => s + n * h.prices[g]!, 0);
  return h.cash + h.bank - h.debt + goods;
}

/** One gun per 50 of hold, at least two and at most ten. */
function targetGuns(h: Hong): number {
  return Math.min(10, Math.max(2, Math.trunc(h.shipSize / 50)));
}

function num(s: string): number {
  return Number(s.replace(/,/g, ""));
}
