// The whole game: the opening choice, the comprador's port menu until the player
// retires or sinks, then the final score (SPEC.md sections 2.2, 5 and 1).

import { bankAvailable, visitBank } from "./bank";
import { HONG_KONG } from "./constants";
import { checkExtortion } from "./extortion";
import { Game } from "./game";
import { newHong, type Hong } from "./hong";
import { checkLender } from "./lender";
import { askOpt, askYn, checkpoint, pick, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { finalPosition, positionComment, rank, score, scoreReport, type Rank } from "./score";
import { buyGoods, conditionReport, goodsAboard, sellGoods } from "./trade";
import { sailAway } from "./voyage";
import { goodsToTransfer, transfer } from "./warehouse";

/** State shared between the running game and its UI. */
export interface Session {
  rng: Rng;
  /** The player's state; null until the opening choice has been made. */
  hong: Hong | null;
}

/** How a game ends: the player retires, or the ship sinks. */
export type Ending = "retired" | "sunk";

/** The final result of a game. */
export interface GameOver {
  ending: Ending;
  /** Cash plus bank, less debt. */
  position: number;
  score: number;
  rank: Rank;
  /** "Your score is N" and the ranking table, for the final screen. */
  report: string;
}

/** Play a game: choose how to start (or restore `saved`), trade until it ends, then score it. */
export function* playPyPan(s: Session, saved: Hong | null = null): Flow<GameOver> {
  const opts = ["Guns (and no debt)", "Debt (and no guns)"];
  if (saved) {
    opts.push("Your last game restored");
  }
  const o = yield* askOpt("Would you like to start with:", opts);
  const h = o === 2 && saved ? saved : newHong(s.rng, o === 0);
  s.hong = h;
  const ending = yield* compradorsLoop(h, s.rng);
  return yield* gameOver(h, ending);
}

/** Comment on the final cash position, and work out the score. */
function* gameOver(h: Hong, ending: Ending): Flow<GameOver> {
  const position = finalPosition(h);
  const comment = positionComment(position);
  if (comment) {
    yield* say(comment);
  }
  const s = score(h);
  return { ending, position, score: s, rank: rank(s), report: scoreReport(s) };
}

/** Port menu loop; returns when the game ends. */
export function* compradorsLoop(h: Hong, rng: Rng): Flow<Ending> {
  if (h.cash > 0) {
    yield* checkExtortion(h, rng);
  }
  yield* checkLender(h, rng);
  for (;;) {
    yield* checkpoint();
    const action = yield* pick(conditionReport(h, "What shall I do, Taipan?"), establishOpts(h, rng));
    const ending = yield* action();
    if (ending) {
      return ending;
    }
  }
}

/** A menu action; returns an Ending if the game is over. */
type Action = () => Flow<Ending | void>;

/** A menu option: its label, its action, and whether it can be chosen now. */
type Option = [string, Action, boolean];

export function establishOpts(h: Hong, rng: Rng): Option[] {
  const opts: Option[] = [
    ["Buy goods", () => buyGoods(h), true],
    // selling and transferring are shown but disabled when there's nothing to move
    ["Sell goods", () => sellGoods(h), goodsAboard(h).length > 0],
  ];
  const leave: Option = ["Leave port", () => sailAway(h, rng), true];
  // abroad, where transfers and the bank come and go, Leave is always third
  if (h.location !== HONG_KONG) {
    opts.push(leave);
  }
  if (h.transfer >= 0) {
    opts.push(["Transfer goods", () => transfer(h), goodsToTransfer(h).length > 0]);
  }
  if (bankAvailable(h)) {
    opts.push(["Visit the bank", () => visitBank(h, rng), true]);
  }
  if (h.location === HONG_KONG) {
    opts.push(leave);
  }
  // only a player who is out of debt can retire
  if (h.location === HONG_KONG && h.debt <= 0) {
    opts.push(["Retire", () => retire(), true]);
  }
  return opts;
}

function* retire(): Flow<Ending | void> {
  if (yield* askYn("Are you sure you want to retire, Taipan?")) {
    return "retired";
  }
}

export interface NewGameOptions {
  rng: Rng;
  /** A saved game to offer for restoring. */
  saved?: Hong | null;
  /** Called with the player's state at every checkpoint. */
  onSave?: (h: Hong) => void;
}

/** Start a game: the Game to drive, plus the Session to read state from. */
export function newGame({ rng, saved = null, onSave }: NewGameOptions): { game: Game<GameOver>; session: Session } {
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
