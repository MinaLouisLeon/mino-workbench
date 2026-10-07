import type { ConflictResolution, GitBranch, GitConflict, GitStash } from "@/Types";
import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";

import { CONFLICT_COPY, SOURCE_CONTROL_MENU_COPY as COPY, STASH_COPY } from "../messages";

/**
 * Right-click menus for the panel's smaller rows: a branch, a stash entry, a
 * conflicted path. Each offers what the row's own buttons do, in the row's
 * own words, plus a copy of the thing's name. Nothing here acts without the
 * confirmation the row would have shown.
 */
export function useBranchRowMenu(
  branch: GitBranch,
  busy: boolean,
  onCheckout: (branch: GitBranch) => void,
) {
  return useContextMenu(() => [
    action("checkout", COPY.checkout, () => onCheckout(branch), {
      disabled: busy || branch.isHead,
      hint: branch.isHead ? COPY.current : undefined,
    }),
    separator(),
    action("copy-name", COPY.copyBranchName, () => void copyText(branch.name)),
  ]);
}

export function useStashRowMenu(
  entry: GitStash,
  busy: boolean,
  handlers: {
    onApply: (index: number, pop: boolean) => void;
    onDrop: (entry: GitStash) => void;
  },
) {
  return useContextMenu(() => [
    action("apply", STASH_COPY.apply, () => handlers.onApply(entry.index, false), {
      disabled: busy,
    }),
    action("pop", STASH_COPY.pop, () => handlers.onApply(entry.index, true), {
      disabled: busy,
    }),
    separator(),
    // `onDrop` asks; the row's confirmation is what deletes.
    action("drop", COPY.dropEntry, () => handlers.onDrop(entry), { disabled: busy, danger: true }),
  ]);
}

export function useConflictRowMenu(
  conflict: GitConflict,
  busy: boolean,
  handlers: {
    onResolve: (path: string, resolution: ConflictResolution) => void;
    onOpen: (conflict: GitConflict) => void;
  },
  deleted: boolean,
) {
  return useContextMenu(() => [
    action("open", CONFLICT_COPY.open, () => handlers.onOpen(conflict)),
    separator(),
    action("ours", CONFLICT_COPY.takeOurs, () => handlers.onResolve(conflict.path, "ours"), {
      disabled: busy,
    }),
    action("theirs", CONFLICT_COPY.takeTheirs, () => handlers.onResolve(conflict.path, "theirs"), {
      disabled: busy,
    }),
    ...(deleted
      ? []
      : [
          action("manual", CONFLICT_COPY.markResolved, () =>
            handlers.onResolve(conflict.path, "manual"), {
            disabled: busy,
            hint: CONFLICT_COPY.markResolvedHint,
          }),
        ]),
    separator(),
    action("copy-path", MENU_COPY.copyPath, () => void copyText(conflict.path)),
  ]);
}
