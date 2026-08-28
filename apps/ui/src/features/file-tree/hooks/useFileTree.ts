import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTransport } from "@/context/TransportContext";
import { describeFailure } from "@/lib/transportError";

import { flattenTree, withExpanded } from "../tree";
import type { DirectoryMap, FileTreeState, TreeRowModel } from "../types";

/**
 * The lazy-load state machine. One directory is fetched per expand, never a
 * recursive walk, and a failed level keeps its own error without taking the
 * rest of the tree down.
 */
export function useFileTree(root: string | null): FileTreeState {
  const transport = useTransport();
  const [directories, setDirectories] = useState<DirectoryMap>({});
  const [expanded, setExpandedPaths] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>());

  const load = useCallback(
    async (path: string) => {
      if (inFlight.current.has(path)) return;
      inFlight.current.add(path);
      setDirectories((current) => ({
        ...current,
        [path]: { status: "loading", error: null, entries: current[path]?.entries ?? null },
      }));
      try {
        const entries = await transport.listDir(path);
        setDirectories((current) => ({
          ...current,
          [path]: { status: "loaded", error: null, entries },
        }));
      } catch (error) {
        setDirectories((current) => ({
          ...current,
          [path]: { status: "error", error: describeFailure(error), entries: null },
        }));
      } finally {
        inFlight.current.delete(path);
      }
    },
    [transport],
  );

  useEffect(() => {
    setDirectories({});
    setExpandedPaths(new Set());
    inFlight.current.clear();
    if (root) void load(root);
  }, [root, load]);

  const setExpanded = useCallback(
    (row: TreeRowModel, expand: boolean) => {
      if (row.entry.kind !== "directory") return;
      setExpandedPaths((current) => withExpanded(current, row.entry.path, expand));
      // Re-fetch a level that previously failed so a transient error is
      // recoverable by collapsing and expanding again.
      if (expand && row.status !== "loaded") void load(row.entry.path);
    },
    [load],
  );

  const toggle = useCallback(
    (row: TreeRowModel) => setExpanded(row, !row.expanded),
    [setExpanded],
  );

  const rows = useMemo(
    () => flattenTree(root, directories, expanded),
    [root, directories, expanded],
  );

  const rootState = root ? directories[root] : undefined;
  return {
    rows,
    rootStatus: rootState?.status ?? "idle",
    rootError: rootState?.error ?? null,
    toggle,
    setExpanded,
  };
}
