import type { ProjectScript, ScriptRef } from "@/Types";

import { SCRIPTS_COPY, SOURCE_LABELS } from "./messages";

/**
 * The tool a script is run with, as its split and its group heading name it.
 *
 * npm is named by the manager that actually runs it - `pnpm`, `yarn` - since
 * that is what the reader will see in the terminal. Everything else is named
 * by its source.
 */
export function sourceLabel(script: ProjectScript): string {
  return script.source === "npm" ? script.runner : SOURCE_LABELS[script.source];
}

/** `pnpm: dev`, `make: build`, `script: scripts/release.sh`. */
export function scriptLabel(script: ProjectScript): string {
  return `${sourceLabel(script)}: ${script.name}`;
}

/** The folder's own name for itself, or "This folder" for an unnamed root. */
export function packageLabel(script: ProjectScript): string {
  return script.package || script.dir || SCRIPTS_COPY.rootPackage;
}

/**
 * One string per script, stable across scans: what the recent list stores
 * and what tells two scripts apart. The same three fields Rust looks a script
 * up by.
 */
export function scriptKey(script: ScriptRef): string {
  return [script.source, script.dir, script.name].join("\u0000");
}
