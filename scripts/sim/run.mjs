// Build and run the wealth simulation, optionally under a tuning scenario
// (scenarios.mjs), or compare every scenario.
//
//   npm run sim -- [--scenario name] [--runs 1000] [--start debt|guns] [--seed 1]
//   npm run sim -- --compare [--runs 1000] [--start guns]

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rolldown } from "rolldown";
import { SCENARIOS } from "./scenarios.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = resolve(ROOT, "node_modules/.cache/sim");

/** Bundle the simulation with a scenario's patches; returns the bundle's path. */
async function build(scenario) {
  const byFile = new Map();
  for (const p of scenario.patches) {
    const file = resolve(ROOT, p.file);
    byFile.set(file, [...(byFile.get(file) ?? []), p]);
  }
  const bundle = await rolldown({
    input: resolve(ROOT, "scripts/sim/simulate.ts"),
    platform: "node",
    logLevel: "silent",
    plugins: [{
      name: "scenario",
      load(id) {
        const patches = byFile.get(id);
        if (!patches) return null;
        let code = readFileSync(id, "utf8");
        for (const p of patches) {
          const n = code.split(p.from).length - 1;
          if (n !== 1) {
            throw new Error(`scenario ${scenario.name}: patch matches ${n} times in ${p.file}: ${p.from}`);
          }
          code = code.replace(p.from, () => p.to);
        }
        return code;
      },
    }],
  });
  const file = resolve(OUT, `${scenario.name}.mjs`);
  await bundle.write({ file, format: "esm" });
  return file;
}

function run(file, args) {
  const r = spawnSync(process.execPath, [file, ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) {
    throw new Error(r.stderr || `exit ${r.status}`);
  }
  return r.stdout;
}

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const pass = args.filter((a, i) => !["--scenario", "--compare"].includes(a) && args[i - 1] !== "--scenario");

if (!args.includes("--compare")) {
  const name = opt("scenario") ?? "baseline";
  const scenario = SCENARIOS.find((s) => s.name === name);
  if (!scenario) throw new Error(`no scenario ${name}: ${SCENARIOS.map((s) => s.name).join(", ")}`);
  process.stdout.write(run(await build(scenario), pass));
} else {
  const rows = [];
  for (const s of SCENARIOS) {
    const sum = JSON.parse(run(await build(s), [...pass, "--json"]));
    rows.push({ s, sum });
    process.stderr.write(`${s.name} `);
  }
  process.stderr.write("\n");
  console.log(compare(rows));
}

function compare(rows) {
  const pct = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : "-");
  const fmt = (n) => {
    if (!Number.isFinite(n)) return "-";
    const a = Math.abs(n);
    const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k` : `${Math.round(a)}`;
    return n < 0 ? `-${s}` : s;
  };
  const table = (header, body) => [header, header.map(() => "---"), ...body].map((r) => `| ${r.join(" | ")} |`).join("\n");
  const first = rows[0].sum;
  const out = [`${first.runs} games per scenario, ${first.start} start\n`];
  out.push("Wealth (cash position, P25 / P50 / P90, ships afloat):\n");
  out.push(table(
    ["Scenario", "Aim", "2 years", "5 years", "10 years", "Afloat at 10 years"],
    rows.map(({ s, sum }) => [s.title, s.aim,
      ...[24, 60, 120].map((m) => `${fmt(sum.position[m].p25)} / ${fmt(sum.position[m].p50)} / ${fmt(sum.position[m].p90)}`),
      pct(sum.afloat[120])]),
  ));
  out.push("\nIncome at 10 years (median share of gross income; losses against it):\n");
  out.push(table(
    ["Scenario", "Trading", "Shocks", "Bank", "Booty", "Losses"],
    rows.map(({ s, sum }) => [s.title, ...["trading", "shocks", "bank", "booty", "losses"].map((k) => pct(sum.shares[k]))]),
  ));
  out.push("\nRisk and windfalls (ships afloat; worth at cost):\n");
  out.push(table(
    ["Scenario", "Sunk", "Worst drawdown (median)", "after year 5", "after year 5 >= 25%", "Biggest windfall after year 5 (median)", "after year 5 >= 10%"],
    rows.map(({ s, sum }) => [s.title, pct(1 - sum.afloat[120]), pct(sum.risk.drawdown), pct(sum.risk.late), pct(sum.risk.lateOver25),
      pct(sum.windfall.late), pct(sum.windfall.lateOver10)]),
  ));
  out.push("\nThe jade moonshot (ships afloat at 10 years):\n");
  out.push(table(
    ["Scenario", "Backed", "Stake (share of worth)", "Won per expedition", "Jade on market", "Position: won", "backed, never won", "didn't back"],
    rows.map(({ s, sum }) => [s.title, pct(sum.moonshot.backed), pct(sum.moonshot.stakeShare), pct(sum.moonshot.perExpedition), pct(sum.jadeOnMarket),
      fmt(sum.moonshot.posSuccess), fmt(sum.moonshot.posFailure), fmt(sum.moonshot.posNotBacked)]),
  ));
  return out.join("\n");
}
