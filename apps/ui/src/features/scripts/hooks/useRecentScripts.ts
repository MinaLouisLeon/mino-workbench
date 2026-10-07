import { useCallback } from "react";

import type { ProjectScript } from "@/Types";
import { usePersistentState } from "@/hooks/usePersistentState";

import { scriptKey } from "../labels";

const STORAGE_KEY = "mino.recentScripts.v1";
/** Scripts kept per folder. */
export const MAX_RECENT = 5;
/** Folders remembered at all; the least recently used is dropped first. */
const MAX_FOLDERS = 20;

/** Folder path to its recent script keys, most recent first. */
type RecentStore = Record<string, string[]>;

/**
 * The scripts last run in this folder, most recent first.
 *
 * Kept with the layout preferences in local storage, which is allowed for the
 * same reason they are: it is a preference about this app's own interface. It
 * holds a script's source, folder and name - the three things that identify
 * it - and never its command, its output or anything from its environment.
 */
export function useRecentScripts(root: string | null) {
  const [store, setStore] = usePersistentState<RecentStore>(STORAGE_KEY, {});
  const keys = root ? (store[root] ?? []) : [];

  const remember = useCallback(
    (script: ProjectScript) => {
      if (!root) return;
      const key = scriptKey(script);
      const { [root]: previous = [], ...others } = store;
      const next = [key, ...previous.filter((entry) => entry !== key)].slice(0, MAX_RECENT);
      // Re-inserted last, so the oldest folder is always the first key.
      const folders = Object.entries({ ...others, [root]: next }).slice(-MAX_FOLDERS);
      setStore(Object.fromEntries(folders));
    },
    [root, store, setStore],
  );

  return { keys, remember };
}
