// The prompt protocol between the engine and a UI.
//
// Game logic is written as generator functions ("flows") that yield prompts and
// receive the player's answer, in the same shape as pypan.py's blocking
// display.say / ask_yn / ask_opt / ask_num calls:
//
//   function* visitBank(h: Hong): Flow {
//     const amt = yield* askNum("How much will you deposit, Taipan?", h.cash);
//     ...
//   }
//
// Flows compose with yield*. The Game driver (game.ts) validates every answer
// before resuming a flow, so the helpers below can trust the values they receive.

/** ASCII art backdrops; the UI owns the actual pictures. */
export type Art = "boat" | "storm" | "pirates";

interface PromptBase {
  text: string;
  art?: Art;
}

/** Show a message; the player taps/presses a key to continue. Answer: undefined. */
export interface SayPrompt extends PromptBase {
  kind: "say";
}

/** A yes/no question. Answer: boolean. */
export interface YnPrompt extends PromptBase {
  kind: "yn";
}

/** A numbered menu. Answer: option index, or null if cancelled (only when cancellable). */
export interface ChoosePrompt extends PromptBase {
  kind: "choose";
  options: string[];
  cancellable: boolean;
}

/**
 * A whole-number entry. Answer: a non-negative integer.
 * `max` is what "All" fills in (0 means no max). As in pypan.py it is not
 * enforced: flows check amounts themselves and explain what went wrong.
 */
export interface NumberPrompt extends PromptBase {
  kind: "number";
  max: number;
}

export type Prompt = SayPrompt | YnPrompt | ChoosePrompt | NumberPrompt;

/** Not a prompt: tells the driver this is a safe point to save the game. */
export interface Checkpoint {
  kind: "checkpoint";
}

export type Step = Prompt | Checkpoint;

/** A game flow: yields steps, receives answers, returns T. */
export type Flow<T = void> = Generator<Step, T, unknown>;

// ------------------------------------------------------------------------------------
// Helpers for writing flows

export function* say(text: string): Flow {
  yield { kind: "say", text };
}

export function* askYn(text: string): Flow<boolean> {
  return (yield { kind: "yn", text }) as boolean;
}

/** Choose one of the options; returns its index. */
export function* askOpt(text: string, options: readonly string[]): Flow<number> {
  return (yield { kind: "choose", text, options: [...options], cancellable: false }) as number;
}

/** Choose one of the options, or cancel (Esc); returns its index or null. */
export function* askOptOrCancel(text: string, options: readonly string[]): Flow<number | null> {
  return (yield { kind: "choose", text, options: [...options], cancellable: true }) as number | null;
}

/** Choose among labeled values (pypan.py's ask_opt2); returns the chosen value. */
export function* pick<T>(text: string, options: readonly (readonly [string, T])[]): Flow<T> {
  const i = yield* askOpt(text, options.map(([label]) => label));
  return options[i]![1];
}

export function* askNum(text: string, max: number = 0): Flow<number> {
  return (yield { kind: "number", text, max }) as number;
}

export function* checkpoint(): Flow {
  yield { kind: "checkpoint" };
}

/**
 * Run a flow with an art backdrop on its prompts (pypan.py's push_prefix /
 * pop_prefix). Prompts that already have art keep it, so nesting works like a stack.
 */
export function* withArt<T>(art: Art, flow: Flow<T>): Flow<T> {
  let next = flow.next();
  while (!next.done) {
    const step = next.value;
    const answer = yield step.kind === "checkpoint" || step.art ? step : { ...step, art };
    next = flow.next(answer);
  }
  return next.value;
}
