// Pirate battles (SPEC.md section 7; section 7.4 for Li Yuen's fleet).
// PIRATE_FLEET is the regular pirates; PIRATE_KING is Li Yuen's fleet, which is
// bigger and does double damage. In any battle the ship sinks at 100% damage.

import {
  ENEMY_DAMAGE_BUMP, ENEMY_DAMAGE_START, ENEMY_HEALTH_BUMP, ENEMY_HEALTH_START,
  GOODS, GUN_SIZE, START_YEAR, good,
} from "./constants";
import { money } from "./format";
import { currentTime, totalGoods, type Hong } from "./hong";
import { askNum, askOpt, pick, say, withArt, type Flow } from "./prompts";
import type { Rng } from "./rng";

export const PIRATE_FLEET = 1;
export const PIRATE_KING = 2;

/** The smallest fleet Li Yuen sends. */
export const LI_YUEN_MIN_SHIPS = 5;

/** How a battle ended. "interrupted" means Li Yuen's fleet drove the pirates off. */
export type BattleOutcome = "won" | "fled" | "interrupted" | "sunk";

type Action = () => Flow;

export class PirateBattle {
  readonly id: number;
  pirates: number;
  readonly baseHealth: number;
  currHealth: number;
  readonly enemyDamage: number;
  runIk = 1;
  runOk = 3;
  readonly booty: number;
  fled = false;

  constructor(
    private readonly h: Hong,
    private readonly rng: Rng,
    against: number = PIRATE_FLEET,
  ) {
    const years = h.year - START_YEAR;
    this.id = against === PIRATE_FLEET ? 1 : 2;
    if (this.id === PIRATE_FLEET) {
      this.pirates = rng.randrange(h.shipSize / 10 + h.shipGuns) + 1;
    } else {
      // Li Yuen brings at least LI_YUEN_MIN_SHIPS, up to capacity / 5 + guns
      const max = Math.max(LI_YUEN_MIN_SHIPS, Math.trunc(h.shipSize / 5) + h.shipGuns);
      this.pirates = rng.inRange(LI_YUEN_MIN_SHIPS, max + 1);
    }
    this.baseHealth = ENEMY_HEALTH_START + years * ENEMY_HEALTH_BUMP;
    this.currHealth = Math.trunc(this.baseHealth * rng.float()) + 20;
    this.enemyDamage = ENEMY_DAMAGE_START + years * ENEMY_DAMAGE_BUMP;
    this.booty = Math.trunc((currentTime(h) / 4) * 1000 * this.pirates + rng.randrange(1000) + 250);
  }

  *execute(): Flow<BattleOutcome> {
    yield* say(
      this.id === PIRATE_FLEET
        ? `${this.pirates} hostile ships approaching, Taipan!`
        : `${this.pirates} ships of Li Yuen's pirate fleet, Taipan!!!`,
    );
    return yield* withArt("pirates", this.fight());
  }

  private *fight(): Flow<BattleOutcome> {
    while (this.pirates > 0) {
      // Li Yuen may interrupt a regular battle (but never his own)
      if (this.id === PIRATE_FLEET && this.rng.chanceOf(20)) {
        yield* say("Li Yuen's fleet drove them off, Taipan!!");
        return "interrupted";
      }
      yield* this.myTurn();
      if (this.pirates > 0) {
        yield* this.theirTurn();
        if (this.h.shipDamage >= this.h.shipSize) {
          yield* say("The buggers got us, Taipan!!");
          yield* say("It's all over now!!");
          return "sunk";
        }
      }
    }
    if (this.fled) {
      return "fled";
    }
    yield* say(`We won the battle, Taipan, and we captured some booty worth ${money(this.booty)}!`);
    this.h.cash += this.booty;
    return "won";
  }

  private *myTurn(): Flow {
    const action = yield* pick(`${this.pirates} enemies remaining ... What shall we do, Taipan?`, this.getOpts());
    yield* action();
  }

  private *theirTurn(): Flow {
    let text = "They're firing on us, Taipan!";
    yield* say(text);
    if (this.isGunHit()) {
      this.h.shipGuns -= 1;
      this.h.shipSize += GUN_SIZE;
      text = `${text}\n\nThe buggers hit a gun!`;
    } else {
      text = `${text}\n\nThey hit us!`;
    }
    this.h.shipDamage += this.calculateDamage();
    yield* say(text);
  }

  isGunHit(): boolean {
    if (this.h.shipGuns > 0) {
      const dc = (this.h.shipDamage / this.h.shipSize) * 100;
      return dc > 80 || dc > this.rng.randrange(100);
    }
    return false;
  }

  calculateDamage(): number {
    const capped = Math.min(15, this.pirates);
    return Math.trunc(this.enemyDamage * capped * this.id * this.rng.float() + capped / 2);
  }

  getOpts(): [string, Action][] {
    const opts: [string, Action][] = [];
    if (this.h.shipGuns > 0) {
      opts.push(["Fire cannons", () => this.fireCannons()]);
    }
    if (totalGoods(this.h) > 0) {
      opts.push(["Dump cargo", () => this.dumpCargo()]);
    }
    opts.push(["Run away", () => this.runAway()]);
    return opts;
  }

  private removePirates(n: number): void {
    this.pirates -= n;
    this.currHealth = Math.trunc(this.baseHealth * this.rng.float()) + 20;
    this.runIk = 1;
    this.runOk = 3;
  }

  private *fireCannons(): Flow {
    let text = "Aye, we'll fire our cannons at 'em, Taipan!";
    yield* say(text);
    let k = 0;
    // once the last ship sinks, the remaining guns hold their fire
    for (let i = 0; i < this.h.shipGuns && this.pirates > 0; i++) {
      this.currHealth -= this.rng.randrange(30) + 10;
      if (this.currHealth < 0) {
        this.removePirates(1);
        k += 1;
      }
    }
    if (k > 0) {
      text = `${text}\n\nWe got ${this.pirates === 0 ? "all" : k} of the buggers!`;
    } else {
      text = `${text}\n\nThey're still after us!`;
    }
    yield* say(text);
  }

  private *runAway(): Flow {
    yield* say("Aye, we'll set sails and run, Taipan!");
    this.runIk += 1;
    this.runOk += this.runIk;
    if (this.rng.randrange(this.runOk) > this.rng.randrange(this.pirates)) {
      yield* say("We got away from 'em, Taipan!");
      this.pirates = 0;
      this.fled = true;
    } else if (this.pirates > 2 && this.rng.chanceOf(5)) {
      const lost = Math.min(this.rng.randrange(this.pirates / 2) + 1, this.pirates - 1);
      yield* say(`Couldn't lose 'em, Taipan, but we escaped from ${lost} of 'em!`);
      this.pirates -= lost;
    } else {
      yield* say("Couldn't lose 'em, Taipan!");
    }
  }

  private *dumpCargo(): Flow {
    const g = yield* askOpt("What shall I toss overboard, Taipan?", GOODS);
    if (this.h.shipGoods[g] === 0) {
      yield* say("We don't have any, Taipan!");
      return;
    }
    const n = yield* askNum(`How much ${good(g)} shall I toss overboard, Taipan?`, this.h.shipGoods[g]!);
    if (n > this.h.shipGoods[g]!) {
      yield* say("We don't have enough on board, Taipan!");
    } else if (n > 0) {
      this.h.shipGoods[g]! -= n;
      // any cargo dumped helps a little; more helps more
      this.runOk += Math.max(1, Math.trunc(n / 10));
    }
  }
}

/**
 * Pirates at sea: a 1-in-pirateChance chance of a regular pirate fleet. If they
 * don't come (1-in-20), or Li Yuen drives them off, Li Yuen's fleet shows up.
 * Returns how the last battle ended, or null if there was none.
 */
export function* checkPirates(h: Hong, rng: Rng): Flow<BattleOutcome | null> {
  let outcome: BattleOutcome | null = null;
  if (rng.chanceOf(h.pirateChance)) {
    outcome = yield* new PirateBattle(h, rng, PIRATE_FLEET).execute();
    if (outcome !== "interrupted") {
      return outcome;
    }
  } else if (!rng.chanceOf(20)) {
    return null;
  }
  return (yield* liYuen(h, rng)) ?? outcome;
}

/** Li Yuen's fleet arrives: it leaves you be if you've paid him, or attacks. */
function* liYuen(h: Hong, rng: Rng): Flow<BattleOutcome | null> {
  yield* say("Li Yuen's pirates, Taipan!!!");
  if (h.extorted !== 0) {
    yield* say("Good joss!! They let us be!!");
    return null;
  }
  return yield* new PirateBattle(h, rng, PIRATE_KING).execute();
}
