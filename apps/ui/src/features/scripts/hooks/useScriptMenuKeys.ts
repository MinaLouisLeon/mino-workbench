import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import type { ProjectScript } from "@/Types";

import type { ScriptOption } from "../types";

interface MenuKeys {
  options: ScriptOption[];
  active: number;
  setActive: (index: number) => void;
  run: (script: ProjectScript) => void;
  close: () => void;
}

/**
 * The filter field's keys. Focus stays in the field the whole time - the
 * active row is `aria-activedescendant`, as in a combobox - so typing and
 * moving never fight over focus.
 */
export function useScriptMenuKeys({ options, active, setActive, run, close }: MenuKeys) {
  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const last = options.length - 1;
      const move = (index: number) => {
        event.preventDefault();
        setActive(Math.max(0, Math.min(last, index)));
      };
      switch (event.key) {
        case "ArrowDown":
          return move(active >= last ? 0 : active + 1);
        case "ArrowUp":
          return move(active <= 0 ? last : active - 1);
        case "Home":
          return move(0);
        case "End":
          return move(last);
        case "Enter": {
          event.preventDefault();
          const chosen = options[active];
          if (chosen) run(chosen.script);
          return;
        }
        case "Escape":
          event.preventDefault();
          return close();
        default:
          return;
      }
    },
    [options, active, setActive, run, close],
  );
}
