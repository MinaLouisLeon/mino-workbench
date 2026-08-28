# Flow: terminal pane

An interactive Nushell session in a real PTY, with a visible fallback when
`nu` is absent.

**Files**

`apps/ui/src/features/terminal/`: `types.ts`, `messages.ts`,
`hooks/useXterm.ts`, `hooks/useTerminalResize.ts`,
`hooks/useTerminalSession.ts`, `components/TerminalPane.tsx`, plus
`apps/ui/src/theme/terminalTheme.ts`.
Backed by `Transport::open_pty` / `write_pty` / `resize_pty` / `close_pty` and
the `pty://<id>` event channel.

```
TerminalPane                     ← useTerminalSession
└─ Pane title="Terminal" accessory=<program basename>
   ├─ Notice variant="warning"   nu missing → fallback shell
   ├─ Notice variant="danger"    session error
   ├─ Notice variant="info"      shell exited
   └─ div ref=container          aria-label="Interactive shell"
      └─ xterm Terminal + FitAddon
```

## Which shell is spawned

`open_pty` calls `shell::probe()`. If `which nu` finds it, `nu` is spawned with
`shell: "nu"` and `fellBack: false`. Otherwise the platform default is spawned:
`$SHELL` then `/bin/sh` on unix, `powershell.exe` then `%COMSPEC%` then
`cmd.exe` on Windows - with `fellBack: true`, which is what raises the notice.
The name shown in the notice comes from `ShellProbe::fallback_label`, because
the probe names the shell the way the target would; the raw program path is
the fallback when there is no probe. The fallback is never blocking: the
terminal works either way.

## Resize, both directions

```
pane resized → ResizeObserver → (coalesced to one per frame) → FitAddon.fit()
             → xterm recomputes cols/rows → xterm onResize
             → resize_pty(id, {cols, rows}) → master.resize() → SIGWINCH / ConPTY resize
             → the shell repaints → PtyEvent::Output → xterm.write
```

There is exactly one path from "the pane changed size" to "the shell was
told": the observer only refits, and xterm's own `onResize` is what calls the
transport. `PtySize::sanitised` raises 0 to 1, because a collapsed pane would
otherwise ask for a 0×0 grid, which some platforms treat as a fatal ioctl.

## Teardown

The effect cleanup disposes the xterm data and resize listeners, unsubscribes
from the event channel and calls `close_pty`. `close_pty` kills the child,
waits for it, and drops the master, which ends the reader thread at EOF.
`disconnect` closes every session; `WindowEvent::Destroyed` disconnects; and
`PtyRegistry`'s `Drop` closes anything left. No orphaned child processes.

A session opened while teardown was already running is detected (the async
continuation checks its cancelled flag) and closed immediately.

## Expected calls

| Action | Call |
| --- | --- |
| Pane mounts with a connection | `probe_shell()` (at connect), then `open_pty({ cwd: root, size })`, then `onPtyEvent(id, …)` |
| Keystroke | `write_pty(id, data)` |
| Pane or window resized | `resize_pty(id, { cols, rows })` |
| Pane unmounts / folder closed / window closed | `close_pty(id)` |

## UI states

| State | Condition | Copy |
| --- | --- | --- |
| Running | session open, `nu` spawned | no notice; header accessory shows `nu` |
| Fallback | `session.fellBack` | "Running without Nushell" / "Nushell (nu) was not found on your PATH, so this terminal is running zsh instead. The tree falls back to a plain listing. Install Nushell and reopen the folder to get structured output." |
| Error | `open_pty` or `write_pty` failed, or a `PtyEvent::Error` | "Terminal problem" + the typed sentence |
| Exited | `PtyEvent::Exit` | "The shell exited" / "The shell exited with code 0. Reopen the folder to start a new session." |

Copy lives in `features/terminal/messages.ts`, not in the JSX.

## Performance

The reader thread hands 8 KiB chunks to a 512-slot channel, so a burst (`cat`
on a large file) does not stall the shell. Scrollback is capped at 5000 lines.
Refits are coalesced to one per animation frame, so dragging a splitter does
not fire hundreds of ioctls.

## Splits

One pane, up to four shells side by side. Each is a `TerminalInstance` with
its own pty, xterm and notices, so a split shares nothing with its neighbours
and closing one ends exactly one session.

The layout is flex with a hand-rolled divider rather than
`react-resizable-panels`, which the rest of the workbench uses. That is a
deliberate exception: the library does not render panels added to a group
after mount, and its documented answer is to re-key the group - which unmounts
the children. Here that would tear down every running shell just because a new
one was opened, so splitting would restart the terminal you were working in.
See `useTerminalSplitSizes`.

## The terminal environment

A child inherits the app's environment, and for a terminal emulator that is
the wrong default: whatever launched the app would decide whether `nu`, `git`
or `claude` print in colour. Two cases bite in practice - no `TERM` at all,
which is normal on Windows, and an inherited `NO_COLOR`, which most modern CLI
tools honour and which turns the pane monochrome for reasons the user cannot
see.

So the pty declares its own terminal (`local/pty_spawn.rs`): `TERM` is
`xterm-256color`, `COLORTERM` is `truecolor`, and `NO_COLOR` and
`CLICOLOR_FORCE` are cleared. Over SSH the same name is requested in
`request_pty`, so a shell behaves the same on either transport.
