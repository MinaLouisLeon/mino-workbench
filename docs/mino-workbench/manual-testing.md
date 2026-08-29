# Manual test guide

QA for Mino Workbench phase 1. Cases are grouped by flow; each scenario is a
per-case table. Continue the numbering when appending; mark a case
**OBSOLETE** rather than deleting it.

The app is English only, so there are no locale or RTL cases. Where a string
gates an assertion, the exact English copy is quoted.

**Fixtures**

| Name | Contents |
| --- | --- |
| `fixture-basic/` | `readme.md` (11 B), `src/` containing `main.rs`, `.hidden`, `notes.txt` |
| `fixture-deep/` | five nested folders, ~200 files in the deepest |
| `fixture-guards/` | `app.bin` (NUL bytes), `big.log` (5 MB), `empty/` (empty folder) |
| `fixture-denied/` | a subfolder with read permission removed (chmod 000, or ACL-denied on Windows) |
| `fixture-link/` | `outside` - a symlink pointing at a folder outside the root |

**Conditions shorthand:** *nu present* = `nu` on PATH; *nu absent* = `nu`
removed from PATH for the session.

---

## 1. Start screen and connecting

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-01 | Any OS, app just launched | Observe the start screen | Heading "Mino Workbench"; two options: "Open a local folder" / "Choose folder", and "Connect over SSH" / "Not available yet" | none | High |
| TC-02 | Any OS, nu present | Click "Open a local folder", pick `fixture-basic/` | Window switches to the three panes; header shows `fixture-basic (local)` | `connect`, then `probe_shell`, `list_dir(root)`, `open_pty` | High |
| TC-03 | Any OS | Click "Open a local folder", then cancel the picker | Nothing happens; still on the start screen, no error shown | none after the cancelled dialog | High |
| TC-04 | Any OS | Tab through the start screen | Focus reaches both options in order, each with a visible ring | none | Medium |
| TC-05 | Any OS | Focus "Open a local folder", press Enter | The folder picker opens | none until a folder is chosen | Medium |
| TC-06 | Any OS | Delete a folder, then reopen it from the picker path | Start screen shows "Could not open that" with "That path is gone: <path>" | `connect` returning `notFound` | Medium |
| TC-07 | Connected to `fixture-basic/` | Click "Close folder" | Returns to the start screen; the terminal's shell process is gone from the OS process list | `disconnect`, then `close_pty` for each session | High |
| TC-08 | Connected | Close the window entirely | No `nu` or fallback shell child process remains | `disconnect` on `WindowEvent::Destroyed` | High |

## 2. File tree pane

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-09 | `fixture-basic/`, nu present | Observe the tree after connecting | `src` listed first (folders before files), then `readme.md`, `notes.txt`; `.hidden` shown dimmed | one `list_dir(root)` only | High |
| TC-10 | `fixture-deep/` | Connect and watch the calls | Only the root level is fetched; nested folders are not read | exactly one `list_dir` | High |
| TC-11 | `fixture-basic/` | Click `src` | Row shows the open chevron and `aria-expanded="true"`; `main.rs` appears indented one level | `list_dir` on the `src` path | High |
| TC-12 | TC-11 done | Click `src` again, then again | Collapses, then re-expands with no second fetch | no further `list_dir` | Medium |
| TC-13 | `fixture-basic/` | Focus `src`, press ArrowRight then ArrowLeft | Expands, then collapses | `list_dir` on the `src` path, once | Medium |
| TC-14 | `fixture-denied/` | Expand the denied subfolder | That row alone shows "You do not have permission to open <path>." in danger colour; sibling rows stay listed | `list_dir` returning `permissionDenied` | High |
| TC-15 | TC-14 done | Collapse and re-expand the denied folder | It re-fetches, so a transient failure is recoverable | `list_dir` again | Low |
| TC-16 | `fixture-guards/` | Expand `empty/` | Nothing appears under it; the tree does not error | `list_dir` returning an empty list | Medium |
| TC-17 | Empty folder as root | Connect to a folder with no entries | "This folder is empty" / "Nothing to show here yet." | `list_dir(root)` returning an empty list | Medium |
| TC-18 | `fixture-deep/`, ~200 files in one folder | Expand the deepest folder | Rows render without a visible stall; scrolling stays smooth | one `list_dir` | Medium |

## 3. Viewer pane

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-19 | Connected, nothing selected | Observe the viewer | "No file selected" / "Choose a file in the tree to read it here." | none | High |
| TC-20 | `fixture-basic/` | Click `readme.md` | Contents render read-only with line numbers; header accessory reads `readme.md` | `read_file` with `maxBytes: null`, `allowBinary: false` | High |
| TC-21 | `fixture-basic/src/main.rs` visible | Click `main.rs` | Rust syntax highlighting is applied | `read_file` | Medium |
| TC-22 | Any `.nu` file | Select it | Renders as plain text with line numbers, not mis-highlighted | `read_file` | Low |
| TC-23 | Viewer showing a file | Type into the editor | Nothing is inserted; the document is read-only | none | High |
| TC-24 | `fixture-guards/` | Select `app.bin` | Warning state "This file is not shown" / "This looks like a binary file (2 KB), so it is not shown here." | `read_file` returning `binaryFile` | High |
| TC-25 | `fixture-guards/` | Select `big.log` (5 MB) | Warning state "This file is not shown" / "This file is 5 MB and the viewer stops at 2 MB. Open it in an external editor instead." | `read_file` returning `tooLarge` | High |
| TC-26 | `fixture-basic/` | Select `readme.md`, delete it on disk, select it again | Danger state "Could not open this file" / "That path is gone: <path>" | `read_file` returning `notFound` | Medium |
| TC-27 | `fixture-denied/` | Select a file inside the denied folder | Danger state "Could not open this file" / "You do not have permission to open <path>." | `read_file` returning `permissionDenied` | High |

## 4. Terminal pane

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-28 | nu present | Connect and look at the terminal | A Nushell prompt appears, rooted at the opened folder; header accessory reads `nu`; no notice | `open_pty` with the root as cwd, then `onPtyEvent` | High |
| TC-29 | nu present | Type `ls` and press Enter | Nushell's table renders in the terminal | `write_pty` per keystroke, including the carriage return | High |
| TC-30 | **nu absent** | Connect | Terminal runs the platform shell; warning notice "Running without Nushell" explaining which shell started and that the tree falls back to a plain listing | `probe_shell` reporting `nuAvailable: false`; `open_pty` returning `fellBack: true` | High |
| TC-31 | **nu absent** | Browse the tree | The tree still lists folders correctly, via the filesystem degrade path | `list_dir` still succeeds | High |
| TC-32 | nu present | Drag the horizontal splitter slowly across the window | The terminal reflows continuously; no truncated or doubled lines afterwards | `resize_pty` per settled size, not per pixel | High |
| TC-33 | nu present | Run a command that streams thousands of lines, such as reading `big.log` | Output streams without freezing the window; the terminal stays scrollable; older lines drop past 5000 | a continuous stream of output events on the session channel | High |
| TC-34 | nu present | Run a long-running command, then press Ctrl+C | The command stops; the prompt returns | `write_pty` carrying the interrupt byte | Medium |
| TC-35 | nu present | Type `exit` and press Enter | Info notice "The shell exited" / "The shell exited with code 0. Reopen the folder to start a new session." | an exit event on the session channel | Medium |
| TC-36 | nu present | Click "Close folder" while a command is running | The child process is gone from the OS process list within a second | `close_pty` | High |

## 5. Transport boundaries

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-37 | Desktop build, start screen | Click "Connect over SSH" | The connection form replaces the option list: Host, Port (22), User, Key file - and **no folder field**. Connect is disabled until host and user are filled | none until submit | High |
| TC-38 | Browser build (`npm run dev`), SSH form filled in | Submit | The refusal names the agent, because the browser build routes every target through it: "Remote agent connections are not available in this build yet." | `AgentTransport.connect` returning `Unimplemented` | Medium |
| TC-39 | `fixture-link/` as root | Expand the tree and select the `outside` symlink | The link is listed, and selecting it is refused with "<path> sits outside the folder you opened, so it cannot be read." | `read_file` returning `pathEscapesRoot` | High |
| TC-40 | Connected | Create a file whose name contains shell metacharacters, refresh the tree, select it | It lists and reads as an ordinary file; nothing is deleted and no shell runs | `list_dir` and `read_file` carrying the name as data | High |
| TC-41 | nu present | Watch the breadcrumb after connecting | Shows the folder path split into segments | `run_structured` with the path-split pipeline and the root bound as a parameter | Medium |
| TC-42 | **nu absent** | Watch the breadcrumb | Still correct, from the TypeScript fallback split; no error is shown | `run_structured` rejects; nothing surfaces to the user | Medium |

## 6. Layout

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-43 | Connected | Drag both splitters, quit, relaunch, reopen the folder | The split sizes are restored | none | Medium |
| TC-44 | Connected | Inspect local storage | Only `mino.layout.v1` and `mino.sidebar.v1` are present; no path, credential, key or file content | none | High |
| TC-45 | Connected | Collapse the terminal pane to its minimum, then expand it | No crash; the shell reflows and stays usable | `resize_pty` with cols and rows of at least 1 | Medium |
| TC-46 | Connected | Tab from the header through all three panes | Every pane is reachable; focus rings are visible against the pane background | none | High |

## 7. Per-OS

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-47 | **Windows 11**, nu present | Resize the window and drag the splitter repeatedly | ConPTY resize is applied every time; no stuck line-wrap, no ghost cursor column | `resize_pty` per settled size | High |
| TC-48 | **Windows 11**, nu present | Type `exit` in the terminal | The exit notice appears and the shell disappears from Task Manager | an exit event, then `close_pty` on teardown | High |
| TC-49 | **Windows 11** | Open a folder whose path contains spaces and a non-ASCII character | Tree, viewer and terminal all work; the breadcrumb shows the path without the extended-length prefix | `list_dir`, `read_file` | High |
| TC-50 | **macOS**, nu present | Close the folder while `nu` is running, then list processes | No orphaned `nu` process | `close_pty`, which kills and reaps the child | High |
| TC-51 | **macOS** | Quit with Cmd+Q while the terminal is busy | Every child is reaped; no zombie process remains | `disconnect` on window destroy | High |
| TC-52 | **Linux**, nu present | Close the folder, then inspect the process tree | No orphaned shell or `nu` under the app | `close_pty` | High |
| TC-53 | **Linux** (WebKitGTK WebView), nu present | Run a command producing several thousand lines | Rendering keeps up; the window stays responsive; scrollback caps at 5000 lines | a continuous stream of output events | High |
| TC-54 | **Linux**, nu absent | Connect | Falls back to the login shell, or `/bin/sh` when it is unset, and names it in the notice | `probe_shell`, then `open_pty` returning `fellBack: true` | Medium |

## 8. Agent daemon

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-55 | Terminal | `npm run agent` | Starts, logs that it is listening on loopback at port 8731, plus the warning that authentication is not implemented | none | High |
| TC-56 | Agent running | Request `/health` | `200` with a status of `ok` and the version | `GET /health` | High |
| TC-57 | Agent running | Request `/version` | `200` reporting protocol `1` and `authenticated: false` | `GET /version` | Medium |
| TC-58 | Agent running | POST a valid transport request body to `/transport` | `501` with a typed unimplemented error; nothing is listed and no process starts | `POST /transport` | High |
| TC-59 | Agent running | Open a WebSocket to `/ws` | One JSON error frame naming the missing authentication, then the socket closes. No PTY is attached | `GET /ws` | High |
| TC-60 | Terminal | Start the agent with a non-loopback bind address | The process refuses to start and explains that the agent has no authentication yet | none | High |

## 10. SSH transport

Needs a reachable host. A container or VM with `sshd` is enough; a second
account on the same machine works too. Cases marked **security** are the ones
that must not regress - each is a guard that fails closed.

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-61 | Host in `known_hosts`, key loaded in the agent, Key file left empty | Fill the form and connect | The three panes open **at the account's home directory**, because the form never asked for a folder. The title bar reads `<folder> (user@host)` | `connect` with `root: null` -> `probe_shell` -> `list_dir` | High |
| TC-62 | Host in `known_hosts`, unencrypted key file named | Connect | Same as TC-61 | `connect` authenticating with the named key | High |
| TC-63 | **security** - host *not* in `known_hosts` | Connect | Refused, naming the `ssh-keyscan` command to add it. No session opens | `connect` returning `protocol` | High |
| TC-64 | **security** - `known_hosts` entry edited so the key no longer matches | Connect | Refused, saying the key does not match what is on record and that this is what a machine-in-the-middle looks like | `connect` returning `protocol` | High |
| TC-65 | **security** - encrypted key file named, agent not holding it | Connect | Refused, pointing at `ssh-add`. The app must not prompt for a passphrase anywhere | `connect` returning `protocol` | High |
| TC-66 | Agent running but holding no keys, Key file empty | Connect | Refused, saying the agent holds no keys | `connect` returning `protocol` | Medium |
| TC-67 | Wrong user name, everything else valid | Connect | Refused, naming the user the host rejected | `connect` returning `protocol` | Medium |
| TC-68 | Connected | Expand a directory in the tree | Children load one level, directories first, then case-insensitive by name - the same order as a local session | `list_dir` over SFTP | High |
| TC-69 | Connected, remote has `nu` | Watch the terminal | A remote Nushell prompt, rooted at the session folder. No fallback notice | `open_pty` with `fellBack: false` | High |
| TC-70 | Connected, remote has **no** `nu` | Watch the terminal | The login shell runs instead, with the visible non-blocking fallback notice naming it | `open_pty` with `fellBack: true` | High |
| TC-71 | Connected | Drag the terminal split, then run `tput cols` remotely | The reported width follows the pane | `resize_pty` -> SSH `window_change` | Medium |
| TC-72 | Connected | Select a remote text file | It renders read-only with the right language | `read_file` over SFTP | High |
| TC-73 | **security** - connected | Select a remote file larger than 2 MiB | Refused with the size notice. Confirm on the host that the file was never transferred (the size is checked before the read) | `read_file` returning `tooLarge` | High |
| TC-74 | **security** - connected | Select a remote binary file | Refused with the binary notice | `read_file` returning `binaryFile` | High |
| TC-75 | **security** - connected to root `/srv/app`, with `/srv/appdata` also present | Ask for `/srv/appdata` | Refused as outside the root. The shared prefix must not be treated as containment | `list_dir` returning `pathEscapesRoot` | High |
| TC-76 | **security** - connected | Create a remote file named `` a';touch /tmp/pwned;'b `` and refresh the tree | It lists as ordinary data. `/tmp/pwned` must not exist afterwards | `list_dir` carrying the name as data | High |
| TC-77 | **security** - connected, remote has `nu` | Watch the breadcrumb | It fills in from the structured channel. On the host, confirm no parameter value appears in the command line (`ps` during the call, or sshd logs): values arrive on stdin | `run_structured` | High |
| TC-78 | Connected, remote has **no** `nu` | Watch the breadcrumb | Still correct, from the TypeScript fallback split; no error is shown | `run_structured` rejects; nothing surfaces | Medium |
| TC-79 | Connected with a terminal open | Close the window | On the host, confirm the remote shell process is gone | `disconnect` -> `close_all` | High |
| TC-80 | Connected | Pull the network cable / block the port | The terminal reports the session ended rather than hanging silently | PTY event stream ends | Medium |
| TC-81 | **security** - any SSH session | Search `~/.config`, local storage and the logs for the host, user or key path after disconnecting | No credential, key material or passphrase is stored anywhere. Layout preferences only | none | High |

## 11. Choosing the working folder

The folder is picked after connecting, not before: remote paths are not
knowable until there is a session to list them with. A native dialog can only
browse the machine the app runs on, so a remote session gets an in-app listing
instead - which is what these cases separate.

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-82 | SSH session open at home | Click "Change folder" | An in-app dialog opens listing the **directories** in the current folder. Files are not listed - a file cannot be a working folder | `list_dir` on the session root | High |
| TC-83 | Picker open | Click a sub-folder | The list moves into it and the path above updates | `list_dir` on the child | High |
| TC-84 | Picker open on the wanted folder | Click "Use this folder" | The picker closes; the tree, breadcrumb and title move to it. On SSH, confirm from the host's auth log that **no second authentication happened** - the live connection is reused | `connect` with the new root | High |
| TC-85 | Picker open | Type an absolute path outside the current root and press Enter | The session re-roots there. This is the only way out of the current root, and it is deliberate: browsing is confined, re-rooting is explicit | `connect` with the typed root | High |
| TC-86 | Picker open | Click a folder the account cannot read | The dialog stays open and shows the permission error; the list is not silently emptied | `list_dir` returning `permissionDenied` | Medium |
| TC-87 | Picker open | Click "Cancel" | The dialog closes and the session is untouched | none | Medium |
| TC-88 | **Local** session | Click "Change folder" | The *operating system's* dialog opens, not the in-app one | `connect` with the chosen root | High |
| TC-89 | Browser build, local session | Click "Change folder" | Explains that choosing a local folder needs the desktop app | none | Medium |
| TC-90 | SSH session with a terminal open | Change the working folder | The tree and breadcrumb move. The running shell keeps its own working directory - re-rooting the pane does not reach into a live shell | `connect`; no `close_pty` | Medium |

## 12. Terminal splits and colour

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-91 | Connected | Look at the Nushell banner | It is **coloured**. Monochrome output means the child was told the terminal cannot do colour | `open_pty` | High |
| TC-92 | Connected | Run `$env.TERM`, `$env.COLORTERM`, `$env.NO_COLOR?` | `xterm-256color`, `truecolor`, and nothing. `NO_COLOR` must be absent even when the app itself was launched from a shell that sets it | `open_pty` | High |
| TC-93 | Connected | Run `claude` (or any colour-aware CLI) | It renders in colour | `open_pty` | High |
| TC-94 | Connected | Click "Split" | A second shell opens beside the first, with a divider between them. The first shell keeps its scrollback and its running process - splitting must never restart it | one more `open_pty` | High |
| TC-95 | Two or more terminals | Drag the divider | The two columns either side trade width; the others hold still | `resize_pty` on the affected shells | Medium |
| TC-96 | Two or more terminals | Focus the divider and press Left/Right | It moves, so the split is not mouse-only | `resize_pty` | Medium |
| TC-97 | Two terminals | Close one with its ✕ | Only that shell ends. Confirm in a process list that exactly one child went away | one `close_pty` | High |
| TC-98 | One terminal | Look for a close control | There is none: the pane always keeps one shell | none | Medium |
| TC-99 | Four terminals open | Look at "Split" | Disabled, and its tooltip says why | none | Low |
| TC-100 | Several terminals open | Close the window | Every shell ends. No orphaned `nu`/shell processes remain | `disconnect` -> `close_all` | High |

## 13. Editing and saving

The only feature in the app that can destroy work, so most of these are about
refusing to.

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-101 | Connected, a text file selected | Type in the viewer | The text appears; an unsaved marker shows and Save becomes enabled | none yet | High |
| TC-102 | Unsaved edit | Press Ctrl+S (Cmd+S on macOS) | It saves; the marker clears and "Saved" flashes. Confirm the new text is on disk outside the app | `write_file` | High |
| TC-103 | Unsaved edit | Click Save | Same as TC-102 | `write_file` | High |
| TC-104 | Nothing changed since load | Look at Save | Disabled: there is nothing to write | none | Medium |
| TC-105 | **security** - connected | Try to save a path outside the root (via the transport) | Refused with `pathEscapesRoot`, and confirm the file was **not** created | `write_file` refusing | High |
| TC-106 | **data loss** - file open in the editor | Change the file in another program, then save in the workbench | Refused, saying it changed on disk *and* that your edits are still here. Confirm the other program's change survived and the editor still holds your text | `write_file` returning `conflict` | High |
| TC-107 | After a conflict | Reopen the file | The newer content loads; the stale draft is replaced | `read_file` | Medium |
| TC-108 | **data loss** - unsaved edit | Select another file in the tree, then select the first again | The unsaved text is still there | `read_file` | High |
| TC-109 | **data loss** - unsaved edit | Close the window | The browser/OS asks before discarding | none | High |
| TC-110 | Connected | Select a binary or oversized file | Still refused, with the guard notice. There is nothing to edit | `read_file` guard | Medium |
| TC-111 | Connected | Save, then check the folder | No `.mino-save` staging file is left behind | `write_file` | Medium |
| TC-112 | SSH session, a remote text file open | Edit and save | The remote file changes. Confirm on the host | `write_file` over SFTP | High |
| TC-113 | **security** - SSH session | Try to save outside the remote root | Refused with `pathEscapesRoot`; nothing is created on the host | `write_file` refusing | High |
| TC-114 | Read-only file (permissions) | Try to save | Refused with a permission message; the editor keeps the text | `write_file` returning `permissionDenied` | Medium |

## 14. Sidebar and search

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-115 | Connected | Click the Search icon in the rail | The panel switches to search; the Files icon is no longer lit | none | High |
| TC-116 | Search showing | Click the Search icon again | The panel collapses to just the rail; the editor and terminal take the width | none | High |
| TC-117 | Sidebar collapsed | Click any rail icon | The panel reopens at the width it had before | none | High |
| TC-118 | Connected | Expand a few tree folders, switch to Search and back | The folders are still expanded | none | High |
| TC-119 | Connected | Drag the sidebar's splitter fully shut | The panel collapses and no rail icon stays lit | none | Medium |
| TC-120 | Sidebar collapsed | Quit, relaunch, reopen the folder | It reopens collapsed, on the same view, at its old width | none | Medium |
| TC-121 | Connected | Type part of a filename in Search | Matching files appear, filename first with its folder beside it, matched letters highlighted | `search_files` | High |
| TC-122 | Connected | Type initials only, e.g. `ftp` for `FileTreePane.tsx` | The file is found: letters match in order, not as a substring | `search_files` | High |
| TC-123 | Connected | Type a word quickly | One search runs, not one per letter (watch the log) | a single `search_files` | Medium |
| TC-124 | Search results showing | Click a result | The file opens in the viewer, exactly as a tree row would | `read_file` | High |
| TC-125 | A repo with `node_modules` or `target` | Search for a name that exists in both your source and there | Only the source file is listed | `search_files` | High |
| TC-126 | A very large tree | Search a common letter | It comes back promptly and says it is showing the best matches only | `search_files` with `truncated` | Medium |
| TC-127 | Connected | Search for something that matches nothing | "No matching files", not an empty pane | `search_files` | Medium |
| TC-128 | Search results showing | Clear the box with the X | Back to the prompt; no stale results | none | Medium |
| TC-129 | Connected | Search, then change the working folder | The box empties; no result from the old folder remains | none | High |
| TC-130 | **security** - SSH session | Search for `'; touch /tmp/pwned; '` | Treated as text: it simply matches nothing. Confirm no file was created on the host | `search_files` over SFTP | High |
| TC-131 | SSH session | Search a remote tree | Remote files are found and rank the same way local ones do | `search_files` over SFTP | High |
| TC-132 | Connected | Tab into the rail and through the sidebar | Every rail button is reachable and its focus ring is visible; Enter activates it | none | High |

## 15. Git

Every case here has a **not a repository** twin worth trying once: open a plain
folder and confirm the workbench looks exactly as it did before git existed -
no badges, no header strip, no error.

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-133 | A git repository open | Look at the header | The branch name is shown beside the folder | `git_repository` | High |
| TC-134 | A clean repository | Look at the header | No dirty marker | `git_status` | High |
| TC-135 | Repository with an edited file | Look at the header | A dot marks the branch dirty; hovering explains it | `git_status` | High |
| TC-136 | Branch tracking a remote, with unpushed commits | Look at the header | An up arrow and the count; hovering says "N commits to push" | `git_status` | Medium |
| TC-137 | Branch behind its remote | Look at the header | A down arrow and the count | `git_status` | Medium |
| TC-138 | Detached HEAD (`git checkout --detach`) | Look at the header | "detached" and the short sha, in the warning tone - not an empty space | `git_repository` | Medium |
| TC-139 | Fresh `git init`, no commit yet | Open the folder | The branch name shows; hovering says it has no commits yet | `git_repository` | Medium |
| TC-140 | Repository with an edited file | Look at the tree | An `M` beside the file, and only beside that file | `git_status` | High |
| TC-141 | A newly created, unstaged file | Look at the tree | A `U` beside it | `git_status` | High |
| TC-142 | `git add` a new file | Refocus the window | An `A` appears | `git_status` | High |
| TC-143 | Stage a change, then edit the file again | Look at the tree | `M` - the unstaged side, which is the change you are making now | `git_status` | Medium |
| TC-144 | A file deleted from disk but not from git | Look at the tree | A `D` beside it | `git_status` | Medium |
| TC-145 | `git mv` a file, then look at the tree | The renamed file | An `R` beside the new name | `git_status` | Medium |
| TC-146 | A repository with a merge conflict | Look at the tree | A `!` in the danger tone on the conflicted file | `git_status` | Medium |
| TC-147 | A repository with `node_modules` or `target` ignored | Expand that folder in the tree | The rows are dimmed, like hidden files, and carry no badge | `git_status` | High |
| TC-148 | Repository open, a file edited in the viewer | Press Ctrl+S | The badge appears within a moment, without touching anything else | `write_file`, then `git_status` | High |
| TC-149 | Repository open | Edit a file in another program, then click back into the workbench | The badge updates on focus | `git_status` | High |
| TC-150 | Repository open | Save several files quickly | One status call, not one per save (watch the log) | a single `git_status` | Medium |
| TC-151 | A repository with `.gitignore` | Search for a name that exists only inside an ignored folder | Nothing is found | `search_files` | High |
| TC-152 | A plain folder with a `generated/` directory | Search for a file inside it | It **is** found: with no repository there is nothing to ignore | `search_files` | High |
| TC-153 | **security** - a repository whose root is above the open folder | Open a sub-directory, then look at the tree and header | The branch shows, but only files inside the open folder carry badges | `git_status` | High |
| TC-154 | A repository with a filename containing a space and one containing an accent | Edit both | Both get badges, on the right rows | `git_status` | Medium |
| TC-155 | **security** - SSH session on a remote repository | Look at the header and tree | The remote host's git answers; badges and branch behave as they do locally | `git_status` over SSH | High |
| TC-156 | SSH session, a remote path containing a single quote | Open it | Refused with a clear sentence, not a mangled command | `git_status` refusing | High |
| TC-157 | A machine with `git` renamed off PATH | Open a repository | "git is not available here" in the header, once. The tree, search and the terminal all still work | `git_repository` failing | High |
| TC-158 | Repository open | Run `git commit` in the terminal pane while the workbench is idle | It succeeds: no index lock is held against it | none | High |
| TC-159 | A repository with thousands of changes | Open it | The tree still responds; the list says it is partial rather than implying the rest is clean | `git_status` with `truncated` | Medium |
| TC-160 | Repository open | Tab to a tree row with a badge with a screen reader on | The state is read as a word ("Modified"), not as the letter | none | High |

## 16. Source control

The panel that stages and commits. **TC-176 to TC-180 are data-loss cases** -
run them the way the editor's data-loss cases are run, and check the file on
disk afterwards rather than trusting the UI.

| ID | Preconditions | Steps | Expected result | Expected call(s) | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-161 | A repository with changes | Click the branch icon in the rail | The source control view opens; Files is no longer lit | none | High |
| TC-162 | A plain folder, not a repository | Open the source control view | "Not a repository", no controls, no error | `git_repository` | High |
| TC-163 | A clean repository | Open the source control view | "Nothing to commit", and no groups | `git_status` | High |
| TC-164 | An edited file and a new file | Look at the panel | Both under Changes, with the count `2`; the letters match the file tree's | `git_status` | High |
| TC-165 | `git add` one of them in the terminal, then refocus | Look at the panel | It moves to Staged changes, and the counts follow | `git_status` | High |
| TC-166 | Stage a file, then edit it again | Look at the panel | It appears in **both** groups - that is correct, not a duplicate | `git_status` | High |
| TC-167 | An edited file | Click its `+` | Only that file stages. Confirm with `git status` in the terminal | `git_stage` with one path | High |
| TC-168 | A staged file | Click its `−` | Only that file unstages; the file on disk is unchanged | `git_unstage` | High |
| TC-169 | Several changes | Click `Stage all` on the Changes header | Everything stages, untracked files included | `git_stage` with `[]` | High |
| TC-170 | Several staged | Click `Unstage all` | Everything unstages | `git_unstage` with `[]` | Medium |
| TC-171 | Anything staged | Type a message, click Commit | It commits; the box clears and names the new commit. Confirm with `git log` | `git_commit` | High |
| TC-172 | Anything staged | Type a message, press Ctrl+Enter | Same as TC-171 | `git_commit` | Medium |
| TC-173 | Nothing typed | Look at Commit | Disabled, and it says "Write a commit message first" | none | High |
| TC-174 | A message typed, nothing staged | Look at Commit | Disabled, and it says "Stage something to commit" | none | High |
| TC-175 | **data loss** - a repository with `user.email` unset (`git config --unset user.email`) | Type a long message and commit | It fails with a sentence naming `user.email`, **and the message is still in the box** | `git_commit` failing | High |
| TC-176 | **data loss** - an edited file | Click its discard arrow | A confirmation naming the file. Nothing has happened yet | none | High |
| TC-177 | **data loss** - that confirmation open | Click "Keep my changes" | It closes and the file is untouched. Confirm the edit is still on disk | none | High |
| TC-178 | **data loss** - that confirmation open | Read the confirm button | It says "Discard <file>", not "OK"; "Keep my changes" is the focused button | none | High |
| TC-179 | **data loss** - an edited file | Discard it and confirm | The file returns to its committed content, **and no other file changes**. Check `git status` | `git_discard` with one path | High |
| TC-180 | **data loss** - unsaved edits open in the viewer for that file | Discard it in the panel, then press Ctrl+S in the viewer | The stale draft is gone; saving cannot write back text that was discarded | `git_discard` | High |
| TC-181 | Several edited files plus one untracked | Click `Discard all` | The confirmation counts only the **tracked** ones; the untracked file survives | `git_discard` | High |
| TC-182 | An untracked file | Look at its row | No discard control. Hovering explains there is nothing to restore it from | none | High |
| TC-183 | Any change | Click a row's path | The file opens in the viewer, exactly as a tree row would | `read_file` | High |
| TC-184 | A deleted file (`rm` a tracked file) | Look at the panel and click the row | It appears with `D`; opening it says the file is gone rather than doing nothing | `git_status` | Medium |
| TC-185 | A file with a space and one with an accent in the name | Stage, commit and discard each | All three work on the right file | `git_stage`, `git_commit`, `git_discard` | Medium |
| TC-186 | Any action | Watch the list after it completes | It refreshes once, on completion - not on a timer, and not mid-click | one `git_status` per action | Medium |
| TC-187 | A repository with an in-progress `index.lock` | Try to stage | It fails with git's own sentence, and the list still shows | `git_stage` failing | Medium |
| TC-188 | **security** - SSH session on a remote repository | Stage, commit and discard | All three run on the remote host; confirm with `git log` there | over SSH | High |
| TC-189 | **security** - SSH session, a file whose name contains a single quote | Try to stage it | Refused with a clear sentence, not a mangled command | `git_stage` refusing | High |
| TC-190 | A commit message containing an apostrophe, over SSH | Commit it | It commits with the apostrophe intact - the message goes on stdin, not the command line | `git_commit` over SSH | High |
| TC-191 | A fresh `git init`, one file staged | Unstage it | It unstages. (`git restore --staged` would fail here; the app uses `git reset`) | `git_unstage` | Medium |
| TC-192 | Source control open | Tab through the panel with a screen reader | Every control has a spoken name; the state letter is read as a word | none | High |
