import { useEffect, useRef } from "react";

/**
 * Ctrl+Shift+R (Cmd+Shift+R on macOS) opens and closes the run-script menu.
 *
 * Listened for in the capture phase on the window, so it works with focus in
 * a terminal: xterm would otherwise take the keystroke and send it to the
 * shell. It is only claimed while the menu exists - a folder with no scripts
 * leaves the browser's own meaning of the chord alone.
 */
export function useMenuShortcut(enabled: boolean, onTrigger: () => void) {
  // Read through a ref, so a new callback each render does not re-subscribe.
  const trigger = useRef(onTrigger);
  trigger.current = onTrigger;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const chord = (event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey;
      if (!chord || event.key.toLowerCase() !== "r") return;
      event.preventDefault();
      event.stopPropagation();
      trigger.current();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}
