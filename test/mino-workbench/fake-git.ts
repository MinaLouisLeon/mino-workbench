import { vi } from "vitest";

import type {
  GitClient,
  GitEntry,
  GitRepository,
  GitStatus,
  TransportError,
} from "@/Types";

/**
 * The fake git surface, kept beside the fake transport rather than in it so
 * neither file grows past the project's ceiling - the same arrangement
 * `fake-search.ts` and `fake-shell.ts` already use.
 */

/** A repository on `main`, clean, tracking `origin/main`. */
export const CLEAN_REPOSITORY: GitRepository = {
  root: "/root",
  branch: "main",
  head: "3f2a1c9",
  detached: false,
  upstream: "origin/main",
  ahead: 0,
  behind: 0,
};

export interface FakeGitOptions {
  /**
   * What `repository()` answers. `undefined` means "not a repository", which
   * is the default because most folders are not one - a fake that was a
   * checkout by default would let a pane depend on git without saying so.
   */
  repository?: GitRepository;
  /** What `status()` answers. Ignored when `repository` is unset. */
  status?: Partial<GitStatus>;
  /** Keyed `git.repository` and `git.status`, like the transport's failures. */
  failures?: Record<string, TransportError>;
}

export function createFakeGit(options: FakeGitOptions = {}): GitClient {
  const repository = options.repository ?? null;
  return {
    repository: vi.fn(async () => {
      const failure = options.failures?.["git.repository"];
      if (failure) throw failure;
      return repository;
    }),
    status: vi.fn(async (): Promise<GitStatus> => {
      const failure = options.failures?.["git.status"];
      if (failure) throw failure;
      // The real transports raise this rather than inventing an empty status,
      // because a caller reaching `status` without asking `repository` first
      // has made a mistake worth reporting.
      if (!repository) {
        throw {
          kind: "invalidArgument",
          detail: {
            message: "the connected folder is not inside a git repository",
          },
        } as TransportError;
      }
      return { repository, entries: [], truncated: false, ...options.status };
    }),
  };
}

/** One status entry, with the two sides defaulted to a plain modification. */
export function makeGitEntry(
  path: string,
  overrides: Partial<GitEntry> = {},
): GitEntry {
  return {
    path,
    relativePath: path.replace(/^\/root\//, ""),
    index: "unmodified",
    worktree: "modified",
    originalPath: null,
    ...overrides,
  };
}
