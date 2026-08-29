/**
 * The git half of the transport API.
 *
 * A second module beside `api.ts` for the same reason `GitTransport` is a
 * second trait beside `Transport` in Rust: git's twenty-five eventual methods
 * would make one file that mirrors neither interface, and "is there git here?"
 * is better asked once than answered by every method. See `plan/decisions.md`
 * D2.
 *
 * Both are re-exported through `@/Types`, so nothing imports from here
 * directly.
 */
import type { GitRepository, GitStatus } from "../generated";

/**
 * Tauri command names for the git surface. The only place these strings are
 * written down.
 */
export const GIT_COMMANDS = {
  repository: "git_repository",
  status: "git_status",
} as const;

export type GitCommand = (typeof GIT_COMMANDS)[keyof typeof GIT_COMMANDS];

/**
 * Mirrors `mino_core::transport::GitTransport`, reached from the client the
 * way `Transport::git()` reaches it in Rust: `transport.git.status()`.
 *
 * Two methods, and everything phase 1 renders is served by them - the tree's
 * badges, the header's branch and dirty marker, and the search walk's ignore
 * predicate all read one `GitStatus`.
 */
export interface GitClient {
  /**
   * The repository containing the connected root, or `null` when the root is
   * not inside one. `null` is an answer, not a failure: most folders are not
   * repositories and the UI renders that quietly.
   *
   * Git being absent from the target *is* a failure, and this is the call that
   * reports it - once, so every git surface can go quiet for the session
   * instead of failing per call.
   */
  repository(): Promise<GitRepository | null>;

  /**
   * The working tree as git sees it. One call for the whole repository, not
   * one per file. Rejects when the connected folder is not a repository, so
   * callers ask `repository()` first.
   */
  status(): Promise<GitStatus>;
}
