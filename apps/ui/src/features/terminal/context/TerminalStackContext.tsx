import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useTerminalStack } from "../hooks/useTerminalStack";
import type { TerminalStack } from "../types";

const TerminalStackContext = createContext<TerminalStack | null>(null);

/**
 * Which terminals the pane holds, shared beyond the pane.
 *
 * The stack used to live inside `TerminalPane`, which was enough while the
 * Split button was the only way to open a shell. The run-script menu in the
 * header is a second way, and it opens a split the same way the button does -
 * so the stack is lifted here, above both, rather than given a second owner.
 */
export function TerminalStackProvider({ children }: { children: ReactNode }) {
  const stack = useTerminalStack();
  return (
    <TerminalStackContext.Provider value={stack}>
      {children}
    </TerminalStackContext.Provider>
  );
}

export function useTerminalStackContext(): TerminalStack {
  const stack = useContext(TerminalStackContext);
  if (!stack) {
    throw new Error(
      "useTerminalStackContext must be used inside a TerminalStackProvider",
    );
  }
  return stack;
}
