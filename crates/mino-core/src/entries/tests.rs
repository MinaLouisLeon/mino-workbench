use super::*;

#[test]
fn an_ordinary_name_passes() {
    assert_eq!(check_name("main.rs").unwrap(), "main.rs");
    assert_eq!(check_name(".gitignore").unwrap(), ".gitignore");
    assert_eq!(check_name("with space").unwrap(), "with space");
}

#[test]
fn a_name_is_one_segment() {
    assert!(check_name("src/main.rs").is_err());
    assert!(check_name("..\\outside").is_err());
    assert!(check_name("../etc").is_err());
    assert!(check_name("..").is_err());
    assert!(check_name(".").is_err());
}

#[test]
fn empty_control_and_oversized_names_are_refused() {
    assert!(check_name("").is_err());
    assert!(check_name("   ").is_err());
    assert!(check_name("bad\0name").is_err());
    assert!(check_name("line\nbreak").is_err());
    assert!(check_name(&"a".repeat(MAX_ENTRY_NAME_BYTES + 1)).is_err());
    assert!(check_name(&"a".repeat(MAX_ENTRY_NAME_BYTES)).is_ok());
}

#[test]
fn windows_refuses_streams_devices_and_trailing_dots() {
    assert!(check_windows_name("notes.txt:hidden").is_err());
    assert!(check_windows_name("what?").is_err());
    assert!(check_windows_name("con").is_err());
    assert!(check_windows_name("CON.txt").is_err());
    assert!(check_windows_name("lpt1.log").is_err());
    assert!(check_windows_name("trailing.").is_err());
    assert!(check_windows_name("trailing ").is_err());
    assert!(check_windows_name("console.txt").is_ok());
    assert!(check_windows_name("main.rs").is_ok());
}

#[test]
fn a_case_only_rename_is_recognised() {
    assert!(is_case_only_rename("readme.md", "README.md"));
    assert!(!is_case_only_rename("readme.md", "readme.md"));
    assert!(!is_case_only_rename("readme.md", "notes.md"));
}
