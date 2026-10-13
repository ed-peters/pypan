// Drives a flow one prompt at a time, so a UI (or a test) can show the current
// prompt and feed back the player's answer.

import { isEnabled, type Flow, type Prompt } from "./prompts";

export class InvalidAnswerError extends Error {
  override name = "InvalidAnswerError";
}

export interface GameOptions {
  /** Called at each checkpoint the flow reaches; the place to save the game. */
  onCheckpoint?: () => void;
}

export class Game<T = void> {
  private readonly flow: Flow<T>;
  private readonly onCheckpoint: () => void;
  private current: Prompt | null = null;
  private finished = false;
  private value: T | undefined;

  constructor(flow: Flow<T>, options: GameOptions = {}) {
    this.flow = flow;
    this.onCheckpoint = options.onCheckpoint ?? (() => {});
    this.advance(this.flow.next());
  }

  /** The prompt awaiting an answer, or null once the flow has finished. */
  get prompt(): Prompt | null {
    return this.current;
  }

  get done(): boolean {
    return this.finished;
  }

  /** What the flow returned, once done. */
  get result(): T | undefined {
    return this.value;
  }

  /**
   * Answer the current prompt and run the flow to its next prompt.
   * An invalid answer throws InvalidAnswerError and leaves the game unchanged.
   */
  answer(value?: unknown): void {
    const p = this.current;
    if (p === null) {
      throw new InvalidAnswerError("the game is over");
    }
    validate(p, value);
    this.advance(this.flow.next(value));
  }

  private advance(next: IteratorResult<unknown, T>): void {
    for (;;) {
      if (next.done) {
        this.current = null;
        this.finished = true;
        this.value = next.value;
        return;
      }
      const step = next.value as Prompt | { kind: "checkpoint" };
      if (step.kind !== "checkpoint") {
        this.current = step;
        return;
      }
      this.onCheckpoint();
      next = this.flow.next();
    }
  }
}

function validate(p: Prompt, v: unknown): void {
  const fail = (expected: string) => {
    throw new InvalidAnswerError(`${p.kind} prompt expects ${expected}, got ${JSON.stringify(v)}`);
  };
  switch (p.kind) {
    case "say":
      if (v !== undefined) fail("no answer");
      break;
    case "yn":
      if (typeof v !== "boolean") fail("a boolean");
      break;
    case "choose":
      if (v === null) {
        if (!p.cancellable) fail(`an option index 0..${p.options.length - 1}`);
      } else if (!Number.isInteger(v) || (v as number) < 0 || (v as number) >= p.options.length) {
        fail(`an option index 0..${p.options.length - 1}${p.cancellable ? " or null" : ""}`);
      } else if (!isEnabled(p, v as number)) {
        fail("an option that isn't disabled");
      }
      break;
    case "number":
      if (!Number.isSafeInteger(v) || (v as number) < 0) fail("a non-negative integer");
      break;
  }
}
