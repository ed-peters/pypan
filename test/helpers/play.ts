// Scripted test driver: run a flow with a list of answers and record what happened.
//
// "say" prompts need no input, so play() continues past them automatically; the
// answers list only covers the interactive prompts (yn, choose, number), in order.
//
//   const { transcript, game } = play(visitBank(h), [0, 100]);

import { Game } from "../../src/engine/game";
import type { Flow, Prompt } from "../../src/engine/prompts";

export interface Entry {
  prompt: Prompt;
  answer?: unknown;
}

export interface Played<T> {
  game: Game<T>;
  /** Every prompt shown, with the answer given (if any). */
  transcript: Entry[];
  /** Number of checkpoints reached. */
  checkpoints: number;
}

/**
 * Run the flow until it finishes or the answers run out (leaving the game waiting
 * on its next interactive prompt). Throws if the flow finishes with answers unused,
 * which usually means the script is out of step with the flow.
 */
export function play<T>(flow: Flow<T>, answers: readonly unknown[] = []): Played<T> {
  let checkpoints = 0;
  const game = new Game(flow, { onCheckpoint: () => checkpoints++ });
  const transcript: Entry[] = [];
  const queue = [...answers];

  while (game.prompt) {
    const prompt = game.prompt;
    if (prompt.kind === "say") {
      transcript.push({ prompt });
      game.answer();
    } else if (queue.length > 0) {
      const answer = queue.shift();
      transcript.push({ prompt, answer });
      game.answer(answer);
    } else {
      transcript.push({ prompt });
      break;
    }
  }

  if (game.done && queue.length > 0) {
    throw new Error(`flow finished with ${queue.length} unused answer(s): ${JSON.stringify(queue)}`);
  }
  return { game, transcript, checkpoints };
}

/** Just the prompt texts, for concise assertions. */
export function texts(played: Played<unknown>): string[] {
  return played.transcript.map((e) => e.prompt.text);
}
