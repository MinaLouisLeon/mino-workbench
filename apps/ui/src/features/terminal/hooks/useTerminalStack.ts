import { useCallback, useState } from "react";

import type { ProjectScript } from "@/Types";

import type { TerminalEntry, TerminalStack } from "../types";

/**
 * How many shells one pane will hold.
 *
 * Each split is a real process on the target, not a tab in a buffer, so this
 * is a deliberate ceiling rather than a UI limit: four side by side is already
 * narrow at a typical pane width, and past that the columns stop being usable.
 */
export const MAX_TERMINALS = 4;

let counter = 0;
/** Stable per-instance key. Not the pty id - the transport issues those. */
function nextId(): string {
  counter += 1;
  return `terminal-${counter}`;
}

function entry(script: ProjectScript | null = null): TerminalEntry {
  return { id: nextId(), script };
}

/**
 * Owns which terminals exist, and nothing else.
 *
 * A terminal's own state - its pty, its output, its exit - belongs to the
 * instance that renders it, so closing one here unmounts it and its session is
 * torn down by the same cleanup that handles closing the window.
 *
 * A terminal may carry the project script it was opened to run. That is fixed
 * when it is added and never changes: the script is run once, as the shell
 * starts, and the shell is an ordinary one from then on.
 */
export function useTerminalStack(): TerminalStack {
  const [terminals, setTerminals] = useState<TerminalEntry[]>(() => [entry()]);

  /**
   * Opens one more shell beside the others, running `script` first if given.
   * Returns false when the pane is already full, so a caller can say so.
   */
  const count = terminals.length;
  const add = useCallback(
    (script?: ProjectScript) => {
      if (count >= MAX_TERMINALS) return false;
      // Checked again inside: two adds in one tick must not make five.
      setTerminals((current) =>
        current.length >= MAX_TERMINALS ? current : [...current, entry(script ?? null)],
      );
      return true;
    },
    [count],
  );

  const close = useCallback((id: string) => {
    // The pane always holds at least one terminal: an empty terminal pane is
    // a dead rectangle, and closing the last one has no obvious way back.
    setTerminals((current) =>
      current.length <= 1 ? current : current.filter((terminal) => terminal.id !== id),
    );
  }, []);

  return {
    terminals,
    ids: terminals.map((terminal) => terminal.id),
    add,
    close,
    canAdd: terminals.length < MAX_TERMINALS,
    canClose: terminals.length > 1,
  };
}
