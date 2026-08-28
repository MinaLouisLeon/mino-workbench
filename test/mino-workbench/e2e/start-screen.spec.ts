import { COPY, expect, test } from "./fixtures";

test.describe("start screen", () => {
  test("offers both a local folder and SSH", async ({ page }) => {
    await expect(page.getByRole("button", { name: new RegExp(COPY.localOption) })).toBeVisible();

    const ssh = page.getByRole("button", { name: new RegExp(COPY.sshOption) });
    await expect(ssh).toBeVisible();
    // SSH was `aria-disabled` while the transport was a stub. It is built now,
    // so the option is a live control.
    await expect(ssh).toHaveAttribute("aria-disabled", "false");
  });

  // The folder picker is a Tauri capability, so the browser build has to say
  // so rather than reaching for an IPC that is not there. TC-31 covers the
  // desktop path, where the same click opens the real dialog.
  test("says the folder picker needs the desktop app", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.localOption) }).click();
    await expect(page.getByRole("alert")).toContainText(COPY.localNeedsDesktop);
  });

  test("choosing SSH opens the connection form", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.sshOption) }).click();

    for (const label of COPY.sshFields) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    // Connect stays disabled until host and user are filled in.
    await expect(page.getByRole("button", { name: COPY.connect })).toBeDisabled();
    // The host key policy is stated before anyone tries to connect.
    await expect(page.getByText(/known_hosts/)).toBeVisible();
  });

  // Remote paths are not knowable before connecting, so the form does not ask
  // for one: the session opens at the account's home directory and the folder
  // is chosen afterwards from a real listing. TC-82 covers that picker.
  test("the form does not ask for a folder", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.sshOption) }).click();
    await expect(page.getByLabel(COPY.folderField, { exact: true })).toHaveCount(0);
  });

  test("host and user alone enable Connect", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.sshOption) }).click();
    const connect = page.getByRole("button", { name: COPY.connect });
    await expect(connect).toBeDisabled();
    await page.getByLabel("Host", { exact: true }).fill("example.invalid");
    await expect(connect).toBeDisabled();
    await page.getByLabel("User", { exact: true }).fill("nu");
    await expect(connect).toBeEnabled();
  });

  test("the form never asks for a password", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.sshOption) }).click();
    // No password box, and nothing that a password manager would fill.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/never asks for a passphrase/)).toBeVisible();
  });

  test("the form validates the port before dialling", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.sshOption) }).click();
    await page.getByLabel("Host", { exact: true }).fill("example.invalid");
    await page.getByLabel("User", { exact: true }).fill("nu");
    await page.getByLabel("Port", { exact: true }).fill("70000");

    await page.getByRole("button", { name: COPY.connect }).click();
    await expect(page.getByRole("alert")).toContainText(COPY.portInvalid);
  });

  test("the form can be left again", async ({ page }) => {
    await page.getByRole("button", { name: new RegExp(COPY.sshOption) }).click();
    await page.getByRole("button", { name: COPY.back }).click();
    await expect(page.getByRole("button", { name: new RegExp(COPY.localOption) })).toBeVisible();
  });

  test("keeps every option reachable from the keyboard", async ({ page }) => {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: new RegExp(COPY.localOption) })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: new RegExp(COPY.sshOption) })).toBeFocused();
  });
});
