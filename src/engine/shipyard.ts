// McHenry's repairs, new ships and guns (SPEC.md section 9).

import { GUN_SIZE, HONG_KONG, SHIP_SIZE_INCREMENT } from "./constants";
import { money } from "./format";
import { currentTime, repairPercent, type Hong } from "./hong";
import { wuCoversShortfall } from "./lender";
import { askNum, askYn, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** On arrival: repairs at home, then (after six months) offers of a new ship or gun. */
export function* checkUpgrades(h: Hong, rng: Rng): Flow {
  // mchenry can repair your ship if you're at home
  if (h.location === HONG_KONG && h.shipDamage > 0) {
    yield* offerRepair(h, rng);
  }

  // upgrades don't come until you've been playing a while
  if (currentTime(h) > 6) {
    if (rng.chanceOf(4)) {
      yield* offerShip(h, rng);
    }
    if (rng.chanceOf(4)) {
      yield* offerGun(h, rng);
    }
  }
}

export function* offerRepair(h: Hong, rng: Rng): Flow {
  // won't repair if there's no point
  if (h.cash === 0 || h.shipDamage === 0) {
    return;
  }

  if (!(yield* askYn("Taipan, Mc Henry from the Hong Kong shipyards has arrived! He says, \"I see ye've a wee bit of damage to yer ship. Will ye be wanting repairs?"))) {
    return;
  }

  const time = currentTime(h);
  const rate = Math.trunc(
    ((60 * (time + 3) / 4) * rng.float() + 25 * (time + 3) / 4) * h.shipSize / 50,
  );
  const cost = rate * h.shipDamage + 1;

  // there's no paying more than the full cost
  let n = Math.min(cost, yield* askNum(
    `Och, 'tis a pity to be ${100 - repairPercent(h)}% damaged. We can fix yer whole ship for ${money(cost)}, or make partial repairs if you wish. How much will ye spend?`,
    Math.min(h.cash, cost),
  ));

  // if you don't have enough, EBW can make up the difference for you
  if (n > h.cash) {
    if (!(yield* wuCoversShortfall(h, cost, "McHenry"))) {
      return;
    }
    n = cost;
  } else {
    h.cash -= n;
  }

  // repairs are in proportion to what you pay
  if (n === cost) {
    h.shipDamage = 0;
  } else {
    h.shipDamage -= Math.trunc(h.shipDamage * n / cost);
  }
}

export function* offerShip(h: Hong, rng: Rng): Flow {
  const time = currentTime(h);
  const cost = rng.randrange(1000 * (time + 5) / 6) * Math.trunc(h.shipSize / 50) + 1000;
  const cond = repairPercent(h) < 80 ? "damaged" : "fine";
  if (h.cash >= cost && (yield* askYn(`Would you like to replace your ${cond} ship with another one that has ${SHIP_SIZE_INCREMENT} more capacity by paying an additional ${money(cost)}, Taipan?`))) {
    h.cash -= cost;
    h.shipSize += SHIP_SIZE_INCREMENT;
    h.shipDamage = 0;
  }
}

export function* offerGun(h: Hong, rng: Rng): Flow {
  const time = currentTime(h);
  const cost = rng.randrange(1000 * (time + 5) / 6) + 500;
  if (h.cash > cost) {
    if (yield* askYn(`Would you like to buy a ship's gun for ${money(cost)}, Taipan?`)) {
      h.cash -= cost;
      h.shipGuns += 1;
      h.shipSize -= GUN_SIZE;
    }
  }
}
