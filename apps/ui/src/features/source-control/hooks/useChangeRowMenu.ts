import { useViewerMode } from "@/features/viewer/context/ViewerModeContext";
import { useSessionContext } from "@/features/workbench/context/SessionContext";
import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";
import { relativeTo } from "@/lib/path";

import { useChangeRow } from "../context/ChangeRowContext";
import { isUntracked } from "../grouping";
import { SOURCE_CONTROL_MENU_COPY as COPY } from "../messages";

/**
 * A changed file's right-click menu: open it or its diff, the row's own
 * stage and discard, and its path.
 *
 * Every action is one the row already has - the menu is a second way to
 * reach them, not a second implementation. Discard in particular goes
 * through `onDiscard`, which only *asks*; the confirmation is unchanged. It
 * is absent on a staged row and on an untracked file, exactly where the
 * row's own button is.
 */
export function useChangeRowMenu() {
  const { row, busy, onOpen, onToggleStaged, onDiscard } = useChangeRow();
  const { setMode, clearCommit } = useViewerMode();
  const { connection } = useSessionContext();

  return useContextMenu(() => {
    const staged = row.group === "staged";
    const discardable = !staged && !isUntracked(row.entry);
    const path = row.entry.path;
    return [
      action("open", COPY.openFile, () => {
        onOpen(row);
        setMode("file");
      }),
      action("open-changes", COPY.openChanges, () => {
        onOpen(row);
        clearCommit();
        setMode("diff");
      }),
      separator(),
      action("stage", staged ? COPY.unstage : COPY.stage, () => onToggleStaged(row), {
        disabled: busy,
      }),
      ...(discardable
        ? [action("discard", COPY.discard, () => onDiscard(row), { disabled: busy, danger: true })]
        : []),
      separator(),
      action("copy-path", MENU_COPY.copyPath, () => void copyText(path)),
      action("copy-relative", MENU_COPY.copyRelativePath, () =>
        void copyText(relativeTo(connection?.root ?? "", path)),
      ),
    ];
  });
}
