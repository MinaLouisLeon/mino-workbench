import type { ReactNode } from "react";

import { useTreeBackgroundMenu } from "../hooks/useTreeMenus";

/**
 * The pane's body, filling it to the bottom so the space below the last row
 * has a right-click menu of its own: new entries at the root, collapse, and
 * refresh. A row's own menu answers first and stops there.
 */
export function TreeBackground({ children }: { children: ReactNode }) {
  const onContextMenu = useTreeBackgroundMenu();
  return (
    <div onContextMenu={onContextMenu} className="h-full">
      {children}
    </div>
  );
}
