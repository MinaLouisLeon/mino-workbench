//! Project scripts: finding them, and running one in a terminal.
//!
//! **Finding** is [`scan`]: the root, then every workspace member it declares,
//! each read through the transport's own `list_dir` and `read_file` and
//! handed to the detector table in [`detectors`]. A detector is a pure
//! function from a folder's names and manifests to scripts, which is what
//! lets a new ecosystem be added - and tested - as one file and one row.
//!
//! **Running** is [`resolve`] then [`launch`]. The UI sends back only which
//! script it means ([`crate::types::ScriptRef`]); the transport scans that
//! folder again and takes the argv from the detector, so nothing the caller
//! sends becomes program text. Every value that came out of a file is held to
//! [`safe::safe_value`] before it is listed, and the argv reaches the shell as
//! parameters - positional parameters for `sh`, `$env.MINO_RUN_ARGV` for
//! Nushell and PowerShell - never spliced into a command line.

pub mod candidate;
pub mod detectors;
pub mod launch;
pub mod members;
pub mod model;
pub mod safe;
pub mod scan;
pub mod source;

pub use model::{Arg, Candidate, Folder, Platform};
pub use scan::{detect, resolve, scan};
pub use source::{ScanSource, Through};
