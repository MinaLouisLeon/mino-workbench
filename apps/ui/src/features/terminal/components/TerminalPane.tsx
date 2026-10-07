import { Fragment } from "react";

import { Pane } from "@/components/ui";

import { useTerminalStackContext } from "../context/TerminalStackContext";
import { useTerminalSplitSizes } from "../hooks/useTerminalSplitSizes";
import { TERMINAL_COPY } from "../messages";
import { TerminalInstance } from "./TerminalInstance";
import { TerminalSplitHandle } from "./TerminalSplitHandle";

/**
 * The terminal pane: one or more shells, side by side.
 *
 * Presentational. Which terminals exist is `useTerminalStack`'s business -
 * shared through `TerminalStackContext`, because the header's run-script menu
 * opens splits too - how wide each one is belongs to `useTerminalSplitSizes`,
 * and what each one does is `TerminalInstance`'s. This only puts them in a row.
 */
export function TerminalPane() {
  const { terminals, add, close, canAdd, canClose } = useTerminalStackContext();
  const { row, sizes, startDrag, nudge } = useTerminalSplitSizes(terminals.length);
  // Wrapped: `add` takes an optional script, and a click event is not one.
  const split = () => {
    add();
  };

  return (
    <Pane
      title="Terminal"
      accessory={
        <button
          type="button"
          onClick={split}
          disabled={!canAdd}
          title={canAdd ? TERMINAL_COPY.splitHint : TERMINAL_COPY.splitFull}
          className="rounded border border-border px-1.5 py-0.5 text-xs text-textMuted hover:border-borderStrong hover:text-text focus:outline-none focus-visible:ring-1 focus-visible:ring-accentStrong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {TERMINAL_COPY.split}
        </button>
      }
    >
      <div ref={row} className="flex h-full min-h-0">
        {terminals.map(({ id, script }, index) => (
          <Fragment key={id}>
            {index > 0 ? (
              <TerminalSplitHandle
                index={index - 1}
                onStart={startDrag}
                onNudge={nudge}
              />
            ) : null}
            <div
              className="min-w-0 overflow-hidden"
              style={{ flexBasis: `${sizes[index] ?? 100 / terminals.length}%`, flexGrow: 0 }}
            >
              <TerminalInstance
                closable={canClose}
                onClose={() => close(id)}
                canSplit={canAdd}
                onSplit={split}
                script={script}
              />
            </div>
          </Fragment>
        ))}
      </div>
    </Pane>
  );
}
