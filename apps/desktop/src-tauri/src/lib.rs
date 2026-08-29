//! Mino Workbench desktop shell.
//!
//! Wires the Tauri window to `mino-core`. The only Rust logic in this crate is
//! command dispatch and the pty event bridge; everything else lives in the
//! core so the browser and agent builds get identical behaviour.

pub mod commands;
mod state;

use tauri::{Manager, WindowEvent};

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mino_desktop_lib=info,mino_core=info".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::connection::connect,
            commands::connection::disconnect,
            commands::fs::list_dir,
            commands::fs::stat,
            commands::fs::search_files,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::git::git_repository,
            commands::git::git_status,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_discard,
            commands::git::git_commit,
            commands::git_history::git_diff,
            commands::git_history::git_log,
            commands::git_history::git_show,
            commands::git_history::git_commit_diff,
            commands::git_history::git_blame,
            commands::pty::open_pty,
            commands::pty::write_pty,
            commands::pty::resize_pty,
            commands::pty::close_pty,
            commands::shell::run_structured,
            commands::shell::probe_shell,
        ])
        .on_window_event(|window, event| {
            // Closing the window must not leave a shell running. The registry
            // also kills sessions on drop; this makes it immediate.
            if matches!(event, WindowEvent::Destroyed) {
                if let Some(transport) = window.state::<state::AppState>().take() {
                    tauri::async_runtime::block_on(async move {
                        let _ = transport.disconnect().await;
                    });
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("the Mino Workbench window could not start");
}
