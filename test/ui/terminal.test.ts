// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERAL } from "../../src/engine/constants";
import { newGame } from "../../src/engine/pypan";
import { ScriptedRng } from "../../src/engine/rng";
import { Terminal } from "../../src/ui/terminal";

// Guns start at the minimum prices: no extortion (no cash), then Wu offers business.
const rolls = () => new ScriptedRng([0, 0, 0, 0, 0]);

let root: HTMLElement;
let onNewGame: () => void;

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.append(root);
  onNewGame = vi.fn();
  // no typewriter in tests
  window.matchMedia = ((q: string) => ({ matches: q.includes("reduce") })) as typeof window.matchMedia;
});

function setup(rng = rolls()) {
  const term = new Terminal(root, { onNewGame });
  const { game, session } = newGame({ rng });
  term.attach(game, session);
  return { game, session };
}

const $ = (sel: string) => root.querySelector<HTMLElement>(sel)!;
const buttons = () => [...root.querySelectorAll<HTMLButtonElement>(".dock button")];
const tap = (label: string) => {
  const b = buttons().find((x) => x.textContent?.includes(label));
  if (!b) throw new Error(`no button "${label}" in ${buttons().map((x) => x.textContent).join(", ")}`);
  b.click();
};
const press = (key: string) => document.dispatchEvent(new KeyboardEvent("keydown", { key }));

describe("Terminal", () => {
  it("shows the opening choice as buttons, with the title art", () => {
    setup();
    expect($(".report-title").textContent).toBe("PYPAN");
    expect($(".art").textContent).toContain("____");
    expect($(".message").textContent).toBe("Would you like to start with:");
    expect(buttons().map((b) => b.textContent)).toEqual(["[1] Guns (and no debt)", "[2] Debt (and no guns)"]);
  });

  it("answers by tapping and updates the panes", () => {
    const { session } = setup();
    tap("Guns");
    tap("[N] No"); //               no business with Wu
    expect(session.hong?.shipGuns).toBe(5);
    expect($(".report-title").textContent).toBe("COMPRADOR'S REPORT - January 1860");
    expect($(".art").textContent).toBe("");
    expect($(".message").textContent).toMatch(/What shall I do, Taipan\?$/);
    expect($(".strip").textContent).toContain("Guns 5");
    expect(buttons().map((b) => b.textContent)).toEqual(expect.arrayContaining(["[5] Leave port", "[6] Retire"]));
  });

  it("answers from the keyboard too", () => {
    const { session } = setup();
    press("2");
    expect(session.hong?.debt).toBe(5000);
  });

  it("offers cancel on cancellable menus, by button or Escape", () => {
    const { game } = setup();
    tap("Guns");
    tap("[N] No"); //               no business with Wu
    tap("Buy goods");
    expect(buttons().at(-1)?.textContent).toBe("[Esc] Never mind");
    press("Escape");
    expect(game.prompt?.text).toMatch(/What shall I do, Taipan\?$/);
  });

  it("enters numbers on the keypad, with ALL filling in the max", () => {
    const { session } = setup(new ScriptedRng([0, 0, 0, 0, 0, 0.5]));
    press("2"); //                 debt start: Li Yuen and Wu come first
    expect($(".message").textContent).toMatch(/^Li Yuen asks/);
    tap("[N] No");
    tap("Continue");
    tap("[N] No");
    tap("Buy goods");
    tap("General");
    expect($(".hint").textContent).toBe("max 80");
    tap("ALL");
    expect($(".entry").textContent).toBe("80");
    tap("⌫");
    expect($(".entry").textContent).toBe("8");
    tap("OK");
    expect(session.hong?.shipGoods[GENERAL]).toBe(8);
  });

  it("types numbers from the keyboard", () => {
    const rng = new ScriptedRng([0, 0, 0, 0, 0, 0.5]);
    const { session } = setup(rng);
    press("2");
    press("n");
    press("Enter");
    press("n");
    press("b");
    press("g");
    for (const k of ["1", "5", "Enter"]) press(k);
    expect(session.hong?.shipGoods[GENERAL]).toBe(15);
  });

  it("continues a message by tapping it", () => {
    const { game } = setup(new ScriptedRng([0, 0, 0, 0, 0, 0.5]));
    press("2");
    press("n");
    expect(game.prompt?.kind).toBe("say");
    $(".report").click();
    expect(game.prompt?.kind).toBe("yn");
  });

  it("toggles the hold and warehouse on small screens", () => {
    setup();
    const toggle = $(".cargo-toggle");
    toggle.click();
    expect($(".panes").classList.contains("show-cargo")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows the score after retiring, and offers a new game", () => {
    setup();
    tap("Guns"); //                  no debt, so Retire is offered
    tap("[N] No"); //               no business with Wu
    tap("Retire");
    expect($(".message").textContent).toBe("Are you sure you want to retire, Taipan?");
    tap("[Y] Yes");
    expect($(".message").textContent).toBe("Have you considered a land-based job?");
    tap("Continue");
    expect($(".message").textContent).toBe(
      "You have retired, Taipan.\n\n" +
      "Your score is 0.\n\n" +
      "  Rank           Score\n" +
      "  Ma Tsu         50,000 and over\n" +
      "  Master Taipan  8,000 to 49,999\n" +
      "  Taipan         1,000 to 7,999\n" +
      "  Compradore     500 to 999\n" +
      "> Galley Hand    less than 500\n\n" +
      "GAME OVER",
    );
    tap("New game");
    expect(onNewGame).toHaveBeenCalled();
  });

  it("reports how the game ended", () => {
    const onEnd = vi.fn();
    const term = new Terminal(root, { onNewGame, onEnd });
    const { game, session } = newGame({ rng: rolls() });
    term.attach(game, session);
    tap("Guns");
    tap("[N] No"); //               no business with Wu
    tap("Retire");
    tap("[Y] Yes");
    expect(onEnd).not.toHaveBeenCalled();
    tap("Continue");
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ ending: "retired", score: 0 }));
  });

  it("shows GAME OVER when the ship sinks", () => {
    const onEnd = vi.fn();
    const term = new Terminal(root, { onNewGame, onEnd });
    // a guns start with a nearly wrecked ship; pirates: 3 ships; no Li Yuen;
    // run fails, no partial escape; return fire sinks us
    const rng = new ScriptedRng([0, 0, 0, 0, 0, 0, 2, 0.5, 100, 1, 0, 2, 1, 0.99]);
    const { game, session } = newGame({ rng });
    term.attach(game, session);
    tap("Guns");
    tap("[N] No"); //               no business with Wu
    session.hong!.shipDamage = 59;
    session.hong!.shipGuns = 0;
    tap("Leave port");
    tap("Shanghai");
    tap("Continue"); //  3 hostile ships approaching
    tap("Run away");
    while (!game.done) tap("Continue");
    expect(game.result?.ending).toBe("sunk");
    expect($(".message").textContent).toMatch(/^Your ship has been lost with all hands, Taipan\.\n\nYour score is 0\./);
    expect($(".message").textContent).toMatch(/GAME OVER$/);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ ending: "sunk" }));
    expect(buttons().map((b) => b.textContent)).toEqual(["New game"]);
  });
});
