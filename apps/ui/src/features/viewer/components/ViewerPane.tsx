import { Notice, Pane, StatusMessage } from "@/components/ui";
import { basename } from "@/lib/path";

import { useViewerMode } from "../context/ViewerModeContext";
import { useBlame } from "../hooks/useBlame";
import { useCodeMirror } from "../hooks/useCodeMirror";
import { useFileDiff } from "../hooks/useFileDiff";
import { useFileEditor } from "../hooks/useFileEditor";
import { VIEWER_COPY } from "../messages";
import { DiffView } from "./DiffView";
import { EditorStatus } from "./EditorStatus";
import { ViewerModeToggle } from "./ViewerModeToggle";

/** Presentational: state, guards and the editor instance all come from hooks. */
export function ViewerPane() {
  const {
    status,
    payload,
    error,
    guarded,
    path,
    revision,
    draft,
    dirty,
    editable,
    saving,
    saveError,
    justSaved,
    onChange,
    save,
  } = useFileEditor();

  const { mode, blame } = useViewerMode();
  const showingDiff = mode === "diff";
  const showEditor = !showingDiff && status === "ready";

  // Not gated on the file being readable. A commit's diff is worth showing for
  // a file that was deleted afterwards, or one too large for the editor: in
  // both cases there is no content to read and a real change to look at.
  const diff = useFileDiff(showingDiff);
  const blameState = useBlame(blame && showEditor);

  const container = useCodeMirror({
    content: draft,
    extension: payload?.extension ?? null,
    editable,
    revision,
    onChange,
    onSave: () => void save(),
    visible: showEditor,
    blame: blame ? blameState.byLine : null,
  });

  return (
    <Pane
      title="Viewer"
      accessory={
        path ? (
          <span className="flex items-center gap-2">
            <ViewerModeToggle blameLoading={blameState.loading} />
            <EditorStatus
              name={basename(path)}
              dirty={dirty}
              saving={saving}
              justSaved={justSaved}
              onSave={() => void save()}
            />
          </span>
        ) : undefined
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {showEditor && saveError ? (
          <div className="shrink-0 p-2">
            <Notice variant="danger" title={VIEWER_COPY.saveErrorTitle}>
              {saveError}
            </Notice>
          </div>
        ) : null}
        {showEditor && blameState.error ? (
          <div className="shrink-0 p-2">
            <Notice variant="warning">{blameState.error}</Notice>
          </div>
        ) : null}

        {/* Always rendered, and always in this position. The editor is
            **hidden, not unmounted**, whenever anything else is showing:
            rebuilding it would restore the document from `draft` - correct,
            but it loses the cursor - and the point of a mode toggle is that it
            costs nothing to look at the diff. Moving this element between
            branches would remount it and break exactly that, which is why the
            conditionals below sit beside it rather than around it.
            `useCodeMirror` is told when it comes back, because a CodeMirror
            laid out at zero height measures itself wrong. */}
        <div
          ref={container}
          hidden={!showEditor}
          aria-label={path ? `Contents of ${basename(path)}` : "File contents"}
          className="min-h-0 flex-1"
        />

        {showEditor ? null : showingDiff && path ? (
          <div className="min-h-0 flex-1">
            <DiffView diff={diff} />
          </div>
        ) : status === "empty" ? (
          <StatusMessage
            title={VIEWER_COPY.emptyTitle}
            description={VIEWER_COPY.emptyBody}
          />
        ) : status === "loading" ? (
          <StatusMessage
            title={VIEWER_COPY.loadingTitle}
            description={VIEWER_COPY.loadingBody}
          />
        ) : (
          <StatusMessage
            title={guarded ? VIEWER_COPY.guardedTitle : VIEWER_COPY.errorTitle}
            description={error ?? undefined}
            tone={guarded ? "warning" : "danger"}
          />
        )}
      </div>
    </Pane>
  );
}
