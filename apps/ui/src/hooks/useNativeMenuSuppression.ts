import { useEffect } from "react";

import type { ContextMenuEntry, ContextMenuRequest } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import { action, hasActions, tidyEntries } from "@/lib/menu";
import { MENU_COPY, SHORTCUTS } from "@/lib/menuCopy";
import { captureRange, isTextField } from "@/lib/textField";
import { textFieldEntries } from "@/lib/textFieldMenu";

/**
 * The browser's context menu never opens in this window - not in production
 * and not in a dev build. It offers Reload, Back and Inspect, none of which
 * mean anything inside a desktop app, and Reload in particular throws away
 * every unsaved draft. Developer tools are still a keypress away (F12, or
 * Ctrl+Shift+I) in a debug build.
 *
 * This listener sits on the document, *behind* every component's own
 * handler: a component that opened a menu has already cancelled the event,
 * and this one only acts on what nobody claimed. For that remainder it offers
 * the menu that fits anywhere - a text field's, or Copy for selected text -
 * and otherwise cancels the event and shows nothing.
 */
export function useNativeMenuSuppression(open: (request: ContextMenuRequest) => void) {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const entries = tidyEntries(fallbackEntries(event.target));
      if (hasActions(entries)) open({ x: event.clientX, y: event.clientY, entries });
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, [open]);
}

function fallbackEntries(target: EventTarget | null): ContextMenuEntry[] {
  if (isTextField(target)) return textFieldEntries(target, captureRange(target));
  const selected = window.getSelection()?.toString() ?? "";
  if (selected === "") return [];
  return [
    action("copy", MENU_COPY.copy, () => void copyText(selected), {
      shortcut: SHORTCUTS.copy,
    }),
  ];
}
