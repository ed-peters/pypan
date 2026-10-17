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

/**
 * Show a message; the player taps/presses a key to continue. Answer: undefined. A
 * `pause` message is a beat in a sequence (a battle round, a storm): the UI moves on
 * by itself after a brief pause, so the player taps only once the sequence is done.
 */
export interface SayPrompt extends PromptBase {
  kind: "say";
  pause?: boolean;
}

/** A yes/no question. Answer: boolean. */
export interface YnPrompt extends PromptBase {
  kind: "yn";
}

/**
 * A numbered menu. Answer: option index, or null if cancelled (only when cancellable).
 * Disabled options are shown but can't be chosen, so the menu keeps its shape.
 */
export interface ChoosePrompt extends PromptBase {
  kind: "choose";
  options: string[];
  cancellable: boolean;
  /** Indexes of the options that can't be chosen. */
  disabled?: number[];
  /** Where "Never mind" goes among the options; the end if not given. */
  cancelAt?: number;
}

/** Ways to shape a menu: options that can't be chosen, and where "Never mind" goes. */
export interface MenuOptions {
  disabled?: readonly number[];
  cancelAt?: number;
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

/** A message that moves on by itself after a brief pause (see SayPrompt). */
export function* beat(text: string): Flow {
  yield { kind: "say", text, pause: true };
}

export function* askYn(text: string): Flow<boolean> {
  return (yield { kind: "yn", text }) as boolean;
}

/** Choose one of the options; returns its index. */
export function* askOpt(text: string, options: readonly string[], menu: MenuOptions = {}): Flow<number> {
  return (yield choosePrompt(text, options, false, menu)) as number;
}

/** Choose one of the options, or cancel (Esc); returns its index or null. */
export function* askOptOrCancel(text: string, options: readonly string[], menu: MenuOptions = {}): Flow<number | null> {
  return (yield choosePrompt(text, options, true, menu)) as number | null;
}

/**
 * Choose among labeled values (pypan.py's ask_opt2); returns the chosen value.
 * An option with a third element of false is shown disabled.
 */
export function* pick<T>(text: string, options: readonly (readonly [string, T, boolean?])[]): Flow<T> {
  const disabled = options.flatMap(([, , enabled], i) => (enabled === false ? [i] : []));
  const i = yield* askOpt(text, options.map(([label]) => label), { disabled });
  return options[i]![1];
}

function choosePrompt(text: string, options: readonly string[], cancellable: boolean, menu: MenuOptions): ChoosePrompt {
  const p: ChoosePrompt = { kind: "choose", text, options: [...options], cancellable };
  if (menu.disabled?.length) {
    p.disabled = [...menu.disabled];
  }
  if (menu.cancelAt !== undefined) {
    p.cancelAt = menu.cancelAt;
  }
  return p;
}

/** Whether a menu option can be chosen. */
export function isEnabled(p: ChoosePrompt, i: number): boolean {
  return !p.disabled?.includes(i);
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
