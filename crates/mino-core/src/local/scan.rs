//! The local scan source for project scripts.
//!
//! The same guarded calls `list_dir` and `read_file` use, minus the Nushell
//! listing `list_dir` prefers: a scan reads several folders every time the
//! run-script menu opens, and a `nu` process per folder made that a second.

use async_trait::async_trait;

use crate::error::Result;
use crate::scripts::ScanSource;
use crate::types::{DirEntry, FilePayload, ReadFileOptions};

use super::roots::RootGuard;
use super::{fs, read};

pub struct LocalScan(pub RootGuard);

#[async_trait]
impl ScanSource for LocalScan {
    async fn list_dir(&self, dir: &str) -> Result<Vec<DirEntry>> {
        fs::list_dir(&self.0, dir)
    }

    async fn read_file(&self, path: &str, options: ReadFileOptions) -> Result<FilePayload> {
        read::read_file(&self.0, path, options)
    }
}
