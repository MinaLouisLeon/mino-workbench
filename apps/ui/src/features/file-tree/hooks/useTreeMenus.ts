import type { ContextMenuEntry } from "@/components/ui";
import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";
import { dirname, relativeTo } from "@/lib/path";

import { useEntryActions } from "../context/EntryActionsContext";
import { useTreeRow } from "../context/TreeRowContext";
import { FILE_TREE_COPY } from "../messages";
import type { EntryActions, TreeRowModel } from "../types";

/**
 * A row's menu: what can be done to the file or folder that was clicked.
 *
 * "New File" and "New Folder" make the entry *beside* a file and *inside* a
 * folder, which is where a reader who right-clicked either expects it. Every
 * entry that changes the filesystem only asks - see `useEntryPrompt`.
 */
export function useTreeRowMenu() {
  const { row } = useTreeRow();
  const actions = useEntryActions();
  return useContextMenu(() => rowEntries(row, actions));
}

/** The pane's own menu, below the last row: new entries at the root. */
export function useTreeBackgroundMenu() {
  const actions = useEntryActions();
  return useContextMenu(() => {
    const { root } = actions;
    if (!root) return [];
    return [
      ...createEntries(root, actions),
      separator(),
      action("collapse-all", FILE_TREE_COPY.collapseAll, actions.collapseAll),
      action("refresh", FILE_TREE_COPY.refresh, actions.reload),
    ];
  });
}

function rowEntries(row: TreeRowModel, actions: EntryActions): ContextMenuEntry[] {
  const { entry } = row;
  const isDirectory = entry.kind === "directory";
  const folder = isDirectory ? entry.path : dirname(entry.path);

  return [
    isDirectory
      ? action("toggle", row.expanded ? FILE_TREE_COPY.collapse : FILE_TREE_COPY.expand, () =>
          actions.toggle(row),
        )
      : action("open", MENU_COPY.open, () => actions.open(entry)),
    separator(),
    ...createEntries(folder, actions),
    action("rename", FILE_TREE_COPY.rename, () => actions.askRename(entry)),
    separator(),
    action("copy-path", MENU_COPY.copyPath, () => void copyText(entry.path)),
    action("copy-relative", MENU_COPY.copyRelativePath, () =>
      void copyText(relativeTo(actions.root ?? "", entry.path)),
    ),
    separator(),
    // Absent rather than disabled over SSH: a remote host has no recycle bin
    // this app can reach, and that is not going to change.
    ...(actions.canTrash
      ? [action("trash", FILE_TREE_COPY.moveToTrash, () => actions.askDelete(entry, "trash"))]
      : []),
    action(
      "delete",
      FILE_TREE_COPY.deletePermanently,
      () => actions.askDelete(entry, "permanent"),
      { danger: true },
    ),
  ];
}

function createEntries(folder: string, actions: EntryActions): ContextMenuEntry[] {
  return [
    action("new-file", FILE_TREE_COPY.newFile, () => actions.askCreate(folder, "file")),
    action("new-folder", FILE_TREE_COPY.newFolder, () => actions.askCreate(folder, "directory")),
  ];
}
