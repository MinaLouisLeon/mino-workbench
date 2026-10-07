use mino_core::types::ScriptCatalog;
use mino_core::TransportError;
use tauri::State;

use crate::state::AppState;

/// Running one is `open_pty` with `spec.script` set - see `commands::pty`.
#[tauri::command]
pub async fn list_project_scripts(
    state: State<'_, AppState>,
) -> Result<ScriptCatalog, TransportError> {
    state.current()?.list_project_scripts().await
}
