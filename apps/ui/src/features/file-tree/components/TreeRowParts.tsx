import { useTreeRow } from "../context/TreeRowContext";

const INDENT_PER_LEVEL_PX = 14;

/** Depth spacing. A spacer element keeps the label text alignment honest. */
export function TreeRowIndent() {
  const { row } = useTreeRow();
  return (
    <span
      aria-hidden="true"
      className="shrink-0"
      style={{ width: row.depth * INDENT_PER_LEVEL_PX }}
    />
  );
}

/** Disclosure marker. Files render a blank of the same width so names line up. */
export function TreeRowChevron() {
  const { row } = useTreeRow();
  const isDirectory = row.entry.kind === "directory";
  return (
    <span aria-hidden="true" className="w-3 shrink-0 text-center text-textFaint">
      {isDirectory ? (row.expanded ? "\u25be" : "\u25b8") : ""}
    </span>
  );
}

export function TreeRowIcon() {
  const { row } = useTreeRow();
  const glyph = ICONS[row.entry.kind];
  return (
    <span aria-hidden="true" className="w-3 shrink-0 text-center text-textFaint">
      {glyph}
    </span>
  );
}

const ICONS = {
  directory: "\u25a0",
  file: "\u25cf",
  symlink: "\u2192",
  other: "\u25cb",
} as const;

export function TreeRowLabel() {
  const { row, selected } = useTreeRow();
  const tone = selected
    ? "text-accentStrong"
    : row.entry.hidden
      ? "text-textFaint"
      : "text-text";
  return <span className={`truncate ${tone}`}>{row.entry.name}</span>;
}

/** Per-row loading and error state; a failed level does not blank the tree. */
export function TreeRowStatus() {
  const { row } = useTreeRow();
  if (row.status === "loading") {
    return (
      <span className="ml-auto shrink-0 pl-2 text-xs text-textFaint">
        Loading…
      </span>
    );
  }
  if (row.status === "error" && row.error) {
    return (
      <span className="ml-auto shrink-0 truncate pl-2 text-xs text-danger">
        {row.error}
      </span>
    );
  }
  return null;
}
