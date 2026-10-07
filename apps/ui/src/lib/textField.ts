import { copyText, readText } from "./clipboard";

/**
 * Editing an `<input>` or `<textarea>` from a context menu.
 *
 * The menu takes focus when it opens, so by the time an entry is chosen the
 * field has lost both focus and - in some engines - its selection. The range
 * is therefore captured when the menu *opens* (`captureRange`) and every
 * operation here puts it back before acting.
 *
 * Edits go through `insertText` so they land on the field's own undo stack
 * and raise the `input` event a controlled React field listens for. Where
 * that command is unavailable the fallback edits the value directly and
 * raises the event itself.
 */
export type TextField = HTMLInputElement | HTMLTextAreaElement;

export interface TextRange {
  start: number;
  end: number;
}

/** Input types that hold free text and expose a selection. */
const TEXT_INPUT_TYPES = new Set(["text", "search", "url", "tel", "password", ""]);

export function isTextField(target: EventTarget | null): target is TextField {
  if (target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}

/** Read-only and disabled fields offer Copy and Select All, nothing else. */
export function isEditable(field: TextField): boolean {
  return !field.readOnly && !field.disabled;
}

/** A password is never put on the clipboard - by this menu or any browser's. */
export function isCopyable(field: TextField): boolean {
  return !(field instanceof HTMLInputElement && field.type === "password");
}

export function captureRange(field: TextField): TextRange {
  const start = field.selectionStart ?? field.value.length;
  return { start, end: field.selectionEnd ?? start };
}

export function hasSelection(range: TextRange): boolean {
  return range.end > range.start;
}

/** Replaces `range` with `text`, as typing would. */
export function replaceRange(field: TextField, range: TextRange, text: string): void {
  field.focus();
  field.setSelectionRange(range.start, range.end);
  const command = text === "" ? "delete" : "insertText";
  // `execCommand` is deprecated and still the only way to edit a field that
  // keeps the browser's undo history. jsdom has no implementation at all.
  const done =
    typeof document.execCommand === "function" &&
    document.execCommand(command, false, text);
  if (done) return;
  field.setRangeText(text, range.start, range.end, "end");
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

export async function copyRange(field: TextField, range: TextRange): Promise<void> {
  await copyText(field.value.slice(range.start, range.end));
}

export async function cutRange(field: TextField, range: TextRange): Promise<void> {
  if (await copyText(field.value.slice(range.start, range.end))) {
    replaceRange(field, range, "");
  }
}

export async function pasteInto(field: TextField, range: TextRange): Promise<void> {
  const text = await readText();
  if (text !== null) replaceRange(field, range, text);
}

export function selectAll(field: TextField): void {
  field.focus();
  field.select();
}
