# Phase 4 - Branches and stash

**Branch** `feat/git-branches-stash`
**Features** #4 branch switcher, #6 stash
**Depends on** phases 1 and 2

## Goal

Move between branches and set work aside. The first phase that changes the
working tree underneath the other panes, which is what makes it more delicate
than its size suggests.

## Transport surface

```rust
    async fn branches(&self) -> Result<Vec<GitBranch>>;
    async fn checkout(&self, name: &str) -> Result<()>;
    async fn create_branch(&self, request: CreateBranchRequest) -> Result<GitBranch>;
    async fn delete_branch(&self, name: &str, force: bool) -> Result<()>;

    async fn stash_list(&self) -> Result<Vec<GitStash>>;
    async fn stash_push(&self, request: StashRequest) -> Result<()>;
    async fn stash_apply(&self, index: u32, pop: bool) -> Result<()>;
    async fn stash_drop(&self, index: u32) -> Result<()>;
```

```rust
pub struct GitBranch {
    pub name: String,
    pub is_head: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub last_commit: Option<GitCommit>,
}

pub struct CreateBranchRequest {
    pub name: String,
    pub from: Option<String>,   // defaults to HEAD
    pub checkout: bool,
}

pub struct StashRequest {
    pub message: Option<String>,
    pub include_untracked: bool,
}

pub struct GitStash {
    pub index: u32,
    pub message: String,
    pub branch: Option<String>,
    pub timestamp_ms: u64,
}
```

A branch name is a caller value that reaches git. It is validated against
git's own rules before use - `git check-ref-format` is the honest way to do
that rather than a hand-rolled regex - and passed as argv, never spliced.

## UI

Two additions to the source control view from phase 2:

- **Branch control** in the view header: current branch, and a picker listing
  local and remote branches with ahead/behind. Create-and-checkout from the
  same control. The header strip from phase 1 keeps showing the branch; this
  is where you change it.
- **Stash section**, collapsed by default: entries with message and age, and
  apply / pop / drop per entry.

## The refresh problem

Checkout and stash change files under the other three panes. Everything with
state keyed by path has to cope:

| Pane | What has to happen |
| --- | --- |
| File tree | Re-read expanded folders; drop rows whose file is gone; keep expansion where the folder survives |
| Viewer | Re-read the open file; if it no longer exists, say so rather than showing stale text |
| Editor drafts | **An unsaved draft must not be silently discarded, and must not be silently written over a different branch's file.** Warn before a checkout that would strand one |
| Search | Results reference paths that may be gone; clear them |
| Source control | Full status refresh |

This is the real work of the phase. A "git state changed" event that all of
them subscribe to is the shape to build, rather than each pane guessing.

## Tests

**Rust**

- Branches lists local and remote, marks HEAD, reports ahead/behind.
- Checkout switches HEAD; checkout of an unknown branch is a typed error.
- Checkout with conflicting local changes fails with a typed error and leaves
  the tree untouched.
- Create with and without checkout; a duplicate name is a typed error.
- An invalid branch name is refused before git runs.
- Stash push, list, apply, pop and drop round-trip.
- Stash with untracked included, and without.
- Delete refuses the checked-out branch without `force`.

**TypeScript**

- The picker lists branches and marks the current one.
- Checkout triggers one refresh across the panes.
- A checkout that would strand an unsaved draft warns first.
- Stash entries render, apply and drop.
- A failed checkout surfaces its sentence and changes nothing.

## Docs

A branches-and-stash section in `git-module.md`, including the refresh
contract - which panes listen, and what each does. Manual QA scenarios for
checkout with a dirty tree and with an unsaved draft open.

## Risks

| Risk | Mitigation |
| --- | --- |
| **Checkout strands an unsaved edit** | Warn before, naming the file; never discard silently. The highest-severity risk in the phase |
| Panes show stale content after a switch | One event, every pane subscribes; tested as a group rather than pane by pane |
| Checkout fails halfway | git either switches or does not; report the typed failure and refresh from truth rather than assuming |
| Stash pop conflicts | Surface it as a conflict; full resolution is phase 6 |

## Out of scope

No merge, no rebase, no cherry-pick, no tag management. No remote branch
tracking changes - that arrives with phase 6.
