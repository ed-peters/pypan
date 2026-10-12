// The green-screen terminal: renders the current prompt, the status panes and the
// input dock, and turns taps and key presses into answers for the Game.

import type { Game } from "../engine/game";
import type { Session } from "../engine/pypan";
import type { Prompt } from "../engine/prompts";
import { ART, TITLE } from "./art";
import { entryValue, keyToResult, type KeyResult } from "./keys";
import {
  cargoLines, cargoSummary, holdRows, reportTitle, statusRows, warehouseRows, type Row,
} from "./panes";

/** Typewriter speed; the whole message is capped so long reports don't drag. */
const MS_PER_CHAR = 6;
const MAX_TYPE_MS = 700;

export interface TerminalCallbacks {
  /** Called when the player asks for a new game after this one ends. */
  onNewGame: () => void;
}

export class Terminal {
  private game: Game | null = null;
  private session: Session | null = null;
  private entry = "";
  private typing: { timer: number; finish: () => void } | null = null;

  private readonly title: HTMLElement;
  private readonly art: HTMLElement;
  private readonly message: HTMLElement;
  private readonly report: HTMLElement;
  private readonly dock: HTMLElement;
  private readonly status: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly warehouse: HTMLElement;
  private readonly hold: HTMLElement;
  private readonly cargo: HTMLElement;
  private readonly cargoToggle: HTMLButtonElement;
  private readonly panes: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: TerminalCallbacks,
  ) {
    root.innerHTML = `
      <div class="screen">
        <aside class="panes">
          <section class="pane status-pane">
            <h2>CURRENT STATUS</h2>
            <dl class="rows status"></dl>
            <div class="strip"></div>
          </section>
          <button type="button" class="cargo-toggle" aria-expanded="false"></button>
          <section class="pane goods-pane">
            <h2>CANTON WAREHOUSE</h2>
            <dl class="rows warehouse"></dl>
          </section>
          <section class="pane goods-pane">
            <h2>SHIP'S HOLD</h2>
            <dl class="rows hold"></dl>
            <h3>Private Cargo</h3>
            <div class="cargo"></div>
          </section>
        </aside>
        <main class="report">
          <h1 class="report-title"></h1>
          <pre class="art" aria-hidden="true"></pre>
          <div class="message" aria-live="polite"></div>
        </main>
        <footer class="dock"></footer>
      </div>`;

    const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    this.title = $(".report-title");
    this.art = $(".art");
    this.message = $(".message");
    this.report = $(".report");
    this.dock = $(".dock");
    this.status = $(".status");
    this.strip = $(".strip");
    this.warehouse = $(".warehouse");
    this.hold = $(".hold");
    this.cargo = $(".cargo");
    this.cargoToggle = $<HTMLButtonElement>(".cargo-toggle");
    this.panes = $(".panes");

    this.cargoToggle.addEventListener("click", () => {
      const open = this.panes.classList.toggle("show-cargo");
      this.cargoToggle.setAttribute("aria-expanded", String(open));
    });

    // tapping the message finishes the typewriter, or continues a "say"
    this.report.addEventListener("click", () => {
      if (this.typing) {
        this.typing.finish();
      } else if (this.game?.prompt?.kind === "say") {
        this.submit(undefined);
      }
    });

    document.addEventListener("keydown", (e) => this.onKey(e));
  }

  /** Start showing a new game. */
  attach(game: Game, session: Session): void {
    this.game = game;
    this.session = session;
    this.render();
  }

  // ----------------------------------------------------------------------------------
  // Input

  private onKey(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }
    const prompt = this.game?.prompt;
    if (!prompt) {
      if (this.game?.done && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        this.callbacks.onNewGame();
      }
      return;
    }
    // the first key press while typing just finishes the message
    if (this.typing && prompt.kind === "say") {
      e.preventDefault();
      this.typing.finish();
      return;
    }
    const result = keyToResult(prompt, e.key, this.entry);
    if (result) {
      e.preventDefault();
      this.apply(result);
    }
  }

  private apply(result: KeyResult): void {
    if (result.type === "entry") {
      this.entry = result.entry;
      this.renderEntry();
    } else {
      this.submit(result.value);
    }
  }

  private submit(value: unknown): void {
    if (!this.game?.prompt) {
      return;
    }
    try {
      this.game.answer(value);
    } catch (e) {
      this.showError(e);
      return;
    }
    this.entry = "";
    this.render();
  }

  // ----------------------------------------------------------------------------------
  // Rendering

  private render(): void {
    const h = this.session?.hong ?? null;
    const prompt = this.game?.prompt ?? null;

    this.title.textContent = reportTitle(h);
    this.renderPanes();

    if (!prompt) {
      this.art.textContent = TITLE;
      this.typeMessage("Your game has been saved, Taipan.");
      this.renderDock([button("New game", () => this.callbacks.onNewGame(), "wide")]);
      return;
    }

    this.art.textContent = prompt.art ? ART[prompt.art] : h ? "" : TITLE;
    this.typeMessage(prompt.text);
    this.renderControls(prompt);
  }

  private renderPanes(): void {
    const h = this.session?.hong ?? null;
    renderRows(this.status, statusRows(h));
    renderRows(this.warehouse, warehouseRows(h));
    renderRows(this.hold, holdRows(h));
    this.cargo.replaceChildren(...cargoLines(h).map((l) => el("div", l)));
    this.cargoToggle.textContent = cargoSummary(h);

    // compact one-line status for narrow screens
    const [loc, cash, debt, bank, guns, repair] = statusRows(h).map(([, v]) => v);
    this.strip.replaceChildren(
      el("span", `${loc}`),
      el("span", `Cash ${cash}`),
      el("span", `Debt ${debt}`),
      el("span", `Bank ${bank}`),
      el("span", `Guns ${guns}`),
      el("span", `Hull ${repair}`),
    );
  }

  private renderControls(prompt: Prompt): void {
    switch (prompt.kind) {
      case "say":
        this.renderDock([button("Continue ▶", () => this.submit(undefined), "wide")]);
        break;

      case "yn":
        this.renderDock([
          button("[Y] Yes", () => this.submit(true)),
          button("[N] No", () => this.submit(false)),
        ], "pair");
        break;

      case "choose": {
        const buttons = prompt.options.map((o, i) => button(`[${i + 1}] ${o}`, () => this.submit(i), "option"));
        if (prompt.cancellable) {
          buttons.push(button("[Esc] Never mind", () => this.submit(null), "option cancel"));
        }
        this.renderDock(buttons, "menu");
        break;
      }

      case "number": {
        const display = el("output", "", "entry");
        const hint = el("div", prompt.max > 0 ? `max ${prompt.max.toLocaleString("en-US")}` : "", "hint");
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Backspace", "0", "A"];
        const labels: Record<string, string> = { Backspace: "⌫", A: "ALL" };
        const pad = el("div", "", "keypad");
        for (const k of keys) {
          pad.append(button(labels[k] ?? k, () => {
            const r = keyToResult(prompt, k, this.entry);
            if (r) this.apply(r);
          }, "key"));
        }
        pad.append(button("OK", () => this.submit(entryValue(this.entry)), "key ok"));
        this.renderDock([el("div", "", "entry-row", [display, hint]), pad], "number");
        this.renderEntry();
        break;
      }
    }
  }

  private renderEntry(): void {
    const out = this.dock.querySelector(".entry");
    if (out) {
      out.textContent = entryValue(this.entry).toLocaleString("en-US");
    }
  }

  private renderDock(children: HTMLElement[], layout = ""): void {
    this.dock.className = `dock ${layout}`.trim();
    this.dock.replaceChildren(...children);
  }

  private typeMessage(text: string): void {
    this.typing?.finish();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || text.length === 0) {
      this.message.textContent = text;
      return;
    }
    const step = Math.max(1, Math.ceil(text.length / (MAX_TYPE_MS / MS_PER_CHAR)));
    let shown = 0;
    this.message.textContent = "";
    const finish = () => {
      window.clearInterval(timer);
      this.message.textContent = text;
      this.typing = null;
    };
    const timer = window.setInterval(() => {
      shown = Math.min(text.length, shown + step);
      this.message.textContent = text.slice(0, shown);
      if (shown >= text.length) {
        finish();
      }
    }, MS_PER_CHAR);
    this.typing = { timer, finish };
  }

  private showError(e: unknown): void {
    console.error(e);
    this.typing?.finish();
    this.art.textContent = "";
    this.message.textContent = `Something went wrong, Taipan.\n\n${(e as Error)?.message ?? e}`;
    this.game = null;
    this.renderDock([button("New game", () => this.callbacks.onNewGame(), "wide")]);
  }
}

// ------------------------------------------------------------------------------------
// DOM helpers

function el(tag: string, text: string, className = "", children: HTMLElement[] = []): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  e.append(...children);
  return e;
}

function button(label: string, onClick: () => void, className = ""): HTMLButtonElement {
  const b = el("button", label, className) as HTMLButtonElement;
  b.type = "button";
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

function renderRows(dl: HTMLElement, rows: Row[]): void {
  dl.replaceChildren(...rows.flatMap(([label, value]) => [el("dt", label), el("dd", value)]));
}
