import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";

/** Keeps the menu this far inside the window edges. */
const EDGE_PX = 4;

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

/**
 * Everything the menu does besides drawing itself: where it sits, where focus
 * goes, and what closes it.
 *
 * - **Position.** It opens at the pointer and is then measured, and moved
 *   back inside the window if it would overflow - flipped up or left, as a
 *   native menu does, rather than clipped.
 * - **Focus.** The first enabled entry takes focus, so the arrow keys work at
 *   once; Up, Down, Home and End move between enabled entries, wrapping.
 * - **Dismissal.** Escape, Tab, a press anywhere outside, scrolling,
 *   resizing and the window losing focus all close it. A menu left floating
 *   over a list that has scrolled under it points at the wrong row.
 */
export function useContextMenuSurface(x: number, y: number, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: x, top: y, measured: false });

  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    const fitsRight = x + width + EDGE_PX <= window.innerWidth;
    const fitsBelow = y + height + EDGE_PX <= window.innerHeight;
    setPosition({
      left: Math.max(EDGE_PX, fitsRight ? x : Math.min(x - width, window.innerWidth - width - EDGE_PX)),
      top: Math.max(EDGE_PX, fitsBelow ? y : Math.min(y - height, window.innerHeight - height - EDGE_PX)),
      measured: true,
    });
    menu.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const dismiss = () => onClose();
    document.addEventListener("pointerdown", onPointerDown, true);
    // Capture, so a scroll inside any pane closes it, not only the page's.
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
    };
  }, [onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose();
      return;
    }
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = nextIndex(event.key, current, items.length);
    if (next === null) return;
    event.preventDefault();
    items[next].focus();
  };

  const style: CSSProperties = {
    left: position.left,
    top: position.top,
    // Hidden for the one frame before it is measured, so it never flashes at
    // a position it is about to leave.
    visibility: position.measured ? "visible" : "hidden",
  };

  return { ref, style, onKeyDown };
}

function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
