import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FileTreePane } from "@/features/file-tree/components/FileTreePane";

import { createFakeTransport, makeEntry } from "../fake-transport";
import { renderConnected } from "../harness";

const LISTINGS = {
  "/root": [makeEntry("/root/src", { kind: "directory" }), makeEntry("/root/notes.md")],
  "/root/src": [makeEntry("/root/src/main.rs")],
};

async function openRowMenu(name: RegExp) {
  fireEvent.contextMenu(await screen.findByRole("treeitem", { name }), {
    clientX: 20,
    clientY: 20,
  });
  return screen.findByRole("menu");
}

function setup(kind: "local" | "ssh" = "local") {
  const user = userEvent.setup();
  const fake = createFakeTransport({ listings: LISTINGS });
  const target =
    kind === "local"
      ? ({ kind: "local", detail: { root: "/root" } } as const)
      : ({
          kind: "ssh",
          detail: { host: "h", port: 22, user: "u", root: "/root", identityPath: null },
        } as const);
  renderConnected(<FileTreePane />, fake.client, "/root", target);
  return { user, ...fake };
}

describe("the file tree's context menu", () => {
  it("offers a file's actions, with the recycle bin on a local session", async () => {
    setup();
    const menu = await openRowMenu(/notes\.md/);
    for (const label of ["Open", "New File", "Rename", "Copy Path", "Move to Recycle Bin", "Delete Permanently"]) {
      expect(menu).toHaveTextContent(label);
    }
  });

  it("leaves the recycle bin out over SSH", async () => {
    setup("ssh");
    const menu = await openRowMenu(/notes\.md/);
    expect(menu).not.toHaveTextContent("Recycle Bin");
    expect(menu).toHaveTextContent("Delete Permanently");
  });

  it("creates a file inside the folder that was right-clicked", async () => {
    const { user, changes } = setup();
    await openRowMenu(/src/);
    await user.click(screen.getByRole("menuitem", { name: /New File/ }));

    const name = await screen.findByRole("textbox", { name: "Name" });
    await user.type(name, "lib.rs{Enter}");

    await waitFor(() =>
      expect(changes).toEqual([
        { kind: "create", detail: { parent: "/root/src", name: "lib.rs", entry: "file" } },
      ]),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("refuses a name that is a path before asking the transport", async () => {
    const { user, changes } = setup();
    await openRowMenu(/notes\.md/);
    await user.click(screen.getByRole("menuitem", { name: /New Folder/ }));

    await user.type(await screen.findByRole("textbox", { name: "Name" }), "../escape");

    expect(screen.getByText(/cannot contain/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(changes).toEqual([]);
  });

  it("renames in place, starting from the current name", async () => {
    const { user, changes } = setup();
    await openRowMenu(/notes\.md/);
    await user.click(screen.getByRole("menuitem", { name: /Rename/ }));

    const name = await screen.findByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("notes.md");
    // The stem is selected, so typing keeps the extension.
    await user.keyboard("todo{Enter}");

    await waitFor(() =>
      expect(changes).toEqual([{ kind: "rename", detail: { path: "/root/notes.md", name: "todo.md" } }]),
    );
  });

  it("asks before deleting, and a cancel asks the transport for nothing", async () => {
    const { user, changes } = setup();
    await openRowMenu(/notes\.md/);
    await user.click(screen.getByRole("menuitem", { name: /Delete Permanently/ }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("notes.md will be deleted. This cannot be undone.");
    // Cancel is the focused button: Enter keeps the file.
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(changes).toEqual([]);
  });

  it("moves to the recycle bin once confirmed", async () => {
    const { user, changes } = setup();
    await openRowMenu(/src/);
    await user.click(screen.getByRole("menuitem", { name: /Move to Recycle Bin/ }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("and everything in it");
    await user.click(screen.getByRole("button", { name: "Move src to Recycle Bin" }));

    await waitFor(() =>
      expect(changes).toEqual([{ kind: "delete", detail: { path: "/root/src", mode: "trash" } }]),
    );
  });

  it("keeps the dialog open with the transport's reason when a change fails", async () => {
    const user = userEvent.setup();
    const fake = createFakeTransport({
      listings: LISTINGS,
      failures: {
        "changeEntry:create": {
          kind: "invalidArgument",
          detail: { message: "notes.md already exists in this folder" },
        },
      },
    });
    renderConnected(<FileTreePane />, fake.client);
    await openRowMenu(/notes\.md/);
    await user.click(screen.getByRole("menuitem", { name: /New File/ }));
    await user.type(await screen.findByRole("textbox", { name: "Name" }), "notes.md{Enter}");

    expect(await screen.findByText(/already exists in this folder/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
