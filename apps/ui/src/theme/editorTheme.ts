import { EditorView } from "@codemirror/view";

import { colorTokens, fontStacks } from "./tokens";

/**
 * CodeMirror takes colours as JavaScript strings, so like the terminal theme
 * it reads the shared tokens rather than carrying its own palette.
 */
export const editorTheme = EditorView.theme(
  {
    "&": {
      color: colorTokens.text,
      backgroundColor: colorTokens.surface,
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: fontStacks.mono.join(", "),
      caretColor: colorTokens.accent,
    },
    ".cm-gutters": {
      backgroundColor: colorTokens.surfaceRaised,
      color: colorTokens.textFaint,
      border: "none",
      borderRight: `1px solid ${colorTokens.border}`,
    },
    ".cm-activeLineGutter": { backgroundColor: colorTokens.surfaceHover },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: colorTokens.selection,
    },
    ".cm-scroller": { overflow: "auto" },
  },
  { dark: true },
);
