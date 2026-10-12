// Boots the browser app: load any saved game, start the engine, attach the UI.

import "@fontsource/vt323";
import "./ui/styles.css";

import { newGame } from "./engine/pypan";
import { SeededRng } from "./engine/rng";
import { LocalStorageStore } from "./storage";
import { Terminal } from "./ui/terminal";

const store = new LocalStorageStore();
const root = document.querySelector<HTMLElement>("#app")!;
const terminal = new Terminal(root, {
  onNewGame: start,
  // a sunk ship can't be restored
  onEnd: (ending) => {
    if (ending === "sunk") void store.clear();
  },
});

async function start(): Promise<void> {
  const saved = await store.load();
  const { game, session } = newGame({
    rng: new SeededRng(),
    saved,
    onSave: (h) => void store.save(h),
  });
  terminal.attach(game, session);
}

void start();
