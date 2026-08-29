# Phase 6 - Remotes, conflicts and review

**Branch** `feat/git-remote-conflicts`
**Features** #7 fetch / pull / push, #13 conflict resolution, #17 PR review
comments inline
**Depends on** phases 1, 2, 3 and 5
**Blocked on** [D3 - credentials](decisions.md#d3---credentials-for-push-and-pull-phase-6-only)

## Goal

The three hardest features, deliberately last. Each one either needs a
decision the earlier phases did not, or is genuinely complex, or both. By the
time this phase starts the foundation under it has been exercised by five
others.

If the plan is going to be cut short, cut it here. Phases 1-5 leave a coherent
and useful application; nothing in this phase is load-bearing for them.

## Feature 7 - fetch, pull, push

**This is the one that pushes against a standing rule.** Everything else in
the plan works without the application ever holding a secret. Talking to a
remote does not, unless the secret belongs to something else.

D3 must be answered first. The recommended answer - delegate to git's own
credential helper, the SSH agent, or the OS keychain - keeps the rule intact
without qualification, and is what the rest of this section assumes.

```rust
    async fn fetch(&self, remote: Option<String>) -> Result<GitFetchResult>;
    async fn pull(&self, request: PullRequest) -> Result<GitPullResult>;
    async fn push(&self, request: PushRequest) -> Result<GitPushResult>;
    async fn remotes(&self) -> Result<Vec<GitRemote>>;
```

Under delegation, git prompting for input is the failure mode to design for:
a prompt with nowhere to go will hang. Every remote operation therefore runs
with `GIT_TERMINAL_PROMPT=0` and a timeout, and a missing credential surfaces
as a typed error saying which helper to configure - never as a hung pane.

Push is confirmed before it runs, naming the remote and the branch. A
force-push is a separate, explicit action and never a fallback when a normal
push is rejected.

## Feature 13 - conflict resolution

```rust
    async fn conflicts(&self) -> Result<Vec<GitConflict>>;
    async fn resolve(&self, path: &str, resolution: ConflictResolution) -> Result<()>;
```

`ConflictResolution` is `Ours`, `Theirs`, or `Manual` - the last meaning the
file was edited and should be marked resolved as it now stands.

The conflicted file's three versions come through the diff machinery from
phase 3. The UI lists conflicted files in the source control view and offers
take-ours, take-theirs, or open-and-edit, then mark resolved. A commit is
refused while any conflict remains, with a sentence saying so.

Explicitly not attempted: a three-way merge editor. That is a large piece of
UI on its own and would be its own phase if wanted.

## Feature 17 - PR review comments inline

```rust
    // On GitHubTransport, extending phase 5
    ReviewComments { number: u32 },
    AddReviewComment { number: u32, path: String, line: u32, body: String },
```

Review threads for the open PR, rendered against the lines they belong to in
the editor - the same gutter machinery blame uses in phase 3.

Two things make this harder than it looks. Comments are anchored to a diff
position, not a file line, so a comment on an outdated diff has to be shown as
outdated rather than pinned to the wrong line. And the file open in the editor
may not be the revision the comment was written against.

Read-only first: show threads and let them be replied to. Submitting a full
review with an approval state is a follow-up.

## Tests

**Rust**

- Fetch against a local bare repository used as a remote - no network in tests.
- Pull fast-forwards; pull with divergence reports the state rather than
  guessing at a merge.
- Push to a local remote, and a rejected non-fast-forward push is a typed
  error naming the reason.
- A missing credential is a typed error, and does not hang. Asserted with a
  timeout.
- Conflicts are listed after a conflicting merge; ours, theirs and manual each
  resolve; a commit with conflicts outstanding is refused.

**TypeScript**

- Push confirms, naming remote and branch; force-push is separately confirmed.
- A rejected push surfaces its sentence and suggests fetching.
- Conflicted files render distinctly and resolve.
- Commit is disabled while conflicts remain, and says why.
- Review threads render on their lines; an outdated thread says it is outdated.

## Risks

| Risk | Mitigation |
| --- | --- |
| **A credential reaches a log or an error message** | Never construct a message from a git line that could contain one; redact by default; a test asserts no secret-shaped content in errors |
| A remote operation hangs on a prompt | `GIT_TERMINAL_PROMPT=0` plus a timeout, always |
| Force-push destroys history | Separate explicit action, never a fallback, confirmed with the branch named |
| Pull loses uncommitted work | Refuse with a typed error when the tree is dirty; suggest stashing rather than doing it silently |
| Comments anchored to the wrong lines | Show outdated threads as outdated rather than guessing a position |

## Out of scope

No merge or rebase driving from the UI beyond what pull performs. No
three-way merge editor. No submitting a review verdict. No conflict resolution
for binary files beyond take-ours or take-theirs.
