import { useCallback, useEffect, useRef, useState } from "react";

import { useTransport } from "@/context/TransportContext";
import { useSessionContext } from "@/features/workbench/context/SessionContext";
import { describeFailure } from "@/lib/transportError";

import type { ProjectScriptsState } from "../types";

const IDLE: ProjectScriptsState = { catalog: null, loading: false, error: null };

/**
 * The folder's scripts, as Rust finds them.
 *
 * Read when a folder opens - so the header knows whether to show the menu at
 * all - and again whenever the menu opens and the window regains focus,
 * because a `package.json` edited in another program is the common case, and
 * a menu offering a script that has since been renamed is the failure it
 * would cause. Each read is a handful of small files; nothing is cached.
 *
 * Only the newest read may land. A slow scan from a folder that has since
 * been closed must not overwrite the list for the one now open.
 */
export function useProjectScripts() {
  const transport = useTransport();
  const { connection } = useSessionContext();
  const [state, setState] = useState<ProjectScriptsState>(IDLE);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    if (!connection) return;
    latest.current += 1;
    const ticket = latest.current;
    setState((current) => ({ ...current, loading: true }));
    try {
      const catalog = await transport.listProjectScripts();
      if (ticket === latest.current) setState({ catalog, loading: false, error: null });
    } catch (failure) {
      if (ticket !== latest.current) return;
      setState((current) => ({
        catalog: current.catalog,
        loading: false,
        error: describeFailure(failure),
      }));
    }
  }, [connection, transport]);

  useEffect(() => {
    setState(IDLE);
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      // Anything still in flight belongs to a folder that is no longer open.
      latest.current += 1;
    };
  }, [refresh]);

  return { ...state, refresh };
}
