import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest owns `*.test.*` and Playwright owns `*.spec.ts`; the two never mix.
// See test/README.md for the authoritative layout.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/ui/src", import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "test/**/e2e/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["apps/ui/src/**/*.{ts,tsx}"],
      exclude: [
        "apps/ui/src/Types/generated/**",
        "apps/ui/src/main.tsx",
        "apps/ui/src/theme/**",
      ],
    },
  },
});
