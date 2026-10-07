import type { ContextMenuEntry } from "@/components/ui";
import { useSessionContext } from "@/features/workbench/context/SessionContext";
import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY, SHORTCUTS } from "@/lib/menuCopy";
import { relativeTo } from "@/lib/path";

import {
  canRedo,
  canUndo,
  copySelection,
  cutSelection,
  pasteText,
  redoEdit,
  selectEverything,
  selectedText,
  undoEdit,
} from "../editorCommands";
import { VIEWER_COPY } from "../messages";
import type { EditorMenuInput } from "../surfaceTypes";

/**
 * The editor's right-click menu: the editing verbs, Save, and the file's
 * path.
 *
 * Built at the moment of the click, from the view itself, so Undo and Copy
 * are enabled exactly when there is something to undo or copy. A read-only
 * file - one that never loaded as text - keeps Copy and Select All and loses
 * the rest.
 */
export function useEditorMenu({ editor, path, editable, dirty, onSave }: EditorMenuInput) {
  const { connection } = useSessionContext();

  return useContextMenu((): ContextMenuEntry[] => {
    const view = editor.view();
    if (!view) return [];
    const selected = selectedText(view) !== "";
    const root = connection?.root ?? "";

    return [
      action("undo", MENU_COPY.undo, () => undoEdit(view), {
        disabled: !editable || !canUndo(view),
        shortcut: SHORTCUTS.undo,
      }),
      action("redo", MENU_COPY.redo, () => redoEdit(view), {
        disabled: !editable || !canRedo(view),
        shortcut: SHORTCUTS.redo,
      }),
      separator(),
      action("cut", MENU_COPY.cut, () => void cutSelection(view), {
        disabled: !editable || !selected,
        shortcut: SHORTCUTS.cut,
      }),
      action("copy", MENU_COPY.copy, () => void copySelection(view), {
        disabled: !selected,
        shortcut: SHORTCUTS.copy,
      }),
      action("paste", MENU_COPY.paste, () => void pasteText(view), {
        disabled: !editable,
        shortcut: SHORTCUTS.paste,
      }),
      separator(),
      action("select-all", MENU_COPY.selectAll, () => selectEverything(view), {
        shortcut: SHORTCUTS.selectAll,
      }),
      separator(),
      action("save", VIEWER_COPY.save, onSave, {
        disabled: !dirty,
        shortcut: SHORTCUTS.save,
      }),
      ...(path
        ? [
            separator(),
            action("copy-path", MENU_COPY.copyPath, () => void copyText(path)),
            action("copy-relative", MENU_COPY.copyRelativePath, () =>
              void copyText(relativeTo(root, path)),
            ),
          ]
        : []),
    ];
  });
}
