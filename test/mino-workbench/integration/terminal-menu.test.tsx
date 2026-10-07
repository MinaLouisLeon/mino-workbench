import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TerminalPane } from "@/features/terminal/components/TerminalPane";

import { createFakeTransport } from "../fake-transport";
import { renderConnected } from "../harness";
import { terminals } from "../xterm-mock";

// jsdom cannot host a real terminal renderer; see ../xterm-mock.
vi.mock("@xterm/xterm", async () => (await import("../xterm-mock")).terminalModule());
vi.mock("@xterm/addon-fit", async () => (await import("../xterm-mock")).fitAddonModule());

/**
 * The terminal's right-click menu acts on xterm, not on the page: the
 * selection is xterm's, and a paste goes through `terminal.paste` so the
 * shell receives it as a bracketed paste rather than as typed lines.
 */
async function openMenu() {
  const shell = (await screen.findAllByLabelText("Interactive shell"))[0];
  fireEvent.contextMenu(shell, { clientX: 30, clientY: 30 });
  return screen.findByRole("menu");
}

describe("the terminal's context menu", () => {
  it("offers Copy only when xterm has a selection", async () => {
    const { client } = createFakeTransport();
    renderConnected(<TerminalPane />, client);
    await waitFor(() => expect(client.openPty).toHaveBeenCalled());

    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeDisabled();
  });

  it("pastes the clipboard through xterm", async () => {
    const user = userEvent.setup();
    const { client } = createFakeTransport();
    renderConnected(<TerminalPane />, client);
    await waitFor(() => expect(client.openPty).toHaveBeenCalled());
    await navigator.clipboard.writeText("ls\npwd");
    const term = terminals[terminals.length - 1];

    await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Paste" }));

    await waitFor(() => expect(term.pasted).toEqual(["ls\npwd"]));
  });

  it("splits from the menu, opening exactly one more session", async () => {
    const user = userEvent.setup();
    const { client } = createFakeTransport();
    renderConnected(<TerminalPane />, client);
    await waitFor(() => expect(client.openPty).toHaveBeenCalledTimes(1));

    await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Split Terminal" }));

    await waitFor(() => expect(client.openPty).toHaveBeenCalledTimes(2));
  });
});
