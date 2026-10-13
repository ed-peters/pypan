// Tuning scenarios for the wealth simulation. Each one patches the game's source
// when the simulation is built (scripts/sim/run.mjs); the game itself is unchanged.
// Every patch must match exactly once, so a scenario fails loudly when the code it
// patches changes.
//
// The aims (etc/game-analysis.md): risks that feel riskier, windfalls that feel
// more powerful, and moonshots that make or break a fortune.

const liYuenTithe = {
  file: "src/engine/extortion.ts",
  from: "cost = rng.inRange(0, time * 1000) + time * 1000;",
  // a share of your money, but never less than today's demand
  to: "cost = Math.max(rng.inRange(0, time * 1000) + time * 1000, Math.trunc((h.cash + h.bank) * (0.02 + 0.04 * rng.float())));",
};

const frequentTithes = {
  file: "src/engine/extortion.ts",
  // Li Yuen's patience runs out about every two years, not every five
  from: "if (time > 1 && rng.chanceOf(20)) {",
  to: "if (time > 1 && rng.chanceOf(8)) {",
};

const tougherPirates = [
  { file: "src/engine/constants.ts", from: "export const ENEMY_HEALTH_BUMP = 10;", to: "export const ENEMY_HEALTH_BUMP = 15;" },
  { file: "src/engine/constants.ts", from: "export const ENEMY_DAMAGE_BUMP = 0.5;", to: "export const ENEMY_DAMAGE_BUMP = 0.7;" },
];

const fiercerPirates = [
  { file: "src/engine/constants.ts", from: "export const ENEMY_HEALTH_BUMP = 10;", to: "export const ENEMY_HEALTH_BUMP = 20;" },
  { file: "src/engine/constants.ts", from: "export const ENEMY_DAMAGE_BUMP = 0.5;", to: "export const ENEMY_DAMAGE_BUMP = 1;" },
];

const heavyStorms = [
  // 1-in-3 storms damage the ship (not 1-in-10), by 10-30% of its size (not 5-20 points)
  {
    file: "src/engine/storm.ts",
    from: "if ((h.shipDamage / h.shipSize) * 100 < 80 && rng.chanceOf(10)) {\n    h.shipDamage += rng.inRange(5, 21);",
    to: "if ((h.shipDamage / h.shipSize) * 100 < 80 && rng.chanceOf(3)) {\n    h.shipDamage += Math.trunc(h.shipSize * rng.inRange(10, 31) / 100);",
  },
];

const frequentShocks = {
  file: "src/engine/trade.ts",
  from: "if (currentTime(h) > 1 && rng.chanceOf(10)) {",
  to: "if (currentTime(h) > 1 && rng.chanceOf(4)) {",
};

const dearShocks = {
  file: "src/engine/trade.ts",
  // shocks hit one of the two dearest goods on the market
  from: "const g = rng.randrange(knownGoods(h).length);",
  to: "const g = knownGoods(h).length - 1 - rng.randrange(2);",
};

const backersOnly = {
  file: "src/engine/jade.ts",
  // if we didn't back it, the jade goes to his backers in London
  from: "It appears our friend Sir Beaumont-Finch was met with success.\");\n      h.jade = true;",
  to: "It appears our friend Sir Beaumont-Finch was met with success.\");",
};

const betTheHouse = [
  {
    file: "src/engine/jade.ts",
    // a quarter to half of the bank, and at least the old stake
    from: "const amount = Math.round(JADE_INVESTMENT * (0.9 + 0.2 * rng.float()) / 1000) * 1000;",
    to: "const amount = Math.round(Math.max(JADE_INVESTMENT, h.bank * (0.25 + 0.25 * rng.float())) / 1000) * 1000;",
  },
  { file: "src/engine/constants.ts", from: "export const JADE_DISCOUNT_MONTHS = 3;", to: "export const JADE_DISCOUNT_MONTHS = 12;" },
];

export const SCENARIOS = [
  { name: "baseline", title: "Baseline", aim: "-", patches: [] },
  { name: "tithe", title: "Li Yuen's tithe", aim: "risk", patches: [liYuenTithe, frequentTithes] },
  { name: "pirates", title: "Fiercer pirates", aim: "risk", patches: fiercerPirates },
  { name: "storms", title: "Heavy storms", aim: "risk", patches: heavyStorms },
  { name: "frequent-shocks", title: "Frequent shocks", aim: "windfall", patches: [frequentShocks] },
  { name: "dear-shocks", title: "Shocks on dear goods", aim: "windfall", patches: [dearShocks] },
  { name: "boom", title: "Boom markets", aim: "windfall", patches: [frequentShocks, dearShocks] },
  { name: "backers-only", title: "Backers only", aim: "moonshot", patches: [backersOnly] },
  { name: "bet-the-house", title: "Bet the house", aim: "moonshot", patches: [backersOnly, ...betTheHouse] },
  {
    name: "balanced", title: "Balanced", aim: "all",
    patches: [liYuenTithe, frequentTithes, ...tougherPirates, dearShocks, backersOnly, ...betTheHouse],
  },
  {
    name: "combined", title: "Combined", aim: "all",
    patches: [liYuenTithe, ...fiercerPirates, frequentShocks, dearShocks, backersOnly, ...betTheHouse],
  },
];
