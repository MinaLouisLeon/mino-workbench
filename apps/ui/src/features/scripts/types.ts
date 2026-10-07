import type { KeyboardEvent, RefObject } from "react";

import type { ProjectScript, ScriptCatalog } from "@/Types";

/** One row of the menu, and where it sits in the list the keyboard walks. */
export interface ScriptOption {
  script: ProjectScript;
  index: number;
  /** DOM id, for the filter field's `aria-activedescendant`. */
  id: string;
}

/** A heading and its rows: "Recent", or one package's scripts from one source. */
export interface ScriptSection {
  key: string;
  heading: string;
  items: ScriptOption[];
}

export interface ProjectScriptsState {
  catalog: ScriptCatalog | null;
  loading: boolean;
  /** Friendly copy for a scan that failed; the last good list is kept. */
  error: string | null;
}

/** Everything the menu renders, from `useScriptMenu`. */
export interface ScriptMenuState extends ProjectScriptsState {
  /** False until the folder is known to define at least one script. */
  available: boolean;
  open: boolean;
  toggle: () => void;
  close: () => void;
  query: string;
  setQuery: (query: string) => void;
  sections: ScriptSection[];
  /** How many rows are showing, across every section. */
  count: number;
  active: number;
  setActive: (index: number) => void;
  activeId: string | undefined;
  /** False when the terminal pane is full; rows are shown but cannot run. */
  canRun: boolean;
  run: (script: ProjectScript) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  button: RefObject<HTMLButtonElement | null>;
  container: RefObject<HTMLDivElement | null>;
}

/** One row's data, shared with its parts through `ScriptRowContext`. */
export interface ScriptRowContextValue {
  option: ScriptOption;
  active: boolean;
  disabled: boolean;
  onRun: () => void;
  onHover: () => void;
}
