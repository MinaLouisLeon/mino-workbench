import type {
  GitClient,
  GitRepository,
  GitStatus,
  TransportError,
} from "@/Types";

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
    return this.reject("git_repository");
  }

  status(): Promise<GitStatus> {
    return this.reject("git_status");
  }
}
