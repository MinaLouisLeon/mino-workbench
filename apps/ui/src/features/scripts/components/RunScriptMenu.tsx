import { ChevronDown, Play } from "lucide-react";

import { useScriptMenu } from "../hooks/useScriptMenu";
import { SCRIPTS_COPY } from "../messages";
import { ScriptMenuPanel } from "./ScriptMenuPanel";

/**
 * The header's run-script button and its dropdown.
 *
 * Takes no props, like `GitBranchStatus` beside it: everything comes from
 * `useScriptMenu`, which reads the session, the transport and the terminal
 * stack from context.
 *
 * Renders nothing in a folder that defines no scripts - a button that can
 * only ever open an empty list is noise in the one strip that is always on
 * screen.
 */
export function RunScriptMenu() {
  const menu = useScriptMenu();
  if (!menu.available) return null;

  return (
    <div ref={menu.container} className="relative shrink-0">
      <button
        ref={menu.button}
        type="button"
        onClick={menu.toggle}
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        aria-label={SCRIPTS_COPY.button}
        title={SCRIPTS_COPY.buttonTitle}
        className="flex items-center gap-0.5 rounded border border-border px-1.5 py-1 text-xs text-textMuted hover:border-borderStrong hover:text-text focus:outline-none focus-visible:ring-1 focus-visible:ring-accentStrong"
      >
        <Play size={12} strokeWidth={1.75} aria-hidden="true" className="text-accent" />
        <ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {menu.open ? <ScriptMenuPanel menu={menu} /> : null}
    </div>
  );
}
