//! Creating, renaming and deleting, over SFTP.
//!
//! The same shape as `local::entries`: the parent is canonicalised and put
//! past the root guard, and the operation acts on one checked name inside it.
//! `realpath` on the entry itself would follow a symlink, which is exactly
//! what a delete must not do.

use russh_sftp::client::SftpSession;
use russh_sftp::protocol::OpenFlags;

use crate::entries::{already_exists, check_name};
use crate::error::{Result, TransportError};
use crate::types::{DeleteMode, DirEntry, EntryChange, NewEntryKind};

use super::entry_tree::{entry_at, exists, join, locate, remove_tree};
use super::fs::{map_error, resolve};
use super::roots::RemoteRoot;

pub async fn change_entry(
    sftp: &SftpSession,
    root: &RemoteRoot,
    change: EntryChange,
) -> Result<Option<DirEntry>> {
    match change {
        EntryChange::Create {
            parent,
            name,
            entry,
        } => create(sftp, root, &parent, &name, entry).await.map(Some),
        EntryChange::Rename { path, name } => rename(sftp, root, &path, &name).await.map(Some),
        EntryChange::Delete { path, mode } => delete(sftp, root, &path, mode).await.map(|()| None),
    }
}

async fn create(
    sftp: &SftpSession,
    root: &RemoteRoot,
    parent: &str,
    name: &str,
    entry: NewEntryKind,
) -> Result<DirEntry> {
    let folder = resolve(sftp, root, parent).await?;
    let meta = sftp
        .metadata(folder.clone())
        .await
        .map_err(|e| map_error(parent, e))?;
    if !meta.is_dir() {
        return Err(TransportError::invalid(format!("{parent} is not a folder")));
    }
    let target = join(&folder, check_name(name)?);
    if exists(sftp, &target).await {
        return Err(already_exists(name));
    }
    match entry {
        // `EXCLUDE` makes the server refuse an existing file, so a file that
        // appears after the check above is still not truncated.
        NewEntryKind::File => {
            let flags = OpenFlags::CREATE | OpenFlags::EXCLUDE | OpenFlags::WRITE;
            let file = sftp
                .open_with_flags(target.clone(), flags)
                .await
                .map_err(|e| map_error(&target, e))?;
            drop(file);
        }
        NewEntryKind::Directory => sftp
            .create_dir(target.clone())
            .await
            .map_err(|e| map_error(&target, e))?,
    }
    entry_at(sftp, target).await
}

async fn rename(sftp: &SftpSession, root: &RemoteRoot, path: &str, name: &str) -> Result<DirEntry> {
    let (folder, current) = locate(sftp, root, path).await?;
    let name = check_name(name)?;
    let target = join(&folder, name);
    if current == name {
        return entry_at(sftp, target).await;
    }
    // SFTP v3 refuses to rename over an existing entry, but not every server
    // follows v3 and the `posix-rename` extension replaces. Asking first is
    // what makes the refusal the same everywhere.
    if exists(sftp, &target).await {
        return Err(already_exists(name));
    }
    sftp.rename(join(&folder, &current), target.clone())
        .await
        .map_err(|e| map_error(path, e))?;
    entry_at(sftp, target).await
}

async fn delete(sftp: &SftpSession, root: &RemoteRoot, path: &str, mode: DeleteMode) -> Result<()> {
    if mode == DeleteMode::Trash {
        return Err(TransportError::invalid(
            "a remote host has no recycle bin this app can reach - delete permanently instead",
        ));
    }
    let (folder, name) = locate(sftp, root, path).await?;
    remove_tree(sftp, join(&folder, &name)).await
}
