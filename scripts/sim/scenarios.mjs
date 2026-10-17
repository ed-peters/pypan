// Tuning scenarios for the wealth simulation. Each one patches the game's source
// when the simulation is built (scripts/sim/run.mjs); the game itself is unchanged.
// Every patch must match exactly once, so a scenario fails loudly when the code it
// patches changes.
//
// The aims (etc/game-analysis.md): risks that feel riskier, windfalls that feel
// more powerful, and moonshots that make or break a fortune.

const oldLiYuen = {
  file: "src/engine/constants.ts",
  // Li Yuen's demand before pypan-88: time x 1000 plus up to as much again
  from: "export const LI_YUEN_SHARE = 0.03;",
  to: "export const LI_YUEN_SHARE = 0;",
};

const impatientLiYuen = {
  file: "src/engine/constants.ts",
  // Li Yuen's patience runs out about every two and a half years, not every five
  from: "export const LI_YUEN_PATIENCE = 20;",
  to: "export const LI_YUEN_PATIENCE = 10;",
};

const refuseLiYuen = {
  file: "scripts/sim/bot.ts",
  // the bot never pays, so his grudge grows to its limit and stays there
  from: "const pay = cost <= h.cash + h.bank;",
  to: "const pay = false;",
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

const smallStakes = {
  file: "src/engine/constants.ts",
  // the stake is about 1,000,000 whatever the bank, as before pypan-86
  from: "export const JADE_STAKE_SHARE = 0.25;",
  to: "export const JADE_STAKE_SHARE = 0;",
};

export const SCENARIOS = [
  { name: "baseline", title: "Baseline", aim: "-", patches: [] },
  { name: "old-li-yuen", title: "Li Yuen before pypan-88", aim: "-", patches: [oldLiYuen] },
  { name: "impatient-li-yuen", title: "Impatient Li Yuen", aim: "risk", patches: [impatientLiYuen] },
  { name: "refuse-li-yuen", title: "Refusing Li Yuen", aim: "risk", patches: [refuseLiYuen] },
  { name: "pirates", title: "Fiercer pirates", aim: "risk", patches: fiercerPirates },
  { name: "storms", title: "Heavy storms", aim: "risk", patches: heavyStorms },
  { name: "frequent-shocks", title: "Frequent shocks", aim: "windfall", patches: [frequentShocks] },
  { name: "dear-shocks", title: "Shocks on dear goods", aim: "windfall", patches: [dearShocks] },
  { name: "boom", title: "Boom markets", aim: "windfall", patches: [frequentShocks, dearShocks] },
  { name: "small-stakes", title: "Small jade stakes", aim: "moonshot", patches: [smallStakes] },
  {
    name: "balanced", title: "Balanced", aim: "all",
    patches: [...tougherPirates, dearShocks],
  },
  {
    name: "combined", title: "Combined", aim: "all",
    patches: [...fiercerPirates, frequentShocks, dearShocks],
  },
];
