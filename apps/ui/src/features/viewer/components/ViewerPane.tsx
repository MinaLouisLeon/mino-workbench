import { Notice, Pane, StatusMessage } from "@/components/ui";
import { basename } from "@/lib/path";

import { useCodeMirror } from "../hooks/useCodeMirror";
import { useFileEditor } from "../hooks/useFileEditor";
import { VIEWER_COPY } from "../messages";
import { EditorStatus } from "./EditorStatus";

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

  const container = useCodeMirror({
    content: draft,
    extension: payload?.extension ?? null,
    editable,
    revision,
    onChange,
    onSave: () => void save(),
  });

  return (
    <Pane
      title="Viewer"
      accessory={
        path ? (
          <EditorStatus
            name={basename(path)}
            dirty={dirty}
            saving={saving}
            justSaved={justSaved}
            onSave={() => void save()}
          />
        ) : undefined
      }
    >
      {status === "empty" ? (
        <StatusMessage title={VIEWER_COPY.emptyTitle} description={VIEWER_COPY.emptyBody} />
      ) : status === "loading" ? (
        <StatusMessage title={VIEWER_COPY.loadingTitle} description={VIEWER_COPY.loadingBody} />
      ) : status === "error" ? (
        <StatusMessage
          title={guarded ? VIEWER_COPY.guardedTitle : VIEWER_COPY.errorTitle}
          description={error ?? undefined}
          tone={guarded ? "warning" : "danger"}
        />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {saveError ? (
            <div className="shrink-0 p-2">
              <Notice variant="danger" title={VIEWER_COPY.saveErrorTitle}>
                {saveError}
              </Notice>
            </div>
          ) : null}
          <div
            ref={container}
            aria-label={path ? `Contents of ${basename(path)}` : "File contents"}
            className="min-h-0 flex-1"
          />
        </div>
      )}
    </Pane>
  );
}
