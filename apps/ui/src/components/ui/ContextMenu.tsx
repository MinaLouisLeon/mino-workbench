import { useContextMenuSurface } from "@/hooks/useContextMenuSurface";
import { MENU_COPY } from "@/lib/menuCopy";

import { MenuItem, MenuItemProvider } from "./MenuItem";
import type { ContextMenuRequest } from "./types";

interface ContextMenuProps {
  request: ContextMenuRequest;
  onClose: () => void;
}

/**
 * The floating menu. Presentational: where it sits, where focus goes and what
 * dismisses it all come from `useContextMenuSurface`, and what is in it comes
 * from whichever feature opened it.
 *
 * Rendered once, by `ContextMenuProvider`, at the root of the window - so it
 * is never clipped by a pane's overflow and always sits above every pane.
 */
export function ContextMenu({ request, onClose }: ContextMenuProps) {
  const { ref, style, onKeyDown } = useContextMenuSurface(request.x, request.y, onClose);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={MENU_COPY.menuLabel}
      onKeyDown={onKeyDown}
      // A right-click on the menu itself means nothing; it must not reach the
      // document listener and open a second one.
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={style}
      className="fixed z-50 min-w-48 max-w-80 rounded border border-borderStrong bg-surfaceRaised py-1 text-sm shadow-lg"
    >
      {request.entries.map((entry) =>
        entry.kind === "separator" ? (
          <div key={entry.id} role="separator" className="my-1 border-t border-border" />
        ) : entry.kind === "heading" ? (
          <div
            key={entry.id}
            role="presentation"
            className="px-3 pb-0.5 pt-1 text-xs uppercase tracking-wide text-textFaint"
          >
            {entry.label}
          </div>
        ) : (
          <MenuItemProvider key={entry.id} value={{ entry, onClose }}>
            <MenuItem>
              <MenuItem.Label />
              <MenuItem.Shortcut />
            </MenuItem>
          </MenuItemProvider>
        ),
      )}
    </div>
  );
}
