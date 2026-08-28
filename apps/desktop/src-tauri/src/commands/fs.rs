use mino_core::types::{DirEntry, FilePayload, ReadFileOptions, WriteRequest};
use mino_core::TransportError;
use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub async fn list_dir(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<DirEntry>, TransportError> {
    state.current()?.list_dir(&path).await
}

#[tauri::command]
pub async fn stat(state: State<'_, AppState>, path: String) -> Result<DirEntry, TransportError> {
    state.current()?.stat(&path).await
}

#[tauri::command]
pub async fn read_file(
    state: State<'_, AppState>,
    path: String,
    options: ReadFileOptions,
) -> Result<FilePayload, TransportError> {
    state.current()?.read_file(&path, options).await
}

#[tauri::command]
pub async fn write_file(
    state: State<'_, AppState>,
    path: String,
    request: WriteRequest,
) -> Result<DirEntry, TransportError> {
    state.current()?.write_file(&path, request).await
}
