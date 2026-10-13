import { describe, expect, it } from "vitest";
import { Game, InvalidAnswerError } from "../../src/engine/game";
import { newHong, type Hong } from "../../src/engine/hong";
import {
  askNum, askOpt, askOptOrCancel, askYn, checkpoint, pick, say, withArt, type Flow,
} from "../../src/engine/prompts";
import { SeededRng } from "../../src/engine/rng";
import { play, texts } from "../helpers/play";

// A toy flow shaped like the real ones, to exercise the protocol end to end.
function* deposit(h: Hong): Flow<string> {
  const amt = yield* askNum("How much will you deposit, Taipan?", h.cash);
  if (amt > h.cash) {
    yield* say("You only have so much cash, Taipan.");
    return "refused";
  }
  h.cash -= amt;
  h.bank += amt;
  return "ok";
}

const hong = () => newHong(new SeededRng(1), false);

describe("Game", () => {
  it("runs to the first prompt on construction", () => {
    const g = new Game(deposit(hong()));
    expect(g.prompt).toEqual({ kind: "number", text: "How much will you deposit, Taipan?", max: 400 });
    expect(g.done).toBe(false);
  });

  it("resumes the flow with each answer and exposes its result", () => {
    const h = hong();
    const g = new Game(deposit(h));
    g.answer(150);
    expect(g.done).toBe(true);
    expect(g.prompt).toBeNull();
    expect(g.result).toBe("ok");
    expect([h.cash, h.bank]).toEqual([250, 150]);
  });

  it("allows numbers above max, leaving the check to the flow (as pypan.py does)", () => {
    const g = new Game(deposit(hong()));
    g.answer(1000);
    expect(g.prompt?.text).toBe("You only have so much cash, Taipan.");
    g.answer();
    expect(g.result).toBe("refused");
  });

  it.each([
    ["say", say("hi"), [true, 0, "x"]],
    ["yn", askYn("ok?"), [undefined, 1, "y"]],
    ["choose", askOpt("which?", ["a", "b"]), [undefined, null, -1, 2, 0.5, "a"]],
    ["number", askNum("how many?", 10), [undefined, -1, 1.5, "3", Infinity, NaN]],
  ] as const)("rejects invalid answers to %s prompts without advancing", (_, flow, bad) => {
    const g = new Game(flow as Flow<unknown>);
    const before = g.prompt;
    for (const v of bad) {
      expect(() => g.answer(v)).toThrow(InvalidAnswerError);
      expect(g.prompt).toBe(before);
    }
  });

  it("accepts null for cancellable menus only", () => {
    const g = new Game(askOptOrCancel("where?", ["a", "b"]));
    g.answer(null);
    expect(g.result).toBeNull();
  });

  it("rejects disabled menu options", () => {
    const g = new Game(askOptOrCancel("where?", ["a", "b"], { disabled: [0] }));
    expect(() => g.answer(0)).toThrow(InvalidAnswerError);
    g.answer(1);
    expect(g.result).toBe(1);
  });

  it("rejects answers after the game is over", () => {
    const g = new Game(say("bye"));
    g.answer();
    expect(() => g.answer()).toThrow(InvalidAnswerError);
  });

  it("calls onCheckpoint and skips past checkpoints without prompting", () => {
    let saves = 0;
    function* loop(): Flow {
      for (let i = 0; i < 3; i++) {
        yield* checkpoint();
        yield* say(`turn ${i}`);
      }
    }
    const g = new Game(loop(), { onCheckpoint: () => saves++ });
    expect(saves).toBe(1);
    expect(g.prompt?.text).toBe("turn 0");
    g.answer();
    g.answer();
    expect(saves).toBe(3);
  });

  it("finishes immediately for a flow with no prompts", () => {
    function* nothing(): Flow<number> {
      return 7;
    }
    const g = new Game(nothing());
    expect(g.done).toBe(true);
    expect(g.result).toBe(7);
  });

  it("propagates errors thrown by the flow", () => {
    function* broken(): Flow {
      yield* say("about to fail");
      throw new Error("boom");
    }
    const g = new Game(broken());
    expect(() => g.answer()).toThrow("boom");
  });
});

describe("prompt helpers", () => {
  it("pick returns the value paired with the chosen label", () => {
    const flow = pick("What shall I do, Taipan?", [["Buy", "buy"], ["Sell", "sell"]] as const);
    const g = new Game(flow);
    expect(g.prompt).toMatchObject({ kind: "choose", options: ["Buy", "Sell"], cancellable: false });
    g.answer(1);
    expect(g.result).toBe("sell");
  });

  it("withArt tags nested prompts, with inner art taking precedence", () => {
    function* battle(): Flow<boolean> {
      yield* say("Storm, Taipan!");
      return yield* askYn("Run?");
    }
    function* voyage(): Flow<boolean> {
      yield* say("Sailing...");
      const ran = yield* withArt("pirates", battle());
      yield* checkpoint();
      yield* say("Arriving...");
      return ran;
    }
    const p = play(withArt("boat", voyage()), [true]);
    expect(p.transcript.map((e) => e.prompt.art)).toEqual(["boat", "pirates", "pirates", "boat"]);
    expect(p.game.result).toBe(true);
    expect(p.checkpoints).toBe(1);
  });

  it("withArt passes answers through to the wrapped flow", () => {
    const g = new Game(withArt("storm", askNum("How many?", 5)));
    g.answer(3);
    expect(g.result).toBe(3);
  });
});

describe("play harness", () => {
  it("auto-continues says and records the transcript", () => {
    function* flow(): Flow<number> {
      yield* say("Welcome");
      const a = yield* askYn("Ready?");
      const n = yield* askNum("How many?");
      yield* say(a ? `Got ${n}` : "No");
      return n;
    }
    const p = play(flow(), [true, 42]);
    expect(texts(p)).toEqual(["Welcome", "Ready?", "How many?", "Got 42"]);
    expect(p.transcript[1]).toMatchObject({ answer: true });
    expect(p.game.result).toBe(42);
  });

  it("stops at the next interactive prompt when answers run out", () => {
    const p = play(deposit(hong()), []);
    expect(p.game.done).toBe(false);
    expect(p.game.prompt?.kind).toBe("number");
  });

  it("complains about unused answers", () => {
    expect(() => play(say("hi"), [true])).toThrow(/unused/);
  });
});
