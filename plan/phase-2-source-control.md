# Phase 2 - Source control

**Branch** `feat/git-source-control`
**Features** #1 working-tree status list, #2 stage / unstage / discard,
#3 commit
**Depends on** phase 1

## Goal

The third view in the rail: what changed, what is staged, and a box to commit
it. This is the daily-driver panel and the reason the sidebar registry was
built with an open slot.

## Transport surface

```rust
    /// Stage paths. An empty slice stages everything, which is what the
    /// group-level control sends.
    async fn stage(&self, paths: &[String]) -> Result<()>;

    /// Remove paths from the index, leaving the working tree alone.
    async fn unstage(&self, paths: &[String]) -> Result<()>;

    /// Throw away working-tree changes. The one destructive call in this
    /// phase - see the confirmation rule below.
    async fn discard(&self, paths: &[String]) -> Result<()>;

    /// Commit what is staged. Returns the new commit so the UI can show it
    /// landed rather than guessing.
    async fn commit(&self, request: CommitRequest) -> Result<GitCommit>;
```

```rust
pub struct CommitRequest {
    pub message: String,
    /// Stage every tracked modification first, `git commit -a`. Untracked
    /// files are still never included.
    pub all: bool,
    pub amend: bool,
}

pub struct GitCommit {
    pub sha: String,
    pub short_sha: String,
    pub summary: String,
    pub author: String,
    pub timestamp_ms: u64,
}
```

Every path argument goes through the path guard before it reaches argv, on
both transports. A path outside the connected root is refused before git is
spawned - `discard` in particular must never be reachable with an
unguarded path.

## UI

A `source-control` entry in `SIDEBAR_VIEWS`, a `SidebarViewId` of the same
name, and `apps/ui/src/features/source-control/`:

```
components/SourceControlPane.tsx   the view
components/CommitBox.tsx           message input and commit button
components/ChangeGroup.tsx         "Staged" / "Changes" headers with counts
components/ChangeRow.tsx           compound row root
components/ChangeRowParts.tsx      Icon, Path, State, Actions
context/ChangeRowContext.tsx       one provider per row
hooks/useSourceControl.ts          status, grouping, and what each action means
messages.ts                        copy
types.ts                           view models
```

The row is a compound component, like `TreeRow` and `SearchRow` before it -
that is the house pattern for a repeated list item and the third instance of
it, so the pattern is now load-bearing rather than incidental.

Selecting a row opens the file in the viewer through the existing
`SelectionContext`, exactly as the tree and search results do. No new
selection concept.

### The destructive-action rule

`discard` throws away work that exists nowhere else - no commit, no stash, no
reflog entry. It is the only action in this plan that can lose data outright.

- It always confirms, naming the file, and the confirm button says what will
  happen rather than "OK".
- Discarding *all* changes confirms with the count.
- It is never the default or the primary-styled button in a row.
- The editor's unsaved draft for that file is cleared with it, so the viewer
  cannot keep showing text that no longer exists anywhere.

## Tests

**Rust** - against real repositories in temp dirs.

- Stage moves an entry from worktree to index; unstage moves it back.
- Staging an empty slice stages everything.
- Discard restores a modified file, and removes nothing else.
- Commit with nothing staged fails with a typed error, not a silent no-op.
- Commit returns a sha that `git log` agrees with.
- Amend replaces the previous commit rather than adding one.
- A path outside the root is refused by every one of the four methods.

**TypeScript**

- Staged and unstaged groups render with the right counts.
- Clicking stage calls the transport with that path only.
- Commit is disabled with an empty message, and with nothing staged.
- A failed commit surfaces its sentence and keeps the typed message.
- Discard confirms first and does nothing when the confirm is dismissed.
- Selecting a row opens that file in the viewer.
- The list refreshes after each action.

## Docs

Extend `git-module.md` with the mutating half and the discard rule. Add the
view to `components.md`, and phase 2 scenarios to `manual-testing.md` -
including a data-loss scenario for discard, marked the way the existing
editor data-loss cases are.

## Risks

| Risk | Mitigation |
| --- | --- |
| Discard loses work | Confirmation, clear wording, never primary-styled, clears the matching draft |
| The list refreshes under a click and the user hits the wrong row | Refresh on completion, not on a timer; keep row identity stable by path |
| Partial failure staging many paths | Report which path failed; never claim success for the batch |
| Commit message lost on failure | The box keeps its text until the commit is known to have landed |

## Out of scope

No hunk-level staging - that needs the diff from phase 3 and is a phase 3+
follow-up. No amend of anything but the last commit. No signing.
