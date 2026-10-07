# Flow: file tree pane

Lazy-loaded, one directory level per expand. Never a recursive walk.

**Files**

`apps/ui/src/features/file-tree/`: `types.ts`, `tree.ts`,
`hooks/useFileTree.ts`, `hooks/useFileTreePane.ts`,
`context/TreeRowContext.tsx`, `components/{FileTreePane,TreeRows,TreeRow,TreeRowParts}.tsx`.
Backed by `Transport::list_dir`.

The right-click menu and the file operations it opens add
`hooks/{useTreeMenus,useEntryPrompt,useEntryAftermath,useEntryNameField}.ts`,
`context/EntryActionsContext.tsx`, `entryName.ts`, `messages.ts` and
`components/{TreeBackground,EntryPromptDialog,EntryNameDialog,EntryDeleteConfirm}.tsx`,
backed by `Transport::change_entry`. See [Creating, renaming and
deleting](#creating-renaming-and-deleting).

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
            ├─ TreeRow.Label       dimmed when hidden or git-ignored, accent when selected
            ├─ TreeRow.GitStatus   M / A / D / R / C / U / T / !, or nothing
            └─ TreeRow.Status      "Loading…" or that level's error
```

Every part reads `useTreeRow()`; nothing is drilled past the provider. This is
the project's compound-component rule applied to the one repeated list item in
the app.

`TreeRow.GitStatus` reads a *second* context, `GitStatusContext`, because git
answers for the whole repository in one call and a row wants its own line out
of it - see [git-module.md](git-module.md). It renders `null` when there is no
repository, no git, or nothing read yet, which is what makes a folder that is
not a checkout render exactly as it did before the part existed.

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
| New file / folder, confirmed | `change_entry({ kind: "create" })`, then `list_dir` for every loaded folder and `git_status` |
| Rename, confirmed | `change_entry({ kind: "rename" })`, then the same re-reads |
| Delete, confirmed | `change_entry({ kind: "delete", mode })`, then the same re-reads |
| Any menu entry, cancelled | none |

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

## Creating, renaming and deleting

Right-click a row for that entry's menu, or the space below the rows for the
root's. See [context-menu-module.md](context-menu-module.md) for the menu
itself; this section is what its file entries do.

| Entry | Asks | Then |
| --- | --- | --- |
| New File… / New Folder… | a name; *inside* a folder that was right-clicked, *beside* a file | `create`; the folder opens if it was collapsed, and a new file opens in the viewer |
| Rename… | a name, pre-filled, with the part before the extension selected | `rename` in place; the selection and any unsaved draft follow the entry to its new name |
| Move to Recycle Bin… | a confirmation naming the entry | `delete` with `mode: "trash"`. **Local sessions only** - the entry is absent over SSH |
| Delete Permanently… | a confirmation naming the entry and saying it cannot be undone | `delete` with `mode: "permanent"` |

**Ask, then act.** `useEntryPrompt` is shaped like `useDiscardPrompt`: menu
entries only *ask*, and the transport is called from exactly one place, the
dialog's confirm. In both delete confirmations **Cancel** is the auto-focused
button, so Enter keeps the file. A folder's confirmation says that everything
in it goes too, and either delete warns when unsaved editor drafts would go
with it.

**After a change** (`useEntryAftermath`): every loaded folder re-reads,
expansion untouched; git status is asked again; a deleted entry's drafts are
dropped and the viewer lets go of it if it was open - the same rule as a
discard, because a draft of a file that is gone is one Ctrl+S from writing it
back.

**Failures keep the dialog open** with the transport's sentence, so a name
that is taken can be corrected rather than retyped.

### The rules in Rust

`Transport::change_entry(EntryChange)` is one method over an enum, as
`GitHubQuery` is, because the three operations share one guard:

- **A name is one segment** (`mino_core::entries::check_name`): not empty, not
  `.` or `..`, no `/` or `\`, no control characters, at most 255 bytes. The
  local transport on Windows also refuses `<>:"|?*` - `:` would otherwise make
  an NTFS alternate data stream - trailing dots and spaces, and device names
  such as `CON`. The dialog checks the portable rules as you type
  (`entryName.ts`); Rust checks all of them regardless.
- **The parent is resolved, never the entry.** The parent folder goes through
  the path guard, and the operation acts on one checked name inside it.
  Canonicalising the entry itself would follow a symlink - so a delete removes
  the **link**, never what it points at.
- **Nothing is overwritten.** A create uses `create_new` locally and
  `EXCLUDE` over SFTP; a rename refuses an existing name, except a change of
  letter case only.
- **The root itself** cannot be renamed or deleted.
- **The recycle bin** uses the `trash` crate, locally. Over SSH, `Trash` is
  refused with a sentence; a permanent delete of a folder walks it over SFTP
  depth-first, without following symlinks.

