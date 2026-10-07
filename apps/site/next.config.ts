import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// The site lives inside an npm workspace, so the build starts at the
// repository root even though Vercel's root directory is `apps/site`.
// `outputFileTracingRoot` says so explicitly; without it Next infers a root
// from the nearest lockfile and warns on every build.
//
// `fileURLToPath` rather than `new URL(...).pathname`: on Windows the latter
// hands back a percent-encoded path with a leading slash, which the tracer
// then fails to canonicalise.
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const config: NextConfig = {
  outputFileTracingRoot: repositoryRoot,
};

export default config;
