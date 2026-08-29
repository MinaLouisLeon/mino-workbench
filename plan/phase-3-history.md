# Phase 3 - History

**Branch** `feat/git-history`
**Features** #9 diff in the viewer, #5 commit history, #10 blame in the gutter
**Depends on** phase 1. Sits better after phase 2, which gives it a view to
live in, but does not require it.

## Goal

Read what happened. Nothing in this phase changes a repository, which makes it
the lowest-risk phase and a good one to take out of order if priorities move.

## Transport surface

```rust
    /// A file's diff, or the whole tree's when `path` is `None`.
    async fn diff(&self, request: DiffRequest) -> Result<GitDiff>;

    /// Commits, newest first, bounded like every other walk in this codebase.
    async fn log(&self, request: LogRequest) -> Result<GitLog>;

    /// One commit with the files it touched.
    async fn show(&self, sha: &str) -> Result<GitCommitDetail>;

    /// Per-line authorship for one file.
    async fn blame(&self, path: &str) -> Result<GitBlame>;
```

```rust
pub struct DiffRequest {
    pub path: Option<String>,
    /// Staged side (`--cached`) rather than working tree.
    pub staged: bool,
    /// Compare against this instead of HEAD.
    pub against: Option<String>,
}

pub struct GitDiff {
    pub files: Vec<GitFileDiff>,
    pub truncated: bool,
}

pub struct GitFileDiff {
    pub relative_path: String,
    pub old_path: Option<String>,
    pub binary: bool,
    pub hunks: Vec<GitHunk>,
}

pub struct GitHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<GitDiffLine>,
}

pub struct GitDiffLine {
    pub kind: GitDiffLineKind,   // Context | Added | Removed
    pub content: String,
    pub old_line: Option<u32>,
    pub new_line: Option<u32>,
}
```

Parsed into hunks in Rust rather than handed to the UI as raw patch text. The
reason is the same one behind `mino_core::search::fuzzy`: two transports must
not produce two different renderings, and a UI that parses a patch would be a
second implementation of git's format.

`GitBlame` is a list of `{ line, sha, short_sha, author, timestamp_ms }`,
already expanded per line, so the gutter does no arithmetic.

Bounds, in the same spirit as `SearchHits`: a default and a maximum on log
depth, a cap on diff size, and `truncated` when either bites. A diff of a
generated file can be enormous; binary files report `binary: true` and no
hunks rather than megabytes of noise.

## UI

**#9 Diff in the viewer.** The viewer gains a mode: `file` or `diff`, toggled
in the pane header, defaulting to `diff` when the file has changes and `file`
otherwise. Rendered as a unified diff with added and removed lines toned from
`theme/tokens.ts` - which needs two new tokens, and `tokens.ts` is the only
file allowed to hold a colour.

The editor's draft handling must not be disturbed. Diff mode is read-only, and
switching modes must not discard an unsaved edit. This is the sharpest
integration risk in the phase.

**#5 Commit history.** A History section in the source control view: subject,
author, relative time, short sha. Selecting a commit shows its files; selecting
a file shows that commit's diff in the viewer. Paged by the log bound rather
than loading everything.

**#10 Blame.** A CodeMirror gutter extension in `useCodeMirror`, showing author
and short sha against each line, collapsed so repeated authorship is not
repeated visually. Off by default and toggled from the viewer header - it
changes the editor's shape and should not surprise anyone.

## Tests

**Rust**

- A modified file produces the hunks git reports, with correct line numbers.
- Staged and unstaged diffs differ after a partial stage.
- A binary file reports `binary: true` and no hunks.
- A renamed file carries `old_path`.
- Log honours its limit and reports `truncated`.
- Log on an unborn branch returns empty, not an error.
- Blame attributes lines to the commits that introduced them.
- Diff and blame refuse a path outside the root.
- Hunk parsing is unit-tested against recorded `git diff` output, including a
  hunk with no trailing newline and one with a `\ No newline at end of file`.

**TypeScript**

- Diff mode renders additions and removals distinctly.
- Toggling modes preserves an unsaved draft.
- A binary file says so instead of rendering.
- History lists commits and opens a commit's file diff.
- The blame gutter renders and toggles off.

## Docs

A `git-history` section in `git-module.md` covering the hunk model and why
parsing lives in Rust. `components.md` for the viewer's new mode and the
gutter. Manual QA scenarios for large diffs, binary files and renames.

## Risks

| Risk | Mitigation |
| --- | --- |
| Diff mode disturbs the editor's drafts | Mode is a viewer concern only; drafts keyed by path, untouched by mode. Explicit test |
| A huge diff freezes the pane | Bound it, report `truncated`, virtualise if a hunk list grows past a screen or two |
| Blame is slow on a large file | On demand only, never on open; cancel on file change |
| Two new colour tokens | Added to `tokens.ts` first, as the rule requires; never inline |

## Out of scope

No side-by-side diff - unified only in this phase. No hunk-level staging. No
graph rendering for branches in the log.
