// The Hong Kong warehouse and transfers (SPEC.md section 10). Senhor Jacinto Remedios,
// who owns much of the Hong Kong waterfront, sells us the first warehouse once our
// ship has outgrown the first one, and bigger ones after (pypan-95). Mijnheer Brouwer
// introduces him, so that comes only once we bank with De Wisselbank (pypan-99, -100).

import { canIntroduce, introduction, pay, spendable } from "./bank";
import {
  GOODS, HONG_KONG, START_SHIP_SIZE, START_WAREHOUSE_SIZE, WAREHOUSE_FEE_SHARE, WAREHOUSE_MIN_FEE,
  WAREHOUSE_REOFFER_MONTHS, WAREHOUSE_SIZE_INCREMENT, good,
} from "./constants";
import { money } from "./format";
import { currentTime, hasAny, hasWarehouse, marketGoods, warehouseAvailable, type Hong } from "./hong";
import { askNum, askOptOrCancel, askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { cashPosition } from "./score";

/** On arrival in Hong Kong: offer a first warehouse, or maybe a bigger one. */
export function* checkWarehouse(h: Hong, rng: Rng): Flow {
  if (h.location !== HONG_KONG) {
    return;
  }
  if (!hasWarehouse(h)) {
    yield* offerFirstWarehouse(h);
    return;
  }
  if (currentTime(h) > 12 && rng.chanceOf(10)) {
    const time = currentTime(h);
    const cost = rng.randrange(1000 * (time + 5) / 6) * Math.trunc(h.warehouseSize / 500) + 1000;
    if (h.cash >= cost && (yield* askYn(`Senhor Remedios has a new warehouse with an additional ${WAREHOUSE_SIZE_INCREMENT} capacity for ${money(cost)}. Would you like to upgrade, Taipan?`))) {
      h.cash -= cost;
      h.warehouseSize += WAREHOUSE_SIZE_INCREMENT;
    }
  }
}

/**
 * Once we bank with De Wisselbank, our ship is bigger than the one we started with,
 * and we can pay, Mijnheer Brouwer introduces Senhor Remedios, who offers a first
 * warehouse for a tenth of our cash position (at least WAREHOUSE_MIN_FEE); if we
 * decline, he asks again himself WAREHOUSE_REOFFER_MONTHS later.
 */
function* offerFirstWarehouse(h: Hong): Flow {
  const t = currentTime(h);
  const fee = firstWarehouseFee(h);
  if (!canIntroduce(h) || h.shipSize <= START_SHIP_SIZE || t < h.warehouseOfferDue || spendable(h) < fee) {
    return;
  }
  const terms = `a warehouse with room for ${money(START_WAREHOUSE_SIZE)} goods for ${money(fee)}`;
  // only a declined offer has set warehouseOfferDue, so 0 means we haven't met him
  const pitch = h.warehouseOfferDue === 0
    ? introduction("Senhor Jacinto Remedios", "who owns much of the Hong Kong waterfront", `Senhor Remedios offers to sell us ${terms}. We could keep there what our new ship can't sell. Shall we buy it?`)
    : `Taipan, Senhor Remedios offers again to sell us ${terms}. Shall we buy it?`;
  if (!(yield* askYn(pitch))) {
    h.warehouseOfferDue = t + WAREHOUSE_REOFFER_MONTHS;
    yield* say("Very well, Taipan. Senhor Remedios says the offer will keep.");
    return;
  }
  yield* pay(h, fee);
  h.warehouseSize = START_WAREHOUSE_SIZE;
  yield* say("Very well, Taipan. Senhor Remedios has given us the keys to our warehouse.");
}

/** A tenth of the cash position, rounded to the thousand, but at least WAREHOUSE_MIN_FEE. */
export function firstWarehouseFee(h: Hong): number {
  return Math.max(WAREHOUSE_MIN_FEE, Math.round(cashPosition(h) * WAREHOUSE_FEE_SHARE / 1000) * 1000);
}

/** The goods aboard ship or in the warehouse. */
export function goodsToTransfer(h: Hong): number[] {
  return marketGoods(h).filter((g) => hasAny(h, g));
}

/** Move one good between ship and warehouse; the fee skims what arrives. */
export function* transfer(h: Hong): Flow {
  // decide what good we're going to transfer: if there's only one, that's it;
  // otherwise goods we have none of are disabled
  const held = goodsToTransfer(h);
  let g = held[0]!;
  if (held.length !== 1) {
    const goods = marketGoods(h);
    const i = yield* askOptOrCancel("What shall I transfer, Taipan?", goods.map((g) => GOODS[g]!), {
      disabled: goods.flatMap((g, i) => (held.includes(g) ? [] : [i])),
    });
    if (i === null) {
      return;
    }
    g = goods[i]!;
  }

  // if we have any onboard, and space in the warehouse, we can offload the good
  if (h.shipGoods[g]! > 0 && warehouseAvailable(h) > 0) {
    const n = yield* askNum(
      `How much ${good(g)} should I send to the warehouse, Taipan?`,
      Math.min(h.shipGoods[g]!, warehouseAvailable(h)),
    );
    if (n > h.shipGoods[g]!) {
      yield* say("You do not have that much in your ship's hold, Taipan.");
    } else if (n > warehouseAvailable(h)) {
      yield* say("You have no space in the warehouse, Taipan.");
    } else if (n > 0) {
      h.shipGoods[g]! -= n;
      h.warehouseGoods[g]! += n;
    }
  }

  // if we have any in the warehouse, we can always load stuff on the ship
  if (h.warehouseGoods[g]! > 0) {
    const n = yield* askNum(`How much ${good(g)} should I bring onto the ship, Taipan?`, h.warehouseGoods[g]!);
    if (n > h.warehouseGoods[g]!) {
      yield* say("You do not have that much in your warehouse, Taipan.");
    } else if (n > 0) {
      h.warehouseGoods[g]! -= n;
      h.shipGoods[g]! += n;
    }
  }
}

