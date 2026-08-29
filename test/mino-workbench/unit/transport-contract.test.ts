import { describe, expect, it } from "vitest";

import type { TransportClient, TransportError } from "@/Types";
import { TRANSPORT_COMMANDS } from "@/Types";
import { AgentTransport } from "@/transport";

import { createFakeTransport } from "../fake-transport";

/** The callable half of the interface: everything but the `kind` field. */
type TransportMethod = Exclude<keyof TransportClient, "kind">;

/** Every method on the interface, in the order the Rust trait declares them. */
const METHODS: TransportMethod[] = [
  "connect",
  "disconnect",
  "listDir",
  "stat",
  "searchFiles",
  "readFile",
  "writeFile",
  "openPty",
  "writePty",
  "resizePty",
  "closePty",
  "runStructured",
  "probeShell",
  "onPtyEvent",
];

describe("transport client contract", () => {
  it("the fake implements every method the panes may call", () => {
    const { client } = createFakeTransport();
    for (const method of METHODS) {
      expect(typeof client[method]).toBe("function");
    }
  });

  it("names one Tauri command per transport method", () => {
    expect(Object.keys(TRANSPORT_COMMANDS)).toHaveLength(METHODS.length - 1);
    expect(TRANSPORT_COMMANDS.listDir).toBe("list_dir");
    expect(TRANSPORT_COMMANDS.runStructured).toBe("run_structured");
  });
});

describe("agent transport", () => {
  const agent = new AgentTransport("ws://127.0.0.1:8731/ws");

  it("reports the endpoint it would dial", () => {
    expect(agent.endpoint).toBe("ws://127.0.0.1:8731/ws");
    expect(agent.kind).toBe("remoteAgent");
  });

  it.each(METHODS)("rejects %s with a typed unimplemented error", async (method) => {
    const call = agent[method] as (...args: unknown[]) => Promise<unknown>;
    // `onPtyEvent` is the one method with no Tauri command behind it, so it
    // names itself rather than being looked up in the command map.
    const feature =
      method === "onPtyEvent" ? "on_pty_event" : TRANSPORT_COMMANDS[method];
    await expect(call.call(agent, "x", "y")).rejects.toEqual({
      kind: "unimplemented",
      detail: { feature, transport: "remoteAgent" },
    } satisfies TransportError);
  });
});
