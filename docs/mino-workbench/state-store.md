# State

There is no state library. React context holds what more than one pane needs;
everything else is a hook local to its feature.

## Contexts

| Context | File | Holds | Read by |
| --- | --- | --- | --- |
| `TransportContext` | `src/context/TransportContext.tsx` | the one `TransportClient` | every hook that calls the transport |
| `SessionContext` | `features/workbench/context/SessionContext.tsx` | `status`, `connection`, `shellProbe`, `error`, `connect`, `disconnect` | start screen, header, tree, terminal |
| `SelectionContext` | `features/workbench/context/SelectionContext.tsx` | `selected` entry, `select` | tree writes, viewer reads |
| `TreeRowContext` | `features/file-tree/context/TreeRowContext.tsx` | one row's data and handlers | the row's parts |
| `SidebarContext` | `features/sidebar/context/SidebarContext.tsx` | `activeView`, `collapsed`, `activate`, `setCollapsed` | the rail, the panel, the column hosting them |
| `SearchRowContext` | `features/search/context/SearchRowContext.tsx` | one hit's data and handlers | the row's parts |
| `GitStatusContext` | `features/git/context/GitStatusContext.tsx` | `availability`, `repository`, `entries` by path, `dirty`, `error`, `truncated`, `refresh` | tree rows, the header strip, source control, the editor (to refresh after a save) |
| `DraftsContext` | `features/viewer/context/DraftsContext.tsx` | the session's `DraftStore` | the editor writes it; source control clears a file's draft when it discards that file |
| `ChangeRowContext` | `features/source-control/context/ChangeRowContext.tsx` | one change row's data and handlers | the row's parts |

`TransportProvider` takes an optional `client`, which is the seam tests inject
a fake through. Production calls `createTransport()`.

`GitStatusProvider` is scoped to the workbench, wrapping `SidebarProvider`,
because the header and the tree both read it: one `git status` for the window,
not one per pane and never one per row. Rows *read* status; they are never
handed it.

## Hooks

| Hook | File | Owns |
| --- | --- | --- |
| `useTransport` | `context/TransportContext.tsx` | reading the client out of context |
| `usePersistentState` | `hooks/usePersistentState.ts` | localStorage-mirrored state |
| `useSession` | `features/workbench/hooks/useSession.ts` | connection lifecycle, teardown on unmount |
| `useWorkbenchLayout` | `features/workbench/hooks/useWorkbenchLayout.ts` | persisted split sizes |
| `useSidebarState` | `features/sidebar/hooks/useSidebarState.ts` | persisted active view and collapsed flag |
| `useSidebarPanel` | `features/sidebar/hooks/useSidebarPanel.ts` | keeping that flag and the resizable column in step |
| `useFileSearch` | `features/search/hooks/useFileSearch.ts` | debounced query, ranked hits, the stale-answer guard |
| `useBreadcrumb` | `features/workbench/hooks/useBreadcrumb.ts` | structured `path split`, degrading to a TS split |
| `useFileTree` | `features/file-tree/hooks/useFileTree.ts` | the lazy-load state machine |
| `useFileTreePane` | `features/file-tree/hooks/useFileTreePane.ts` | root, rows, selection, activation |
| `useGitStatus` | `features/git/hooks/useGitStatus.ts` | the two git calls, the stale-answer guard, and the refresh policy |
| `useGitEntry` | `features/git/hooks/useGitEntry.ts` | one path's badge and ignored flag, looked up out of the status |
| `useSourceControl` | `features/source-control/hooks/useSourceControl.ts` | grouping, the action runner, and what each control means |
| `useCommitBox` | `features/source-control/hooks/useCommitBox.ts` | the message, why the button is unavailable, and keeping the text through a failure |
| `useDiscardPrompt` | `features/source-control/hooks/useDiscardPrompt.ts` | the confirmation gate; asking and acting are separate functions |
| `useFileViewer` | `features/viewer/hooks/useFileViewer.ts` | reading the selected file, guard classification |
| `useCodeMirror` | `features/viewer/hooks/useCodeMirror.ts` | the read-only editor instance |
| `useXterm` | `features/terminal/hooks/useXterm.ts` | the terminal instance and its fit addon |
| `useTerminalResize` | `features/terminal/hooks/useTerminalResize.ts` | refit on container resize, coalesced per frame |
| `useTerminalSession` | `features/terminal/hooks/useTerminalSession.ts` | binding one PTY session to one terminal |
| `useConnectionOptions` | `features/start-screen/hooks/useConnectionOptions.ts` | folder picking and connecting |

Components hold no state, no effects and no data fetching. If a pane needs
logic, it gets a hook.

## What is persisted

| Key | Value | Where |
| --- | --- | --- |
| `mino.layout.v1` | `{ tree, viewer, terminal }` split percentages | `localStorage` |
| `mino.sidebar.v1` | `{ activeView, collapsed }` | `localStorage` |

**Nothing else.** No credentials, no private keys, no passphrases, no host
secrets, no file contents, no directory listings, and no git state - branch
names, shas and status entries are read fresh and never written down. An
unsent commit message lives in component state and goes with the window; a
draft lives in `DraftsContext` and does the same. `usePersistentState` is for
layout preferences; a write that fails (storage full or disabled) is swallowed
rather than interrupting the session.

## Rust-side state

| Holder | File | Holds |
| --- | --- | --- |
| `AppState` | `apps/desktop/src-tauri/src/state.rs` | the current `Arc<dyn Transport>` |
| `LocalTransport.root` | `crates/mino-core/src/local/mod.rs` | the canonicalised `RootGuard` |
| `PtyRegistry` | `crates/mino-core/src/local/pty.rs` | live PTY sessions by id |

`connect` tears down the previous transport before selecting a new one, so a
reconnect cannot leave the old session's children running.
