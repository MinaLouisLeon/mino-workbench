import { ModalFrame, Notice } from "@/components/ui";

import { FILE_TREE_COPY } from "../messages";
import type { EntryPrompt, EntryPromptState } from "../types";

interface EntryDeleteConfirmProps {
  prompt: Extract<EntryPrompt, { kind: "delete" }>;
  state: EntryPromptState;
}

const BUTTON =
  "rounded border px-2 py-1 text-xs focus:outline-none focus-visible:ring-1 disabled:opacity-50";

/**
 * The confirmation in front of both deletes - to the Recycle Bin, and for
 * good. Built to the discard confirmation's rules, because a permanent delete
 * is the same kind of action:
 *
 * - it **names** what will go, and says when a folder's contents go with it;
 * - it says whether the delete can be undone, in words;
 * - it warns when unsaved editor drafts would go with it;
 * - the confirm button says what it will do, and **Cancel** is the
 *   auto-focused button, so Enter does the safe thing.
 *
 * The permanent delete is drawn in the danger tone; the recycle bin, which
 * can be undone from outside this app, is not.
 */
export function EntryDeleteConfirm({ prompt, state }: EntryDeleteConfirmProps) {
  const { target, mode, unsaved } = prompt;
  const folder = target.kind === "directory";
  const trash = mode === "trash";
  const body = trash
    ? (folder ? FILE_TREE_COPY.trashFolder : FILE_TREE_COPY.trashOne)(target.name)
    : (folder ? FILE_TREE_COPY.deleteFolder : FILE_TREE_COPY.deleteOne)(target.name);

  return (
    <ModalFrame
      title={trash ? FILE_TREE_COPY.trashTitle : FILE_TREE_COPY.deleteTitle}
      tone={trash ? "default" : "danger"}
      onCancel={state.cancel}
    >
      <p className="break-words text-sm text-textMuted">{body}</p>
      {unsaved > 0 ? (
        <Notice variant="warning">{FILE_TREE_COPY.unsavedLost(unsaved)}</Notice>
      ) : null}
      {state.error ? <Notice variant="danger">{state.error}</Notice> : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={state.cancel}
          className={`${BUTTON} border-borderStrong text-text hover:bg-surfaceHover focus-visible:ring-accentStrong`}
        >
          {FILE_TREE_COPY.cancel}
        </button>
        <button
          type="button"
          onClick={state.confirmDelete}
          disabled={state.busy}
          className={`${BUTTON} border-danger text-danger hover:bg-dangerMuted focus-visible:ring-danger`}
        >
          {state.busy
            ? FILE_TREE_COPY.working
            : trash
              ? FILE_TREE_COPY.confirmTrash(target.name)
              : FILE_TREE_COPY.confirmDelete(target.name)}
        </button>
      </div>
    </ModalFrame>
  );
}
