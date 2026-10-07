import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { EntryActions } from "../types";

const EntryActionsContext = createContext<EntryActions | null>(null);

/**
 * What the tree's menus can do, provided once rather than threaded through
 * every row: a row already reads its own data from `TreeRowProvider`, and
 * handing it nine handlers as well would put it far past the prop ceiling.
 */
export function EntryActionsProvider({
  value,
  children,
}: {
  value: EntryActions;
  children: ReactNode;
}) {
  return <EntryActionsContext.Provider value={value}>{children}</EntryActionsContext.Provider>;
}

export function useEntryActions(): EntryActions {
  const actions = useContext(EntryActionsContext);
  if (!actions) {
    throw new Error("useEntryActions must be used inside an EntryActionsProvider");
  }
  return actions;
}
