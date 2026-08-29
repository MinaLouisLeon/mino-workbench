// Installs the git hooks in `lefthook.yml`, and deliberately does not on CI.
//
// This runs from npm's `prepare`, which fires on every `npm install` and every
// `npm ci` - including the ones in the release workflow. Hooks installed there
// are not a convenience, they are a hazard: the release job pushes the version
// bump back to `main`, and a `pre-push` hook turns that push into a second,
// unwanted run of the whole test suite inside a job that was never set up for
// it. That is exactly how the v0.1.2 release failed - the hook ran Playwright
// in a job that never installed a browser, the hook failed, and the push with
// it.
//
// So: hooks are for humans. CI has its own workflow and does not need them.
// The workflow also sets `LEFTHOOK=0`, which stops any hook that somehow got
// installed from running; this script stops them being installed at all.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

// Set by GitHub Actions and by every other CI provider worth naming.
if (process.env.CI) {
  console.log("CI detected - skipping git hook installation");
  process.exit(0);
}

// Resolved rather than taken from PATH. npm puts `node_modules/.bin` on PATH
// for its own scripts, so `lefthook` alone would work from `prepare` and fail
// for anyone running this file directly - which is the one time you would run
// it by hand.
const require = createRequire(import.meta.url);
let entry;
try {
  entry = require.resolve("lefthook/bin/index.js");
} catch {
  console.error("lefthook is not installed; run `npm install` first");
  process.exit(1);
}

const result = spawnSync(process.execPath, [entry, "install"], {
  stdio: "inherit",
});

// A failed install should be visible, not silent: a developer who thinks the
// hooks are on when they are not is worse off than one who knows they are off.
if (result.error) {
  console.error(`could not run lefthook: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
