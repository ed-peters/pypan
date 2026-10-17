// Wealth simulation: play many games with the "decent player" bot (bot.ts) and
// report the spread of wealth after 2, 5 and 10 years among the ships still afloat.
//
//   npm run sim -- [--runs 1000] [--start debt|guns] [--seed 1] [--json]
//
// Low, middling and high success are the 25th, 50th and 90th percentiles. --json
// prints a summary for comparing scenarios (scripts/sim/run.mjs) instead.

import { currentTime, type Hong } from "../../src/engine/hong";
import { newGame } from "../../src/engine/pypan";
import { SeededRng } from "../../src/engine/rng";
import { rank } from "../../src/engine/score";
import { GOODS, PORCELAIN, SCORE_DIVISOR } from "../../src/engine/constants";
import { finalPosition } from "../../src/engine/score";
import { sharesValue } from "../../src/engine/ventures";
import { Bot, worth, type Ledger } from "./bot";

const STAGES = [
  { label: "Early (2 years)", months: 24 },
  { label: "Mid (5 years)", months: 60 },
  { label: "Late (10 years)", months: 120 },
] as const;
const LAST = STAGES.at(-1)!.months;
const PERCENTILES = [10, 25, 50, 75, 90, 95, 99] as const;
const TIERS = [
  { label: "Low", p: 25 },
  { label: "Middling", p: 50 },
  { label: "High", p: 90 },
] as const;
const MAX_PROMPTS = 100000;

interface Snapshot {
  position: number;
  worth: number;
  cash: number;
  bank: number;
  debt: number;
  shipSize: number;
  guns: number;
  score: number;
  /** The value of our shares in ventures, and which we hold. */
  shares: number;
  holds: { godowns: boolean; arms: boolean; mine: boolean };
  /** Cash + bank - debt + what was paid for the goods aboard. */
  atCost: number;
  ledger: Ledger;
}

interface Run {
  /** Snapshot at the first port menu after N months played, by N. */
  at: Map<number, Snapshot>;
  sunkAt: number | null;
  /** The biggest fall in worth at cost from an earlier peak (once over 10,000). */
  maxDrawdown: number;
  /** The same, after the first five years. */
  lateDrawdown: number;
}

function args(): { runs: number; start: "debt" | "guns"; seed: number; json: boolean } {
  const a = process.argv.slice(2);
  const get = (k: string, d: string) => {
    const i = a.indexOf(`--${k}`);
    return i >= 0 ? a[i + 1]! : d;
  };
  return { runs: Number(get("runs", "1000")), start: get("start", "debt") as "debt" | "guns", seed: Number(get("seed", "1")), json: a.includes("--json") };
}

function play(seed: number, start: "debt" | "guns"): Run {
  const bot = new Bot(start);
  const at = new Map<number, Snapshot>();
  let done = false;
  const { game, session } = newGame({
    rng: new SeededRng(seed),
    onSave: (h: Hong) => {
      const played = currentTime(h) - 1;
      if (!at.has(played)) {
        // the final position, as scored: shares in ventures count
        const position = finalPosition(h);
        at.set(played, {
          position, worth: worth(h), cash: h.cash, bank: h.bank, debt: h.debt,
          shares: sharesValue(h), holds: { godowns: !!h.godowns, arms: !!h.arms, mine: !!h.mine },
          shipSize: h.shipSize, guns: h.shipGuns,
          score: Math.floor(position / currentTime(h) / SCORE_DIVISOR),
          atCost: bot.worthAtCost(h),
          ledger: { ...bot.ledger, byGood: [...bot.ledger.byGood] },
        });
      }
      if (played >= LAST) done = true;
    },
  });
  let prompts = 0;
  while (game.prompt && !done) {
    if (++prompts > MAX_PROMPTS) {
      throw new Error(`seed ${seed}: no end after ${MAX_PROMPTS} prompts (month ${session.hong ? currentTime(session.hong) : 0})`);
    }
    game.answer(bot.answer(game.prompt, session.hong));
  }
  const sunk = game.done && game.result?.ending === "sunk";
  return { at, sunkAt: sunk ? currentTime(session.hong!) : null, maxDrawdown: drawdown(at), lateDrawdown: drawdown(at, 60) };
}

function drawdown(at: Map<number, Snapshot>, from = 0): number {
  let peak = 0;
  let worst = 0;
  for (const m of [...at.keys()].filter((m) => m >= from).sort((a, b) => a - b)) {
    const v = at.get(m)!.atCost;
    peak = Math.max(peak, v);
    if (peak >= 10000) worst = Math.max(worst, (peak - v) / peak);
  }
  return worst;
}

/** The figures compared across scenarios, for games afloat after LAST months. */
export interface Summary {
  runs: number;
  start: string;
  afloat: Record<number, number>;
  position: Record<number, { p25: number; p50: number; p90: number }>;
  /** Median share of each source in gross income, and losses against it. */
  shares: { trading: number; shocks: number; bank: number; booty: number; consignments: number; ventures: number; losses: number; porcelain: number };
  /**
   * At 10 years: games holding each venture, and any; among those holding any, the
   * shares' median part of their position, and ventures' share of their income (P10 / P50 / P90).
   */
  ventures: {
    godowns: number; arms: number; mine: number;
    held: number; ofPosition: number; incomeP10: number; incomeP50: number; incomeP90: number;
  };
  /** Share of games in the porcelain trade, the median month they bought in, and the share of porcelain profit lost to breakage. */
  porcelain: { owned: number; month: number; broken: number };
  shocks: { perGame: number; upSold: number; downBought: number; gain: number };
  windfall: { median: number; over10: number; over25: number; late: number; lateOver10: number };
  risk: { drawdown: number; over25: number; over50: number; late: number; lateOver25: number };
  moonshot: {
    /** Share of games offered it, and that backed it; per expedition backed, how many won. */
    offered: number; backed: number; perExpedition: number; expeditions: number; stakeShare: number;
    posSuccess: number; posFailure: number; posNotBacked: number;
  };
}

function summarize(results: Run[], runs: number, start: string): Summary {
  const alive = results.filter((r) => r.at.has(LAST));
  const last = alive.map((r) => r.at.get(LAST)!);
  const frac = (xs: unknown[], n = alive.length) => xs.length / n;
  const med = (xs: number[]) => median(xs);
  const pos = (months: number) => {
    const v = [...results.flatMap((r) => (r.at.has(months) ? [r.at.get(months)!.position] : []))].sort((a, b) => a - b);
    return { p25: percentile(v, 25), p50: percentile(v, 50), p90: percentile(v, 90) };
  };
  const income = last.map((x) => {
    const l = x.ledger;
    const parts = {
      trading: l.tradeProfit - l.shockGain, shocks: l.shockGain, bank: l.bankInterest,
      booty: l.booty, consignments: l.consignments, ventures: l.ventureGain,
    };
    const gross = Object.values(parts).reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const losses = l.robbery + l.liYuen + l.fines + l.seized + l.repairs + l.debtInterest + l.ventureLost
      + l.porcelainFee + l.porcelainBroken;
    return {
      ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v / gross])),
      losses: losses / gross,
      // porcelain trading profit, a part of trading
      porcelain: l.byGood[PORCELAIN]! / gross,
    } as Summary["shares"];
  });
  const share = (k: keyof Summary["shares"]) => med(income.map((x) => x[k]));
  const ledgers = last.map((x) => x.ledger);
  const backed = last.filter((x) => x.ledger.jadeStake > 0);
  const group = (f: (x: Snapshot) => boolean) => med(last.filter(f).map((x) => x.position));
  return {
    runs, start,
    afloat: Object.fromEntries(STAGES.map((st) => [st.months, results.filter((r) => r.at.has(st.months)).length / runs])),
    position: Object.fromEntries(STAGES.map((st) => [st.months, pos(st.months)])),
    shares: {
      trading: share("trading"), shocks: share("shocks"), bank: share("bank"), booty: share("booty"),
      consignments: share("consignments"), ventures: share("ventures"), losses: share("losses"),
      porcelain: share("porcelain"),
    },
    ventures: (() => {
      const holders = last.map((x, i) => [x, income[i]!] as const).filter(([x]) => x.shares > 0);
      const shares = holders.map(([, inc]) => inc.ventures).sort((a, b) => a - b);
      return {
        godowns: frac(last.filter((x) => x.holds.godowns)),
        arms: frac(last.filter((x) => x.holds.arms)),
        mine: frac(last.filter((x) => x.holds.mine)),
        held: frac(holders),
        ofPosition: med(holders.map(([x]) => x.shares / Math.max(1, x.position))),
        incomeP10: percentile(shares, 10), incomeP50: percentile(shares, 50), incomeP90: percentile(shares, 90),
      };
    })(),
    porcelain: {
      owned: frac(ledgers.filter((l) => l.porcelainMonth !== null)),
      month: med(ledgers.flatMap((l) => (l.porcelainMonth === null ? [] : [l.porcelainMonth]))),
      broken: med(ledgers.flatMap((l) => (l.porcelainMonth === null ? [] : [l.porcelainBroken / Math.max(1, l.byGood[PORCELAIN]! + l.porcelainBroken)]))),
    },
    shocks: {
      perGame: med(ledgers.map((l) => l.shocksUp + l.shocksDown)),
      upSold: ledgers.reduce((a, l) => a + l.shocksUpSold, 0) / Math.max(1, ledgers.reduce((a, l) => a + l.shocksUp, 0)),
      downBought: ledgers.reduce((a, l) => a + l.shocksDownBought, 0) / Math.max(1, ledgers.reduce((a, l) => a + l.shocksDown, 0)),
      gain: med(ledgers.map((l) => l.shockGain)),
    },
    windfall: {
      median: med(ledgers.map((l) => l.biggestWindfall)),
      over10: frac(ledgers.filter((l) => l.biggestWindfall >= 0.1)),
      over25: frac(ledgers.filter((l) => l.biggestWindfall >= 0.25)),
      late: med(ledgers.map((l) => l.biggestLateWindfall)),
      lateOver10: frac(ledgers.filter((l) => l.biggestLateWindfall >= 0.1)),
    },
    risk: {
      drawdown: med(alive.map((r) => r.maxDrawdown)),
      over25: frac(alive.filter((r) => r.maxDrawdown >= 0.25)),
      over50: frac(alive.filter((r) => r.maxDrawdown >= 0.5)),
      late: med(alive.map((r) => r.lateDrawdown)),
      lateOver25: frac(alive.filter((r) => r.lateDrawdown >= 0.25)),
    },
    moonshot: {
      offered: frac(ledgers.filter((l) => l.jadeOffers > 0)),
      backed: frac(backed),
      perExpedition: backed.reduce((a, x) => a + x.ledger.jadeWins, 0) / Math.max(1, backed.reduce((a, x) => a + x.ledger.jadeBacked, 0)),
      expeditions: med(backed.map((x) => x.ledger.jadeBacked)),
      stakeShare: med(backed.map((x) => x.ledger.jadeStakeShare)),
      posSuccess: group((x) => x.ledger.jadeWins > 0),
      posFailure: group((x) => x.ledger.jadeStake > 0 && x.ledger.jadeWins === 0),
      posNotBacked: group((x) => x.ledger.jadeStake === 0),
    },
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

function median(xs: number[]): number {
  return percentile([...xs].sort((a, b) => a - b), 50);
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e4 ? `${(a / 1e3).toFixed(0)}k` : `${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
}

function table(header: string[], rows: string[][]): string {
  const line = (r: string[]) => `| ${r.join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
}

function main(): void {
  const { runs, start, seed, json } = args();
  const t0 = Date.now();
  const results: Run[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(play(seed + i, start));
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const sum = summarize(results, runs, start);
  if (json) {
    console.log(JSON.stringify(sum));
    return;
  }

  const out: string[] = [];
  out.push(`${runs} games, ${start} start, seeds ${seed}..${seed + runs - 1} (${secs}s)\n`);

  // survival
  out.push(table(
    ["Stage", "Afloat"],
    STAGES.map((s) => {
      const alive = results.filter((r) => r.at.has(s.months)).length;
      return [s.label, `${alive} (${((100 * alive) / runs).toFixed(1)}%)`];
    }),
  ));
  out.push("");

  // the headline: cash position (cash + bank - debt) by tier
  const snaps = (months: number) => results.flatMap((r) => (r.at.has(months) ? [r.at.get(months)!] : []));
  const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
  out.push("Cash position (cash + bank - debt), with the score and rank it would earn:\n");
  out.push(table(
    ["Stage", ...TIERS.map((t) => `${t.label} (P${t.p})`)],
    STAGES.map((s) => {
      const ss = snaps(s.months);
      const pos = sorted(ss.map((x) => x.position));
      return [s.label, ...TIERS.map((t) => {
        const v = percentile(pos, t.p);
        const score = Math.floor(v / (s.months + 1) / SCORE_DIVISOR);
        return `${fmt(v)} (score ${fmt(score)}, ${rank(score)})`;
      })];
    }),
  ));
  out.push("");

  // the full spread, for position and for net worth including goods
  for (const [name, f] of [
    ["Cash position", (x: Snapshot) => x.position],
    ["Net worth including goods at local prices", (x: Snapshot) => x.worth],
  ] as const) {
    out.push(`${name}, percentiles among ships afloat:\n`);
    out.push(table(
      ["Stage", ...PERCENTILES.map((p) => `P${p}`)],
      STAGES.map((s) => {
        const v = sorted(snaps(s.months).map(f));
        return [s.label, ...PERCENTILES.map((p) => fmt(percentile(v, p)))];
      }),
    ));
    out.push("");
  }

  // the ship, and where the money is, at the median
  out.push("Medians among ships afloat:\n");
  out.push(table(
    ["Stage", "Cash", "Bank", "Debt", "Hold", "Guns"],
    STAGES.map((s) => {
      const ss = snaps(s.months);
      return [s.label, ...(["cash", "bank", "debt", "shipSize", "guns"] as const).map((k) => fmt(median(ss.map((x) => x[k]))))];
    }),
  ));
  out.push("");

  // where the money came from, cumulative to each stage
  const keys = [
    "tradeProfit", "shockGain", "consignments", "booty", "bankInterest", "debtInterest", "liYuen", "robbery",
    "fines", "seized", "repairs", "ships", "guns",
  ] as const;
  out.push("Money in and out, cumulative, median among ships afloat (P25-P75 for trading):\n");
  out.push(table(
    ["Stage", ...keys],
    STAGES.map((s) => {
      const ss = snaps(s.months);
      return [s.label, ...keys.map((k) => {
        const v = ss.map((x) => x.ledger[k] as number);
        if (k === "tradeProfit") {
          const sv = sorted(v);
          return `${fmt(percentile(sv, 50))} (${fmt(percentile(sv, 25))}-${fmt(percentile(sv, 75))})`;
        }
        return fmt(median(v));
      })];
    }),
  ));
  out.push("");

  // which goods the trading profit comes from
  out.push("Share of all trading profit by good:\n");
  out.push(table(
    ["Stage", ...GOODS],
    STAGES.map((s) => {
      const ss = snaps(s.months);
      const totals = GOODS.map((_, g) => ss.reduce((t, x) => t + x.ledger.byGood[g]!, 0));
      const all = totals.reduce((a, b) => a + b, 0);
      return [s.label, ...totals.map((t) => `${((100 * t) / all).toFixed(0)}%`)];
    }),
  ));
  out.push("");

  out.push("Cash position with and without a jade win so far:\n");
  out.push(table(
    ["Stage", "Won jade", "Games", ...TIERS.map((t) => `${t.label} (P${t.p})`)],
    STAGES.flatMap((s) => [true, false].map((j) => {
      const pos = sorted(snaps(s.months).filter((x) => (x.ledger.jadeWins > 0) === j).map((x) => x.position));
      return [s.label, j ? "yes" : "no", String(pos.length), ...TIERS.map((t) => fmt(percentile(pos, t.p)))];
    })),
  ));
  out.push("");

  // price shocks, windfalls, risk and the jade moonshot, at 10 years
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  out.push("Income at 10 years: median share of gross income per game (losses against it):\n");
  out.push(table(
    ["Trading (not shocks)", "Price shocks", "Bank interest", "Booty", "Consignments", "Ventures (returns)", "Losses (with venture losses, the porcelain fee and breakage)"],
    [[sum.shares.trading, sum.shares.shocks, sum.shares.bank, sum.shares.booty, sum.shares.consignments, sum.shares.ventures, sum.shares.losses].map(pct)],
  ));
  out.push("");
  out.push("Price shocks over 10 years:\n");
  out.push(table(
    ["Shocks per game", "Rises sold into", "Crashes bought into", "Median gain", "Biggest windfall (median, share of worth)", "Games with a windfall >= 10% / 25% of worth", "After year 5: biggest (median)", ">= 10%"],
    [[fmt(sum.shocks.perGame), pct(sum.shocks.upSold), pct(sum.shocks.downBought), fmt(sum.shocks.gain), pct(sum.windfall.median), `${pct(sum.windfall.over10)} / ${pct(sum.windfall.over25)}`, pct(sum.windfall.late), pct(sum.windfall.lateOver10)]],
  ));
  out.push("");
  out.push("Risk over 10 years (worth at cost, ships afloat):\n");
  out.push(table(
    ["Sunk by 10 years", "Median worst drawdown", "Games with a drawdown >= 25%", ">= 50%", "After year 5: median worst", ">= 25%"],
    [[pct(1 - sum.afloat[LAST]!), pct(sum.risk.drawdown), pct(sum.risk.over25), pct(sum.risk.over50), pct(sum.risk.late), pct(sum.risk.lateOver25)]],
  ));
  out.push("");
  out.push("Porcelain, among ships afloat at 10 years (breakage against porcelain profit plus breakage):\n");
  out.push(table(
    ["In the trade", "Bought in (median month)", "Porcelain profit (share of income)", "Lost to breakage"],
    [[pct(sum.porcelain.owned), fmt(sum.porcelain.month), pct(sum.shares.porcelain), pct(sum.porcelain.broken)]],
  ));
  out.push("");
  out.push("Ventures, among ships afloat at 10 years (income shares among those holding any):\n");
  out.push(table(
    ["Holding godowns", "arms smuggling", "the jade mine", "any", "Shares (median, of position)", "Venture income, share of gross: P10", "P50", "P90"],
    [[pct(sum.ventures.godowns), pct(sum.ventures.arms), pct(sum.ventures.mine), pct(sum.ventures.held), pct(sum.ventures.ofPosition),
      pct(sum.ventures.incomeP10), pct(sum.ventures.incomeP50), pct(sum.ventures.incomeP90)]],
  ));
  out.push("");
  out.push("The jade expedition (moonshot), among ships afloat at 10 years:\n");
  out.push(table(
    ["Offered", "Backed", "Stake (median share of worth)", "Expeditions backed (median)", "Won per expedition", "Position at 10 years: won", "backed, never won", "didn't back"],
    [[pct(sum.moonshot.offered), pct(sum.moonshot.backed), pct(sum.moonshot.stakeShare), fmt(sum.moonshot.expeditions), pct(sum.moonshot.perExpedition),
      fmt(sum.moonshot.posSuccess), fmt(sum.moonshot.posFailure), fmt(sum.moonshot.posNotBacked)]],
  ));
  out.push("");

  // the whole curve, for picking thresholds at other months
  out.push("Cash position by year, among ships afloat:\n");
  const years = Array.from({ length: LAST / 12 }, (_, i) => (i + 1) * 12);
  out.push(table(
    ["Months", "Afloat", ...TIERS.map((t) => `${t.label} (P${t.p})`)],
    years.map((m) => {
      const pos = sorted(snaps(m).map((x) => x.position));
      return [String(m), `${((100 * pos.length) / runs).toFixed(0)}%`, ...TIERS.map((t) => fmt(percentile(pos, t.p)))];
    }),
  ));

  console.log(out.join("\n"));
}

main();
