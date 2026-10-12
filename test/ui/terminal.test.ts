// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERAL } from "../../src/engine/constants";
import { newGame } from "../../src/engine/pypan";
import { ScriptedRng } from "../../src/engine/rng";
import { Terminal } from "../../src/ui/terminal";

// Guns start at the minimum prices: no extortion (no cash) and no Wu (no debt).
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
    expect(session.hong?.shipGuns).toBe(5);
    expect($(".report-title").textContent).toBe("COMPRADOR'S REPORT - January 1860");
    expect($(".art").textContent).toBe("");
    expect($(".message").textContent).toMatch(/What shall I do, Taipan\?$/);
    expect($(".strip").textContent).toContain("Guns 5");
    expect(buttons().map((b) => b.textContent)).toContain("[7] Leave port");
  });

  it("answers from the keyboard too", () => {
    const { session } = setup();
    press("2");
    expect(session.hong?.debt).toBe(5000);
  });

  it("offers cancel on cancellable menus, by button or Escape", () => {
    const { game } = setup();
    tap("Guns");
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

  it("offers a new game when the game ends", () => {
    setup();
    tap("Guns");
    tap("Exit the game");
    tap("Continue");
    expect($(".message").textContent).toBe("Your game has been saved, Taipan.");
    tap("New game");
    expect(onNewGame).toHaveBeenCalled();
  });
});
