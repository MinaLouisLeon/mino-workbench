//! Creating, renaming and deleting, locally.
//!
//! Every operation resolves the *parent* folder through the `RootGuard` and
//! then acts on one checked name inside it. Resolving the entry itself would
//! be wrong twice over: a file being created does not exist yet, and
//! canonicalising a symlink would hand back what it points at - so "delete
//! this link" would become "delete the folder it points to".

use std::fs::{self, Metadata, OpenOptions};
use std::path::Path;

use crate::entries::{already_exists, is_case_only_rename};
use crate::error::{Result, TransportError};
use crate::types::{DeleteMode, DirEntry, EntryChange, NewEntryKind};

use super::entry_paths::{entry_at, local_name, locate, taken_or_io};
use super::roots::{display_path, RootGuard};

pub fn change_entry(guard: &RootGuard, change: EntryChange) -> Result<Option<DirEntry>> {
    match change {
        EntryChange::Create {
            parent,
            name,
            entry,
        } => create(guard, &parent, &name, entry).map(Some),
        EntryChange::Rename { path, name } => rename(guard, &path, &name).map(Some),
        EntryChange::Delete { path, mode } => delete(guard, &path, mode).map(|()| None),
    }
}

fn create(guard: &RootGuard, parent: &str, name: &str, entry: NewEntryKind) -> Result<DirEntry> {
    let folder = guard.resolve(parent)?;
    if !folder.is_dir() {
        return Err(TransportError::invalid(format!("{parent} is not a folder")));
    }
    let target = folder.join(local_name(name)?);
    let shown = display_path(&target);
    let made = match entry {
        // `create_new` is the exists check and the create in one call, so
        // nothing can appear between asking and making.
        NewEntryKind::File => OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&target)
            .map(drop),
        NewEntryKind::Directory => fs::create_dir(&target),
    };
    made.map_err(|e| taken_or_io(&shown, name, e))?;
    entry_at(&target)
}

fn rename(guard: &RootGuard, path: &str, name: &str) -> Result<DirEntry> {
    let (folder, current) = locate(guard, path)?;
    let new_name = local_name(name)?;
    if current == new_name {
        return entry_at(&folder.join(&current));
    }
    let target = folder.join(new_name);
    // `rename` replaces an existing file on every platform this runs on, so
    // the refusal has to be asked for. A case-only rename is the one target
    // that may "exist": on Windows and macOS it is the entry itself.
    if fs::symlink_metadata(&target).is_ok() && !is_case_only_rename(&current, new_name) {
        return Err(already_exists(name));
    }
    fs::rename(folder.join(&current), &target).map_err(|e| TransportError::from_io(path, e))?;
    entry_at(&target)
}

fn delete(guard: &RootGuard, path: &str, mode: DeleteMode) -> Result<()> {
    let (folder, name) = locate(guard, path)?;
    let target = folder.join(name);
    match mode {
        DeleteMode::Trash => {
            trash::delete(&target).map_err(|e| TransportError::io(format!("{path}: {e}")))
        }
        DeleteMode::Permanent => {
            let meta =
                fs::symlink_metadata(&target).map_err(|e| TransportError::from_io(path, e))?;
            remove(&target, &meta).map_err(|e| TransportError::from_io(path, e))
        }
    }
}

/// A real folder is removed with its contents. Anything else - a file, or a
/// symlink to either - is removed on its own. Windows keeps a directory
/// symlink as a directory entry, which `remove_file` refuses, hence the retry.
fn remove(target: &Path, meta: &Metadata) -> std::io::Result<()> {
    if meta.is_dir() {
        return fs::remove_dir_all(target);
    }
    fs::remove_file(target).or_else(|err| {
        if meta.file_type().is_symlink() {
            fs::remove_dir(target)
        } else {
            Err(err)
        }
    })
}

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_delete;
