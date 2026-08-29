# Phase 5 - GitHub

**Branch** `feat/github-integration`
**Features** #14 CI status, #15 pull request list, #16 create a PR,
#18 issues list, #19 open on github.com
**Depends on** phase 1 only - it needs the branch name and the remote, nothing
else. It can jump the queue if GitHub matters more than local git.

## Goal

Bring the parts of GitHub you check while working into the workbench, without
this application ever holding a credential.

## The credential position

The standing rule is that no credential, token or passphrase is written to
disk, to a log, or to browser storage. This phase honours it by **never having
a token at all**: every call shells out to the `gh` CLI, which owns its own
authentication and stores it in the OS keychain under its own name.

Consequences, and they are worth stating plainly:

- `gh` must be installed and logged in. Where it is not, every GitHub surface
  says so in one sentence and goes quiet - the same shape as the `nu` and
  `git` probes.
- Only GitHub remotes are supported. A GitLab or Bitbucket remote gets the
  same quiet absence, not an error.
- The app cannot offer to log you in. It can only tell you to run
  `gh auth login`, which is the correct division of responsibility.

**`gh` output is untrusted input.** Titles, branch names and bodies come from
whoever opened the PR or issue. They are rendered as text, never as markup,
and never interpolated into a command. This is the same discipline the
transport already applies to filenames.

## Transport surface

```rust
#[async_trait]
pub trait GitHubTransport: Send + Sync + 'static {
    /// Whether `gh` is present and authenticated, and what repository the
    /// remote points at. Cheap enough to call on mount.
    async fn probe(&self) -> Result<GitHubProbe>;

    /// One `gh` subcommand with `--json`, parsed. Program text is fixed and
    /// lives in Rust; caller values travel as argv.
    async fn query(&self, request: GitHubQuery) -> Result<GitHubResponse>;
}
```

The `query` shape deliberately mirrors `run_structured`: a fixed set of
subcommands defined in Rust, caller values as parameters, JSON back. Five
features share two methods rather than needing ten.

```rust
pub enum GitHubQuery {
    Runs { branch: String, limit: u32 },     // gh run list --json ...
    PullRequests { state: PrState, limit: u32 },
    PullRequest { number: u32 },
    Issues { state: IssueState, limit: u32 },
    CreatePullRequest { title: String, body: String, base: String, draft: bool },
    BrowseUrl { path: String, line: Option<u32> },
}
```

`CreatePullRequest` is the one that writes. It is confirmed in the UI before
it runs, shows exactly what will be created, and reports the URL it made.

## UI

A `github` entry in `SIDEBAR_VIEWS` with the `Github` icon, and
`apps/ui/src/features/github/`. Sections, each collapsible:

- **Checks** (#14) - the latest run for the current branch, its conclusion and
  the failing job named. This is the one that earns its place daily.
- **Pull requests** (#15) - open PRs, author, check state; selecting one shows
  its detail.
- **Issues** (#18) - open issues, collapsed by default.
- **New pull request** (#16) - title, body, base; confirms before creating.

**#19 Open on github.com** is not a section but a command on the viewer
header: opens the current file at the current line on the web, through the
Tauri opener rather than a link the page navigates to.

Polling: on mount, on branch change, and on an explicit refresh. **Not on a
timer** - a workbench that quietly makes network calls forever is a surprise,
and the rate limit is real.

## Tests

**Rust**

- The probe reports `gh` absent, present-but-unauthenticated, and ready.
- A non-GitHub remote reports unsupported rather than failing.
- Each query builds the argv it should, with caller values as separate
  arguments - the test asserts no value appears inside a joined string.
- Malformed JSON from `gh` is a typed protocol error, not a panic.
- `BrowseUrl` refuses a path outside the connected root.

**TypeScript** - all through the fake transport, never the network.

- Checks render green, red and in-progress states, and name the failing job.
- PR and issue lists render, and empty states read as sentences.
- `gh` missing: every section shows the one-sentence explanation, and nothing
  else in the app changes.
- Creating a PR confirms first, then shows the resulting URL.
- A title containing markup renders as text.

## Docs

`docs/mino-workbench/github-module.md`, covering the credential position first
because it is the reason the module is shaped this way. Manual QA scenarios
including `gh` logged out and a non-GitHub remote.

## Risks

| Risk | Mitigation |
| --- | --- |
| Rate limits | No timer polling; refresh on mount, branch change and request |
| `gh` output format changes between versions | Always `--json` with explicit fields; a typed protocol error when a field is missing |
| Untrusted PR/issue text | Rendered as text, never markup, never argv |
| Network stalls the pane | Every query has a timeout; the section shows its own loading and error state |
| Creating a PR by accident | Explicit confirmation showing title, base and draft state |

## Out of scope

No merging a PR from here. No review submission - that is #17 in phase 6. No
issue creation or editing. No notifications.
