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
        // The only way a URL leaves this window. #19 opens a file on
        // github.com through the operating system's browser rather than by
        // letting the page navigate: a webview that can be sent to an
        // arbitrary address is a webview somebody else can steer. The
        // capability scopes it to github.com; see
        // `capabilities/default.json`.
        .plugin(tauri_plugin_opener::init())
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
            commands::git_branches::git_branches,
            commands::git_branches::git_checkout,
            commands::git_branches::git_create_branch,
            commands::git_branches::git_delete_branch,
            commands::git_stash::git_stash_list,
            commands::git_stash::git_stash_push,
            commands::git_stash::git_stash_apply,
            commands::git_stash::git_stash_drop,
            commands::git_remote::git_remotes,
            commands::git_remote::git_fetch,
            commands::git_remote::git_pull,
            commands::git_remote::git_push,
            commands::git_remote::git_conflicts,
            commands::git_remote::git_resolve,
            commands::github::github_probe,
            commands::github::github_query,
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
