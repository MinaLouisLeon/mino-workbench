import { defineConfig } from "@playwright/test";

// Playwright owns `*.spec.ts` only. Specs run against the Vite dev server, so
// they exercise the browser build: there is no Tauri runtime, which means the
// app falls back to the agent transport and its typed "not implemented"
// results - exactly what a browser user would see today.
export default defineConfig({
  testDir: "./test",
  testMatch: "**/e2e/*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
