import { useCallback, useMemo } from "react";

import { useSelection } from "@/features/workbench/context/SelectionContext";
import { useSessionContext } from "@/features/workbench/context/SessionContext";

import type { EntryActions, TreeRowModel } from "../types";
import { useEntryAftermath } from "./useEntryAftermath";
import { useEntryPrompt } from "./useEntryPrompt";
import { useFileTree } from "./useFileTree";

/**
 * Everything the tree pane needs, so the component stays presentational:
 * the root from the session, the lazy-loaded rows, and what a row activation
 * means (expand a folder, or hand a file to the viewer).
 *
 * It also assembles what the right-click menus can do - `actions` - and the
 * dialog those menus open - `prompt`. The recycle bin is offered on a local
 * session only; over SSH the menu leaves it out.
 */
export function useFileTreePane() {
  const { connection } = useSessionContext();
  const { selected, select } = useSelection();
  const root = connection?.root ?? null;
  const { rows, rootStatus, rootError, toggle, setExpanded, reload, expandPath, collapseAll } =
    useFileTree(root);

  const onActivate = useCallback(
    (row: TreeRowModel) => {
      if (row.entry.kind === "directory") {
        toggle(row);
        return;
      }
      select(row.entry);
    },
    [toggle, select],
  );

  const onExpandKey = useCallback(
    (row: TreeRowModel, expand: boolean) => setExpanded(row, expand),
    [setExpanded],
  );

  const aftermath = useEntryAftermath({ root, reload, expandPath });
  const { state: prompt, askCreate, askRename, askDelete } = useEntryPrompt(aftermath);

  const actions = useMemo<EntryActions>(
    () => ({
      root,
      canTrash: connection?.kind === "local",
      open: select,
      toggle,
      collapseAll,
      reload,
      askCreate,
      askRename,
      askDelete,
    }),
    [root, connection, select, toggle, collapseAll, reload, askCreate, askRename, askDelete],
  );

  return {
    root,
    rows,
    rootStatus,
    rootError,
    selectedPath: selected?.path ?? null,
    onActivate,
    onExpandKey,
    actions,
    prompt,
  };
}
