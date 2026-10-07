# Run-script module

A ▶ button beside the branch name in the header opens a dropdown of every
script the open folder defines. Choosing one opens a new terminal split and
runs the script in it. The shell stays open at a prompt afterwards, so the
output can be read and the script run again.

| Piece | Where |
| --- | --- |
| Detector table, scan, launch | `crates/mino-core/src/scripts/` |
| Domain types | `crates/mino-core/src/types/scripts.rs` (`ProjectScript`, `ScriptCatalog`, `ScriptRef`, `ScriptSource`) |
| Transport method | `Transport::list_project_scripts`; running is `open_pty` with `PtySpawnSpec.script` |
| Tauri command | `apps/desktop/src-tauri/src/commands/scripts.rs` |
| Header button and dropdown | `apps/ui/src/features/scripts/` |
| Shared terminal stack | `apps/ui/src/features/terminal/context/TerminalStackContext.tsx` |

## What is detected

Each source is one row of `DETECTORS` in
`crates/mino-core/src/scripts/detectors/mod.rs`, in the order the menu shows
them within a folder.

| Source | Reads | Lists | Runs with |
| --- | --- | --- | --- |
| `npm` | `package.json` `scripts` | each script | `npm`/`pnpm`/`yarn`/`bun run <name>`. Picked from `packageManager`, then the lockfile here, then the workspace root's, then npm |
| `deno` | `deno.json` / `deno.jsonc` `tasks` | each task | `deno task <name>` |
| `composer` | `composer.json` `scripts` | each script | `composer run-script <name>` |
| `python` | `pyproject.toml` | `[project.scripts]`, `[tool.poetry.scripts]`, `[tool.pdm.scripts]`, `[tool.poe.tasks]`, hatch's default env scripts | Entry points through `uv run` / `poetry run` / `pdm run`, picked by lockfile, or by name with none. Task tables through their own tool |
| `cargo` | `Cargo.toml` | `build`, `run` (only with `src/main.rs` or `[[bin]]`), `test`, `check` | `cargo` |
| `go` | `go.mod` | `build`, `run` (only beside `main.go`), `test`, `vet` | `go … ./...` |
| `make` | `Makefile` / `makefile` / `GNUmakefile` | explicit targets. Not `.PHONY`-style specials, `%` patterns, `$(VAR)` names or assignments | `make <target>` |
| `just` | `justfile` | recipes. Not settings, aliases, assignments or `_private` ones | `just <recipe>` |
| `task` | `Taskfile.yml` and its spellings | keys under `tasks:` | `task <name>` |
| `gradle` | `build.gradle(.kts)` | `build`, `test`, `clean`, plus `run` with the `application` plugin | `./gradlew` / `.\gradlew.bat` when present, else `gradle` |
| `maven` | `pom.xml` | `compile`, `test`, `package`, `install`, `clean` | `./mvnw` / `.\mvnw.cmd` when present, else `mvn` |
| `dotnet` | `*.sln`, `*.slnx`, `*.csproj`, `*.fsproj`, `*.vbproj` | `build`, `run` (projects only), `test` | `dotnet`, naming the file when the folder holds more than one |
| `file` | the folder and its `scripts/` | `.sh .bash .ps1 .bat .cmd .nu .py` at the root. The same plus `.js .mjs .cjs` in `scripts/`. Not `setup.py`, `conftest.py`, `noxfile.py`, dot- or `_`-files | its interpreter: `sh`/`bash`, `powershell`/`pwsh -NoProfile -File`, `nu`, `python3`/`python`, `node`. A `.bat` runs as itself, on Windows only |

**Adding an ecosystem** takes one file in `detectors/`, one row in `DETECTORS`
and one `ScriptSource` variant (then `npm run gen:types` and a label in
`apps/ui/src/features/scripts/messages.ts`). A detector is a pure function
from a `Folder` (its names, plus the manifests it asked to have read) to
`Candidate`s, so it is tested with strings alone. See
`crates/mino-core/tests/project_scripts_*.rs`.

## Workspaces

The root is scanned, then every member the root declares, one level deep:

- npm `workspaces` (array or `{ packages }`) and `pnpm-workspace.yaml`
- Cargo `[workspace] members`
- `go.work` `use`
- Deno `workspace`
- uv `[tool.uv.workspace] members`

A pattern is a literal folder or a wildcard in its last segment
(`packages/*`, `apps/web-*`). A trailing `/**` is read as `/*`. A `!pattern`
excludes. A wildcard earlier in the path is skipped rather than walked.
`node_modules`, `target`, `.git`, `vendor`, `dist` and `build` are never
members. Past 64 members, or 1000 scripts, the catalog sets `truncated` and
the menu says so.

Every read goes through the transport's own `list_dir` and `read_file`, so the
path guard applies to each manifest exactly as it does to a file opened in the
viewer. A manifest over 512 KiB, a binary one or an unparsable one makes its
detector find nothing. It never fails the scan.

## Running one: the injection rules

This is the part that matters, because a script name is text written by
whoever wrote the repository and it ends up in front of a shell.

1. **The UI never sends a command.** It sends `ScriptRef { source, dir, name }`
   inside `PtySpawnSpec.script`. Rust scans that folder again (`scripts::resolve`)
   and takes the argv from the detector. A manifest edited since the menu
   opened runs as it now reads. A script that has gone is refused with
   `invalidArgument` before any process starts.
2. **The argv is typed.** Each element is `Arg::Fixed(&'static str)`, which
   can only be a literal in `mino-core`, or `Arg::Value(String)`, anything from
   a file. Every `Value` must pass `scripts::safe::safe_value`:
   `[A-Za-z0-9._:/\\@+-]`, at most 200 characters, no leading `-` (so a make
   target cannot become an option) and no `..`. A script that fails is counted
   in `ScriptCatalog.skipped` and the menu says how many were left out. It is
   never escaped instead. `cmd.exe` re-parses the arguments of every `.cmd`
   shim (`npm.cmd`), and escaping for that, PowerShell, Nushell and `sh` at
   once is how injection bugs are written.
3. **The argv reaches the shell as parameters, never as text.** See
   `crates/mino-core/src/scripts/launch.rs`:

| Target | Launch | Where the argv travels |
| --- | --- | --- |
| Local POSIX | `/bin/sh -c SH_RUN <shell> <argv…>` | positional parameters, run as `"$@"`. Then `exec "$0"` becomes the shell |
| SSH | `cd '<dir>' && exec /bin/sh -c 'SH_RUN' '<shell>' '<argv>'…` | the same, each single-quoted by `ssh::command::quote`, which refuses a `'` |
| Windows, Nushell | `nu -e NU_RUN` | `$env.MINO_RUN_ARGV` as JSON, the same `$env.MINO_*` rule as every pipeline |
| Windows, PowerShell | `powershell -NoExit -Command PS_RUN` | `$env:MINO_RUN_ARGV` as JSON. The program is resolved as an *application*, so `npm` finds `npm.cmd` rather than an `npm.ps1` an execution policy would block |
| Windows, `cmd.exe` | refused | `cmd` re-parses whatever it is given. A sentence says Nushell or PowerShell is needed |

`SH_RUN`, `NU_RUN` and `PS_RUN` are fixed program text, and unit tests assert
each contains no character of the quoting it travels through.

**Ctrl+C stops the script, not the terminal.** `sh` traps `INT` while the
script runs, and Nushell and PowerShell return to their prompt. Each launcher
first prints `> <argv>` dimmed, so the split shows what it ran.

## The menu

- **Visible whenever the folder has at least one script**, in or out of a git
  repository. Hidden otherwise: no empty button in the one strip that is always
  on screen. The agent transport answers `Unimplemented`, so the browser build
  hides it too.
- **Scanned again** when a folder opens, every time the menu opens and when the
  window regains focus. Only the newest scan may land.
- **Filter:** every typed word must appear in the name, command, package or
  runner. So `web dev` finds `dev` in the `web` package.
- **Sections:** *Recent* first, then one section per package and source
  (`web · pnpm`, `This folder · make`), in the order Rust found them.
- **Keyboard:** `Ctrl+Shift+R` (or `Cmd+Shift+R`) toggles it from anywhere,
  terminal included. It is listened for in the capture phase so xterm does not
  swallow it, and only claimed while the button exists. In the field, `↑`/`↓`
  wrap, `Home`/`End` jump, `Enter` runs and `Esc` closes and returns focus to
  wherever it was when the menu opened - the button, or the terminal. Focus never leaves the field. The highlighted row is
  `aria-activedescendant` (combobox + listbox).
- **Full pane:** with four shells open, rows are shown but disabled and the
  terminal pane's own "Four shells is the most this pane will hold" heads the
  list.
- **Recent** is stored under `mino.recentScripts.v1`: folder path → up to five
  script keys, each built from source, folder and name, for at most 20 folders. It holds what identifies a
  script, never its command or output.

## The split

`useTerminalStack` now tracks `{ id, script }` per terminal and lives in
`TerminalStackContext`, provided in `Workbench`, because the Split button and
the menu both open splits. A script's split is labelled `▶ pnpm: dev` (the
manager for npm, the source otherwise), with the command in its tooltip.
Closing it closes its session like any other split.

## Known limits

- Make, just and Taskfiles are read by line, not evaluated. Targets built from
  variables, included makefiles and included Taskfiles are not listed.
- Cargo, Go, Gradle, Maven and .NET get their standard commands, not the
  build's full task list. That would mean running the tool.
- A script named with a character outside the safe alphabet (a space, `&`,
  `=`, `,` …) cannot be run from the menu. Run it from the terminal.
- Over SSH the remote host is assumed POSIX, as the shell probe already does.
