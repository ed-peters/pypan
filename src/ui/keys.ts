// Input handling as pure functions: which answer (if any) a key or button press
// gives for the current prompt. Shared by the on-screen controls and the keyboard.

import { isEnabled, type Prompt } from "../engine/prompts";

/** Longest number the keypad accepts; well inside Number.MAX_SAFE_INTEGER. */
export const MAX_DIGITS = 12;

/** The result of a key press: an answer to submit, or a new number entry. */
export type KeyResult =
  | { type: "answer"; value: unknown }
  | { type: "entry"; entry: string };

/** The number shown for an entry string ("" shows as 0, as in pypan.py). */
export function entryValue(entry: string): number {
  return entry === "" ? 0 : Number(entry);
}

/**
 * Edit a number entry: digits append, Backspace deletes, "A" fills in the max.
 * Entries above max are allowed: flows check amounts themselves (and the repair
 * flow relies on it to offer Wu's help).
 */
export function editEntry(entry: string, key: string, max: number): string {
  if (/^[0-9]$/.test(key)) {
    const next = (entry + key).replace(/^0+(?=\d)/, "");
    return next.length > MAX_DIGITS ? entry : next;
  }
  if (key === "Backspace" || key === "Delete") {
    return entry.slice(0, -1);
  }
  if (key === "a" || key === "A") {
    return max > 0 ? String(max) : entry;
  }
  return entry;
}

/** Map a keyboard key to a result for the prompt, or null if it does nothing. */
export function keyToResult(prompt: Prompt, key: string, entry: string): KeyResult | null {
  switch (prompt.kind) {
    case "say":
      // any key continues, as in pypan.py (but not bare modifiers)
      return isModifier(key) ? null : { type: "answer", value: undefined };

    case "yn":
      if (key === "y" || key === "Y") return { type: "answer", value: true };
      if (key === "n" || key === "N") return { type: "answer", value: false };
      return null;

    case "choose": {
      if (key === "Escape") {
        return prompt.cancellable ? { type: "answer", value: null } : null;
      }
      if (/^[1-9]$/.test(key)) {
        const i = Number(key) - 1;
        return i < prompt.options.length && isEnabled(prompt, i) ? { type: "answer", value: i } : null;
      }
      if (key.length === 1) {
        const i = prompt.options.findIndex((o, j) => o[0]?.toUpperCase() === key.toUpperCase() && isEnabled(prompt, j));
        return i >= 0 ? { type: "answer", value: i } : null;
      }
      return null;
    }

    case "number": {
      if (key === "Enter") {
        return { type: "answer", value: entryValue(entry) };
      }
      const next = editEntry(entry, key, prompt.max);
      return next === entry ? null : { type: "entry", entry: next };
    }
  }
}

function isModifier(key: string): boolean {
  return ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Dead", "Unidentified"].includes(key);
}
