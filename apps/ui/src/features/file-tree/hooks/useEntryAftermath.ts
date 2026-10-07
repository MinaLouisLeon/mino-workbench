import { useCallback } from "react";

import type { DirEntry, EntryChange } from "@/Types";
import { useGitStatusContext } from "@/features/git/context/GitStatusContext";
import { useDrafts } from "@/features/viewer/context/DraftsContext";
import { useSelection } from "@/features/workbench/context/SelectionContext";
import { isWithin } from "@/lib/path";

interface AftermathInput {
  root: string | null;
  reload: () => void;
  expandPath: (path: string) => void;
}

/**
 * Everything that has to follow a change to the tree, once the transport has
 * said it happened.
 *
 * The tree re-reads, and git is asked again - a new file is untracked, a
 * renamed one is a delete and an add. Beyond that, the two things keyed by
 * path have to follow the entry:
 *
 * - **the selection.** The viewer follows a renamed file to its new name, and
 *   lets go of one that is gone rather than go on showing it;
 * - **drafts.** An unsaved edit moves with a rename, so it is there under the
 *   new name, and goes with a delete - the same rule a discard follows, for
 *   the same reason: a draft of a file that no longer exists is one Ctrl+S
 *   from writing it back.
 */
export function useEntryAftermath({ root, reload, expandPath }: AftermathInput) {
  const { selected, select } = useSelection();
  const drafts = useDrafts();
  const { refresh: refreshGit } = useGitStatusContext();

  return useCallback(
    (change: EntryChange, result: DirEntry | null) => {
      if (change.kind === "create" && result) {
        if (change.detail.parent !== root) expandPath(change.detail.parent);
        if (result.kind === "file") select(result);
      }
      if (change.kind === "rename" && result) {
        const from = change.detail.path;
        for (const path of drafts.paths()) {
          if (!isWithin(path, from)) continue;
          const draft = drafts.get(path);
          drafts.clear(path);
          if (draft) drafts.set(result.path + path.slice(from.length), draft);
        }
        if (selected && isWithin(selected.path, from)) {
          select(selected.path === from && result.kind === "file" ? result : null);
        }
      }
      if (change.kind === "delete") {
        const gone = change.detail.path;
        for (const path of drafts.paths()) if (isWithin(path, gone)) drafts.clear(path);
        if (selected && isWithin(selected.path, gone)) select(null);
      }
      reload();
      refreshGit();
    },
    [root, reload, expandPath, select, selected, drafts, refreshGit],
  );
}
