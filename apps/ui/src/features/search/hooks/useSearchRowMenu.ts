import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";

import { useSearchRow } from "../context/SearchRowContext";

/**
 * A search result's right-click menu: open it, or copy where it is. The
 * relative path is the transport's own `relativePath`, so it reads exactly as
 * the row shows it.
 */
export function useSearchRowMenu() {
  const { hit, onActivate } = useSearchRow();
  return useContextMenu(() => [
    action("open", MENU_COPY.open, () => onActivate(hit)),
    separator(),
    action("copy-path", MENU_COPY.copyPath, () => void copyText(hit.entry.path)),
    action("copy-relative", MENU_COPY.copyRelativePath, () => void copyText(hit.relativePath)),
  ]);
}
