import type { ScriptSource } from "@/Types";

/**
 * User-facing copy for the run-script menu.
 *
 * Kept out of the components so the strings stay shallow and a future
 * translation pass has one file to reach for.
 */
export const SCRIPTS_COPY = {
  button: "Run a script",
  /** The shortcut is spelled for Windows and Linux; macOS takes Cmd as well. */
  buttonTitle: "Run a project script in a new terminal (Ctrl+Shift+R)",
  shortcutHint: "↑↓ to move · Enter to run · Esc to close",

  filterLabel: "Filter scripts",
  filterPlaceholder: "Filter scripts…",
  listLabel: "Project scripts",

  recentHeading: "Recent",
  rootPackage: "This folder",

  loading: "Looking for scripts…",
  empty: "This folder defines no scripts.",
  noMatch: (query: string) => `No script matches “${query}”.`,
  failed: "The scripts could not be read",

  skipped: (count: number) =>
    `${count} script${count === 1 ? " was" : "s were"} left out because ${
      count === 1 ? "its name holds" : "their names hold"
    } characters a shell could misread.`,
  truncated: "This workspace has more packages than one scan reads; some are not listed.",
} as const;

/** What each source is called in a group heading and a split's label. */
export const SOURCE_LABELS: Record<ScriptSource, string> = {
  npm: "npm",
  make: "make",
  just: "just",
  task: "task",
  cargo: "cargo",
  go: "go",
  python: "python",
  composer: "composer",
  deno: "deno",
  gradle: "gradle",
  maven: "maven",
  dotnet: ".NET",
  file: "script",
};
