//! Git domain types.
//!
//! Split in two along the line the transport itself is split on: reading the
//! working tree, and changing it.
//!
//! - [`status`] is what git says the tree looks like. Phase 1 built it and
//!   every later phase reads it.
//! - [`commit`] is what a caller asks git to do and what git did. Nothing here
//!   is a command; a [`commit::CommitRequest`] is data the transport turns into
//!   argv, and a [`commit::GitCommit`] is the answer.

mod commit;
mod status;

pub use commit::{CommitRequest, GitCommit, MAX_COMMIT_MESSAGE_BYTES};
pub use status::{GitEntry, GitFileState, GitRepository, GitStatus, MAX_STATUS_ENTRIES};
