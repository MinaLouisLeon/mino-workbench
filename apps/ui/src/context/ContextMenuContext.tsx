import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { ContextMenu } from "@/components/ui";
import type { ContextMenuRequest } from "@/components/ui";
import { useNativeMenuSuppression } from "@/hooks/useNativeMenuSuppression";

interface ContextMenuContextValue {
  open: (request: ContextMenuRequest) => void;
  close: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

/**
 * The one context menu in the window, and the reason the browser's own never
 * appears.
 *
 * Right-click is answered in two layers. A component that knows what it is -
 * a tree row, the terminal, the editor - handles `contextmenu` itself through
 * `useContextMenu` and opens a menu of its own entries. Anything that does
 * not reaches the document listener in `useNativeMenuSuppression`, which
 * always cancels the browser's menu and offers the generic one where there is
 * something generic to offer: a text field, or selected text.
 *
 * One menu at a time, held here: opening a second replaces the first.
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ContextMenuRequest | null>(null);
  // What had focus when the menu opened, so closing it gives focus back -
  // which, for a text field, is also what keeps its caret where it was.
  const returnTo = useRef<HTMLElement | null>(null);

  const open = useCallback((next: ContextMenuRequest) => {
    const active = document.activeElement;
    returnTo.current = active instanceof HTMLElement ? active : null;
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    setRequest(null);
    const target = returnTo.current;
    returnTo.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, []);

  useNativeMenuSuppression(open);

  const value = useMemo(() => ({ open, close }), [open, close]);
  return (
    <ContextMenuContext.Provider value={value}>
      {children}
      {request ? <ContextMenu request={request} onClose={close} /> : null}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenuContext(): ContextMenuContextValue {
  const menu = useContext(ContextMenuContext);
  if (!menu) {
    throw new Error("useContextMenuContext must be used inside a ContextMenuProvider");
  }
  return menu;
}
