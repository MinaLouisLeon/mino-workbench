//! What a detector is handed, and what it hands back.
//!
//! A detector never touches a transport. The scanner reads the folder - its
//! listing and the manifests the detector asked for - into a [`Folder`], and
//! the detector is a pure function over that. That is what lets every
//! detector be tested with a string and nothing else.

use std::collections::{BTreeSet, HashMap};

use crate::types::ScriptSource;

pub use super::candidate::{Arg, Candidate};

/// The operating system a script will run on, which is not always this one:
/// over SSH it is the remote host's, and that host is always POSIX.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Windows,
    Unix,
}

impl Platform {
    /// The machine this process runs on.
    pub fn local() -> Self {
        if cfg!(windows) {
            Platform::Windows
        } else {
            Platform::Unix
        }
    }
}

/// One folder, as much of it as the detectors asked for.
#[derive(Debug, Clone, Default)]
pub struct Folder {
    /// Relative to the connected root, `/`-separated, empty for the root.
    pub dir: String,
    pub files: BTreeSet<String>,
    pub dirs: BTreeSet<String>,
    /// Manifest name to contents, for the manifests some detector asked for.
    pub texts: HashMap<String, String>,
    /// Subfolder name to the file names in it, for the subfolders some
    /// detector asked to have listed (`scripts/`, `src/`).
    pub children: HashMap<String, BTreeSet<String>>,
}

impl Folder {
    pub fn has(&self, name: &str) -> bool {
        self.files.contains(name)
    }

    pub fn text(&self, name: &str) -> Option<&str> {
        self.texts.get(name).map(String::as_str)
    }

    /// The first of `names` present in this folder, in the order given.
    pub fn first_of<'a>(&self, names: &[&'a str]) -> Option<&'a str> {
        names.iter().copied().find(|name| self.has(name))
    }
}

/// What a detector sees: the folder under scan, the workspace root above it
/// (the same folder when scanning the root), and the target platform.
pub struct Scope<'a> {
    pub folder: &'a Folder,
    pub root: &'a Folder,
    pub platform: Platform,
}

/// One row of the detector table.
pub struct Detector {
    pub source: ScriptSource,
    /// The files in this folder the detector wants read.
    pub reads: fn(&Folder) -> Vec<String>,
    /// Subfolders whose file names it wants listed.
    pub lists: &'static [&'static str],
    pub detect: fn(&Scope) -> Vec<Candidate>,
    /// Workspace member patterns this folder declares, relative to it.
    pub members: fn(&Scope) -> Vec<String>,
}

/// For a detector that declares no workspace.
pub fn no_members(_scope: &Scope) -> Vec<String> {
    Vec::new()
}

/// For a detector that only needs the folder's names, not any file's text.
pub fn no_reads(_folder: &Folder) -> Vec<String> {
    Vec::new()
}

/// For a detector that reads one or more fixed manifest names.
pub fn present(folder: &Folder, names: &[&str]) -> Vec<String> {
    names
        .iter()
        .filter(|name| folder.has(name))
        .map(|name| name.to_string())
        .collect()
}
