import { useEffect, type ReactNode } from "react";

import { render } from "@testing-library/react";

import type { ConnectionTarget, TransportClient } from "@/Types";
import { TransportProvider } from "@/context/TransportContext";
import { SelectionProvider } from "@/features/workbench/context/SelectionContext";
import {
  SessionProvider,
  useSessionContext,
} from "@/features/workbench/context/SessionContext";

function Connected({
  target,
  children,
}: {
  target: ConnectionTarget;
  children: ReactNode;
}) {
  const { connect, connection } = useSessionContext();
  useEffect(() => {
    void connect(target);
  }, [connect, target]);
  return connection ? <>{children}</> : null;
}

/** A remote session, for panes that behave differently off this machine. */
export function sshTarget(root: string): ConnectionTarget {
  return {
    kind: "ssh",
    detail: { host: "host.invalid", port: 22, user: "nu", root, identityPath: null },
  };
}

/**
 * Renders a pane inside a live session backed by a fake transport, which is
 * how a pane is exercised without a Tauri runtime.
 *
 * `target` defaults to a local session. Pass `sshTarget(root)` for the cases
 * where being remote is the point.
 */
export function renderConnected(
  ui: ReactNode,
  client: TransportClient,
  root = "/root",
  target: ConnectionTarget = { kind: "local", detail: { root } },
) {
  return render(
    <TransportProvider client={client}>
      <SessionProvider>
        <SelectionProvider>
          <Connected target={target}>{ui}</Connected>
        </SelectionProvider>
      </SessionProvider>
    </TransportProvider>,
  );
}

/** Renders providers only, for hooks that do not need a connection. */
export function withProviders(client: TransportClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TransportProvider client={client}>
        <SessionProvider>
          <SelectionProvider>{children}</SelectionProvider>
        </SessionProvider>
      </TransportProvider>
    );
  };
}
