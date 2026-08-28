import type { FilePayload } from "@/Types";

export type ViewerStatus = "empty" | "loading" | "ready" | "error";

export interface ViewerState {
  status: ViewerStatus;
  payload: FilePayload | null;
  /** Already-friendly copy; guards (too large, binary) land here too. */
  error: string | null;
  /** True when the failure is a deliberate guard rather than a fault. */
  guarded: boolean;
}

/** One file's unsaved edit, remembered while the session lasts. */
export interface Draft {
  /** What the editor holds. */
  content: string;
  /** What was on disk when it was loaded, so "dirty" is a comparison. */
  baseline: string;
}

export interface EditorState {
  draft: string | null;
  /** Last known disk content. `null` until a file loads. */
  baseline: string | null;
  /** Modification time of `baseline`, sent back to guard against clobbering. */
  savedModifiedMs: number | null;
  saving: boolean;
  /** Already-friendly copy for a failed save. */
  saveError: string | null;
  /** Briefly true after a successful save, for the confirmation. */
  justSaved: boolean;
}

export interface CodeMirrorOptions {
  /** Initial document. Only read when `revision` changes. */
  content: string | null;
  extension: string | null;
  editable: boolean;
  /** Bumped once per file load, so typing does not rebuild the view. */
  revision: number;
  onChange: (doc: string) => void;
  onSave: () => void;
}

export interface EditorStatusProps {
  name: string;
  dirty: boolean;
  saving: boolean;
  justSaved: boolean;
  onSave: () => void;
}
