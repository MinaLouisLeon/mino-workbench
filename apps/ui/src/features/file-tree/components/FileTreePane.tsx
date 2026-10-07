import { Pane, StatusMessage } from "@/components/ui";

import { EntryActionsProvider } from "../context/EntryActionsContext";
import { useFileTreePane } from "../hooks/useFileTreePane";
import { EntryPromptDialog } from "./EntryPromptDialog";
import { TreeBackground } from "./TreeBackground";
import { TreeRows } from "./TreeRows";

/**
 * Presentational: every decision it renders comes from useFileTreePane.
 *
 * The rows and the space below them each have a right-click menu - a row's
 * for that entry, the background's for the root - and both read what they can
 * do from `EntryActionsProvider`. The dialog they open is drawn here.
 */
export function FileTreePane() {
  const {
    root,
    rows,
    rootStatus,
    rootError,
    selectedPath,
    onActivate,
    onExpandKey,
    actions,
    prompt,
  } = useFileTreePane();

  return (
    <Pane title="Files">
      <EntryActionsProvider value={actions}>
        <TreeBackground>
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
        </TreeBackground>
        <EntryPromptDialog state={prompt} />
      </EntryActionsProvider>
    </Pane>
  );
}
