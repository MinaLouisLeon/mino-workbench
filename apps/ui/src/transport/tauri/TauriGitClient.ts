import type { GitClient, GitRepository, GitStatus } from "@/Types";
import { GIT_COMMANDS } from "@/Types";

import { invokeTransport } from "./invoke";

/**
 * The desktop git surface: one method per Tauri command, no logic of its own.
 *
 * A separate class rather than two more methods on `TauriTransport`, mirroring
 * the Rust split - `Transport::git()` returns a second trait, and this is what
 * that looks like on the other side of the IPC boundary.
 */
export class TauriGitClient implements GitClient {
  repository(): Promise<GitRepository | null> {
    return invokeTransport(GIT_COMMANDS.repository);
  }

  status(): Promise<GitStatus> {
    return invokeTransport(GIT_COMMANDS.status);
  }
}
