//! Deleting, and the two refusals that matter most for it: the root, and a
//! path outside it.

use super::tests::{root_str, rooted};
use super::*;

#[test]
fn deletes_a_folder_with_its_contents() {
    let (_dir, guard) = rooted();
    std::fs::create_dir_all(guard.root().join("gone/deeper")).unwrap();
    std::fs::write(guard.root().join("gone/deeper/file.txt"), "x").unwrap();
    let path = guard.root().join("gone").to_string_lossy().into_owned();
    let change = EntryChange::Delete {
        path,
        mode: DeleteMode::Permanent,
    };
    assert_eq!(change_entry(&guard, change).unwrap(), None);
    assert!(!guard.root().join("gone").exists());
}

#[test]
fn the_root_itself_cannot_be_renamed_or_deleted() {
    let (_dir, guard) = rooted();
    let delete = EntryChange::Delete {
        path: root_str(&guard),
        mode: DeleteMode::Permanent,
    };
    assert!(matches!(
        change_entry(&guard, delete).unwrap_err(),
        TransportError::InvalidArgument { .. }
    ));
    let rename = EntryChange::Rename {
        path: root_str(&guard),
        name: "other".into(),
    };
    assert!(change_entry(&guard, rename).is_err());
    assert!(guard.root().is_dir());
}

#[test]
fn a_path_outside_the_root_is_refused() {
    let outside = tempfile::tempdir().unwrap();
    std::fs::write(outside.path().join("victim.txt"), "x").unwrap();
    let (_dir, guard) = rooted();
    let path = outside
        .path()
        .join("victim.txt")
        .to_string_lossy()
        .into_owned();
    let change = EntryChange::Delete {
        path,
        mode: DeleteMode::Permanent,
    };
    assert!(matches!(
        change_entry(&guard, change).unwrap_err(),
        TransportError::PathEscapesRoot { .. }
    ));
    assert!(outside.path().join("victim.txt").exists());
}

#[cfg(unix)]
#[test]
fn deleting_a_symlink_leaves_its_target() {
    let outside = tempfile::tempdir().unwrap();
    std::fs::write(outside.path().join("kept.txt"), "x").unwrap();
    let (_dir, guard) = rooted();
    std::os::unix::fs::symlink(outside.path(), guard.root().join("link")).unwrap();
    let path = guard.root().join("link").to_string_lossy().into_owned();
    let change = EntryChange::Delete {
        path,
        mode: DeleteMode::Permanent,
    };
    change_entry(&guard, change).unwrap();
    assert!(outside.path().join("kept.txt").exists());
}
