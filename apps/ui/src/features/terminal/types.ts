import type { RefObject } from "react";

import type { ProjectScript, PtyExit, PtySession, PtySize } from "@/Types";

export interface TerminalSessionState {
  session: PtySession | null;
  /** Friendly copy for a failure that stopped the session opening. */
  error: string | null;
  /** Set once the shell exits; the pane then offers a reason, not a blank box. */
  exit: PtyExit | null;
  /**
   * Name of the shell spawned because `nu` was missing, e.g. `zsh`. Null when
   * Nushell started normally.
   */
  fallbackShell: string | null;
}

export interface TerminalInstanceProps {
  /** False for the last terminal: the pane always keeps one. */
  closable: boolean;
  onClose: () => void;
  /** False at the pane's ceiling; the menu says why. */
  canSplit: boolean;
  onSplit: () => void;
  /** The project script this shell was opened to run, or null for a plain one. */
  script: ProjectScript | null;
}

/** One terminal in the pane, as `useTerminalStack` tracks it. */
export interface TerminalEntry {
  id: string;
  /** Run once as the shell starts; the shell stays open afterwards. */
  script: ProjectScript | null;
}

/** What `TerminalStackContext` shares: the pane's terminals and their controls. */
export interface TerminalStack {
  terminals: TerminalEntry[];
  ids: string[];
  /** False when the pane is already full, so the caller can say so. */
  add: (script?: ProjectScript) => boolean;
  close: (id: string) => void;
  canAdd: boolean;
  canClose: boolean;
}

export interface TerminalSplitHandleProps {
  /** Index of the gap: it sits between column `index` and `index + 1`. */
  index: number;
  onStart: (index: number, clientX: number) => void;
  onNudge: (index: number, percent: number) => void;
}

export interface XtermHandle {
  container: RefObject<HTMLDivElement | null>;
  /** Resizes the terminal to its container and returns the new grid size. */
  fit: () => PtySize;
  ready: boolean;
}
