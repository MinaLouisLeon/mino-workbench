import { vi } from "vitest";

import type {
  ConnectionInfo,
  ConnectionTarget,
  DirEntry,
  FilePayload,
  PtyEvent,
  PtyEventHandler,
  PtySession,
  PtySessionId,
  SearchHits,
  SearchQuery,
  ShellProbe,
  StructuredOutput,
  TransportClient,
  TransportError,
  WriteRequest,
} from "@/Types";

import type { FakeGitOptions } from "./fake-git";
import { createFakeGit } from "./fake-git";
import { searchFiles } from "./fake-search";
import { NU_PRESENT_PROBE } from "./fake-shell";

export { CLEAN_REPOSITORY, makeGitEntry } from "./fake-git";
export { EMPTY_DIFF, line, makeFileDiff, makeHunk } from "./fake-git-history";

export interface FakeTransportOptions extends FakeGitOptions {
  listings?: Record<string, DirEntry[]>;
  files?: Record<string, FilePayload>;
  failures?: Record<string, TransportError>;
  shellProbe?: ShellProbe;
  session?: Partial<PtySession>;
  structured?: StructuredOutput;
  /** Paths the search walk would find, relative to the root. */
  searchable?: string[];
}

export function makeEntry(path: string, overrides: Partial<DirEntry> = {}): DirEntry {
  const name = path.split(/[\\/]/).pop() ?? path;
  return {
    path,
    name,
    kind: "file",
    size: 12,
    modifiedMs: null,
    readonly: false,
    hidden: name.startsWith("."),
    ...overrides,
  };
}

/**
 * The primary test seam: a fake implementation of the same interface the panes
 * are written against. If a pane cannot be tested through this, it is reaching
 * past the transport and the source is wrong.
 */
export function createFakeTransport(options: FakeTransportOptions = {}) {
  const listeners = new Map<PtySessionId, PtyEventHandler>();
  /** What `writeFile` was handed, by path. */
  const saved = new Map<string, string>();
  const session: PtySession = {
    id: "session-1",
    program: "/usr/bin/nu",
    shell: "nu",
    cwd: "/root",
    size: { cols: 80, rows: 24 },
    fellBack: false,
    ...options.session,
  };

  const fail = (key: string) => {
    const failure = options.failures?.[key];
    if (failure) return Promise.reject(failure);
    return null;
  };

  const client: TransportClient = {
    kind: "local",
    // Echoes the target it was handed rather than answering "local" to
    // everything: which transport a session is on changes how panes behave -
    // the folder picker is the clearest case - so a test has to be able to
    // open a remote one.
    connect: vi.fn(async (target: ConnectionTarget): Promise<ConnectionInfo> => {
      const failure = await fail("connect");
      if (failure) return failure;
      const root = target.detail.root ?? "/root";
      const name = root.split(/[\\/]/).filter(Boolean).pop() ?? root;
      return { id: "connection-1", kind: target.kind, root, label: `${name} (${target.kind})` };
    }),
    disconnect: vi.fn(async () => undefined),
    listDir: vi.fn(async (path: string) => {
      const failure = options.failures?.[`listDir:${path}`];
      if (failure) throw failure;
      return options.listings?.[path] ?? [];
    }),
    stat: vi.fn(async (path: string) => makeEntry(path)),
    searchFiles: vi.fn(
      (query: SearchQuery): Promise<SearchHits> =>
        searchFiles(options.searchable ?? [], query, options.failures?.searchFiles),
    ),
    // Records what was saved so a test can assert the content, and honours
    // the same conflict guard the real transports apply.
    writeFile: vi.fn(async (path: string, request: WriteRequest) => {
      const failure = options.failures?.[`writeFile:${path}`];
      if (failure) throw failure;
      const existing = options.files?.[path];
      saved.set(path, request.content);
      return makeEntry(path, {
        size: request.content.length,
        modifiedMs: (existing?.size ?? 0) + 1,
      });
    }),
    readFile: vi.fn(async (path: string): Promise<FilePayload> => {
      const failure = options.failures?.[`readFile:${path}`];
      if (failure) throw failure;
      const payload = options.files?.[path];
      if (!payload) throw { kind: "notFound", detail: { path } } as TransportError;
      return payload;
    }),
    openPty: vi.fn(async () => session),
    writePty: vi.fn(async () => undefined),
    resizePty: vi.fn(async () => undefined),
    closePty: vi.fn(async () => undefined),
    runStructured: vi.fn(
      async (): Promise<StructuredOutput> =>
        options.structured ?? { value: [], stderr: "" },
    ),
    probeShell: vi.fn(async () => options.shellProbe ?? NU_PRESENT_PROBE),
    git: createFakeGit(options),
    onPtyEvent: vi.fn(async (id: PtySessionId, handler: PtyEventHandler) => {
      listeners.set(id, handler);
      return () => listeners.delete(id);
    }),
  };

  /** Pushes an event as the real transport would. */
  const emit = (event: PtyEvent, id: PtySessionId = session.id) =>
    listeners.get(id)?.(event);

  return {
    client,
    emit,
    session,
    listenerCount: () => listeners.size,
    /** What was saved, by path. */
    saved,
  };
}
