# Overview

## Scope

Phase 1 of Mino Workbench: the local transport working end to end behind an
interface that already has three implementations. Covered here are the Rust
core, the agent daemon skeleton, the Tauri desktop shell and the React UI with
its three panes.

Not in scope for phase 1: SSH and remote-agent implementations (scaffolded,
returning typed errors), agent authentication (documented open task), writing
files, and any i18n (this app is English only). The viewer edits and saves
files; `write_file` is the only write in the app and carries the same path
guard as every read.

## Architecture

```
apps/ui (React 19 + TS)
  panes --> TransportClient (interface, apps/ui/src/Types/modules/api.ts)
                 |-- TauriTransport  --invoke--> apps/desktop/src-tauri/src/commands/*
                 `-- AgentTransport  --ws------> crates/mino-agent  (declared, not built)
                                                        |
apps/desktop/src-tauri  -- dispatch only ---------------+
                                                        v
                                          crates/mino-core::Transport
                                            |-- LocalTransport        (working)
                                            |-- SshTransport          (russh + SFTP)
                                            `-- RemoteAgentTransport  (Unimplemented)
```

`mino-core` depends on neither Tauri nor a web framework, which is what lets
the daemon and the desktop app share exactly one behaviour.

## Route map (the transport method map)

The transport is this app's API; these methods are its routes. Full signatures
and their Tauri/agent counterparts are in [endpoints.md](endpoints.md).

| Method | Purpose |
| --- | --- |
| `connect` / `disconnect` | Open or tear down a session against a target, pinning the root |
| `list_dir` | One directory level, lazily |
| `search_files` | The whole tree, bounded: fuzzy filename search |
| `stat` | Metadata for one path |
| `read_file` | File contents behind the size ceiling and the binary sniff |
| `open_pty` / `write_pty` / `resize_pty` / `close_pty` | Interactive shell session |
| `run_structured` | Non-interactive Nushell call returning parsed JSON |
| `probe_shell` | Is `nu` on PATH, and what is spawned instead |

## Flow

```
StartScreen
  `- useConnectionOptions
       |- local  -> dialog.open({directory:true}) -> connect({kind:"local"})
       `- ssh    -> SSH form (host, user, key - no folder)
                 -> connect({kind:"ssh", root:null}) -> known_hosts check
                 -> key file or agent -> SFTP + shell channels
                 -> opens at the remote home; folder chosen after

connected
  `- Workbench (persisted splits)
       |- WorkbenchHeader -> Breadcrumb -> run_structured("path split")
       |                                    `-> fails -> splitSegments() in TS
       |- ActivityBar   -> useSidebarState -> which view shows, or none
       |- SidebarPanel  -> FileTreePane -> useFileTreePane -> useFileTree
       |                |                                     `-> list_dir per expand
       |                `- SearchPane  -> useFileSearch -> search_files (debounced)
       |- ViewerPane    -> useFileViewer   -> read_file -> useCodeMirror
       `- TerminalPane  -> useTerminalSession -> open_pty + onPtyEvent
                                              -> useTerminalResize -> resize_pty
```

## Type generation

Rust owns the domain types; `ts-rs` 10.1 exports them to
`apps/ui/src/Types/generated/`, one file per type plus an `index.ts` barrel.
The output is checked in so the UI type-checks without a Rust toolchain, and
regenerated with `npm run gen:types` (which sets `TS_RS_EXPORT_DIR` and runs
`cargo test -p mino-core`). Generated files are never edited by hand.

64-bit integer fields carry `#[ts(type = "number")]` because `serde_json` puts
them on the wire as JSON numbers, while ts-rs would otherwise emit `bigint`.

## Pinned versions

Every dependency is pinned. Rust versions are in the workspace `Cargo.toml`
under `[workspace.dependencies]`; JavaScript versions in `apps/ui/package.json`
and the root `package.json`.

| Area | Crate / package | Version |
| --- | --- | --- |
| PTY | `portable-pty` | 0.8.1 |
| Async | `tokio` | 1.42.0 |
| Errors | `thiserror` | 2.0.9 |
| TS export | `ts-rs` | 10.1.0 |
| PATH lookup | `which` | 7.0.1 |
| SSH (phase 2) | `russh` / `russh-sftp` | 0.49.0 / 2.0.5 |
| WebSocket (phase 2) | `tokio-tungstenite` | 0.24.0 |
| Agent HTTP | `axum` | 0.8.1 |
| Desktop | `tauri` / `tauri-build` / `tauri-plugin-dialog` | 2.1.1 / 2.0.4 / 2.0.4 |
| UI | `react` / `vite` / `typescript` | 19.0.0 / 6.0.7 / 5.7.2 |
| Terminal | `@xterm/xterm` / `@xterm/addon-fit` | 5.5.0 / 0.10.0 |
| Editor | `@codemirror/view` / `@codemirror/state` | 6.35.3 / 6.5.0 |
| Layout | `react-resizable-panels` | 2.1.7 |
| Tests | `vitest` / `@playwright/test` | 2.1.8 / 1.49.1 |

Nushell itself is **not** a dependency. It is driven as a process, in a PTY and
through the non-interactive structured channel. `nu-engine`, `nu-protocol`,
`nu-cli` and `embed-nu` are deliberately absent.

## Known quirks

- **Structured listings carry less metadata than filesystem listings.** The
  `ls` pipeline asks for the three columns every Nushell version agrees on
  (`name`, `type`, `size`), so `modifiedMs` comes back `null` and `readonly`
  comes back `false` from the structured path. The filesystem degrade path
  fills both. Nothing in the UI depends on either field yet.
- **Windows paths are canonicalised to the `\\?\` extended-length form.**
  Everything the UI sees goes through `display_path`, which strips it. Compare
  canonical paths, never displayed ones.
- **React StrictMode opens two PTY sessions in development.** The first is
  closed immediately by the effect cleanup. This is correct teardown being
  exercised, not a leak, and it does not happen in a production build.
- **`.nu` files render as plain text in the viewer.** CodeMirror 6 has no
  Nushell grammar; plain text with line numbers beats the wrong highlighting.
- **The SSH start-screen option is `aria-disabled`, not `disabled`.** A truly
  disabled button cannot be focused and cannot explain itself; this one is
  wired to the SSH transport and answers with the typed reason.
- **Symlinks are listed but not followed during a listing.** Following happens
  only when a user selects one, and the path guard re-checks containment then -
  so a symlink pointing outside the root is rejected rather than traversed.
- **In the browser build every target is served by `AgentTransport`.** The
  transport client is chosen by runtime, not by target, so a browser user
  activating the SSH option sees the remote-agent refusal. Inside the Tauri
  window the same click reaches `SshTransport` and reads "SSH connections are
  not available in this build yet."
