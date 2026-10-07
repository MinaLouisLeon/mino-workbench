import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { ContextMenuAction } from "./types";

interface MenuItemContextValue {
  entry: ContextMenuAction;
  onClose: () => void;
}

const MenuItemContext = createContext<MenuItemContextValue | null>(null);

/** One entry's data, read by its parts - the house style for list items. */
export function MenuItemProvider({
  value,
  children,
}: {
  value: MenuItemContextValue;
  children: ReactNode;
}) {
  return <MenuItemContext.Provider value={value}>{children}</MenuItemContext.Provider>;
}

function useMenuItem(): MenuItemContextValue {
  const item = useContext(MenuItemContext);
  if (!item) throw new Error("MenuItem parts must be rendered inside a MenuItemProvider");
  return item;
}

/**
 * The entry: a real button, so Enter and Space choose it.
 *
 * The menu closes *before* the action runs. Closing gives focus back to what
 * was right-clicked, and several actions - Paste into a field, Select All in
 * the editor - need that focus to act on.
 */
function MenuItemRoot({ children }: { children: ReactNode }) {
  const { entry, onClose } = useMenuItem();
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={entry.disabled}
      title={entry.hint}
      onClick={() => {
        onClose();
        entry.onSelect();
      }}
      className={`flex w-full items-center justify-between gap-6 px-3 py-1 text-left focus:outline-none disabled:cursor-default disabled:text-textFaint ${
        entry.danger
          ? "text-danger hover:bg-dangerMuted focus:bg-dangerMuted"
          : "text-text hover:bg-surfaceHover focus:bg-surfaceHover"
      }`}
    >
      {children}
    </button>
  );
}

function MenuItemLabel() {
  const { entry } = useMenuItem();
  return <span className="truncate">{entry.label}</span>;
}

function MenuItemShortcut() {
  const { entry } = useMenuItem();
  if (!entry.shortcut) return null;
  return <span className="shrink-0 text-xs text-textFaint">{entry.shortcut}</span>;
}

export const MenuItem = Object.assign(MenuItemRoot, {
  Label: MenuItemLabel,
  Shortcut: MenuItemShortcut,
});
