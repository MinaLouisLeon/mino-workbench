//! Domain types shared by every transport implementation.
//!
//! All of them derive `ts_rs::TS` and are exported to
//! `apps/ui/src/Types/generated/`. TypeScript is generated from Rust; the
//! generated files are checked in and must never be edited by hand. See
//! `docs/mino-workbench/overview.md` for the regeneration command.

mod connection;
mod entry;
mod file;
mod git;
mod pty;
mod search;
mod structured;

pub use connection::{ConnectionInfo, ConnectionTarget, TransportKind};
pub use entry::{DirEntry, EntryKind};
pub use file::{
    FileEncoding, FilePayload, ReadFileOptions, WriteRequest, DEFAULT_READ_LIMIT_BYTES,
    DEFAULT_WRITE_LIMIT_BYTES,
};
pub use git::{
    CommitRequest, CreateBranchRequest, DiffRequest, GitBlame, GitBlameLine, GitBranch,
    GitChangedFile, GitCommit, GitCommitDetail, GitDiff, GitDiffLine, GitDiffLineKind, GitEntry,
    GitFileDiff, GitFileState, GitHunk, GitLog, GitRepository, GitStash, GitStatus, LogRequest,
    StashRequest, BLAME_SHA_LENGTH, DEFAULT_LOG_LIMIT, DIFF_CONTEXT_LINES, MAX_BLAME_LINES,
    MAX_BRANCH_NAME_BYTES, MAX_COMMIT_MESSAGE_BYTES, MAX_DIFF_LINES, MAX_LOG_LIMIT,
    MAX_STASH_MESSAGE_BYTES, MAX_STATUS_ENTRIES,
};
pub use pty::{PtyEvent, PtyExit, PtySession, PtySessionId, PtySize, PtySpawnSpec, PtyStream};
pub use search::{
    SearchHit, SearchHits, SearchQuery, DEFAULT_SEARCH_LIMIT, MAX_SCANNED_ENTRIES,
    MAX_SEARCH_LIMIT, SEARCH_TIMEOUT_MS, SKIPPED_DIRECTORIES,
};
pub use structured::{ShellKind, ShellProbe, StructuredOutput, StructuredRequest};
