import { basename } from "@/lib/path";

import { useEditorMenu } from "../hooks/useEditorMenu";
import type { EditorSurfaceProps } from "../surfaceTypes";

/**
 * The element CodeMirror mounts into, and the owner of its right-click menu.
 *
 * Split out of `ViewerPane` so the menu has a home that is not the pane: the
 * pane decides *whether* the editor shows, this decides what a right-click on
 * it offers. It is still always rendered and only hidden - see the note where
 * the pane renders it.
 */
export function EditorSurface({ editor, path, hidden, editing }: EditorSurfaceProps) {
  const onContextMenu = useEditorMenu({ editor, path, ...editing });
  return (
    <div
      ref={editor.container}
      hidden={hidden}
      onContextMenu={onContextMenu}
      aria-label={path ? `Contents of ${basename(path)}` : "File contents"}
      className="min-h-0 flex-1"
    />
  );
}
