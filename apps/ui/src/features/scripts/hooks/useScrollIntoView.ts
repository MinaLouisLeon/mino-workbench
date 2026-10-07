import { useEffect, useRef } from "react";

/**
 * Keeps the highlighted row in view as the arrow keys move it through a list
 * taller than its box.
 */
export function useScrollIntoView<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    // jsdom has no layout, and so no scrollIntoView.
    if (active) ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  return ref;
}
