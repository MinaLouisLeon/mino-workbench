/**
 * Menu labels more than one feature uses. A feature's own entries keep their
 * labels in that feature's `messages`; these are the shared verbs, written
 * once so "Copy Path" in the tree and in the editor cannot drift apart.
 */
export const MENU_COPY = {
  menuLabel: "Actions",
  open: "Open",
  undo: "Undo",
  redo: "Redo",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  selectAll: "Select All",
  copyPath: "Copy Path",
  copyRelativePath: "Copy Relative Path",
  copyLink: "Copy Link",
  openOnGitHub: "Open on GitHub",
  readOnly: "This field is read-only",
  noSelection: "Nothing is selected",
} as const;

/** Display-only shortcut hints, in the platform's own spelling. */
const MAC = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
const MOD = MAC ? "⌘" : "Ctrl+";

export const SHORTCUTS = {
  undo: `${MOD}Z`,
  redo: MAC ? "⇧⌘Z" : "Ctrl+Y",
  cut: `${MOD}X`,
  copy: `${MOD}C`,
  paste: `${MOD}V`,
  selectAll: `${MOD}A`,
  save: `${MOD}S`,
} as const;
