//! Reading a folder for the detectors.
//!
//! The scan is written once, against [`ScanSource`] - a folder listing and a
//! file read, both guarded - so it reads a local folder and a remote one
//! identically and every manifest goes through the same path guard as a file
//! opened in the viewer.
//!
//! Over SSH the source is the transport itself ([`Through`]). Locally it is
//! the guarded filesystem calls the transport's own `list_dir` falls back to:
//! the transport prefers a Nushell listing, which costs a process per folder,
//! and a scan reads several folders every time the menu opens.

use async_trait::async_trait;

use crate::error::Result;
use crate::transport::Transport;
use crate::types::{DirEntry, EntryKind, FilePayload, ReadFileOptions, MAX_MANIFEST_BYTES};

use super::detectors::DETECTORS;
use super::model::Folder;

/// `dir/name`, or `name` at the root.
pub fn join(dir: &str, name: &str) -> String {
    if dir.is_empty() {
        name.to_string()
    } else {
        format!("{dir}/{name}")
    }
}

/// What a scan reads through. Both calls take a path relative to the
/// connected root and must apply the root guard.
#[async_trait]
pub trait ScanSource: Send + Sync {
    async fn list_dir(&self, dir: &str) -> Result<Vec<DirEntry>>;
    async fn read_file(&self, path: &str, options: ReadFileOptions) -> Result<FilePayload>;
}

/// Scans through a transport's own `list_dir` and `read_file`.
pub struct Through<'a>(pub &'a dyn Transport);

#[async_trait]
impl ScanSource for Through<'_> {
    async fn list_dir(&self, dir: &str) -> Result<Vec<DirEntry>> {
        self.0.list_dir(dir).await
    }

    async fn read_file(&self, path: &str, options: ReadFileOptions) -> Result<FilePayload> {
        self.0.read_file(path, options).await
    }
}

/// Names in one folder, split into files and folders.
pub async fn list(source: &dyn ScanSource, dir: &str) -> Result<(Vec<String>, Vec<String>)> {
    let mut files = Vec::new();
    let mut dirs = Vec::new();
    for entry in source.list_dir(dir).await? {
        match entry.kind {
            EntryKind::Directory => dirs.push(entry.name),
            EntryKind::File | EntryKind::Symlink => files.push(entry.name),
            EntryKind::Other => {}
        }
    }
    Ok((files, dirs))
}

/// Lists `dir` and reads every manifest a detector asked for.
///
/// Only the listing can fail the folder. A manifest that cannot be read - too
/// large, binary, gone since the listing - is left out of `texts`, and its
/// detector finds nothing rather than taking the folder down with it.
pub async fn read_folder(source: &dyn ScanSource, dir: &str) -> Result<Folder> {
    let (files, dirs) = list(source, dir).await?;
    let mut folder = Folder {
        dir: dir.to_string(),
        files: files.into_iter().collect(),
        dirs: dirs.into_iter().collect(),
        ..Folder::default()
    };

    let mut wanted: Vec<String> = DETECTORS.iter().flat_map(|d| (d.reads)(&folder)).collect();
    wanted.sort();
    wanted.dedup();
    let options = ReadFileOptions {
        max_bytes: Some(MAX_MANIFEST_BYTES),
        allow_binary: false,
    };
    for name in wanted {
        if let Ok(payload) = source.read_file(&join(dir, &name), options).await {
            folder.texts.insert(name, payload.content);
        }
    }

    let mut subfolders: Vec<&str> = DETECTORS
        .iter()
        .flat_map(|d| d.lists.iter().copied())
        .collect();
    subfolders.sort_unstable();
    subfolders.dedup();
    for sub in subfolders {
        if !folder.dirs.contains(sub) {
            continue;
        }
        if let Ok((names, _)) = list(source, &join(dir, sub)).await {
            folder
                .children
                .insert(sub.to_string(), names.into_iter().collect());
        }
    }
    Ok(folder)
}
