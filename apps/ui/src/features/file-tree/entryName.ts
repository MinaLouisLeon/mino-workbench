import { FILE_TREE_COPY } from "./messages";

/** Mirrors `MAX_ENTRY_NAME_BYTES` in `mino_core::types`. */
const MAX_NAME_BYTES = 255;

/**
 * Why `name` cannot name a new or renamed entry, or `null` when it can.
 *
 * The same rules `mino_core::entries::check_name` applies, checked here first
 * so the dialog can say what is wrong while it is being typed. Rust checks
 * again regardless - this is the friendly half, not the guard - and Windows'
 * extra rules are left to Rust, which knows which machine it is on.
 */
export function entryNameProblem(name: string): string | null {
  if (name.trim() === "") return FILE_TREE_COPY.nameEmpty;
  if (name === "." || name === "..") return FILE_TREE_COPY.nameDots;
  if (/[\\/]/.test(name)) return FILE_TREE_COPY.nameSeparator;
  if (new TextEncoder().encode(name).length > MAX_NAME_BYTES) {
    return FILE_TREE_COPY.nameTooLong;
  }
  return null;
}

/**
 * The part of a name to select when renaming: everything before the last
 * dot, so typing replaces `notes` and keeps `.md`. A dot-file such as
 * `.gitignore` is all name, and is selected whole.
 */
export function stemLength(name: string): number {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? dot : name.length;
}
