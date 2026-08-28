import { useCallback } from "react";

import { useSelection } from "@/features/workbench/context/SelectionContext";
import { useSessionContext } from "@/features/workbench/context/SessionContext";

import type { TreeRowModel } from "../types";
import { useFileTree } from "./useFileTree";

/**
 * Everything the tree pane needs, so the component stays presentational:
 * the root from the session, the lazy-loaded rows, and what a row activation
 * means (expand a folder, or hand a file to the viewer).
 */
export function useFileTreePane() {
  const { connection } = useSessionContext();
  const { selected, select } = useSelection();
  const root = connection?.root ?? null;
  const { rows, rootStatus, rootError, toggle, setExpanded } = useFileTree(root);

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

  return {
    root,
    rows,
    rootStatus,
    rootError,
    selectedPath: selected?.path ?? null,
    onActivate,
    onExpandKey,
  };
}
