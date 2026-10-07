import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectScript } from "@/Types";
import { useTerminalStackContext } from "@/features/terminal/context/TerminalStackContext";
import { useSessionContext } from "@/features/workbench/context/SessionContext";

import { buildSections } from "../catalog";
import type { ScriptMenuState } from "../types";
import { useMenuShortcut } from "./useMenuShortcut";
import { useProjectScripts } from "./useProjectScripts";
import { useRecentScripts } from "./useRecentScripts";
import { useScriptMenuKeys } from "./useScriptMenuKeys";

/**
 * The run-script menu's state: what is listed, what is chosen, and what
 * choosing does.
 *
 * Choosing a script opens a split through the same terminal stack as the
 * Split button. The split itself asks Rust to run it, so there is exactly one
 * way a script reaches a shell, and the menu is not it.
 */
export function useScriptMenu(): ScriptMenuState {
  const { connection } = useSessionContext();
  const scripts = useProjectScripts();
  const recent = useRecentScripts(connection?.root ?? null);
  const stack = useTerminalStackContext();
  const button = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  // Where focus was when the menu opened - the button, or a terminal when
  // the shortcut opened it - so closing puts the reader back where they were.
  const returnTo = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [activeState, setActive] = useState(0);

  const sections = useMemo(
    () => buildSections(scripts.catalog?.scripts ?? [], recent.keys, query),
    [scripts.catalog, recent.keys, query],
  );
  const options = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  // Clamped rather than reset: a re-scan that shortens the list must not
  // leave the highlight past its end.
  const active = Math.min(activeState, Math.max(0, options.length - 1));
  const available = (scripts.catalog?.scripts.length ?? 0) > 0;

  const { refresh } = scripts;
  const show = useCallback(() => {
    const focused = document.activeElement;
    returnTo.current =
      focused instanceof HTMLElement && focused !== document.body ? focused : null;
    setQueryState("");
    setActive(0);
    setOpen(true);
    void refresh();
  }, [refresh]);

  const close = useCallback(() => {
    setOpen(false);
    const back = returnTo.current?.isConnected ? returnTo.current : button.current;
    back?.focus();
  }, []);

  const toggle = useCallback(() => (open ? close() : show()), [open, close, show]);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setActive(0);
  }, []);

  const { add, canAdd } = stack;
  const { remember } = recent;
  const run = useCallback(
    (script: ProjectScript) => {
      if (!add(script)) return;
      remember(script);
      setOpen(false);
    },
    [add, remember],
  );

  const onKeyDown = useScriptMenuKeys({ options, active, setActive, run, close });
  useMenuShortcut(available, toggle);

  // A press outside the menu closes it, as any popover does. Focus is left
  // where the press put it rather than pulled back to the button.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return {
    catalog: scripts.catalog,
    loading: scripts.loading,
    error: scripts.error,
    available,
    open: open && available,
    toggle,
    close,
    query,
    setQuery,
    sections,
    count: options.length,
    active,
    setActive,
    activeId: options[active]?.id,
    canRun: canAdd,
    run,
    onKeyDown,
    button,
    container,
  };
}
