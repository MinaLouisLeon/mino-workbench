import type { RefObject } from "react";

import type { Terminal } from "@xterm/xterm";

import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText, readText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";

import { TERMINAL_COPY } from "../messages";
import type { TerminalInstanceProps } from "../types";

/**
 * The terminal's right-click menu.
 *
 * Copy, Paste and Select All act on xterm, not on the page: the terminal's
 * text is drawn on a canvas and its selection is xterm's own. Paste goes
 * through `terminal.paste`, which is what a keyboard paste does - so a
 * multi-line paste is bracketed for the shell, and nothing runs until the
 * reader presses Enter, rather than each line executing as it lands.
 *
 * No shortcut hints here, on purpose: inside a shell Ctrl+C is an interrupt,
 * not a copy, and a menu that said otherwise would be teaching a habit that
 * kills processes.
 */
export function useTerminalMenu(
  terminal: RefObject<Terminal | null>,
  { closable, onClose, canSplit, onSplit }: TerminalInstanceProps,
) {
  return useContextMenu(() => {
    const term = terminal.current;
    if (!term) return [];
    const selection = term.getSelection();
    const copy = () => {
      void copyText(selection);
      term.focus();
    };

    return [
      action("copy", MENU_COPY.copy, copy, {
        disabled: selection === "",
        hint: selection === "" ? MENU_COPY.noSelection : undefined,
      }),
      action("paste", MENU_COPY.paste, () => {
        void readText().then((text) => {
          if (text !== null) term.paste(text);
          term.focus();
        });
      }),
      action("select-all", MENU_COPY.selectAll, () => term.selectAll()),
      separator(),
      action("clear", TERMINAL_COPY.clear, () => {
        term.clear();
        term.focus();
      }),
      separator(),
      action("split", TERMINAL_COPY.splitMenu, onSplit, {
        disabled: !canSplit,
        hint: canSplit ? undefined : TERMINAL_COPY.splitFull,
      }),
      ...(closable ? [action("close", TERMINAL_COPY.closeTerminal, onClose)] : []),
    ];
  });
}
