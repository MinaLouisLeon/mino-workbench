import type { ReactNode } from "react";

import { useScriptRow } from "../context/ScriptRowContext";
import { useScrollIntoView } from "../hooks/useScrollIntoView";
import { sourceLabel } from "../labels";

/**
 * One script in the menu. Everything it renders comes from
 * `ScriptRowProvider`, so the parts can be reordered without threading props.
 *
 * An `option`, not a button: focus stays in the filter field and this row is
 * pointed at by `aria-activedescendant`. `mousedown`'s default is prevented
 * so clicking a row never moves focus out of the field first; the click
 * itself still arrives.
 */
function ScriptRowRoot({ children }: { children: ReactNode }) {
  const { option, active, disabled, onRun, onHover } = useScriptRow();
  const row = useScrollIntoView<HTMLDivElement>(active);

  return (
    <div
      ref={row}
      id={option.id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!disabled) onRun();
      }}
      onPointerMove={onHover}
      className={`flex cursor-pointer flex-col gap-0.5 px-2 py-1 ${
        active ? "bg-accentMuted" : ""
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

/** The script's name, with the tool that runs it beside it. */
function ScriptRowName() {
  const { option } = useScriptRow();
  return (
    <span className="flex min-w-0 items-baseline gap-2 text-xs">
      <span className="min-w-0 truncate text-text">{option.script.name}</span>
      <span className="ml-auto shrink-0 text-textFaint">{sourceLabel(option.script)}</span>
    </span>
  );
}

/**
 * What it runs, quiet and on one line. Written by whoever wrote the manifest,
 * so it is text, never markup - React escapes it like a filename.
 */
function ScriptRowCommand() {
  const { option } = useScriptRow();
  if (!option.script.command) return null;
  return (
    <span
      className="truncate font-mono text-xs text-textFaint"
      title={option.script.command}
    >
      {option.script.command}
    </span>
  );
}

export const ScriptRow = Object.assign(ScriptRowRoot, {
  Name: ScriptRowName,
  Command: ScriptRowCommand,
});
