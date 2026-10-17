import { afterEach, describe, expect, it, vi } from "vitest";
import { toSaveString } from "../../src/engine/save";
import { LocalStorageStore, SAVE_KEY } from "../../src/storage";
import { makeHong } from "../helpers/hong";

/** A minimal in-memory Storage. */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(k: string) { return this.items.get(k) ?? null; }
  key(i: number) { return [...this.items.keys()][i] ?? null; }
  removeItem(k: string) { this.items.delete(k); }
  setItem(k: string, v: string) { this.items.set(k, v); }
}

/** A Storage whose every call throws, like Safari with site data blocked. */
const brokenStorage = new Proxy({} as Storage, {
  get: () => () => { throw new Error("SecurityError"); },
});

afterEach(() => vi.restoreAllMocks());

describe("LocalStorageStore", () => {
  it("has nothing to load at first", async () => {
    expect(await new LocalStorageStore(new MemoryStorage()).load()).toBeNull();
  });

  it("saves and loads a game in the pypan.json format", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageStore(storage);
    const h = makeHong({ cash: 1234, shipGoods: [1, 2, 3, 4, 0] });
    await store.save(h);
    expect(storage.getItem(SAVE_KEY)).toBe(toSaveString(h));
    expect(await store.load()).toEqual(h);
  });

  it("saves a snapshot, not a live reference", async () => {
    const store = new LocalStorageStore(new MemoryStorage());
    const h = makeHong();
    await store.save(h);
    h.cash = 0;
    expect((await store.load())?.cash).toBe(400);
  });

  it("clears the saved game", async () => {
    const store = new LocalStorageStore(new MemoryStorage());
    await store.save(makeHong());
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it("treats a corrupt save as no save", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "{not json");
    expect(await new LocalStorageStore(storage).load()).toBeNull();
  });

  it("never throws when storage is unavailable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const storage of [brokenStorage, null]) {
      const store = new LocalStorageStore(storage);
      await expect(store.save(makeHong())).resolves.toBeUndefined();
      await expect(store.load()).resolves.toBeNull();
      await expect(store.clear()).resolves.toBeUndefined();
    }
  });
});
