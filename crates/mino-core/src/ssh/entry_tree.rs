//! The path half of `entries`, over SFTP: where an existing entry is, whether
//! a name is taken, and the depth-first walk a folder delete needs. Split
//! from `entries` so that file reads as the three operations.

use russh_sftp::client::SftpSession;

use crate::entries::{check_name, root_refused};
use crate::error::{Result, TransportError};
use crate::types::DirEntry;

use super::fs::{entry_for, map_error, resolve};
use super::roots::{normalise, RemoteRoot};

/// Depth-first, without recursion: folders are emptied before they are
/// removed, and a symlink is removed as itself - `symlink_metadata` is what
/// stops the walk from following one out of the tree.
pub(super) async fn remove_tree(sftp: &SftpSession, top: String) -> Result<()> {
    let mut pending = vec![(top, false)];
    while let Some((path, emptied)) = pending.pop() {
        let meta = sftp
            .symlink_metadata(path.clone())
            .await
            .map_err(|e| map_error(&path, e))?;
        if meta.is_symlink() || !meta.is_dir() {
            sftp.remove_file(path.clone())
                .await
                .map_err(|e| map_error(&path, e))?;
        } else if emptied {
            sftp.remove_dir(path.clone())
                .await
                .map_err(|e| map_error(&path, e))?;
        } else {
            let listing = sftp
                .read_dir(path.clone())
                .await
                .map_err(|e| map_error(&path, e))?;
            pending.push((path.clone(), true));
            for item in listing {
                let child = item.file_name();
                if child != "." && child != ".." {
                    pending.push((join(&path, &child), false));
                }
            }
        }
    }
    Ok(())
}

/// The canonical parent and the entry's own name, with the root refused.
pub(super) async fn locate(
    sftp: &SftpSession,
    root: &RemoteRoot,
    path: &str,
) -> Result<(String, String)> {
    let candidate = normalise(&root.candidate(path));
    if candidate == root.root() {
        return Err(root_refused());
    }
    let (parent, name) = candidate
        .rsplit_once('/')
        .ok_or_else(|| TransportError::invalid(format!("{path} has no parent folder")))?;
    let name = check_name(name)?.to_string();
    let parent = if parent.is_empty() { "/" } else { parent };
    let folder = resolve(sftp, root, parent).await?;
    let target = join(&folder, &name);
    if target == root.root() {
        return Err(root_refused());
    }
    sftp.symlink_metadata(target.clone())
        .await
        .map_err(|e| map_error(path, e))?;
    Ok((folder, name))
}

pub(super) async fn exists(sftp: &SftpSession, path: &str) -> bool {
    sftp.symlink_metadata(path.to_string()).await.is_ok()
}

pub(super) async fn entry_at(sftp: &SftpSession, target: String) -> Result<DirEntry> {
    let meta = sftp
        .symlink_metadata(target.clone())
        .await
        .map_err(|e| map_error(&target, e))?;
    Ok(entry_for(target, meta))
}

pub(super) fn join(folder: &str, name: &str) -> String {
    format!("{}/{name}", folder.trim_end_matches('/'))
}
