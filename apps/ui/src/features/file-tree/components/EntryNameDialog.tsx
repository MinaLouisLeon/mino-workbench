import { ModalFrame, Notice } from "@/components/ui";
import { basename } from "@/lib/path";

import { useEntryNameField } from "../hooks/useEntryNameField";
import { FILE_TREE_COPY } from "../messages";
import type { EntryPrompt, EntryPromptState } from "../types";

interface EntryNameDialogProps {
  prompt: Extract<EntryPrompt, { kind: "create" | "rename" }>;
  state: EntryPromptState;
}

const BUTTON =
  "rounded border px-2 py-1 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-accentStrong disabled:opacity-50";

/**
 * Asks for a name: for a new file, a new folder, or a rename.
 *
 * It says *where* - the folder the entry will be made in - because "New File"
 * from a row's menu makes it beside that row, and the reader should not have
 * to work out which folder that was. Presentational: the box is
 * `useEntryNameField`'s and the call is `useEntryPrompt`'s.
 */
export function EntryNameDialog({ prompt, state }: EntryNameDialogProps) {
  const initial = prompt.kind === "rename" ? prompt.target.name : "";
  const field = useEntryNameField(initial, state.submitName);
  const folder = prompt.kind === "create" ? prompt.parent : null;
  const title =
    prompt.kind === "rename"
      ? FILE_TREE_COPY.renameTitle
      : prompt.entry === "directory"
        ? FILE_TREE_COPY.newFolderTitle
        : FILE_TREE_COPY.newFileTitle;

  return (
    <ModalFrame title={title} onCancel={state.cancel}>
      <form onSubmit={field.onSubmit} className="flex flex-col gap-2">
        {folder ? (
          <p className="truncate text-xs text-textFaint" title={folder}>
            {FILE_TREE_COPY.inFolder(basename(folder) || folder)}
          </p>
        ) : null}
        <label className="sr-only" htmlFor="entry-name">
          {FILE_TREE_COPY.nameLabel}
        </label>
        <input
          id="entry-name"
          ref={field.input}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={field.problem !== null}
          className="w-full rounded border border-border bg-surfaceSunken px-2 py-1 font-mono text-sm text-text focus:border-borderStrong focus:outline-none focus-visible:ring-1 focus-visible:ring-accentStrong"
        />
        {field.problem ? <p className="text-xs text-warning">{field.problem}</p> : null}
        {state.error ? <Notice variant="danger">{state.error}</Notice> : null}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={state.cancel}
            className={`${BUTTON} border-borderStrong text-text hover:bg-surfaceHover`}
          >
            {FILE_TREE_COPY.cancel}
          </button>
          <button
            type="submit"
            disabled={!field.ready || state.busy}
            className={`${BUTTON} border-accent bg-accentMuted text-accentStrong hover:border-accentStrong`}
          >
            {state.busy
              ? FILE_TREE_COPY.working
              : prompt.kind === "rename"
                ? FILE_TREE_COPY.confirmRename
                : FILE_TREE_COPY.create}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
