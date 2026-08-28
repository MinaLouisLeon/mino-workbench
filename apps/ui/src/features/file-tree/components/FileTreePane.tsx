import { Pane, StatusMessage } from "@/components/ui";

import { useFileTreePane } from "../hooks/useFileTreePane";
import { TreeRows } from "./TreeRows";

/** Presentational: every decision it renders comes from useFileTreePane. */
export function FileTreePane() {
  const { root, rows, rootStatus, rootError, selectedPath, onActivate, onExpandKey } =
    useFileTreePane();

  return (
    <Pane title="Files">
      {!root ? (
        <StatusMessage
          title="No folder open"
          description="Open a folder to browse its contents."
        />
      ) : rootStatus === "error" ? (
        <StatusMessage
          title="Could not read this folder"
          description={rootError ?? undefined}
          tone="danger"
        />
      ) : rootStatus === "loading" && rows.length === 0 ? (
        <StatusMessage title="Loading…" description="Reading the folder." />
      ) : rows.length === 0 ? (
        <StatusMessage
          title="This folder is empty"
          description="Nothing to show here yet."
        />
      ) : (
        <TreeRows
          rows={rows}
          selectedPath={selectedPath}
          onActivate={onActivate}
          onExpandKey={onExpandKey}
        />
      )}
    </Pane>
  );
}
