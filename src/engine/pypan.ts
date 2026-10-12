// The whole game: the opening choice, the comprador's port menu until the player
// retires or sinks, then the final score (SPEC.md sections 2.2, 5 and 1).

import { visitBank } from "./bank";
import { HONG_KONG } from "./constants";
import { checkExtortion } from "./extortion";
import { Game } from "./game";
import { newHong, type Hong } from "./hong";
import { checkLender, visitWu } from "./lender";
import { askOpt, askYn, checkpoint, pick, say, type Flow } from "./prompts";
import type { Rng } from "./rng";
import { cashPosition, positionComment, rank, score, scoreReport, type Rank } from "./score";
import { buyGoods, conditionReport, sellGoods } from "./trade";
import { sailAway } from "./voyage";
import { transfer } from "./warehouse";

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
  const position = cashPosition(h);
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
  // only a player who is out of debt can retire
  if (h.location === HONG_KONG && h.debt <= 0) {
    opts.push(["Retire", () => retire()]);
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
