import { ScriptRowProvider } from "../context/ScriptRowContext";
import type { ScriptMenuState, ScriptSection } from "../types";
import { ScriptRow } from "./ScriptRow";

interface ScriptGroupProps {
  section: ScriptSection;
  menu: ScriptMenuState;
}

/** A heading - "Recent", or a package and its tool - and its rows. */
export function ScriptGroup({ section, menu }: ScriptGroupProps) {
  return (
    <div role="group" aria-label={section.heading}>
      <div
        role="presentation"
        className="truncate px-2 pt-1.5 text-xs font-medium uppercase tracking-wide text-textFaint"
      >
        {section.heading}
      </div>
      {section.items.map((option) => (
        <ScriptRowProvider
          key={option.id}
          value={{
            option,
            active: option.index === menu.active,
            disabled: !menu.canRun,
            onRun: () => menu.run(option.script),
            onHover: () => menu.setActive(option.index),
          }}
        >
          <ScriptRow>
            <ScriptRow.Name />
            <ScriptRow.Command />
          </ScriptRow>
        </ScriptRowProvider>
      ))}
    </div>
  );
}
