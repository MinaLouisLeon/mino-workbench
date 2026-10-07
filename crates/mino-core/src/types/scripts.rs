use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Where a project script was found. One variant per row of the detector
/// table in [`crate::scripts::detectors`]; adding an ecosystem adds one here.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub enum ScriptSource {
    /// `package.json` scripts, run with npm, pnpm, yarn or bun.
    Npm,
    Make,
    Just,
    /// go-task's `Taskfile.yml`.
    Task,
    Cargo,
    Go,
    /// `pyproject.toml`: entry points and the poetry, pdm, poe and hatch tables.
    Python,
    Composer,
    Deno,
    Gradle,
    Maven,
    Dotnet,
    /// A loose script file in the folder or its `scripts/` directory.
    File,
}

/// One runnable entry in the run-script menu.
///
/// Everything here is display text except `source`, `dir` and `name`, which
/// together are the [`ScriptRef`] the UI hands back to run it. The command
/// itself never crosses the boundary in that direction: the transport scans
/// again and builds the argv from fixed program text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub struct ProjectScript {
    pub source: ScriptSource,
    /// Folder the script runs in, relative to the connected root with `/`
    /// separators. Empty for the root itself.
    pub dir: String,
    /// The script's own name: `dev`, a make target, `scripts/build.sh`.
    pub name: String,
    /// What the folder calls itself - a package name, or `dir` when the
    /// manifest has none. Used to group a workspace's scripts.
    pub package: String,
    /// Program that runs it: `pnpm`, `make`, `cargo`.
    pub runner: String,
    /// What the script does, as written in the manifest - `vite build` for an
    /// npm script, the argv joined for everything else. Display only.
    pub command: String,
}

/// The answer to `list_project_scripts`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub struct ScriptCatalog {
    pub scripts: Vec<ProjectScript>,
    /// Scripts left out because a name or path holds a character no shell can
    /// be trusted with - see `crate::scripts::safe`. Counted so the menu can
    /// say so rather than silently showing fewer.
    pub skipped: u32,
    /// True when a workspace had more members, or a folder more scripts, than
    /// one scan will read.
    pub truncated: bool,
}

/// Names a script to run. Sent back by the UI inside `PtySpawnSpec`; the
/// transport looks it up again rather than trusting anything else about it.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub struct ScriptRef {
    pub source: ScriptSource,
    pub dir: String,
    pub name: String,
}

/// Workspace members read in one scan. A monorepo past this is listed in part
/// and says so through [`ScriptCatalog::truncated`].
pub const MAX_SCRIPT_MEMBERS: usize = 64;
/// Scripts returned in one scan.
pub const MAX_SCRIPTS: usize = 1000;
/// A manifest above this is not read. 512 KiB is far past any real one.
pub const MAX_MANIFEST_BYTES: u64 = 512 * 1024;
