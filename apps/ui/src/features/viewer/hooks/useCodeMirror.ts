import { useEffect, useRef } from "react";

import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";

import { editorTheme } from "@/theme/editorTheme";

import { languageFor } from "../languages";
import type { CodeMirrorOptions } from "../types";

/**
 * The CodeMirror 6 view.
 *
 * The view is rebuilt when a different file loads - keyed on `revision`, which
 * the loader bumps once per read - and deliberately *not* on every keystroke.
 * The document lives in the editor while it is being edited; React is told
 * about changes through `onChange` rather than owning them, because feeding
 * state back in on each keypress would rebuild the view and lose the cursor.
 */
export function useCodeMirror(options: CodeMirrorOptions) {
  const container = useRef<HTMLDivElement | null>(null);
  // Read through refs so a changed handler does not rebuild the editor.
  const latest = useRef(options);
  latest.current = options;

  const { revision, extension, editable, content } = options;
  // The document arrives one render after the file loads, because the editor
  // state hook fills it in. Without this in the dependencies the effect would
  // run once with nothing to show and never run again, leaving a blank pane.
  const hasContent = content !== null;

  useEffect(() => {
    const parent = container.current;
    if (!parent || content === null) return;

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          // Save first, so the platform's save shortcut is not swallowed by
          // anything the default keymap binds.
          keymap.of([
            {
              key: "Mod-s",
              preventDefault: true,
              run: () => {
                latest.current.onSave();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          editorTheme,
          EditorState.readOnly.of(!editable),
          EditorView.editable.of(editable),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              latest.current.onChange(update.state.doc.toString());
            }
          }),
          ...languageFor(extension),
        ],
      }),
    });

    return () => view.destroy();
    // `content` is the *initial* document for this revision; typing must not
    // re-run this effect, which is why it is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, extension, editable, hasContent]);

  return container;
}
