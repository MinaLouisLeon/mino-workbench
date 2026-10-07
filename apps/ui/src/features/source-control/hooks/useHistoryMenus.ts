import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";

import { SOURCE_CONTROL_MENU_COPY as COPY } from "../messages";
import type { useHistory } from "./useHistory";

type History = ReturnType<typeof useHistory>;

/**
 * Right-click menus for the History list: one for a commit, one for a file
 * inside an open commit.
 *
 * One handler per kind of row rather than one per row, because the rows are
 * drawn in a loop. Each row carries what it is in a `data-` attribute, and
 * the handler looks it up in the list it already has - so the menu always
 * describes the list as it is now, not as it was when the row rendered.
 */
export function useHistoryMenus(history: History) {
  const onCommitMenu = useContextMenu((event) => {
    const commit = history.commits.find((c) => c.sha === event.currentTarget.dataset.sha);
    if (!commit) return [];
    const open = commit.sha === history.openSha;
    return [
      action("files", open ? COPY.hideFiles : COPY.showFiles, () =>
        history.openCommit(commit.sha),
      ),
      separator(),
      action("copy-sha", COPY.copySha, () => void copyText(commit.sha)),
      action("copy-short", COPY.copyShortSha, () => void copyText(commit.shortSha)),
      action("copy-subject", COPY.copySubject, () => void copyText(commit.summary)),
    ];
  });

  const onFileMenu = useContextMenu((event) => {
    const path = event.currentTarget.dataset.path;
    const file = history.files?.find((f) => f.relativePath === path);
    if (!file) return [];
    return [
      action("open-changes", COPY.openChanges, () => history.openFile(file)),
      separator(),
      action("copy-relative", MENU_COPY.copyRelativePath, () => void copyText(file.relativePath)),
    ];
  });

  return { onCommitMenu, onFileMenu };
}
