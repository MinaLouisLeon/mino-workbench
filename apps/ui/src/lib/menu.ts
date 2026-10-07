import type { ContextMenuAction, ContextMenuEntry } from "@/components/ui";

/**
 * Builders for context menu entries, so a feature's menu reads as a list of
 * what it offers rather than a list of object literals.
 *
 * Ids only have to be unique within one menu; they are React keys.
 */
export function action(
  id: string,
  label: string,
  onSelect: () => void,
  extra: Partial<Omit<ContextMenuAction, "kind" | "id" | "label" | "onSelect">> = {},
): ContextMenuEntry {
  return { kind: "action", id, label, onSelect, ...extra };
}

let separators = 0;
export function separator(): ContextMenuEntry {
  separators += 1;
  return { kind: "separator", id: `separator-${separators}` };
}

export function heading(id: string, label: string): ContextMenuEntry {
  return { kind: "heading", id, label };
}

/**
 * Drops the separators a conditional menu leaves behind: at either end, and
 * two in a row. A builder can then write `separator()` between groups without
 * checking whether the group beside it turned out empty.
 */
export function tidyEntries(entries: ContextMenuEntry[]): ContextMenuEntry[] {
  const tidy: ContextMenuEntry[] = [];
  for (const entry of entries) {
    const previous = tidy[tidy.length - 1];
    if (entry.kind === "separator" && (!previous || previous.kind === "separator")) {
      continue;
    }
    tidy.push(entry);
  }
  while (tidy.length > 0 && tidy[tidy.length - 1].kind === "separator") tidy.pop();
  return tidy;
}

/** True when a menu has something to choose - not just headings. */
export function hasActions(entries: ContextMenuEntry[]): boolean {
  return entries.some((entry) => entry.kind === "action");
}
