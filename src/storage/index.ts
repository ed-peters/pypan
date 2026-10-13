// Where saved games live: the browser's localStorage (there is no backend). The
// interface is async so another store could implement it; the local store never
// throws.

import type { Hong } from "../engine/hong";
import { fromSaveString, toSaveString } from "../engine/save";

export interface SaveStore {
  /** The saved game, or null if there is none (or it can't be read). */
  load(): Promise<Hong | null>;
  save(h: Hong): Promise<void>;
  clear(): Promise<void>;
}

export const SAVE_KEY = "pypan.save";

/** Saves to the browser's localStorage, in the pypan.json format. */
export class LocalStorageStore implements SaveStore {
  constructor(
    private readonly storage: Storage | null = defaultStorage(),
    private readonly key: string = SAVE_KEY,
  ) {}

  async load(): Promise<Hong | null> {
    try {
      const json = this.storage?.getItem(this.key);
      return json ? fromSaveString(json) : null;
    } catch (e) {
      console.warn("pypan: couldn't load saved game", e);
      return null;
    }
  }

  async save(h: Hong): Promise<void> {
    try {
      this.storage?.setItem(this.key, toSaveString(h));
    } catch (e) {
      console.warn("pypan: couldn't save game", e);
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage?.removeItem(this.key);
    } catch (e) {
      console.warn("pypan: couldn't clear saved game", e);
    }
  }
}

// Accessing localStorage can itself throw (e.g. blocked site data).
function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
