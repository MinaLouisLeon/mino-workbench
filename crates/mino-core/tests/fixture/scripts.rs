//! Hand-built folders for the detector suites.
//!
//! A detector is a pure function over a [`Folder`], so these tests never touch
//! a disk: a folder is its file names, the manifests' text, and the listing
//! of any subfolder a detector asked for.

use mino_core::scripts::{detect, Folder, Platform};
use mino_core::types::{ProjectScript, ScriptSource};

/// A folder holding `files` - each a name and its text, where the text is
/// empty for a file whose contents no detector reads.
pub fn folder(dir: &str, files: &[(&str, &str)]) -> Folder {
    let mut folder = Folder {
        dir: dir.to_string(),
        ..Folder::default()
    };
    for (name, text) in files {
        folder.files.insert(name.to_string());
        if !text.is_empty() {
            folder.texts.insert(name.to_string(), text.to_string());
        }
    }
    folder
}

/// Adds a listed subfolder.
pub fn with_child(mut folder: Folder, sub: &str, names: &[&str]) -> Folder {
    folder.dirs.insert(sub.to_string());
    folder.children.insert(
        sub.to_string(),
        names.iter().map(|name| name.to_string()).collect(),
    );
    folder
}

/// Scripts found in a root folder on `platform`.
pub fn found(folder: &Folder, platform: Platform) -> Vec<ProjectScript> {
    detect(folder, folder, platform).0
}

/// The names of the scripts from one source, in menu order.
pub fn names(scripts: &[ProjectScript], source: ScriptSource) -> Vec<String> {
    scripts
        .iter()
        .filter(|script| script.source == source)
        .map(|script| script.name.clone())
        .collect()
}

/// The one script with this source and name.
pub fn one(scripts: &[ProjectScript], source: ScriptSource, name: &str) -> ProjectScript {
    scripts
        .iter()
        .find(|script| script.source == source && script.name == name)
        .cloned()
        .unwrap_or_else(|| panic!("no {source:?} script called {name}"))
}
