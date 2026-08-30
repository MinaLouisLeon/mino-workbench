# Sidebar module

The activity rail down the left edge and the panel it switches, plus the first
view added alongside the file tree: recursive filename search.

## Shape

```
apps/ui/src/features/sidebar/
  views.ts                       the registry - this array IS the sidebar
  types.ts                       SidebarViewId, SidebarView, SidebarState
  messages.ts                    copy
  context/SidebarContext.tsx     active view + collapsed, provided by Workbench
  hooks/useSidebarState.ts       the persisted preference and the click rules
  hooks/useSidebarPanel.ts       keeps that flag and the resizable column in step
  components/ActivityBar.tsx     the rail
  components/ActivityBarButton.tsx  one rail button
  components/SidebarPanel.tsx    every view, inactive ones hidden
```

## Adding a view

Three edits, no component changes:

1. Add the id to `SidebarViewId` in `types.ts`. The union is closed, so a
   missing registry entry is a type error rather than a blank panel.
2. Add the label to `messages.ts`.
3. Add one entry to `SIDEBAR_VIEWS` in `views.ts`: `id`, `label`, a
   `lucide-react` `icon`, and a `Panel` component.

`Panel` takes no props. A view reads what it needs from context, exactly as
`FileTreePane`, `SearchPane`, `SourceControlPane` and `GitHubPane` do. Array
order is rail order.

The registry has been added to three times now without a component changing,
which is what it was built for. Source control arrived in phase 2 as one entry,
one id and one label; GitHub arrived in phase 5 the same way, below source
control - what is happening locally comes before what is happening on a server.

## Two decisions worth knowing

**Views are hidden, not unmounted.** `SidebarPanel` renders every view and puts
`hidden` on the inactive ones. Unmounting would throw away the tree's expanded
folders and the search box's query on every switch, and returning to a view you
had set up only to find it reset is what makes a sidebar feel disposable. The
cost is that hidden views stay in memory; neither does any work while hidden,
so this is cheap today and is the thing to re-examine if a heavier view lands.

**Collapsing goes through the panel, not through rendering.** Clicking the
active view's icon collapses the panel to zero width - VS Code's behaviour -
and `useSidebarPanel` drives `react-resizable-panels`' imperative handle to do
it. Two details it has to get right:

- Every imperative call, `isCollapsed()` included, throws until the group has
  measured itself. Nothing is attempted before the group's first `onLayout`.
- A collapsed panel reports a size of zero, and `useWorkbenchLayout` refuses to
  store that - otherwise the next launch would restore a sidebar that expands
  to nothing.

Dragging the handle shut collapses the panel too, and `onCollapse` writes the
flag back, so the rail button and the handle always agree.

## Search

The one view with a transport call behind it. `search_files` is the only method
that descends the tree - `list_dir` is deliberately one level - and it is
bounded rather than exhaustive.

| Bound | Value | Where |
| --- | --- | --- |
| Results returned | 200, ceiling 500 | `SearchQuery::effective_limit` |
| Entries visited | 40,000 | `MAX_SCANNED_ENTRIES` |
| Wall clock | 5s | `SEARCH_TIMEOUT_MS` |
| Directories skipped | `.git`, `node_modules`, `target`, `dist`, … | `SKIPPED_DIRECTORIES` |

Hitting any of them sets `SearchHits.truncated`, and the pane says the list is
partial rather than implying it is complete.

**Matching is fuzzy and lives in Rust.** `ftp` finds `FileTreePane.tsx`. It is
in `mino_core::search::fuzzy` rather than in the UI so that every transport
ranks the same set of files the same way - otherwise the results would reorder
themselves when a session moved from local to SSH. `fuzzy` finds where a match
lands; `scoring` decides what it is worth. Tuning ranking means editing the
weights in `scoring.rs` and nothing else.

The matcher tries every alignment rather than taking the usual forward-then-
tighten shortcut. That shortcut gets the common case wrong: searching `main` in
`src/domain/main.rs` it locks onto the `main` inside `domain` and never offers
the filename to the scorer at all.

**The walk differs per transport, the decisions do not.** Local walks with
`std::fs` on a blocking thread; SSH walks over SFTP. Both are breadth-first, so
shallow matches are found first and a truncated search still returns the useful
part of the tree. Both feed one `search::Collector`, which owns the limits, the
ranking and the truncation flag. Neither descends into a symlinked directory: a
link pointing at an ancestor would otherwise make the walk endless.

Containment needs no per-entry check locally - the walk starts at the guarded
root and only moves downwards - and over SSH every child is still put through
`RemoteRoot::contains`, so a server answering with a path outside the root is
ignored rather than followed. **No query text ever reaches a remote shell.**
SFTP was chosen over a remote `find` partly for that: matching happens in this
process, so there is no command line for a filename to become syntax on.

**In the UI**, `useFileSearch` debounces at 180ms and tags each request with a
sequence number, so a slow early search that lands after a fast later one is
dropped. Without that, deleting a character can leave results for a query you
no longer have on screen. Changing the working folder clears the box.

Rust matches against the whole relative path, because that is what people type
against - `srcmain` should find `src/main.rs`. The row reads better with the
filename first, so `splitPath` re-bases the match indices onto each half.

## Tests

| File | Covers |
| --- | --- |
| `crates/mino-core/src/search/fuzzy.rs` | matching, including the alignment case above |
| `crates/mino-core/src/search/scoring.rs` | ranking order |
| `crates/mino-core/tests/local_search.rs` | descending, subsequence matching, ranking |
| `crates/mino-core/tests/local_search_guards.rs` | skip list, limits, the path guard |
| `test/mino-workbench/integration/sidebar.test.tsx` | switching, collapsing, state kept across a switch |
| `test/mino-workbench/integration/sidebar-persistence.test.tsx` | restoring, and surviving unreadable storage |
| `test/mino-workbench/integration/search-pane.test.tsx` | typing, debounce, opening a hit |
| `test/mino-workbench/integration/search-pane-failures.test.tsx` | errors, and the stale-answer race |
| `test/mino-workbench/unit/split-path.test.ts` | re-basing highlights onto name and folder |

One jsdom trap, documented in `test/mino-workbench/sidebar-harness.ts`:
react-resizable-panels swallows pointer events it believes are over a resize
handle, and it decides that from `getBoundingClientRect`, which jsdom answers
with zeroes for everything. With a handle on screen `userEvent.click` becomes a
silent no-op, so those suites use `fireEvent.click`. Real browsers report real
rectangles and are unaffected.
