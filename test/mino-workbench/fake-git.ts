import { vi } from "vitest";

import type {
  CommitRequest,
  GitClient,
  GitCommit,
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

/** The commit a successful `commit()` reports, unless a test says otherwise. */
export const LANDED_COMMIT: GitCommit = {
  sha: "3f2a1c9d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39",
  shortSha: "3f2a1c9",
  summary: "A committed change",
  author: "Test",
  timestampMs: 1_788_024_729_000,
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
  /** Keyed by method name (`git.status`, `git.commit`, …). */
  failures?: Record<string, TransportError>;
  /** What `commit()` resolves with when it is not made to fail. */
  commit?: Partial<GitCommit>;
}

export function createFakeGit(options: FakeGitOptions = {}): GitClient {
  const repository = options.repository ?? null;

  /** Throws the failure a test configured for `key`, if there is one. */
  const refuse = (key: string) => {
    const failure = options.failures?.[key];
    if (failure) throw failure;
  };

  return {
    repository: vi.fn(async () => {
      refuse("git.repository");
      return repository;
    }),
    status: vi.fn(async (): Promise<GitStatus> => {
      refuse("git.status");
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

    // The mutating half records what it was asked for and nothing else. What
    // git would *do* is asserted in Rust against real repositories; what the
    // panel asks for is what these tests are about.
    stage: vi.fn(async (_paths: string[]) => {
      refuse("git.stage");
    }),
    unstage: vi.fn(async (_paths: string[]) => {
      refuse("git.unstage");
    }),
    discard: vi.fn(async (_paths: string[]) => {
      refuse("git.discard");
    }),
    commit: vi.fn(async (request: CommitRequest): Promise<GitCommit> => {
      refuse("git.commit");
      const [firstLine] = request.message.split("\n");
      return {
        ...LANDED_COMMIT,
        summary: firstLine || LANDED_COMMIT.summary,
        ...options.commit,
      };
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
