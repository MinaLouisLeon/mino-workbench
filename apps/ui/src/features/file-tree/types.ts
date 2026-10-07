import type { DeleteMode, DirEntry, NewEntryKind } from "@/Types";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

/** One directory's listing state. Directories are loaded on expand, never up front. */
export interface DirectoryState {
  status: LoadStatus;
  error: string | null;
  entries: DirEntry[] | null;
}

export type DirectoryMap = Record<string, DirectoryState>;

/** A single visible row, already flattened and depth-tagged. */
export interface TreeRowModel {
  entry: DirEntry;
  depth: number;
  expanded: boolean;
  status: LoadStatus;
  error: string | null;
}

export interface TreeRowContextValue {
  row: TreeRowModel;
  selected: boolean;
  onActivate: (row: TreeRowModel) => void;
  onExpandKey: (row: TreeRowModel, expand: boolean) => void;
}

export interface FileTreeState {
  rows: TreeRowModel[];
  rootStatus: LoadStatus;
  rootError: string | null;
  toggle: (row: TreeRowModel) => void;
  setExpanded: (row: TreeRowModel, expand: boolean) => void;
  /** Re-reads every loaded folder. Expansion is left as it is. */
  reload: () => void;
  expandPath: (path: string) => void;
  collapseAll: () => void;
}

/**
 * The question the tree is asking, if any. Asking and acting are separate
 * steps - the transport is only called from the dialog's confirm - so a
 * create, a rename or a delete always passes through one of these first.
 */
export type EntryPrompt =
  | { kind: "create"; parent: string; entry: NewEntryKind }
  | { kind: "rename"; target: DirEntry }
  /** `unsaved` counts the editor drafts the delete would strand. */
  | { kind: "delete"; target: DirEntry; mode: DeleteMode; unsaved: number };

/** What the tree's menus can do, provided once to every row. */
export interface EntryActions {
  /** Where "copy relative path" is relative to. */
  root: string | null;
  /** The recycle bin is offered on the local transport only. */
  canTrash: boolean;
  open: (entry: DirEntry) => void;
  toggle: (row: TreeRowModel) => void;
  collapseAll: () => void;
  reload: () => void;
  askCreate: (parent: string, entry: NewEntryKind) => void;
  askRename: (target: DirEntry) => void;
  askDelete: (target: DirEntry, mode: DeleteMode) => void;
}

/** The open dialog and what it can do. Read by `EntryPromptDialog`. */
export interface EntryPromptState {
  prompt: EntryPrompt | null;
  busy: boolean;
  /** The transport's answer to a failed attempt; the dialog stays open. */
  error: string | null;
  cancel: () => void;
  submitName: (name: string) => void;
  confirmDelete: () => void;
}
