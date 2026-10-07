import type { CodeMirrorHandle } from "./types";

/**
 * Prop and input shapes for the editor surface and its menu. Beside `types.ts`
 * rather than in it, which is at the file ceiling.
 */

/** What the menu needs to know about the edit in progress. */
export interface EditorEditing {
  /** False for a file that never loaded as text: Copy only, no edits. */
  editable: boolean;
  /** Enables Save. */
  dirty: boolean;
  onSave: () => void;
}

export interface EditorSurfaceProps {
  editor: CodeMirrorHandle;
  path: string | null;
  hidden: boolean;
  editing: EditorEditing;
}

export interface EditorMenuInput extends EditorEditing {
  editor: CodeMirrorHandle;
  path: string | null;
}
