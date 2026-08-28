import { test as base } from "@playwright/test";

/**
 * Specs run against the Vite dev server, so there is no Tauri runtime: the app
 * picks the agent transport, and every call comes back as the typed
 * "not implemented" result. That is the browser build's real behaviour today.
 */
export const COPY = {
  heading: "Mino Workbench",
  localOption: "Open a local folder",
  sshOption: "Connect over SSH",
  localNeedsDesktop: "Opening a local folder needs the desktop app.",
  sshFields: ["Host", "Port", "User", "Key file"],
  // The folder is deliberately not one of them - see the spec.
  folderField: "Folder",
  connect: "Connect",
  back: "Back",
  portInvalid: "The port must be a whole number between 1 and 65535.",
  sshUnavailable: "SSH connections are not available in this build yet.",
  remoteUnavailable: "Remote agent connections are not available in this build yet.",
} as const;

export const test = base.extend<{ startScreen: void }>({
  startScreen: [
    async ({ page }, use) => {
      await page.goto("/");
      await page.getByRole("heading", { name: COPY.heading }).waitFor();
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
