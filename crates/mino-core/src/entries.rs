//! The rules every transport applies to an [`EntryChange`] before it touches
//! anything.
//!
//! The path guard proves a *path* is inside the root. A create or a rename
//! also takes a *name*, and a name is a caller value that becomes part of a
//! path - so it is held to a stricter rule than a path is: exactly one
//! segment, with nothing in it that a filesystem would read as structure.
//! Written once here so the local and SSH transports cannot disagree about
//! what a valid name is.
//!
//! [`EntryChange`]: crate::types::EntryChange

use crate::error::{Result, TransportError};
use crate::types::MAX_ENTRY_NAME_BYTES;

/// Characters Windows refuses in a name. `:` is the one that matters most: on
/// NTFS `notes.txt:hidden` is not an error, it is an alternate data stream,
/// and a file created that way is invisible in every listing.
const WINDOWS_RESERVED: &[char] = &['<', '>', ':', '"', '|', '?', '*'];

/// Device names Windows reserves in every folder, with or without an
/// extension: `con.txt` opens the console, not a file.
const WINDOWS_DEVICES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Returns `name` when it is a single, ordinary path segment, and a sentence
/// naming what is wrong with it otherwise.
///
/// Separators of both styles are refused whatever the target, so a name that
/// is valid over SSH is valid locally too and the tree behaves the same on
/// either.
pub fn check_name(name: &str) -> Result<&str> {
    if name.trim().is_empty() {
        return Err(TransportError::invalid("a name cannot be empty"));
    }
    if name == "." || name == ".." {
        return Err(TransportError::invalid(format!(
            "\"{name}\" is not a name a file or folder can have"
        )));
    }
    if name.contains(['/', '\\']) {
        return Err(TransportError::invalid(
            "a name cannot contain / or \\ - it names one entry, not a path",
        ));
    }
    if name.chars().any(char::is_control) {
        return Err(TransportError::invalid(
            "a name cannot contain control characters",
        ));
    }
    if name.len() > MAX_ENTRY_NAME_BYTES {
        return Err(TransportError::invalid(format!(
            "a name can be at most {MAX_ENTRY_NAME_BYTES} bytes long"
        )));
    }
    Ok(name)
}

/// The additional rules a Windows filesystem imposes. Applied by the local
/// transport on Windows only: a POSIX host is entitled to a file called
/// `a:b`, and refusing it over SSH would be refusing a real file.
pub fn check_windows_name(name: &str) -> Result<&str> {
    if let Some(found) = name.chars().find(|c| WINDOWS_RESERVED.contains(c)) {
        return Err(TransportError::invalid(format!(
            "a name cannot contain {found} on Windows"
        )));
    }
    if name.ends_with(['.', ' ']) {
        return Err(TransportError::invalid(
            "a name cannot end with a dot or a space on Windows",
        ));
    }
    let stem = name.split('.').next().unwrap_or(name).trim_end();
    if WINDOWS_DEVICES
        .iter()
        .any(|device| device.eq_ignore_ascii_case(stem))
    {
        return Err(TransportError::invalid(format!(
            "{stem} is a device name on Windows and cannot name a file"
        )));
    }
    Ok(name)
}

/// True when a rename changes nothing but letter case.
///
/// On a case-insensitive filesystem the target of `readme.md` -> `README.md`
/// "already exists" - it is the entry being renamed - so the exists check has
/// to let this one case through rather than refuse it.
pub fn is_case_only_rename(from: &str, to: &str) -> bool {
    from != to && from.to_lowercase() == to.to_lowercase()
}

/// The refusal both transports give when a create or a rename would land on
/// an existing entry. Never an overwrite: the tree does not replace files.
pub fn already_exists(name: &str) -> TransportError {
    TransportError::invalid(format!("{name} already exists in this folder"))
}

/// The open folder is the session's root, not an entry in it, so the tree
/// cannot rename or delete it.
pub fn root_refused() -> TransportError {
    TransportError::invalid("the open folder itself cannot be renamed or deleted")
}

#[cfg(test)]
mod tests;
