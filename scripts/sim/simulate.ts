// Wealth simulation: play many games with the "decent player" bot (bot.ts) and
// report the spread of wealth after 2, 5 and 10 years among the ships still afloat.
//
//   npm run sim -- [--runs 1000] [--start debt|guns] [--seed 1]
//
// Low, middling and high success are the 25th, 50th and 90th percentiles.

import { currentTime, type Hong } from "../../src/engine/hong";
import { newGame } from "../../src/engine/pypan";
import { SeededRng } from "../../src/engine/rng";
import { rank } from "../../src/engine/score";
import { GOODS } from "../../src/engine/constants";
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
  jade: boolean;
  ledger: Ledger;
}

interface Run {
  /** Snapshot at the first port menu after N months played, by N. */
  at: Map<number, Snapshot>;
  sunkAt: number | null;
}

function args(): { runs: number; start: "debt" | "guns"; seed: number } {
  const a = process.argv.slice(2);
  const get = (k: string, d: string) => {
    const i = a.indexOf(`--${k}`);
    return i >= 0 ? a[i + 1]! : d;
  };
  return { runs: Number(get("runs", "1000")), start: get("start", "debt") as "debt" | "guns", seed: Number(get("seed", "1")) };
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
        const position = h.cash + h.bank - h.debt;
        at.set(played, {
          position, worth: worth(h), cash: h.cash, bank: h.bank, debt: h.debt,
          shipSize: h.shipSize, guns: h.shipGuns,
          score: Math.floor(position / currentTime(h) / 100),
          jade: h.jade,
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
  return { at, sunkAt: sunk ? currentTime(session.hong!) : null };
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
  const { runs, start, seed } = args();
  const t0 = Date.now();
  const results: Run[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(play(seed + i, start));
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

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
        const score = Math.floor(v / (s.months + 1) / 100);
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
  const keys = (Object.keys(results[0]!.at.get(0)!.ledger) as (keyof Ledger)[]).filter((k) => k !== "byGood");
  out.push("Money in and out, cumulative, median among ships afloat (P25-P75 for trading):\n");
  out.push(table(
    ["Stage", ...keys],
    STAGES.map((s) => {
      const ss = snaps(s.months);
      return [s.label, ...keys.map((k) => {
        const v = ss.map((x) => x.ledger[k]);
        if (k === "tradeProfit") {
          const sv = sorted(v);
          return `${fmt(percentile(sv, 50))} (${fmt(percentile(sv, 25))}-${fmt(percentile(sv, 75))})`;
        }
        return fmt(median(v));
      })];
    }),
  ));
  out.push("");

  // which goods the trading profit comes from, and whether jade is on the market
  out.push("Share of all trading profit by good, and games with jade on the market:\n");
  out.push(table(
    ["Stage", ...GOODS, "Jade on market"],
    STAGES.map((s) => {
      const ss = snaps(s.months);
      const totals = GOODS.map((_, g) => ss.reduce((t, x) => t + x.ledger.byGood[g]!, 0));
      const all = totals.reduce((a, b) => a + b, 0);
      const jade = ss.filter((x) => x.jade).length;
      return [s.label, ...totals.map((t) => `${((100 * t) / all).toFixed(0)}%`), `${((100 * jade) / ss.length).toFixed(0)}%`];
    }),
  ));
  out.push("");

  out.push("Cash position with and without jade on the market:\n");
  out.push(table(
    ["Stage", "Jade", "Games", ...TIERS.map((t) => `${t.label} (P${t.p})`)],
    STAGES.flatMap((s) => [true, false].map((j) => {
      const pos = sorted(snaps(s.months).filter((x) => x.jade === j).map((x) => x.position));
      return [s.label, j ? "yes" : "no", String(pos.length), ...TIERS.map((t) => fmt(percentile(pos, t.p)))];
    })),
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
