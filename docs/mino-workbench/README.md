# Mino Workbench

> Version: `mino-core` 0.1.0 · Rust 1.98 toolchain, 1.85 MSRV (edition 2021) ·
> Tauri 2.1.1 · React 19.0.0 · Vite 6.0.7 · TypeScript 5.7.2

> A three-pane Nushell workbench - terminal, file tree, editor -
> where every filesystem, PTY and shell call goes through one transport
> interface with three implementations.

## Documents

| Document | What it covers |
| --- | --- |
| [overview.md](overview.md) | Scope, architecture, the transport method map, flow diagram, pinned versions, known quirks |
| [endpoints.md](endpoints.md) | The transport interface (trait method · Tauri command · agent frame) and the agent's HTTP/WS surface |
| [transport-layer-module.md](transport-layer-module.md) | Connecting, the three implementations, the path guard, the structured Nushell channel |
| [terminal-pane-module.md](terminal-pane-module.md) | PTY lifecycle, resize in both directions, the `nu`-missing fallback |
| [file-tree-pane-module.md](file-tree-pane-module.md) | Lazy loading per folder, selection, per-level errors |
| [sidebar-module.md](sidebar-module.md) | The activity rail, the view registry, collapsing, and filename search |
| [viewer-pane-module.md](viewer-pane-module.md) | CodeMirror 6, language selection, binary and size guards |
| [git-module.md](git-module.md) | The git surface: status and badges, staging, discard and commit, and reading history - diff, log, show and blame |
| [components.md](components.md) | Shared presentational components and the compound tree row |
| [state-store.md](state-store.md) | Contexts, hooks, what is persisted and what must never be |
| [manual-testing.md](manual-testing.md) | The QA guide: every scenario, per OS |

## Quick Reference

```
Start screen → pick a folder → connect(local) → ConnectionInfo
                                    ↓
              probe_shell → nu found? → PTY spawns nu
                                     ↘ no → PTY spawns the default shell + notice

Tree row expand → list_dir(path) → nu `ls … | to json` → DirEntry[]
                                 ↘ nu missing/failed → std::fs listing → DirEntry[]

Folder opened → git_repository → in a repo? → git_status → badges + header
                              ↘ no  → nothing at all (not an error)
                              ↘ git missing → one sentence, then quiet
File saved / window focused → debounced git_status → badges refresh

Rail (branch icon) → source control → staged / changed groups
Row + / −          → git_stage / git_unstage(one path) → git_status
Group + / −        → git_stage / git_unstage([])       → git_status
Row discard        → confirm naming the file → git_discard → git_status
                   ↘ cancelled → nothing is called at all
Message + Commit   → git_commit (message on stdin) → git_log → "Committed <sha>"

Viewer header Diff → git_diff(path)        → hunks, parsed in Rust
Viewer header Blame→ git_blame(path)       → a CodeMirror gutter (on demand)
History            → git_log(limit, skip)  → commits, paged
History commit     → git_show(sha)         → the files it touched
History file       → git_commit_diff(sha)  → that commit's diff in the viewer

Rail icon → active view switches (or collapses, if already showing)
Search typed → debounce → search_files(query) → walk + fuzzy rank → SearchHits
                                              ↳ in a repo, .gitignore is skipped too
Search hit    → selection context → read_file(path)

Tree row (file) → selection context → read_file(path)
                                    → size ceiling → binary sniff → FilePayload
                                    ↘ TooLarge / BinaryFile → viewer notice

Terminal keystroke → write_pty(id, data) → shell
Pane resized      → fit() → xterm onResize → resize_pty(id, size)
Shell output      → PtyEvent::Output → Tauri event `pty://<id>` → xterm.write

Window closed → disconnect() → close_all() → children killed
```

## The rule this documentation exists to protect

No UI component and no Tauri command touches the filesystem or spawns a
process. See [CLAUDE.md](../../CLAUDE.md).

## Building on Windows

MSVC (`x86_64-pc-windows-msvc`) is the toolchain Tauri supports on Windows and
the one to prefer. It needs the Visual Studio Build Tools with the C++ workload
and a Windows SDK, which is an elevated install.

The workspace also builds on `x86_64-pc-windows-gnu`, which installs entirely
per-user and needs no administrator. Three things to know if you take that
route, each learned the hard way:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `error calling dlltool 'dlltool.exe': program not found` | rustup's bundled `rust-mingw` has no binutils | Install MinGW-w64 (WinLibs) and put its `bin` on `PATH` |
| `ld.exe: cannot find C:/Users/Your` | GNU `ld` does not quote its own spec paths | Install MinGW to a path with **no spaces**, and set `CARGO_TARGET_DIR` to one too |
| `export ordinal too large` | GNU `ld` cannot export the symbol count Tauri pulls into a `cdylib` | Already handled: the desktop `[lib]` is `rlib` only (see its Cargo.toml) |

`cargo test --workspace` additionally fails to *start* the `mino-desktop` test
harness on the GNU toolchain (`STATUS_ENTRYPOINT_NOT_FOUND`). That crate is
dispatch only and declares no tests, so nothing is lost - run
`cargo test --workspace --exclude mino-desktop` there.
