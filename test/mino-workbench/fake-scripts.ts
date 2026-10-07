import type { ProjectScript, ScriptCatalog } from "@/Types";

/** One script, with only what a test cares about spelled out. */
export function makeScript(overrides: Partial<ProjectScript> = {}): ProjectScript {
  return {
    source: "npm",
    dir: "",
    name: "dev",
    package: "acme",
    runner: "pnpm",
    command: "vite",
    ...overrides,
  };
}

/**
 * A small workspace: two root npm scripts, a Makefile target, and one script
 * in a member package - enough for three sections and a filter that matters.
 */
export const WORKSPACE_SCRIPTS: ProjectScript[] = [
  makeScript({ name: "dev", command: "vite" }),
  makeScript({ name: "build", command: "vite build" }),
  makeScript({
    source: "make",
    name: "release",
    package: "",
    runner: "make",
    command: "make release",
  }),
  makeScript({ dir: "packages/web", package: "web", name: "start", command: "next start" }),
];

export function makeCatalog(
  scripts: ProjectScript[] = WORKSPACE_SCRIPTS,
  extra: Partial<ScriptCatalog> = {},
): ScriptCatalog {
  return { scripts, skipped: 0, truncated: false, ...extra };
}
