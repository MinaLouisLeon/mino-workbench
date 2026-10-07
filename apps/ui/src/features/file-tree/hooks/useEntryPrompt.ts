import { useCallback, useState } from "react";

import type { DeleteMode, DirEntry, EntryChange, NewEntryKind } from "@/Types";
import { useTransport } from "@/context/TransportContext";
import { useDrafts } from "@/features/viewer/context/DraftsContext";
import { describeFailure } from "@/lib/transportError";
import { isWithin } from "@/lib/path";

import type { EntryPrompt, EntryPromptState } from "../types";

/**
 * The gate in front of every change the tree makes to the filesystem.
 *
 * Shaped like `useDiscardPrompt`, and for the same reason: asking and acting
 * are separate functions, and the transport is called from exactly one place
 * - a confirm. A menu entry can only *ask*.
 *
 * A failure keeps the dialog open with the transport's sentence in it, so a
 * name that is already taken can be corrected rather than retyped.
 */
export function useEntryPrompt(
  onChanged: (change: EntryChange, result: DirEntry | null) => void,
) {
  const transport = useTransport();
  const drafts = useDrafts();
  const [prompt, setPrompt] = useState<EntryPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback((next: EntryPrompt) => {
    setError(null);
    setPrompt(next);
  }, []);

  const askCreate = useCallback(
    (parent: string, entry: NewEntryKind) => ask({ kind: "create", parent, entry }),
    [ask],
  );
  const askRename = useCallback((target: DirEntry) => ask({ kind: "rename", target }), [ask]);
  const askDelete = useCallback(
    (target: DirEntry, mode: DeleteMode) => {
      const unsaved = drafts.unsavedPaths().filter((path) => isWithin(path, target.path));
      ask({ kind: "delete", target, mode, unsaved: unsaved.length });
    },
    [ask, drafts],
  );

  const cancel = useCallback(() => {
    if (busy) return;
    setPrompt(null);
    setError(null);
  }, [busy]);

  const run = useCallback(
    async (change: EntryChange) => {
      setBusy(true);
      setError(null);
      try {
        const result = await transport.changeEntry(change);
        setPrompt(null);
        onChanged(change, result);
      } catch (failure) {
        setError(describeFailure(failure));
      } finally {
        setBusy(false);
      }
    },
    [transport, onChanged],
  );

  const submitName = useCallback(
    (name: string) => {
      if (!prompt || busy) return;
      if (prompt.kind === "create") {
        void run({ kind: "create", detail: { parent: prompt.parent, name, entry: prompt.entry } });
      } else if (prompt.kind === "rename") {
        if (name === prompt.target.name) return setPrompt(null);
        void run({ kind: "rename", detail: { path: prompt.target.path, name } });
      }
    },
    [prompt, busy, run],
  );

  const confirmDelete = useCallback(() => {
    if (prompt?.kind !== "delete" || busy) return;
    void run({ kind: "delete", detail: { path: prompt.target.path, mode: prompt.mode } });
  }, [prompt, busy, run]);

  const state: EntryPromptState = { prompt, busy, error, cancel, submitName, confirmDelete };
  return { state, askCreate, askRename, askDelete };
}
