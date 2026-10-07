//! The path half of `entries`: where an existing entry is, what a new name
//! may be on this machine, and what an entry looks like once it has moved.
//! Split from `entries` so that file reads as the three operations.

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use crate::entries::{already_exists, check_name, root_refused};
use crate::error::{Result, TransportError};
use crate::types::DirEntry;

use super::fs::entry_from;
use super::roots::{display_path, RootGuard};

/// Splits an existing entry into its canonical parent and its own name, and
/// refuses the root itself: the open folder is not the tree's to rename or
/// delete.
pub(super) fn locate(guard: &RootGuard, path: &str) -> Result<(PathBuf, String)> {
    let requested = PathBuf::from(path);
    let joined = if requested.is_absolute() {
        requested
    } else {
        guard.root().join(requested)
    };
    let (Some(parent), Some(name)) = (joined.parent(), joined.file_name()) else {
        return Err(root_refused());
    };
    let name = check_name(&name.to_string_lossy())?.to_string();
    let folder = match guard.resolve(&parent.to_string_lossy()) {
        Ok(folder) => folder,
        // The root's own parent is outside it. Saying so in those words would
        // be accurate and unhelpful - but only for the root: a parent that
        // escapes through a symlink gets the guard's own answer.
        Err(TransportError::PathEscapesRoot { .. })
            if guard.resolve(path).ok().as_deref() == Some(guard.root()) =>
        {
            return Err(root_refused());
        }
        Err(other) => return Err(other),
    };
    fs::symlink_metadata(folder.join(&name)).map_err(|e| TransportError::from_io(path, e))?;
    Ok((folder, name))
}

/// `check_name`, plus Windows' own rules when this is Windows.
pub(super) fn local_name(name: &str) -> Result<&str> {
    let name = check_name(name)?;
    #[cfg(windows)]
    let name = crate::entries::check_windows_name(name)?;
    Ok(name)
}

pub(super) fn entry_at(target: &Path) -> Result<DirEntry> {
    let shown = display_path(target);
    let meta = fs::symlink_metadata(target).map_err(|e| TransportError::from_io(&shown, e))?;
    Ok(entry_from(target, &meta))
}

pub(super) fn taken_or_io(shown: &str, name: &str, err: std::io::Error) -> TransportError {
    if err.kind() == ErrorKind::AlreadyExists {
        already_exists(name)
    } else {
        TransportError::from_io(shown, err)
    }
}
