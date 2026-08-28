# Flow: viewer pane

Read-only CodeMirror 6. Both guards are enforced in the transport; the pane
only presents their verdict.

**Files**

`apps/ui/src/features/viewer/`: `types.ts`, `languages.ts`,
`hooks/useFileViewer.ts`, `hooks/useCodeMirror.ts`,
`components/ViewerPane.tsx`, plus `apps/ui/src/theme/editorTheme.ts`.
Backed by `Transport::read_file`.

```
ViewerPane                    ← useFileViewer (selection → payload | guard)
└─ Pane title="Viewer" accessory=<basename>
   ├─ StatusMessage           (empty / loading / guarded / error)
   └─ div ref=useCodeMirror   aria-label="Contents of <name>"
      └─ EditorView           editable, line numbers, wrapping, language by extension
```

## Guards

| Guard | Where | Threshold | Result |
| --- | --- | --- | --- |
| Size ceiling | `local/read.rs`, checked before the read | 2 MiB (`DEFAULT_READ_LIMIT_BYTES`) | `tooLarge` |
| Binary sniff | `local/read.rs::looks_binary` | NUL byte in the first 8192 bytes, or invalid UTF-8 | `binaryFile` |

Both are *expected outcomes*, not faults: the pane shows them in warning
colour under "This file is not shown", while a real failure (permission
denied, gone) shows in danger colour under "Could not open this file".

`allowBinary` exists on `ReadFileOptions` for a future image previewer; the
viewer never sets it.

## Language selection

By extension, in `languages.ts`: css/scss, html/htm, js/jsx/mjs/cjs, ts/tsx,
json, md/markdown, py, rs. Anything else - `.nu` included, since CodeMirror 6
has no Nushell grammar - renders as plain text with line numbers.

The view is rebuilt when the document or the language changes rather than
reconfigured. Read-only, capped at 2 MiB, so rebuilding is cheap and cannot
leave stale state behind.

## Expected calls

| Action | Call |
| --- | --- |
| Select a file in the tree | `read_file(path, { maxBytes: null, allowBinary: false })` |
| Select a directory row | none; the viewer stays empty |
| Select nothing | none |

## UI states

| State | Condition | Copy |
| --- | --- | --- |
| Empty | nothing selected | "No file selected" / "Choose a file in the tree to read it here." |
| Loading | read in flight | "Loading…" / "Reading the file." |
| Ready | payload returned | the editor, header accessory shows the file name |
| Oversize | `tooLarge` | "This file is not shown" / "This file is 5 MB and the viewer stops at 2 MB. Open it in an external editor instead." |
| Binary | `binaryFile` | "This file is not shown" / "This looks like a binary file (2 KB), so it is not shown here." |
| Denied | `permissionDenied` | "Could not open this file" / "You do not have permission to open <path>." |
| Gone | `notFound` | "Could not open this file" / "That path is gone: <path>" |

## Accessibility

The editor container carries `aria-label="Contents of <name>"`. CodeMirror's
own content is focusable and arrow-navigable in read-only mode, so the pane is
reachable and readable from the keyboard.

## Editing

The pane started read-only and now saves. What that added, and why each piece
is there:

| Concern | Where | Decision |
| --- | --- | --- |
| The write itself | `Transport::write_file` | One method, three implementations, the same path guard as every read. A save outside the connected root is refused before a byte moves - proved by `tests/local_write.rs`. |
| Losing someone else's edit | `WriteRequest::expected_modified_ms` | The editor sends the modification time it loaded; the transport refuses the write if the file has moved on, and returns `Conflict`. Without this a save would silently discard a change made by a build, a formatter, or the terminal in the pane below. |
| Losing your own edit | `drafts.ts` | Unsaved text is remembered per file, so switching in the tree mid-edit and coming back does not discard the buffer. Memory only - nothing unsaved is written anywhere, which keeps the promise that the app persists layout preferences and nothing else. A `beforeunload` guard covers closing the window with edits pending. |
| A half-written file | `local/write.rs` | The write is staged beside the target and renamed over it, so a crash mid-save leaves the old file or the new one, never a truncated one. The SSH writer deliberately does *not* do this: SFTP `rename` is not required to replace an existing file, and staging would break saving on servers without the `posix-rename` extension. |
| Rebuilding the editor | `useCodeMirror` | The view is keyed on a `revision` the loader bumps once per read, never on the document. Keying it on content would rebuild the editor on every keystroke and lose the cursor. `hasContent` is in the dependencies because the document arrives one render after the file loads - without it the effect runs once with nothing to show and never runs again, leaving a blank pane. |

Binary and oversized files are still refused, so there is nothing to edit in
the cases the read guards reject.
