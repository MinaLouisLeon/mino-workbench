import { redo, redoDepth, selectAll, undo, undoDepth } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";

import { copyText, readText } from "@/lib/clipboard";

/**
 * What the editor's context menu does to the CodeMirror view.
 *
 * Every edit goes through a CodeMirror transaction rather than the DOM, so it
 * lands on the editor's own undo history and reaches `onChange` like typing
 * does - which is what keeps the draft and the dirty marker right.
 *
 * Each command focuses the view first: the menu had focus a moment ago, and
 * the reader expects to carry on typing where they were.
 */
export function selectedText(view: EditorView): string {
  const { from, to } = view.state.selection.main;
  return view.state.sliceDoc(from, to);
}

export function canUndo(view: EditorView): boolean {
  return undoDepth(view.state) > 0;
}

export function canRedo(view: EditorView): boolean {
  return redoDepth(view.state) > 0;
}

export function undoEdit(view: EditorView): void {
  view.focus();
  undo(view);
}

export function redoEdit(view: EditorView): void {
  view.focus();
  redo(view);
}

export async function copySelection(view: EditorView): Promise<void> {
  await copyText(selectedText(view));
  view.focus();
}

export async function cutSelection(view: EditorView): Promise<void> {
  if (!(await copyText(selectedText(view)))) return;
  view.focus();
  view.dispatch(view.state.replaceSelection(""), { userEvent: "delete.cut" });
}

export async function pasteText(view: EditorView): Promise<void> {
  const text = await readText();
  view.focus();
  if (text === null) return;
  view.dispatch(view.state.replaceSelection(text), {
    userEvent: "input.paste",
    scrollIntoView: true,
  });
}

export function selectEverything(view: EditorView): void {
  view.focus();
  selectAll(view);
}
