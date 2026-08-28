# Flow: file tree pane

Lazy-loaded, one directory level per expand. Never a recursive walk.

**Files**

`apps/ui/src/features/file-tree/`: `types.ts`, `tree.ts`,
`hooks/useFileTree.ts`, `hooks/useFileTreePane.ts`,
`context/TreeRowContext.tsx`, `components/{FileTreePane,TreeRows,TreeRow,TreeRowParts}.tsx`.
Backed by `Transport::list_dir`.

```
FileTreePane                       ← useFileTreePane (root, rows, selection)
└─ Pane title="Files"
   ├─ StatusMessage                (no folder / error / loading / empty)
   └─ TreeRows  role="tree"
      └─ TreeRowProvider           one per row, holds that row's data
         └─ TreeRow  role="treeitem"
            ├─ TreeRow.Indent      depth × 14px
            ├─ TreeRow.Chevron     ▸ / ▾, blank for files
            ├─ TreeRow.Icon        ■ dir · ● file · → symlink · ○ other
            ├─ TreeRow.Label       dimmed when hidden, accent when selected
            └─ TreeRow.Status      "Loading…" or that level's error
```

Every part reads `useTreeRow()`; nothing is drilled past the provider. This is
the project's compound-component rule applied to the one repeated list item in
the app.

## Loading

`useFileTree(root)` keeps a `DirectoryMap` of `path → { status, error, entries }`
and a set of expanded paths. `flattenTree` (pure, in `tree.ts`) turns the two
into the visible rows.

- On connect, only the root is fetched. One `list_dir` call.
- Expanding a folder fetches that folder, once. An in-flight set prevents a
  double fetch from a double click.
- Expanding a folder that previously failed re-fetches it, so a transient
  error is recoverable by collapsing and expanding again.
- `flattenTree` tracks visited paths, so a symlink loop terminates.

## Selection

Activating a directory row toggles it. Activating a file row puts the entry in
`SelectionContext`, which the viewer reads. The tree never reads a file itself.

## Expected calls

| Action | Call |
| --- | --- |
| Connect | `list_dir(connection.root)` |
| Expand a folder (first time) | `list_dir(<folder path>)` |
| Expand a folder (already loaded) | none |
| Collapse | none |
| Select a file | none from the tree; the viewer issues `read_file` |

## UI states

| State | Condition | Copy |
| --- | --- | --- |
| No folder | no connection | "No folder open" / "Open a folder to browse its contents." |
| Loading | root loading, no rows yet | "Loading…" / "Reading the folder." |
| Empty | root loaded, zero entries | "This folder is empty" / "Nothing to show here yet." |
| Root error | root listing failed | "Could not read this folder" + the typed sentence |
| Level loading | a row's own fetch in flight | row shows "Loading…" |
| Level error | a row's fetch failed | row shows the typed sentence in danger colour; siblings stay listed |

## Accessibility

`role="tree"` with `aria-label="Folder contents"`; each row is a real `button`
with `role="treeitem"`, `aria-level`, `aria-selected`, and `aria-expanded` on
directories only. Enter and Space activate; ArrowRight expands; ArrowLeft
collapses. Focus is visible via `focus-visible:ring-accentStrong`. The full
path is on `title` for rows whose name is truncated.
