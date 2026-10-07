import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { ScriptRowContextValue } from "../types";

const ScriptRowContext = createContext<ScriptRowContextValue | null>(null);

/**
 * Holds one row's data so `ScriptRow`'s parts read it from context, the house
 * style for a repeated list item - see `TreeRow`, `SearchRow`, `ChangeRow`.
 */
export function ScriptRowProvider({
  value,
  children,
}: {
  value: ScriptRowContextValue;
  children: ReactNode;
}) {
  return <ScriptRowContext.Provider value={value}>{children}</ScriptRowContext.Provider>;
}

export function useScriptRow(): ScriptRowContextValue {
  const row = useContext(ScriptRowContext);
  if (!row) {
    throw new Error("ScriptRow parts must be rendered inside a ScriptRowProvider");
  }
  return row;
}
