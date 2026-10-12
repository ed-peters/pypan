import { describe, expect, it } from "vitest";
import type { Prompt } from "../../src/engine/prompts";
import { MAX_DIGITS, editEntry, entryValue, keyToResult } from "../../src/ui/keys";

const say: Prompt = { kind: "say", text: "" };
const yn: Prompt = { kind: "yn", text: "" };
const menu: Prompt = { kind: "choose", text: "", options: ["Buy goods", "Sell goods", "Leave port"], cancellable: false };
const cities: Prompt = { kind: "choose", text: "", options: ["Hong Kong", "Shanghai", "Saigon"], cancellable: true };
const num: Prompt = { kind: "number", text: "", max: 300 };

const answer = (value: unknown) => ({ type: "answer", value });

describe("editEntry", () => {
  it("appends digits and drops leading zeros", () => {
    expect(editEntry("", "0", 300)).toBe("0");
    expect(editEntry("0", "5", 300)).toBe("5");
    expect(editEntry("12", "3", 300)).toBe("123");
  });

  it("deletes with Backspace", () => {
    expect(editEntry("123", "Backspace", 300)).toBe("12");
    expect(editEntry("", "Backspace", 300)).toBe("");
  });

  it("fills in the max with A, when there is one", () => {
    expect(editEntry("7", "a", 300)).toBe("300");
    expect(editEntry("7", "A", 300)).toBe("300");
    expect(editEntry("7", "A", 0)).toBe("7");
  });

  it("allows amounts above max (flows explain why they're refused)", () => {
    expect(editEntry("30", "1", 300)).toBe("301");
  });

  it("stops at MAX_DIGITS", () => {
    const full = "9".repeat(MAX_DIGITS);
    expect(editEntry(full, "9", 0)).toBe(full);
  });

  it("shows an empty entry as 0", () => {
    expect(entryValue("")).toBe(0);
    expect(entryValue("42")).toBe(42);
  });
});

describe("keyToResult", () => {
  it("continues a say on any key but modifiers", () => {
    expect(keyToResult(say, "Enter", "")).toEqual(answer(undefined));
    expect(keyToResult(say, "x", "")).toEqual(answer(undefined));
    expect(keyToResult(say, "Shift", "")).toBeNull();
  });

  it("answers Y/N in either case", () => {
    expect(keyToResult(yn, "y", "")).toEqual(answer(true));
    expect(keyToResult(yn, "N", "")).toEqual(answer(false));
    expect(keyToResult(yn, "Enter", "")).toBeNull();
  });

  it("chooses by number", () => {
    expect(keyToResult(menu, "1", "")).toEqual(answer(0));
    expect(keyToResult(menu, "3", "")).toEqual(answer(2));
    expect(keyToResult(menu, "4", "")).toBeNull();
    expect(keyToResult(menu, "0", "")).toBeNull();
  });

  it("chooses by first letter, taking the first match", () => {
    expect(keyToResult(menu, "l", "")).toEqual(answer(2));
    expect(keyToResult(cities, "s", "")).toEqual(answer(1));
    expect(keyToResult(menu, "z", "")).toBeNull();
  });

  it("cancels with Escape only when allowed", () => {
    expect(keyToResult(cities, "Escape", "")).toEqual(answer(null));
    expect(keyToResult(menu, "Escape", "")).toBeNull();
  });

  it("edits a number and submits it with Enter", () => {
    expect(keyToResult(num, "4", "1")).toEqual({ type: "entry", entry: "14" });
    expect(keyToResult(num, "A", "1")).toEqual({ type: "entry", entry: "300" });
    expect(keyToResult(num, "Enter", "14")).toEqual(answer(14));
    expect(keyToResult(num, "Enter", "")).toEqual(answer(0));
    expect(keyToResult(num, "x", "14")).toBeNull();
  });
});
