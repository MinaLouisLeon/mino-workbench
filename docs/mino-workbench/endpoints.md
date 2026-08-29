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
```

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
