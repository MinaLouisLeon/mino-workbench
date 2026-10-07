use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The longest name a new or renamed entry may have, in bytes. The common
/// ceiling across NTFS, ext4 and APFS, so a name accepted here is one every
/// target can hold.
pub const MAX_ENTRY_NAME_BYTES: usize = 255;

/// What `Create` makes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub enum NewEntryKind {
    File,
    Directory,
}

/// How `Delete` removes an entry.
///
/// Two modes, both offered from the tree and both confirmed first. `Trash`
/// hands the entry to the operating system's recycle bin and is only answered
/// by the local transport: a remote host has no recycle bin this app can
/// reach, so SSH refuses it with a sentence rather than deleting outright.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub enum DeleteMode {
    Trash,
    Permanent,
}

/// One change to the shape of the tree: a new file or folder, a rename, or a
/// delete.
///
/// One enumerated request rather than three trait methods, for the reason
/// `GitHubQuery` is one: three operations share one guard - resolve the
/// *parent*, prove it is inside the root, then act on one name in it - and
/// that is easier to keep right written once.
///
/// A name is a single path segment and never a path. `Rename` renames in
/// place; moving an entry to another folder is deliberately not offered.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", content = "detail", rename_all = "camelCase")]
#[ts(export, export_to = "generated/")]
pub enum EntryChange {
    /// Makes `name` inside the folder `parent`. Refuses if it already exists.
    #[serde(rename_all = "camelCase")]
    Create {
        parent: String,
        name: String,
        entry: NewEntryKind,
    },

    /// Gives the entry at `path` the name `name`, in the same folder. Refuses
    /// if that name is already taken.
    #[serde(rename_all = "camelCase")]
    Rename { path: String, name: String },

    /// Removes the entry at `path`, and everything under it when it is a
    /// folder. A symlink is removed itself, never what it points at.
    #[serde(rename_all = "camelCase")]
    Delete { path: String, mode: DeleteMode },
}
