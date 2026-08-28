// Regenerates apps/ui/src/Types/generated from the Rust domain types.
//
// ts-rs writes one file per `#[derive(TS)]` type plus an index barrel. The
// output is checked in so the UI type-checks without a Rust toolchain; run
// this whenever a type in crates/mino-core/src/types or error.rs changes.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportDir = path.join(root, "apps", "ui", "src", "Types");

const result = spawnSync(
  "cargo",
  ["test", "-p", "mino-core", "--", "--quiet"],
  {
    cwd: root,
    stdio: "inherit",
    // ts-rs joins each type's `export_to = "generated/"` onto this directory.
    env: { ...process.env, TS_RS_EXPORT_DIR: exportDir },
  },
);

process.exit(result.status ?? 1);
