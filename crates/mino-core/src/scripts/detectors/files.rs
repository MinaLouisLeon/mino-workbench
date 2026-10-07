//! Loose script files: in the folder itself, and in its `scripts/` directory.
//!
//! Each runs under the interpreter its extension names rather than by being
//! made executable, because a checkout on Windows has no executable bit and a
//! script copied from elsewhere often has lost it.
//!
//! The folder itself is held to a shorter list than `scripts/`: a `.js` in a
//! project root is nearly always configuration (`eslint.config.js`) rather
//! than something to run, while one in `scripts/` was put there to be run.

use crate::types::ScriptSource;

use super::super::model::{no_members, no_reads, Arg, Candidate, Detector, Platform, Scope};

pub const FILES: Detector = Detector {
    source: ScriptSource::File,
    reads: no_reads,
    lists: &[SCRIPTS_DIR],
    detect,
    members: no_members,
};

const SCRIPTS_DIR: &str = "scripts";
const ROOT_EXTENSIONS: &[&str] = &["sh", "bash", "ps1", "bat", "cmd", "nu", "py"];
const SCRIPTS_EXTENSIONS: &[&str] = &[
    "sh", "bash", "ps1", "bat", "cmd", "nu", "py", "js", "mjs", "cjs",
];
/// Python files a project root holds that are not meant to be run by hand.
const NOT_SCRIPTS: &[&str] = &["setup.py", "conftest.py", "noxfile.py"];

/// The interpreter for `extension` on `platform`, as fixed program text.
/// `None` where the platform cannot run it - a `.bat` on Linux.
fn interpreter(extension: &str, platform: Platform) -> Option<&'static [&'static str]> {
    let windows = platform == Platform::Windows;
    Some(match extension {
        "sh" if windows => &["bash"],
        "sh" => &["sh"],
        "bash" => &["bash"],
        "ps1" if windows => &["powershell", "-NoProfile", "-File"],
        "ps1" => &["pwsh", "-NoProfile", "-File"],
        // A batch file is its own program on Windows: nothing goes in front.
        "bat" | "cmd" if windows => &[],
        "bat" | "cmd" => return None,
        "nu" => &["nu"],
        "py" if windows => &["python"],
        "py" => &["python3"],
        "js" | "mjs" | "cjs" => &["node"],
        _ => return None,
    })
}

fn candidate(sub: Option<&str>, file: &str, platform: Platform) -> Option<Candidate> {
    let (_, extension) = file.rsplit_once('.')?;
    let extension = extension.to_ascii_lowercase();
    let allowed = if sub.is_some() {
        SCRIPTS_EXTENSIONS
    } else {
        ROOT_EXTENSIONS
    };
    if !allowed.contains(&extension.as_str()) || file.starts_with(['.', '_']) {
        return None;
    }
    if sub.is_none() && NOT_SCRIPTS.contains(&file) {
        return None;
    }
    let fixed = interpreter(&extension, platform)?;
    let separator = if platform == Platform::Windows {
        "\\"
    } else {
        "/"
    };
    let name = match sub {
        Some(sub) => format!("{sub}/{file}"),
        None => file.to_string(),
    };
    // A batch file run as a program needs a path, or it would be looked up on
    // PATH instead of in this folder.
    let path = match (sub, fixed.is_empty()) {
        (Some(sub), _) => format!("{sub}{separator}{file}"),
        (None, true) => format!(".{separator}{file}"),
        (None, false) => file.to_string(),
    };
    let mut argv: Vec<Arg> = fixed.iter().map(|part| Arg::Fixed(part)).collect();
    argv.push(Arg::Value(path));
    Some(Candidate::new(name, argv))
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let platform = scope.platform;
    let mut found: Vec<Candidate> = scope
        .folder
        .files
        .iter()
        .filter_map(|file| candidate(None, file, platform))
        .collect();
    if let Some(names) = scope.folder.children.get(SCRIPTS_DIR) {
        found.extend(
            names
                .iter()
                .filter_map(|file| candidate(Some(SCRIPTS_DIR), file, platform)),
        );
    }
    found
}
