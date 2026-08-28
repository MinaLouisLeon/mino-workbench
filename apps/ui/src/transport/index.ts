import type { TransportClient } from "@/Types";

import { AgentTransport } from "./agent/AgentTransport";
import { TauriTransport } from "./tauri/TauriTransport";

export { AgentTransport } from "./agent/AgentTransport";
export { TauriTransport } from "./tauri/TauriTransport";

/** Default agent endpoint. Loopback only - the daemon refuses anything else. */
export const DEFAULT_AGENT_URL = "ws://127.0.0.1:8731/ws";

export function isDesktopRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Picks the client for the runtime, not for the target: inside the Tauri
 * window every target is served by the Rust commands, and in a plain browser
 * the only way out is the agent socket.
 */
export function createTransport(): TransportClient {
  return isDesktopRuntime()
    ? new TauriTransport()
    : new AgentTransport(DEFAULT_AGENT_URL);
}
