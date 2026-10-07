import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RunScriptMenu } from "@/features/scripts/components/RunScriptMenu";
import { TerminalPane } from "@/features/terminal/components/TerminalPane";

import { makeCatalog } from "../fake-scripts";
import { createFakeTransport } from "../fake-transport";
import { renderConnected } from "../harness";

// jsdom cannot host a real terminal renderer; see ../xterm-mock.
vi.mock("@xterm/xterm", async () => (await import("../xterm-mock")).terminalModule());
vi.mock("@xterm/addon-fit", async () => (await import("../xterm-mock")).fitAddonModule());

/**
 * The header's run-script menu, rendered beside the terminal pane it opens
 * splits in - the two share one terminal stack, which is what is under test.
 */
function renderMenu(options: Parameters<typeof createFakeTransport>[0] = {}) {
  const fake = createFakeTransport({ scripts: makeCatalog(), ...options });
  renderConnected(
    <>
      <RunScriptMenu />
      <TerminalPane />
    </>,
    fake.client,
  );
  return fake;
}

const openMenu = async () =>
  userEvent.click(await screen.findByRole("button", { name: "Run a script" }));
const shells = () => screen.getAllByLabelText("Interactive shell");

beforeEach(() => window.localStorage.clear());

describe("run-script menu", () => {
  it("is absent in a folder that defines no scripts", async () => {
    const { client } = renderMenu({ scripts: makeCatalog([]) });
    await waitFor(() => expect(client.listProjectScripts).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Run a script" })).toBeNull();
  });

  it("lists every script, grouped, with what each one runs", async () => {
    renderMenu();
    await openMenu();

    const list = await screen.findByRole("listbox", { name: "Project scripts" });
    const web = within(list).getByRole("group", { name: "web · pnpm" });
    expect(within(web).getByRole("option", { name: /start/ })).toBeInTheDocument();
    expect(within(list).getByText("vite build")).toBeInTheDocument();
    expect(within(list).getByRole("group", { name: "This folder · make" })).toBeInTheDocument();
  });

  it("scans the folder again every time it opens", async () => {
    const { client } = renderMenu();
    await openMenu();
    await waitFor(() => expect(client.listProjectScripts).toHaveBeenCalledTimes(2));
  });

  it("runs a chosen script in a new split, sending only which script it is", async () => {
    const { client } = renderMenu();
    await waitFor(() => expect(client.openPty).toHaveBeenCalledTimes(1));
    await openMenu();

    await userEvent.click(await screen.findByRole("option", { name: /start/ }));

    await waitFor(() => expect(shells()).toHaveLength(2));
    expect(client.openPty).toHaveBeenLastCalledWith(
      expect.objectContaining({
        script: { source: "npm", dir: "packages/web", name: "start" },
      }),
    );
    // Nothing but the identity crosses: never the command text.
    expect(JSON.stringify(vi.mocked(client.openPty).mock.lastCall)).not.toContain("next start");
    expect(screen.getByText("▶ pnpm: start")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("leaves the first shell a plain one", async () => {
    const { client } = renderMenu();
    await waitFor(() => expect(client.openPty).toHaveBeenCalledTimes(1));
    expect(vi.mocked(client.openPty).mock.calls[0][0]).not.toHaveProperty("script");
  });

  it("says the pane is full rather than opening a fifth shell", async () => {
    const { client } = renderMenu();
    const split = await screen.findByRole("button", { name: "Split" });
    for (let i = 0; i < 3; i += 1) await userEvent.click(split);
    await waitFor(() => expect(shells()).toHaveLength(4));

    await openMenu();
    expect(
      await screen.findByText("Four shells is the most this pane will hold"),
    ).toBeInTheDocument();
    const dev = screen.getAllByRole("option", { name: /dev/ })[0];
    expect(dev).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(dev);
    expect(shells()).toHaveLength(4);
    expect(client.openPty).toHaveBeenCalledTimes(4);
  });

  it("says how many scripts were left out, and why", async () => {
    renderMenu({ scripts: makeCatalog(undefined, { skipped: 2 }) });
    await openMenu();
    expect(
      await screen.findByText(/2 scripts were left out because their names hold/),
    ).toBeInTheDocument();
  });
});
