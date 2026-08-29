import type {
  CommitRequest,
  GitClient,
  GitCommit,
  GitRepository,
  GitStatus,
  TransportError,
} from "@/Types";
import { GIT_COMMANDS } from "@/Types";

/**
 * The browser git surface: declared, not built.
 *
 * Rejects with the same typed `Unimplemented` error the Rust stub returns, and
 * with the same feature names, so the panes behave identically whichever end
 * answers. Note what it does *not* do: `repository()` does not resolve `null`.
 * "There is no agent protocol for this yet" and "this folder is not a
 * repository" are different facts, and a quiet UI would hide the first behind
 * the second.
 */
export class AgentGitClient implements GitClient {
  private reject<T>(feature: string): Promise<T> {
    const error: TransportError = {
      kind: "unimplemented",
      detail: { feature, transport: "remoteAgent" },
    };
    return Promise.reject(error);
  }

  repository(): Promise<GitRepository | null> {
    return this.reject(GIT_COMMANDS.repository);
  }

  status(): Promise<GitStatus> {
    return this.reject(GIT_COMMANDS.status);
  }

  stage(_paths: string[]): Promise<void> {
    return this.reject(GIT_COMMANDS.stage);
  }

  unstage(_paths: string[]): Promise<void> {
    return this.reject(GIT_COMMANDS.unstage);
  }

  discard(_paths: string[]): Promise<void> {
    return this.reject(GIT_COMMANDS.discard);
  }

  commit(_request: CommitRequest): Promise<GitCommit> {
    return this.reject(GIT_COMMANDS.commit);
  }
}
