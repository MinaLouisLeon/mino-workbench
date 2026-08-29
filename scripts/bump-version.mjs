// Moves the project's version forward, in every file that declares it.
//
// The version is the release tag, so it has to be a single decision applied
// consistently: `tauri.conf.json` names the installer and the release,
// `Cargo.toml` versions the crates, and the two package.json files keep npm
// agreeing with them. They drift the moment one is bumped by hand.
//
//   node scripts/bump-version.mjs            print the current version
//   node scripts/bump-version.mjs patch      0.1.0 -> 0.1.1
//   node scripts/bump-version.mjs minor      0.1.4 -> 0.2.0
//   node scripts/bump-version.mjs major      0.2.7 -> 1.0.0
//   node scripts/bump-version.mjs 1.2.3      set it outright
//
// Prints the new version on stdout, so CI can read it.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAURI_CONF = "apps/desktop/src-tauri/tauri.conf.json";
const JSON_FILES = [TAURI_CONF, "package.json", "apps/ui/package.json"];
const CARGO_TOML = "Cargo.toml";

const read = (file) => readFileSync(path.join(root, file), "utf8");
const write = (file, text) => writeFileSync(path.join(root, file), text);

function currentVersion() {
  const version = JSON.parse(read(TAURI_CONF)).version;
  if (typeof version !== "string") {
    throw new Error(`${TAURI_CONF} has no version`);
  }
  return version;
}

function nextVersion(current, bump) {
  // An explicit version wins over a bump keyword.
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;

  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`cannot bump "${current}": expected major.minor.patch`);
  }
  const [major, minor, patch] = parts;
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`unknown bump "${bump}": use major, minor, patch, or a version`);
  }
}

function writeJsonVersion(file, version) {
  const parsed = JSON.parse(read(file));
  parsed.version = version;
  // Re-serialised rather than patched by regex: these are small, purely
  // structured files, and 2 spaces is what npm and Tauri already write.
  write(file, `${JSON.stringify(parsed, null, 2)}\n`);
}

function writeCargoVersion(version) {
  const text = read(CARGO_TOML);
  // Only the `[workspace.package]` version, which is the first bare
  // `version = "..."` in the file. Dependency versions are `name = { version
  // = ... }` or indented, and must not be touched.
  const pattern = /^version = "\d+\.\d+\.\d+"$/m;
  if (!pattern.test(text)) {
    throw new Error(`${CARGO_TOML} has no [workspace.package] version to bump`);
  }
  write(CARGO_TOML, text.replace(pattern, `version = "${version}"`));
}

const bump = process.argv[2];
const current = currentVersion();

if (!bump) {
  console.log(current);
  process.exit(0);
}

const next = nextVersion(current, bump);
for (const file of JSON_FILES) writeJsonVersion(file, next);
writeCargoVersion(next);

console.error(`${current} -> ${next}`);
console.log(next);
