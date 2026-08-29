import { useCallback, useEffect, useRef, useState } from "react";

import type { SearchHit, SearchHits } from "@/Types";
import { useTransport } from "@/context/TransportContext";
import { useSelection } from "@/features/workbench/context/SelectionContext";
import { useSessionContext } from "@/features/workbench/context/SessionContext";
import { describeFailure } from "@/lib/transportError";

import type { FileSearchState, SearchStatus } from "../types";

/**
 * Long enough that typing a word costs one walk rather than one per letter,
 * short enough that the results feel like they are following you.
 */
const DEBOUNCE_MS = 180;

const EMPTY: SearchHits = { hits: [], truncated: false, scanned: 0 };

/**
 * The search pane's state: what was typed, what came back, and what a result
 * activation means.
 *
 * Two things it takes care of that a component should not have to. Typing is
 * debounced, so a word costs one walk rather than one per keystroke. And every
 * request carries a sequence number, so a slow early search that lands after a
 * fast later one is dropped instead of overwriting it - without that, deleting
 * a character can leave you looking at results for a query you no longer have.
 */
export function useFileSearch(): FileSearchState {
  const transport = useTransport();
  const { connection } = useSessionContext();
  const { select } = useSelection();
  const root = connection?.root ?? null;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [result, setResult] = useState<SearchHits>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  /** Sequence number of the most recent request; older answers are ignored. */
  const latest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!root || trimmed === "") {
      // Not an error and not a result: the pane shows its prompt instead.
      latest.current += 1;
      setStatus("idle");
      setResult(EMPTY);
      setError(null);
      return;
    }

    const ticket = (latest.current += 1);
    setStatus("searching");

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await transport.searchFiles({
            query: trimmed,
            limit: null,
            includeHidden: true,
            includeDirectories: false,
          });
          if (ticket !== latest.current) return;
          setResult(found);
          setError(null);
          setStatus("ready");
        } catch (failure) {
          if (ticket !== latest.current) return;
          setResult(EMPTY);
          setError(describeFailure(failure));
          setStatus("error");
        }
      })();
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, root, transport]);

  // Changing the working folder must not leave the previous folder's results
  // on screen, which would invite opening a file that is no longer in scope.
  useEffect(() => {
    latest.current += 1;
    setQuery("");
    setResult(EMPTY);
    setStatus("idle");
    setError(null);
  }, [root]);

  const onActivate = useCallback(
    (hit: SearchHit) => select(hit.entry),
    [select],
  );

  return {
    query,
    setQuery,
    status,
    hits: result.hits,
    truncated: result.truncated,
    scanned: result.scanned,
    error,
    onActivate,
  };
}
