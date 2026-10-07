import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SourceControlPane } from "@/features/source-control/components/SourceControlPane";

import { CLEAN_REPOSITORY, createFakeTransport, makeGitEntry } from "../fake-transport";
import { renderConnected } from "../harness";

const rightClick = (target: Element) =>
  fireEvent.contextMenu(target, { clientX: 40, clientY: 40 });

describe("the browser's context menu", () => {
  it("is cancelled everywhere, and nothing opens where there is nothing to offer", async () => {
    const { client } = createFakeTransport();
    renderConnected(<p>Plain text</p>, client);

    const notCancelled = rightClick(await screen.findByText("Plain text"));

    expect(notCancelled).toBe(false);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("is replaced by Cut, Copy and Paste on a text field", async () => {
    const { client } = createFakeTransport();
    renderConnected(<input aria-label="Field" defaultValue="hello" />, client);

    rightClick(await screen.findByRole("textbox", { name: "Field" }));

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveTextContent("Cut");
    expect(menu).toHaveTextContent("Paste");
    // Nothing is selected, so there is nothing to cut or copy.
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeEnabled();
  });

  it("closes on Escape and gives focus back", async () => {
    const user = userEvent.setup();
    const { client } = createFakeTransport();
    renderConnected(<input aria-label="Field" defaultValue="hello" />, client);
    const field = await screen.findByRole("textbox", { name: "Field" });
    field.focus();

    rightClick(field);
    await screen.findByRole("menu");
    // The first enabled entry takes focus, so the arrow keys work at once.
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Paste/ })).toHaveFocus());
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(field).toHaveFocus();
  });
});

describe("the commit message menu", () => {
  it("writes a conventional-commit type at the start of the message", async () => {
    const user = userEvent.setup();
    const { client } = createFakeTransport({
      repository: CLEAN_REPOSITORY,
      status: { entries: [makeGitEntry("/root/a.rs", { index: "added", worktree: "unmodified" })] },
    });
    renderConnected(<SourceControlPane />, client);
    const box = await screen.findByRole("textbox", { name: /message/i });
    await user.type(box, "fix(tree): add the menu");

    rightClick(box);
    expect(await screen.findByText("Commit type")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: /feat: a new feature/ }));

    expect(box).toHaveValue("feat(tree): add the menu");
  });
});
