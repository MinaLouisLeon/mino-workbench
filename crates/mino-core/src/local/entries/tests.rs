//! `Trash` is not exercised here: it would put test files in the recycle bin
//! of whoever runs the suite. It is covered by the manual test guide.

use super::*;
use crate::types::EntryKind;

pub(super) fn rooted() -> (tempfile::TempDir, RootGuard) {
    let dir = tempfile::tempdir().unwrap();
    let guard = RootGuard::new(dir.path().to_str().unwrap()).unwrap();
    (dir, guard)
}

pub(super) fn root_str(guard: &RootGuard) -> String {
    guard.root().to_string_lossy().into_owned()
}

fn create_in(guard: &RootGuard, name: &str, entry: NewEntryKind) -> Result<Option<DirEntry>> {
    change_entry(
        guard,
        EntryChange::Create {
            parent: root_str(guard),
            name: name.into(),
            entry,
        },
    )
}

#[test]
fn creates_a_file_and_a_folder() {
    let (_dir, guard) = rooted();
    let file = create_in(&guard, "new.txt", NewEntryKind::File)
        .unwrap()
        .unwrap();
    assert_eq!(file.name, "new.txt");
    assert_eq!(file.kind, EntryKind::File);
    let folder = create_in(&guard, "src", NewEntryKind::Directory)
        .unwrap()
        .unwrap();
    assert_eq!(folder.kind, EntryKind::Directory);
    assert!(guard.root().join("src").is_dir());
}

#[test]
fn create_refuses_an_existing_name_without_touching_it() {
    let (_dir, guard) = rooted();
    std::fs::write(guard.root().join("keep.txt"), "contents").unwrap();
    let err = create_in(&guard, "keep.txt", NewEntryKind::File).unwrap_err();
    assert!(matches!(err, TransportError::InvalidArgument { .. }));
    assert_eq!(
        std::fs::read_to_string(guard.root().join("keep.txt")).unwrap(),
        "contents"
    );
}

#[test]
fn a_name_that_is_a_path_is_refused() {
    let (_dir, guard) = rooted();
    assert!(create_in(&guard, "../escape.txt", NewEntryKind::File).is_err());
    assert!(create_in(&guard, "a/b.txt", NewEntryKind::File).is_err());
    assert!(!guard.root().join("a").exists());
}

#[test]
fn renames_in_place_and_refuses_to_overwrite() {
    let (_dir, guard) = rooted();
    std::fs::write(guard.root().join("old.txt"), "a").unwrap();
    std::fs::write(guard.root().join("taken.txt"), "b").unwrap();
    let old = guard.root().join("old.txt").to_string_lossy().into_owned();

    let clash = EntryChange::Rename {
        path: old.clone(),
        name: "taken.txt".into(),
    };
    assert!(change_entry(&guard, clash).is_err());
    assert_eq!(
        std::fs::read_to_string(guard.root().join("taken.txt")).unwrap(),
        "b"
    );

    let renamed = EntryChange::Rename {
        path: old,
        name: "new.txt".into(),
    };
    let entry = change_entry(&guard, renamed).unwrap().unwrap();
    assert_eq!(entry.name, "new.txt");
    assert!(!guard.root().join("old.txt").exists());
}

#[test]
fn a_case_only_rename_goes_through() {
    let (_dir, guard) = rooted();
    std::fs::write(guard.root().join("readme.md"), "a").unwrap();
    let path = guard
        .root()
        .join("readme.md")
        .to_string_lossy()
        .into_owned();
    let change = EntryChange::Rename {
        path,
        name: "README.md".into(),
    };
    let entry = change_entry(&guard, change).unwrap().unwrap();
    assert_eq!(entry.name, "README.md");
}
