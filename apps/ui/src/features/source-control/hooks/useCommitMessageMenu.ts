import { useContextMenu } from "@/hooks/useContextMenu";
import { action, heading, separator } from "@/lib/menu";
import { captureRange, isEditable, isTextField, replaceRange } from "@/lib/textField";
import { textFieldEntries } from "@/lib/textFieldMenu";

import { COMMIT_TYPES, withCommitType } from "../commitTypes";
import { SOURCE_CONTROL_MENU_COPY } from "../messages";

/**
 * The commit message box's right-click menu: the text field's own Cut, Copy,
 * Paste and Select All, then the conventional-commit types.
 *
 * A type is written through the field rather than through `setMessage`, so
 * it lands on the box's undo history - Ctrl+Z takes back a type picked by
 * mistake - and the caret ends up just after it, ready for the subject.
 */
export function useCommitMessageMenu() {
  return useContextMenu((event) => {
    const field = event.currentTarget;
    if (!isTextField(field)) return [];
    const range = captureRange(field);
    return [
      ...textFieldEntries(field, range),
      separator(),
      heading("commit-type", SOURCE_CONTROL_MENU_COPY.commitType),
      ...COMMIT_TYPES.map(({ type, label }) =>
        action(`type-${type}`, label, () => {
          const { replace, insert } = withCommitType(field.value, type);
          replaceRange(field, { start: 0, end: replace }, insert);
        }, { disabled: !isEditable(field) }),
      ),
    ];
  });
}
