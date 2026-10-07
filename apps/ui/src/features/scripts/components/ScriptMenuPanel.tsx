import { TERMINAL_COPY } from "@/features/terminal/messages";

import { SCRIPTS_COPY } from "../messages";
import type { ScriptMenuState } from "../types";
import { ScriptGroup } from "./ScriptGroup";

const LIST_ID = "run-script-list";

/**
 * The dropdown: a filter field, the sections, and a line on anything that was
 * left out.
 *
 * The field is a combobox and the list its listbox, so a screen reader hears
 * the highlighted script as the arrow keys move without focus ever leaving
 * the field.
 */
export function ScriptMenuPanel({ menu }: { menu: ScriptMenuState }) {
  const skipped = menu.catalog?.skipped ?? 0;
  const empty = menu.count === 0;

  return (
    <div className="absolute right-0 top-full z-30 mt-1 flex w-96 max-w-[90vw] flex-col rounded border border-borderStrong bg-surfaceRaised shadow-lg">
      <div className="border-b border-border p-1.5">
        <input
          autoFocus
          role="combobox"
          aria-label={SCRIPTS_COPY.filterLabel}
          aria-expanded
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={menu.activeId}
          value={menu.query}
          onChange={(event) => menu.setQuery(event.target.value)}
          onKeyDown={menu.onKeyDown}
          placeholder={SCRIPTS_COPY.filterPlaceholder}
          spellCheck={false}
          className="w-full rounded border border-border bg-surface px-1.5 py-1 text-xs text-text placeholder:text-textFaint focus:outline-none focus-visible:ring-1 focus-visible:ring-accentStrong"
        />
      </div>

      {menu.canRun ? null : (
        <p className="border-b border-border px-2 py-1.5 text-xs text-warning">
          {TERMINAL_COPY.splitFull}
        </p>
      )}
      {menu.error ? (
        <p className="border-b border-border px-2 py-1.5 text-xs text-danger">
          {SCRIPTS_COPY.failed}: {menu.error}
        </p>
      ) : null}

      <div
        id={LIST_ID}
        role="listbox"
        aria-label={SCRIPTS_COPY.listLabel}
        className="max-h-80 overflow-y-auto pb-1"
      >
        {menu.sections.map((section) => (
          <ScriptGroup key={section.key} section={section} menu={menu} />
        ))}
        {empty ? (
          <p className="px-2 py-1.5 text-xs text-textFaint">
            {menu.loading && !menu.catalog
              ? SCRIPTS_COPY.loading
              : menu.query
                ? SCRIPTS_COPY.noMatch(menu.query)
                : SCRIPTS_COPY.empty}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border px-2 py-1 text-xs text-textFaint">
        {skipped > 0 ? <p>{SCRIPTS_COPY.skipped(skipped)}</p> : null}
        {menu.catalog?.truncated ? <p>{SCRIPTS_COPY.truncated}</p> : null}
        <p aria-hidden="true">{SCRIPTS_COPY.shortcutHint}</p>
      </div>
    </div>
  );
}
