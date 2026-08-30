# Endpoints

This app has no HTTP API of its own; the transport interface *is* the API. Each
row below is one route in three forms: the Rust trait method, the Tauri command
the desktop build invokes, and the agent WebSocket frame the browser build will
send once the daemon is authenticated.

## The transport interface

Defined in `crates/mino-core/src/transport.rs`. Mirrored one-for-one by
`TransportClient` in `apps/ui/src/Types/modules/api.ts`.

| Function (file) | Method · Endpoint | Params / Body | Returns |
| --- | --- | --- | --- |
| `connect` (`transport.rs`) | Tauri `connect` · agent `{"method":"connect"}` | `target: ConnectionTarget` | `ConnectionInfo` |
| `disconnect` (`transport.rs`) | Tauri `disconnect` · agent `{"method":"disconnect"}` | – | `void` |
| `list_dir` (`transport.rs`) | Tauri `list_dir` · agent `{"method":"listDir"}` | `path: string` | `DirEntry[]` |
| `stat` (`transport.rs`) | Tauri `stat` · agent `{"method":"stat"}` | `path: string` | `DirEntry` |
| `search_files` (`transport.rs`) | Tauri `search_files` · agent `{"method":"searchFiles"}` | `query: SearchQuery` | `SearchHits` |
| `read_file` (`transport.rs`) | Tauri `read_file` · agent `{"method":"readFile"}` | `path: string`, `options: ReadFileOptions` | `FilePayload` |
| `open_pty` (`transport.rs`) | Tauri `open_pty` · agent `{"method":"openPty"}` | `spec: PtySpawnSpec` | `PtySession` (Rust: `PtyStream`) |
| `write_pty` (`transport.rs`) | Tauri `write_pty` · agent `{"method":"writePty"}` | `id: PtySessionId`, `data: string` | `void` |
| `resize_pty` (`transport.rs`) | Tauri `resize_pty` · agent `{"method":"resizePty"}` | `id: PtySessionId`, `size: PtySize` | `void` |
| `close_pty` (`transport.rs`) | Tauri `close_pty` · agent `{"method":"closePty"}` | `id: PtySessionId` | `void` |
| `run_structured` (`transport.rs`) | Tauri `run_structured` · agent `{"method":"runStructured"}` | `request: StructuredRequest` | `StructuredOutput` |
| `probe_shell` (`transport.rs`) | Tauri `probe_shell` · agent `{"method":"probeShell"}` | – | `ShellProbe` |
| *(stream)* | Tauri event `pty://<id>` · agent `{"result":"ptyEvent"}` | – | `PtyEvent` |

### The one deviation

Rust's `open_pty` returns `PtyStream { session, events }` - a descriptor plus a
channel. A channel cannot cross IPC, so the desktop layer drains it and
re-emits each `PtyEvent` on the Tauri event `pty://<session id>`
(`apps/desktop/src-tauri/src/commands/pty.rs::event_name`). TypeScript's
`openPty` therefore returns the descriptor, and the stream arrives through
`onPtyEvent(id, handler)`.

## The git interface

A **second** trait, `mino_core::transport::GitTransport`, reached from the
first through `Transport::git() -> Option<&dyn GitTransport>` and mirrored in
TypeScript as `client.git`. Twenty-five git methods on one trait would make
every implementation file and the stub macro grow for reasons that have nothing
to do with cohesion - see `plan/decisions.md` D2. In Rust the surface is split
across five supertraits and in TypeScript across five modules; callers see one
object either way.

| Function (file) | Method · Endpoint | Params / Body | Returns |
| --- | --- | --- | --- |
| `repository` (`transport/git.rs`) | Tauri `git_repository` · agent *(not yet)* | – | `GitRepository \| null` |
| `status` (`transport/git.rs`) | Tauri `git_status` · agent *(not yet)* | – | `GitStatus` |
| `stage` (`transport/git.rs`) | Tauri `git_stage` · agent *(not yet)* | `paths: string[]` | `void` |
| `unstage` (`transport/git.rs`) | Tauri `git_unstage` · agent *(not yet)* | `paths: string[]` | `void` |
| `discard` (`transport/git.rs`) | Tauri `git_discard` · agent *(not yet)* | `paths: string[]` | `void` |
| `commit` (`transport/git.rs`) | Tauri `git_commit` · agent *(not yet)* | `request: CommitRequest` | `GitCommit` |
| `diff` (`transport/git.rs`) | Tauri `git_diff` · agent *(not yet)* | `request: DiffRequest` | `GitDiff` |
| `log` (`transport/git.rs`) | Tauri `git_log` · agent *(not yet)* | `request: LogRequest` | `GitLog` |
| `show` (`transport/git.rs`) | Tauri `git_show` · agent *(not yet)* | `revision: string` | `GitCommitDetail` |
| `commit_diff` (`transport/git.rs`) | Tauri `git_commit_diff` · agent *(not yet)* | `revision: string`, `path: string \| null` | `GitDiff` |
| `blame` (`transport/git.rs`) | Tauri `git_blame` · agent *(not yet)* | `path: string` | `GitBlame` |

`repository` returning `null` is an **answer**, not a failure: most folders are
not repositories, and the UI renders that as a quiet state. Git being absent
from the target *is* a failure, reported once by this call so every git surface
can go quiet for the session rather than failing per call.

`status` rejects with `invalidArgument` when the folder is not a repository, so
a caller that skipped `repository` is told rather than handed an empty status.

On the four mutating methods an **empty `paths` array means everything** - it
is what the group-level controls send - and every path is guarded against the
connected root before git is spawned. `discard` is the only call on this
interface that destroys data; see the discard rule in
[git-module.md](git-module.md).

### The branch and stash half

Eight more methods on the same trait, reached the same way. They are listed
apart because they are the first calls on this interface that **change files
under the other panes**: after a checkout or a stash, some open paths hold
different bytes and some are not there at all.

| Function (file) | Method · Endpoint | Params / Body | Returns |
| --- | --- | --- | --- |
| `branches` (`transport/git/branches.rs`) | Tauri `git_branches` · agent *(not yet)* | – | `GitBranch[]` |
| `checkout` (`transport/git/branches.rs`) | Tauri `git_checkout` · agent *(not yet)* | `name: string` | `void` |
| `create_branch` (`transport/git/branches.rs`) | Tauri `git_create_branch` · agent *(not yet)* | `request: CreateBranchRequest` | `GitBranch` |
| `delete_branch` (`transport/git/branches.rs`) | Tauri `git_delete_branch` · agent *(not yet)* | `name: string`, `force: boolean` | `void` |
| `stash_list` (`transport/git/stash.rs`) | Tauri `git_stash_list` · agent *(not yet)* | – | `GitStash[]` |
| `stash_push` (`transport/git/stash.rs`) | Tauri `git_stash_push` · agent *(not yet)* | `request: StashRequest` | `void` |
| `stash_apply` (`transport/git/stash.rs`) | Tauri `git_stash_apply` · agent *(not yet)* | `index: number`, `pop: boolean` | `void` |
| `stash_drop` (`transport/git/stash.rs`) | Tauri `git_stash_drop` · agent *(not yet)* | `index: number` | `void` |

A branch **name** is a caller value and is checked twice: locally for anything
readable as an option, then by `git check-ref-format` for git's own rules. A
stash **index** is not a string at all - a `u32` becomes `stash@{N}` in Rust,
so no caller text reaches the selector.

**An index is a position, not an identity.** Dropping an entry renumbers every
entry below it, so every call that takes one is followed by a re-read rather
than a local edit of the list.

`delete_branch` with `force`, and `stash_drop`, are the two destructive calls
here: what they remove is reachable only through the reflog afterwards, which
this app does not offer. Both are confirmed in the UI first.

```ts
GitBranch          = { name: string, isHead: boolean, isRemote: boolean,
                       upstream: string | null, ahead: number, behind: number,
                       lastCommit: GitCommit | null }
CreateBranchRequest = { name: string, from: string | null, checkout: boolean }
StashRequest       = { message: string | null, includeUntracked: boolean }
GitStash           = { index: number, message: string, branch: string | null,
                       timestampMs: number }
```

### The remote and conflict half

Six more methods on the same trait, reached the same way. They are listed
apart because they are the only calls in this application that **leave the
machine**, and the only ones that can be asked for a credential.

| Function (file) | Method · Endpoint | Params / Body | Returns |
| --- | --- | --- | --- |
| `remotes` (`transport/git/remote.rs`) | Tauri `git_remotes` · agent *(not yet)* | – | `GitRemote[]` |
| `fetch` (`transport/git/remote.rs`) | Tauri `git_fetch` · agent *(not yet)* | `remote: string \| null` | `GitFetchResult` |
| `pull` (`transport/git/remote.rs`) | Tauri `git_pull` · agent *(not yet)* | `request: PullRequest` | `GitPullResult` |
| `push` (`transport/git/remote.rs`) | Tauri `git_push` · agent *(not yet)* | `request: PushRequest` | `GitPushResult` |
| `conflicts` (`transport/git/conflict.rs`) | Tauri `git_conflicts` · agent *(not yet)* | – | `GitConflict[]` |
| `resolve` (`transport/git/conflict.rs`) | Tauri `git_resolve` · agent *(not yet)* | `path: string`, `resolution: ConflictResolution` | `void` |

**No credential passes through any of them, and there is none to pass.**
`plan/decisions.md` D3 settled that git authenticates with its own credential
helper, the SSH agent or the OS keychain; nothing in this process reads, holds,
forwards or logs a secret. Every one of these runs with `GIT_TERMINAL_PROMPT=0`
and a two-minute ceiling, so a machine with no helper configured gets a sentence
naming what to set up rather than a pane that never finishes.

**Every string they return is redacted.** A remote URL can carry a token, and
git prints remote URLs unprompted - so `GitRemote`'s two URLs and every
`summary` and error sentence have been through `mino_core::git::redact` before
they cross this boundary.

`pull` **rejects** when the working tree is dirty, rather than merging over it
or stashing on the reader's behalf. `push` **rejects** when the remote refuses,
with a sentence saying nothing was pushed; it is never retried as a force push.

```ts
GitRemote        = { name: string, fetchUrl: string, pushUrl: string }

// A request to *perform* a pull. Not a GitHub pull request - that is
// `GitHubPullRequest`, which is a different thing entirely.
PullRequest      = { remote: string | null, rebase: boolean }
PushRequest      = { remote: string | null, branch: string | null,
                     force: boolean, setUpstream: boolean }

GitPullOutcome   = "alreadyUpToDate" | "fastForwarded" | "merged"
                 | "rebased" | "conflicted"
GitPushOutcome   = "pushed" | "alreadyUpToDate"

GitFetchResult   = { remote: string, summary: string | null }
GitPullResult    = { remote: string, outcome: GitPullOutcome,
                     summary: string | null }
GitPushResult    = { remote: string, branch: string, outcome: GitPushOutcome,
                     summary: string | null, forced: boolean }

GitConflictKind  = "bothModified" | "bothAdded" | "bothDeleted" | "addedByUs"
                 | "addedByThem" | "deletedByUs" | "deletedByThem"
GitConflict      = { path: string, relativePath: string,
                     kind: GitConflictKind }
ConflictResolution = "ours" | "theirs" | "manual"
```

`GitPullOutcome.conflicted` is a **state, not a failure**: the merge stopped,
the files are where it left them, and `conflicts()` is how they get settled.

`PushRequest.force` sends `--force-with-lease`, never `--force`, so a push
refuses rather than overwriting work this repository has never seen. It is a
separate, explicitly confirmed action and never a fallback.

`ConflictResolution.manual` discards nothing: it takes the file exactly as it
is on disk and marks it resolved, which is what makes editing a conflicted file
in the viewer a first-class way to settle one.

## The GitHub interface

A **third** trait, `mino_core::transport::GitHubTransport`, reached from the
first through `Transport::github() -> Option<&dyn GitHubTransport>` and
mirrored in TypeScript as `client.github`. The argument for a separate trait is
the one `plan/decisions.md` D2 makes about git, inherited rather than re-made.

Two methods, not ten. Five features share one enumerated query rather than each
bringing a method, a Tauri command and a client method of its own - see
[github-module.md](github-module.md).

| Function (file) | Method · Endpoint | Params / Body | Returns |
| --- | --- | --- | --- |
| `probe` (`transport/github.rs`) | Tauri `github_probe` · agent *(not yet)* | – | `GitHubProbe` |
| `query` (`transport/github.rs`) | Tauri `github_query` · agent *(not yet)* | `request: GitHubQuery` | `GitHubResponse` |

**No credential passes through either of them, and there is none to pass.**
Every call ends in a `gh` process that owns its own authentication in the
operating system keychain. Nothing in `mino-core`, in the Tauri command layer
or in the client reads, holds, forwards or logs a token.

`probe` has four answers and they are four different facts - `absent`,
`unauthenticated`, `unsupported`, `ready` - and only the last permits a
`query`. **None of the first three is an error**; an `Err` from `probe` means
something else went wrong entirely.

`query` rejects with `invalidArgument` when the session's probe is not `ready`,
so a section that skipped the probe is told rather than producing an obscure
`gh` failure two layers down. Every call is bounded by a 20-second timeout
locally and 30 over SSH, because these go over the network.

```ts
GitHubAvailability = "absent" | "unauthenticated" | "unsupported" | "ready"
GitHubRepository   = { nameWithOwner: string, url: string,
                       defaultBranch: string | null }
GitHubProbe        = { availability: GitHubAvailability,
                       repository: GitHubRepository | null,
                       detail: string | null }

GitHubQuery =
  | { kind: "runs",              detail: { branch: string, limit: number } }
  | { kind: "runJobs",           detail: { runId: number } }
  | { kind: "pullRequests",      detail: { state: PrState, limit: number } }
  | { kind: "pullRequest",       detail: { number: number } }
  | { kind: "issues",            detail: { state: IssueState, limit: number } }
  | { kind: "createPullRequest", detail: { title: string, body: string,
                                           base: string, draft: boolean } }
  | { kind: "browseUrl",         detail: { path: string, line: number | null,
                                           branch: string | null } }
  | { kind: "reviewComments",    detail: { number: number } }
  | { kind: "replyToReviewComment",
      detail: { number: number, commentId: number, body: string } }

GitHubResponse =
  | { kind: "runs",         detail: GitHubRun[] }
  | { kind: "jobs",         detail: GitHubJob[] }
  | { kind: "pullRequests", detail: GitHubPullRequest[] }
  | { kind: "pullRequest",  detail: GitHubPullRequest }
  | { kind: "issues",       detail: GitHubIssue[] }
  | { kind: "created",      detail: GitHubCreated }
  | { kind: "url",          detail: string }
  | { kind: "reviewThreads", detail: GitHubReviewThread[] }
  | { kind: "reviewThread",  detail: GitHubReviewThread }

PrState          = "open" | "closed" | "merged" | "all"
IssueState       = "open" | "closed" | "all"
GitHubCheckState = "pending" | "running" | "passed" | "failed"
                 | "cancelled" | "skipped" | "unknown"

GitHubRun         = { id: number, workflow: string, title: string,
                      branch: string, state: GitHubCheckState, url: string,
                      startedMs: number | null }
GitHubJob         = { name: string, state: GitHubCheckState, url: string | null }
GitHubPullRequest = { number: number, title: string, author: string, url: string,
                      state: "open" | "closed" | "merged", isDraft: boolean,
                      headRef: string, baseRef: string,
                      checks: GitHubCheckState, updatedMs: number | null,
                      body: string | null }
GitHubIssue       = { number: number, title: string, author: string, url: string,
                      state: "open" | "closed", labels: string[],
                      updatedMs: number | null }
GitHubCreated     = { url: string, number: number | null }

GitHubReviewComment = { id: number, author: string, body: string,
                        url: string, createdMs: number | null }
GitHubReviewThread  = { id: number, path: string, line: number | null,
                        outdated: boolean, resolved: boolean,
                        comments: GitHubReviewComment[] }
```

`GitHubReviewThread.line` is `null` exactly when `outdated` is true, and that
pair is the whole of #17's hard part. A review comment is anchored to a
position in a **diff**, not to a line in a file; when the pull request gains
commits, that position is gone. Such a thread is listed and **never drawn
against a line** - pinning it to `original_line` would put somebody's objection
next to whatever now happens to sit there.

`replyToReviewComment` is the second query that writes. Its body travels to
`gh` as JSON on **stdin**, and it answers with the thread **re-read** rather
than with the one comment `gh` hands back.

`GitHubQuery` is an **enum, not a string**: a caller picks a variant and the
`gh` subcommand behind it lives in Rust. There is no shape of this type that
names a subcommand or adds a flag. `createPullRequest` is the only variant that
writes; its `body` travels to `gh` on **stdin** rather than in argv, and the UI
confirms before sending it.

Every text field that came back is **untrusted input** - written by whoever
opened the pull request or filed the issue. It is rendered as text, never as
markup, and never sent back to `gh`.

## Request and response shapes

```ts
ConnectionTarget =
  | { kind: "local",       detail: { root: string } }
  | { kind: "ssh",         detail: { host: string, port: number, user: string,
                                     root: string, identityPath: string | null } }
  | { kind: "remoteAgent", detail: { url: string, root: string } }

ConnectionInfo   = { id: string, kind: TransportKind, root: string, label: string }
DirEntry         = { path: string, name: string, kind: EntryKind, size: number,
                     modifiedMs: number | null, readonly: boolean, hidden: boolean }
EntryKind        = "file" | "directory" | "symlink" | "other"
ReadFileOptions  = { maxBytes: number | null, allowBinary: boolean }
FilePayload      = { path: string, size: number, encoding: "utf8" | "base64",
                     content: string, extension: string | null }
PtySize          = { cols: number, rows: number }
PtySpawnSpec     = { cwd: string | null, size: PtySize }
PtySession       = { id: PtySessionId, program: string, shell: "nu" | "fallback",
                     cwd: string, size: PtySize, fellBack: boolean }
PtyEvent         = { type: "output", data: string }
                 | { type: "exit",   data: { code: number | null, success: boolean } }
                 | { type: "error",  data: string }
ShellProbe       = { nuAvailable: boolean, nuPath: string | null,
                     fallbackProgram: string, fallbackLabel: string }
SearchQuery      = { query: string, limit: number | null,
                     includeHidden: boolean, includeDirectories: boolean }
SearchHit        = { entry: DirEntry, relativePath: string, score: number,
                     matchIndices: number[] }
SearchHits       = { hits: SearchHit[], truncated: boolean, scanned: number }
StructuredRequest  = { pipeline: string, params: Record<string,string>,
                       cwd: string | null, timeoutMs: number | null }
StructuredOutput   = { value: unknown, stderr: string }

GitRepository    = { root: string, branch: string | null, head: string | null,
                     detached: boolean, upstream: string | null,
                     ahead: number, behind: number }
GitFileState     = "unmodified" | "modified" | "added" | "deleted" | "renamed"
                 | "copied" | "untracked" | "ignored" | "conflicted"
                 | "typeChanged"
GitEntry         = { path: string, relativePath: string,
                     index: GitFileState, worktree: GitFileState,
                     originalPath: string | null }
GitStatus        = { repository: GitRepository, entries: GitEntry[],
                     truncated: boolean }
CommitRequest    = { message: string, all: boolean, amend: boolean }
GitCommit        = { sha: string, shortSha: string, summary: string,
                     author: string, timestampMs: number }
DiffRequest      = { path: string | null, staged: boolean,
                     against: string | null }
GitDiffLineKind  = "context" | "added" | "removed"
GitDiffLine      = { kind: GitDiffLineKind, content: string,
                     oldLine: number | null, newLine: number | null,
                     noNewline: boolean }
GitHunk          = { oldStart: number, oldLines: number, newStart: number,
                     newLines: number, header: string, lines: GitDiffLine[] }
GitFileDiff      = { relativePath: string, oldPath: string | null,
                     binary: boolean, hunks: GitHunk[] }
GitDiff          = { files: GitFileDiff[], truncated: boolean }
LogRequest       = { limit: number | null, skip: number, path: string | null }
GitLog           = { commits: GitCommit[], truncated: boolean }
GitChangedFile   = { relativePath: string, oldPath: string | null,
                     state: GitFileState }
GitCommitDetail  = { commit: GitCommit, files: GitChangedFile[] }
GitBlameLine     = { line: number, sha: string, shortSha: string,
                     author: string, timestampMs: number, summary: string }
GitBlame         = { relativePath: string, lines: GitBlameLine[],
                     truncated: boolean }
```

`GitEntry` carries **two** states because staged-and-then-modified-again is a
real condition: `index` is the staged side and `worktree` the unstaged one.
`GitRepository.root` is the work tree root, which may sit above the connected
root.

### Validation rules

| Field | Rule | Failure |
| --- | --- | --- |
| `ConnectionTarget.local.root` | Must exist and be a directory | `notFound` / `invalidArgument` |
| every `path` | Canonicalises inside the connected root | `pathEscapesRoot` |
| `ReadFileOptions.maxBytes` | Defaults to 2 MiB (`DEFAULT_READ_LIMIT_BYTES`); checked before the read | `tooLarge` |
| file content | NUL byte in the first 8192 bytes, or invalid UTF-8, is binary | `binaryFile` (unless `allowBinary`) |
| `StructuredRequest.pipeline` | Must end in `to json` | `invalidArgument` |
| `StructuredRequest.params` keys | Must match `^[A-Z0-9_]+$`; bound as `$env.MINO_<KEY>` | `invalidArgument` |
| `StructuredRequest.timeoutMs` | Defaults to 10 000 ms, clamped to 60 000 ms | `timeout` |
| `StructuredRequest.cwd` | Resolved through the path guard like any path | `pathEscapesRoot` |
| `PtySize` | `cols`/`rows` raised to at least 1 | – |
| every git argument | Fixed program text; argv only, never a command line | – |
| git working directory (SSH) | Single-quoted; a path containing `'` is refused, not escaped | `invalidArgument` |
| `GitStatus.entries` | Rows outside the connected root are dropped before returning | – |
| `GitStatus.entries` | Capped at 10 000 (`MAX_STATUS_ENTRIES`) | `truncated: true` |
| `git_status` outside a repository | Refused rather than answered with an empty status | `invalidArgument` |
| every git path argument | `..`/`.` segments refused; must sit inside the connected root; the root itself is not a path | `pathEscapesRoot` / `invalidArgument` |
| a batch of git paths | All-or-nothing: one refused path runs none of them | `pathEscapesRoot` |
| `CommitRequest.message` | Non-empty after trimming, at most 64 KiB. Sent on stdin, never in argv | `invalidArgument` |
| `git_commit` with nothing staged | Refused rather than a silent no-op | `invalidArgument` |
| every revision (`against`, `show`, `commit_diff`) | No leading `-`; only `[A-Za-z0-9/._-^~@{}:]`; at most 256 chars. Placed *in front* of `--` | `invalidArgument` |
| `GitDiff` | Cut at 20 000 lines (`MAX_DIFF_LINES`); a binary file reports `binary` and no hunks | `truncated: true` |
| `LogRequest.limit` | Defaults to 50, clamped to 500 | – |
| `git_log` on an unborn branch | An empty page, not an error | – |
| `GitBlame` | Cut at 50 000 lines (`MAX_BLAME_LINES`) | `truncated: true` |

### Error shape

Every failure is one `TransportError`, adjacently tagged, so TypeScript narrows
on `kind`:

```ts
{ kind: "unimplemented",    detail: { feature: string, transport: TransportKind } }
{ kind: "notConnected" }
{ kind: "notFound",         detail: { path: string } }
{ kind: "permissionDenied", detail: { path: string } }
{ kind: "pathEscapesRoot",  detail: { path: string } }
{ kind: "tooLarge",         detail: { path: string, size: number, limit: number } }
{ kind: "binaryFile",       detail: { path: string, size: number } }
{ kind: "ptyNotFound",      detail: { id: string } }
{ kind: "pty" | "shell" | "io" | "protocol" | "invalidArgument",
                            detail: { message: string } }
{ kind: "timeout",          detail: { operation: string, ms: number } }
```

The user-facing sentence for each is produced by
`apps/ui/src/lib/transportError.ts::transportErrorMessage` - the single place
that copy lives.

## The agent daemon surface

`crates/mino-agent`. Binds `127.0.0.1:8731` by default.

| Function (file) | Method · Endpoint | Params / Body | Returns |
| --- | --- | --- | --- |
| `health` (`http.rs`) | `GET /health` | – | `200 {"status":"ok","version":"0.1.0"}` |
| `version` (`http.rs`) | `GET /version` | – | `200 {"name","version","protocol":"1","authenticated":false}` |
| `transport` (`http.rs`) | `POST /transport` | `AgentRequest` JSON | `501 {"result":"error","data":{"kind":"unimplemented",…}}` |
| `upgrade` (`ws.rs`) | `GET /ws` (upgrade) | – | One `Envelope<AgentResponse>` error frame, then close |

Frame schema: `crates/mino-agent/src/protocol.rs`. Requests are
`{ "method": …, "params": … }`, responses `{ "result": …, "data": … }`, both
wrapped in `Envelope { id, body }` for correlation on the socket.

### Open task: authentication

**The agent has no authentication.** That is why:

- `AgentConfig::socket_addr` refuses any non-loopback bind address outright.
  There is no flag that disables the check.
- `POST /transport` parses the body (so the schema is exercised) and then
  refuses; the request never reaches a transport.
- `GET /ws` accepts the upgrade only to send one typed error frame explaining
  why, then closes. No PTY is ever attached.

Before any of these do real work, a token handshake has to land: a shared
secret presented on the upgrade, per-connection session binding, and an
explicit decision on whether the daemon may be reached over anything but an SSH
tunnel. Until then, do not expose the port.
