# Feature index

The nineteen features, where each lands, and what it needs. Use this to check
that nothing was dropped between the list and the phases.

## By number

| # | Feature | Phase | Branch |
| --- | --- | --- | --- |
| 1 | Working-tree status list | 2 | `feat/git-source-control` |
| 2 | Stage / unstage / discard | 2 | `feat/git-source-control` |
| 3 | Commit | 2 | `feat/git-source-control` |
| 4 | Branch switcher | 4 | `feat/git-branches-stash` |
| 5 | Commit history | 3 | `feat/git-history` |
| 6 | Stash | 4 | `feat/git-branches-stash` |
| 7 | Fetch / pull / push | 6 | `feat/git-remote-conflicts` |
| 8 | Git-aware file tree | 1 | `feat/git-foundation` |
| 9 | Diff in the viewer | 3 | `feat/git-history` |
| 10 | Blame in the editor gutter | 3 | `feat/git-history` |
| 11 | Search respects `.gitignore` | 1 | `feat/git-foundation` |
| 12 | Branch and dirty marker in the header | 1 | `feat/git-foundation` |
| 13 | Conflict resolution | 6 | `feat/git-remote-conflicts` |
| 14 | CI status for the current branch | 5 | `feat/github-integration` |
| 15 | Pull request list | 5 | `feat/github-integration` |
| 16 | Create a PR from the current branch | 5 | `feat/github-integration` |
| 17 | PR review comments inline | 6 | `feat/git-remote-conflicts` |
| 18 | Issues list | 5 | `feat/github-integration` |
| 19 | Open this file on github.com | 5 | `feat/github-integration` |

## By phase

**Phase 1** #8, #11, #12 - everything that falls out of `status()`
**Phase 2** #1, #2, #3 - the source control panel
**Phase 3** #5, #9, #10 - reading history
**Phase 4** #4, #6 - branches and stash
**Phase 5** #14, #15, #16, #18, #19 - GitHub through the `gh` CLI
**Phase 6** #7, #13, #17 - remotes, conflicts, review

## Sidebar views added

The rail's registry (`apps/ui/src/features/sidebar/views.ts`) gains two
entries across the six phases. Each is an id in `SidebarViewId`, a label, a
`lucide-react` icon and a component - no other component changes.

| View | Added in | Icon | Grows in |
| --- | --- | --- | --- |
| Source control | 2 | `GitBranch` | 3 (history), 4 (branches, stash), 6 (conflicts) |
| GitHub | 5 | `Github` | 6 (review comments) |

## Features that touch existing panes

Worth knowing up front, because these are the edits that reach outside a new
folder and into code other features already depend on.

| Feature | Touches | Care needed |
| --- | --- | --- |
| #8 tree badges | `TreeRowParts.tsx`, `TreeRowContext` | Extend the compound row with a new part; never replace one |
| #11 gitignore | `types/search.rs` skip list, `search::Collector` | Must degrade to today's hard-coded list outside a repository |
| #12 header | `WorkbenchHeader.tsx` | Six-prop ceiling: pass one object or read context |
| #9 diff | `ViewerPane`, `useFileViewer` | The viewer gains a mode; the editor's draft handling must not be disturbed |
| #10 blame | `useCodeMirror` | A CodeMirror gutter extension, and its theme reads `theme/tokens.ts` |
