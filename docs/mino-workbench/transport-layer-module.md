# Flow: transport layer

Opening a session, and everything every other flow routes through.

**Files**

| Layer | Files |
| --- | --- |
| Interface | `crates/mino-core/src/transport.rs`, `src/types/*`, `src/error.rs` |
| Local | `crates/mino-core/src/local/{mod,transport_impl,fs,read,roots,pty,pty_spawn,structured,pipelines}.rs` |
| SSH | `crates/mino-core/src/ssh/mod.rs` |
| Remote agent | `crates/mino-core/src/remote/mod.rs` |
| Shared stub body | `crates/mino-core/src/stub.rs` |
| Dispatch | `apps/desktop/src-tauri/src/{state.rs,commands/*}` |
| Client | `apps/ui/src/transport/*`, `apps/ui/src/Types/modules/api.ts` |
| Entry UI | `apps/ui/src/features/start-screen/*` |

```
App
└─ TransportProvider              createTransport() → Tauri or Agent client
   └─ SessionProvider             useSession: connect / disconnect / shellProbe
      └─ SelectionProvider
         └─ AppShell
            ├─ StartScreen        (no connection)
            │  └─ ConnectionOption × 2   ← useConnectionOptions
            └─ Workbench          (connected)
```

## Choosing an implementation

`mino_core::transport_for(target)` is the only place a transport is
constructed. `AppState::select` calls it and keeps the result; commands take it
from `AppState::current`, which answers `NotConnected` before `connect`.

On the TypeScript side the choice is by **runtime**, not by target:
`createTransport()` returns `TauriTransport` inside the Tauri window and
`AgentTransport` in a plain browser. Inside the window, every target - local,
ssh, remoteAgent - is served by the Rust commands, and Rust picks the
implementation.

## The path guard

`RootGuard` (`local/roots.rs`) holds the canonicalised root pinned at
`connect`. `resolve(path)` canonicalises the requested path and refuses it with
`pathEscapesRoot` unless it sits inside the root. Because canonicalisation
resolves symlinks, a link pointing out of the tree is refused too. Every local
filesystem call - `list_dir`, `stat`, `read_file`, the PTY's `cwd`, and
`run_structured`'s `cwd` - goes through it.

## The structured Nushell channel

`run_structured` runs `nu --no-config-file -c <pipeline>` with:

- the pipeline as **one argv entry**, never a shell line;
- caller values bound as environment variables `MINO_<KEY>`, read inside the
  pipeline as `$env.MINO_<KEY>`;
- keys validated against `^[A-Z0-9_]+$` before the process starts;
- a requirement that the pipeline ends in `to json`;
- `kill_on_drop(true)` plus a timeout, so a hung pipeline cannot outlive its
  call.

This is what makes injection structurally impossible rather than filtered: a
filename containing `; rm -rf /` arrives as the value of an environment
variable.

Pipeline text lives in exactly two places, split by who calls it:
`crates/mino-core/src/local/pipelines.rs` for calls Rust makes (the `ls`
listing), and `apps/ui/src/features/workbench/pipelines.ts` for calls the UI
makes (the breadcrumb's `path split`). Neither duplicates the other.

## UI states

| State | Where | Copy |
| --- | --- | --- |
| Idle | StartScreen | "A Nushell terminal, a file tree and a read-only viewer over one transport." |
| Local option | ConnectionOption | "Open a local folder" / "Choose folder" |
| SSH option | ConnectionOption | "Connect over SSH" / "Set up" |
| SSH form | SshForm | Host, Port, User, Key file - no password box, and no folder |
| Folder picker | FolderPicker | "Choose a working folder" - a listing on SSH, the OS dialog on local |
| Connecting | StartScreen, `role="status"` | "Opening…" |
| Error | StartScreen `Notice variant="danger"` | "Could not open that" + the typed sentence |
| Cancelled picker | – | Nothing happens; cancelling is not an error |
| Connected | Workbench header | `<folder> (local)` plus the breadcrumb |

## The SSH transport

Files go over SFTP and shells over SSH channels, both on one authenticated
connection.

| Concern | Where | Decision |
| --- | --- | --- |
| Host keys | `ssh/handler.rs` | Checked against `known_hosts`. An unknown or changed key is refused; there is no accept-anything mode and no trust-on-first-use. Learning a key is a person's decision and already has a tool - `ssh-keyscan`. |
| Authentication | `ssh/session.rs`, `ssh/agent.rs` | A key file or an SSH agent. Nothing else. |
| Secrets | everywhere | None are held. `ConnectionTarget::Ssh` carries no password or passphrase, the form has no password box, and an encrypted key is delegated to the agent rather than decrypted here. |
| Path guard | `ssh/roots.rs` | `SFTP realpath`, then containment. Split in two because canonicalising is a round trip, not a syscall; `fs::resolve` is the only place the halves are joined. The separator in the prefix test is what stops `/srv/appdata` passing for root `/srv/app`. |
| Listings | `ssh/fs.rs` | SFTP, not `ls` output. A deliberate difference from the local transport, which prefers the Nushell channel: SFTP is always present, returns real metadata, and does not need `nu` installed remotely. Still structured data - nothing is scraped from terminal text. |
| Injection | `ssh/command.rs` | `exec` hands a string to the remote login shell, so that string is built from fixed program text only. Caller values travel as JSON on **stdin**, where `from json \| load-env` binds them - which is why `$env.MINO_PATH` means the same thing on both transports. The one caller value that must reach a command line is the working directory; it is single-quoted, and a value that cannot be quoted safely is refused rather than escaped. |
| PTY ownership | `ssh/pty.rs`, `ssh/pty_drive.rs` | A russh `Channel` cannot be split - reading takes `&mut self`, writing `&self` - so one task owns each channel and writes, resizes and closes arrive as commands. `Channel::wait` is an mpsc receive, so the `select!` cannot drop a message. |
| Teardown | `ssh/pty.rs` | `close_all` runs before the connection drops, so no remote shell outlives the window. |
| Choosing the root | `ssh/reroot.rs` | The form does not ask for a folder: remote paths are not knowable before connecting, so a fresh session roots at the account's home (`realpath(".")`) and the folder is chosen afterwards from a real listing. Applying that choice is a `connect` with a new root, which the transport recognises as the same endpoint and serves from the live connection - no second authentication, and no second prompt from the agent. |

## Phase 2 notes

`RemoteAgentTransport` carries a `dial` entry point written against
`tokio_tungstenite::connect_async`, unused until the agent authenticates. It
still uses the shared `unimplemented_transport!` macro so its body cannot drift
from the trait.
