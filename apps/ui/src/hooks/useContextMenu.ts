import { useCallback, useRef } from "react";
import type { MouseEvent } from "react";

import type { ContextMenuEntry } from "@/components/ui";
import { useContextMenuContext } from "@/context/ContextMenuContext";
import { hasActions, tidyEntries } from "@/lib/menu";

/**
 * Gives an element a context menu of its own.
 *
 * `build` runs at the moment of the right-click, not on every render, so a
 * menu can read state that is only known then - what is selected in the
 * terminal, where the caret is in a field. It returns the entries, or an
 * empty array to claim the click and show nothing.
 *
 * Either way the browser's menu is cancelled and the event goes no further:
 * the innermost element with a menu is the one that answers, so a tree row's
 * menu is not replaced by the pane's around it.
 *
 * Returns the `onContextMenu` handler to put on the element.
 */
export function useContextMenu(
  build: (event: MouseEvent<HTMLElement>) => ContextMenuEntry[],
) {
  const { open } = useContextMenuContext();
  // Read through a ref so the handler is stable while `build` is a fresh
  // closure each render.
  const latest = useRef(build);
  latest.current = build;

  return useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const entries = tidyEntries(latest.current(event));
      if (!hasActions(entries)) return;
      open({ ...menuPoint(event), entries });
    },
    [open],
  );
}

/**
 * Where to open. A menu opened from the keyboard - the Menu key, or
 * Shift+F10 - arrives with no pointer position, so it opens at the element
 * instead, the way a native menu would.
 */
function menuPoint(event: MouseEvent<HTMLElement>): { x: number; y: number } {
  if (event.clientX !== 0 || event.clientY !== 0) {
    return { x: event.clientX, y: event.clientY };
  }
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: rect.left + 8, y: rect.bottom };
}
