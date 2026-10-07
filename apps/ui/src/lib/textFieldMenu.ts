import type { ContextMenuEntry } from "@/components/ui";

import { action, separator } from "./menu";
import { MENU_COPY, SHORTCUTS } from "./menuCopy";
import type { TextField, TextRange } from "./textField";
import {
  copyRange,
  cutRange,
  hasSelection,
  isCopyable,
  isEditable,
  pasteInto,
  selectAll,
} from "./textField";

/**
 * Cut, Copy, Paste and Select All for any `<input>` or `<textarea>`.
 *
 * The menu every text field gets without asking, from
 * `useNativeMenuSuppression`. A field with more to offer - the commit message
 * - puts its own entries after these rather than building its own copy.
 */
export function textFieldEntries(field: TextField, range: TextRange): ContextMenuEntry[] {
  const editable = isEditable(field);
  const selected = hasSelection(range);
  const copyable = isCopyable(field);
  const reason = !editable ? MENU_COPY.readOnly : !selected ? MENU_COPY.noSelection : undefined;

  return [
    action("cut", MENU_COPY.cut, () => void cutRange(field, range), {
      disabled: !editable || !selected || !copyable,
      shortcut: SHORTCUTS.cut,
      hint: reason,
    }),
    action("copy", MENU_COPY.copy, () => void copyRange(field, range), {
      disabled: !selected || !copyable,
      shortcut: SHORTCUTS.copy,
      hint: selected ? undefined : MENU_COPY.noSelection,
    }),
    action("paste", MENU_COPY.paste, () => void pasteInto(field, range), {
      disabled: !editable,
      shortcut: SHORTCUTS.paste,
      hint: editable ? undefined : MENU_COPY.readOnly,
    }),
    separator(),
    action("select-all", MENU_COPY.selectAll, () => selectAll(field), {
      disabled: field.value === "",
      shortcut: SHORTCUTS.selectAll,
    }),
  ];
}
