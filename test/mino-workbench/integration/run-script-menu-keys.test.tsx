import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RunScriptMenu } from "@/features/scripts/components/RunScriptMenu";
import { TerminalPane } from "@/features/terminal/components/TerminalPane";

import { makeCatalog } from "../fake-scripts";
import { createFakeTransport } from "../fake-transport";
import { renderConnected } from "../harness";

vi.mock("@xterm/xterm", async () => (await import("../xterm-mock")).terminalModule());
vi.mock("@xterm/addon-fit", async () => (await import("../xterm-mock")).fitAddonModule());

/** The menu's keyboard, its filter, and what it remembers between runs. */
function renderMenu() {
  const fake = createFakeTransport({ scripts: makeCatalog() });
  const view = renderConnected(
    <>
      <RunScriptMenu />
      <TerminalPane />
    </>,
    fake.client,
  );
  return { ...fake, view };
}

const button = () => screen.findByRole("button", { name: "Run a script" });
const filter = () => screen.findByRole("combobox", { name: "Filter scripts" });
const shells = () => screen.getAllByLabelText("Interactive shell");

beforeEach(() => window.localStorage.clear());

describe("run-script menu keyboard", () => {
  it("opens and closes on Ctrl+Shift+R", async () => {
    renderMenu();
    await button();

    await userEvent.keyboard("{Control>}{Shift>}R{/Shift}{/Control}");
    expect(await filter()).toHaveFocus();

    await userEvent.keyboard("{Control>}{Shift>}R{/Shift}{/Control}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("gives focus back to wherever the shortcut was pressed", async () => {
    renderMenu();
    await button();
    // Stands in for a terminal: anything focusable the reader was typing in.
    const elsewhere = screen.getByRole("button", { name: "Split" });
    elsewhere.focus();

    await userEvent.keyboard("{Control>}{Shift>}R{/Shift}{/Control}");
    expect(await filter()).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(elsewhere).toHaveFocus());
  });

  it("moves with the arrows and runs the highlighted script on Enter", async () => {
    const { client } = renderMenu();
    await waitFor(() => expect(client.openPty).toHaveBeenCalledTimes(1));
    await userEvent.click(await button());
    const field = await filter();

    // Rows: dev, build, release, start. Down twice, up once: build.
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
    const build = screen.getByRole("option", { name: /build/ });
    expect(build).toHaveAttribute("aria-selected", "true");
    expect(field).toHaveAttribute("aria-activedescendant", build.id);

    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(shells()).toHaveLength(2));
    expect(client.openPty).toHaveBeenLastCalledWith(
      expect.objectContaining({ script: { source: "npm", dir: "", name: "build" } }),
    );
  });

  it("closes on Escape and hands focus back to the button", async () => {
    renderMenu();
    await userEvent.click(await button());
    await filter();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(await button()).toHaveFocus();
  });

  it("filters as you type, and says when nothing matches", async () => {
    renderMenu();
    await userEvent.click(await button());
    await userEvent.type(await filter(), "web");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: /start/ })).toBeInTheDocument();

    await userEvent.type(await filter(), "zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No script matches “webzzz”.")).toBeInTheDocument();
  });

  it("puts what was last run at the top next time, and remembers it", async () => {
    const { view } = renderMenu();
    await userEvent.click(await button());
    await userEvent.click(await screen.findByRole("option", { name: /release/ }));
    await waitFor(() => expect(shells()).toHaveLength(2));

    await userEvent.click(await button());
    const recent = await screen.findByRole("group", { name: "Recent" });
    expect(within(recent).getByRole("option", { name: /release/ })).toBeInTheDocument();

    const stored = window.localStorage.getItem("mino.recentScripts.v1") ?? "";
    expect(stored).toContain("release");
    // The identity only - never what the script runs.
    expect(stored).not.toContain("make release");
    view.unmount();
  });
});
