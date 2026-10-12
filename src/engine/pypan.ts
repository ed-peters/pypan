// The whole game: the opening choice, then the comprador's port menu until the
// player exits (SPEC.md sections 2.2 and 5).

import { visitBank } from "./bank";
import { HONG_KONG } from "./constants";
import { checkExtortion } from "./extortion";
import { Game } from "./game";
import { newHong, type Hong } from "./hong";
import { checkLender, visitWu } from "./lender";
import { askOpt, checkpoint, pick, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { buyGoods, conditionReport, sellGoods } from "./trade";
import { sailAway } from "./voyage";
import { transfer } from "./warehouse";

/** State shared between the running game and its UI. */
export interface Session {
  rng: Rng;
  /** The player's state; null until the opening choice has been made. */
  hong: Hong | null;
}

/** Play a game: choose how to start (or restore `saved`), then trade until exit. */
export function* playPyPan(s: Session, saved: Hong | null = null): Flow {
  const opts = ["Guns (and no debt)", "Debt (and no guns)"];
  if (saved) {
    opts.push("Your last game restored");
  }
  const o = yield* askOpt("Would you like to start with:", opts);
  const h = o === 2 && saved ? saved : newHong(s.rng, o === 0);
  s.hong = h;
  yield* compradorsLoop(h, s.rng);
}

/** Port menu loop; returns when the player exits the game. */
export function* compradorsLoop(h: Hong, rng: Rng): Flow {
  if (h.cash > 0) {
    yield* checkExtortion(h, rng);
  }
  yield* checkLender(h, rng);
  for (;;) {
    yield* checkpoint();
    const action = yield* pick(conditionReport(h, "What shall I do, Taipan?"), establishOpts(h, rng));
    if (yield* action()) {
      return;
    }
  }
}

/** A menu action; returns true to exit the game. */
type Action = () => Flow<boolean | void>;

export function establishOpts(h: Hong, rng: Rng): [string, Action][] {
  const opts: [string, Action][] = [
    ["Buy goods", () => buyGoods(h)],
    ["Sell goods", () => sellGoods(h)],
  ];
  if (h.transfer >= 0) {
    opts.push(["Transfer goods", () => transfer(h)]);
  }
  if (h.location === HONG_KONG) {
    opts.push(["Visit Elder Brother Wu", () => visitWu(h, rng)]);
    opts.push(["Visit the bank", () => visitBank(h)]);
  }
  opts.push(["Leave port", () => sailAway(h, rng)]);
  if (h.location === HONG_KONG) {
    opts.push(["Exit the game", () => saveAndExit()]);
  }
  return opts;
}

function* saveAndExit(): Flow<boolean> {
  yield* say("Very well. Until we meet again, Taipan!");
  yield* checkpoint();
  return true;
}

export interface NewGameOptions {
  rng: Rng;
  /** A saved game to offer for restoring. */
  saved?: Hong | null;
  /** Called with the player's state at every checkpoint. */
  onSave?: (h: Hong) => void;
}

/** Start a game: the Game to drive, plus the Session to read state from. */
export function newGame({ rng, saved = null, onSave }: NewGameOptions): { game: Game; session: Session } {
  const session: Session = { rng, hong: null };
  const game = new Game(playPyPan(session, saved), {
    onCheckpoint: () => {
      if (session.hong && onSave) {
        onSave(session.hong);
      }
    },
  });
  return { game, session };
}
