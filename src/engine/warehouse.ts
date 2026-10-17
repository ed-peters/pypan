// The Hong Kong warehouse and transfers (SPEC.md section 10).

import { GOODS, HONG_KONG, WAREHOUSE_SIZE_INCREMENT, good } from "./constants";
import { money } from "./format";
import { currentTime, hasAny, marketGoods, warehouseAvailable, type Hong } from "./hong";
import { askNum, askOptOrCancel, askYn, say, type Flow } from "./prompts";
import type { Rng } from "./rng";

/** On arrival in Hong Kong: maybe offer a bigger warehouse. */
export function* checkWarehouse(h: Hong, rng: Rng): Flow {
  if (h.location === HONG_KONG && currentTime(h) > 12 && rng.chanceOf(10)) {
    const time = currentTime(h);
    const cost = rng.randrange(1000 * (time + 5) / 6) * Math.trunc(h.warehouseSize / 500) + 1000;
    if (h.cash >= cost && (yield* askYn(`A new warehouse with an additional ${WAREHOUSE_SIZE_INCREMENT} capacity is available for ${money(cost)}. Would like to upgrade, Taipan?`))) {
      h.cash -= cost;
      h.warehouseSize += WAREHOUSE_SIZE_INCREMENT;
    }
  }
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

