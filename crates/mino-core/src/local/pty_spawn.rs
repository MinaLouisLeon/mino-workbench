//! Spawning one PTY and pumping its output into a channel.
//!
//! `portable-pty` is a blocking API, so the read loop lives on a dedicated OS
//! thread and hands chunks to async callers over an mpsc channel. The thread
//! ends when the pty reaches EOF, which happens when the master is dropped in
//! `close`, so no thread outlives its session.

use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty};
use tokio::sync::mpsc;

use crate::error::{Result, TransportError};
use crate::scripts::launch::Launch;
use crate::types::{PtyEvent, PtyExit, PtySize};

use super::pty_env::apply_env;

/// Output chunks buffered before the reader thread blocks. Deep enough that a
/// burst of terminal output (`cat` on a large file) does not stall the shell.
const CHANNEL_CAPACITY: usize = 512;
const READ_BUFFER_BYTES: usize = 8192;
/// How long the waiter polls for an exit status after EOF before giving up.
const EXIT_POLL_ATTEMPTS: u32 = 100;
const EXIT_POLL_INTERVAL_MS: u64 = 50;

pub type SharedChild = Arc<Mutex<Box<dyn Child + Send + Sync>>>;

pub struct SpawnedPty {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: SharedChild,
    pub events: mpsc::Receiver<PtyEvent>,
}

pub fn spawn(launch: &Launch, cwd: &str, size: PtySize) -> Result<SpawnedPty> {
    let program = launch.program.as_str();
    let size = size.sanitised();
    let pair = native_pty_system()
        .openpty(portable_pty::PtySize {
            rows: size.rows,
            cols: size.cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| TransportError::pty(format!("could not open a pty: {e}")))?;

    let mut command = CommandBuilder::new(program);
    command.args(&launch.args);
    command.cwd(cwd);
    apply_env(&mut command, launch);

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|e| TransportError::pty(format!("could not start {program}: {e}")))?;
    // Dropped immediately: holding the slave open would keep the pty alive
    // after the child exits and the reader would never see EOF.
    drop(pair.slave);

    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| TransportError::pty(format!("could not read from the pty: {e}")))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| TransportError::pty(format!("could not write to the pty: {e}")))?;

    let child: SharedChild = Arc::new(Mutex::new(child));
    let (tx, events) = mpsc::channel(CHANNEL_CAPACITY);
    let waiter = Arc::clone(&child);
    std::thread::Builder::new()
        .name("mino-pty-reader".to_string())
        .spawn(move || pump(reader, waiter, tx))
        .map_err(|e| TransportError::pty(format!("could not start the pty reader: {e}")))?;

    Ok(SpawnedPty {
        master: pair.master,
        writer,
        child,
        events,
    })
}

fn pump(mut reader: Box<dyn Read + Send>, child: SharedChild, tx: mpsc::Sender<PtyEvent>) {
    let mut buffer = [0u8; READ_BUFFER_BYTES];
    loop {
        match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => {
                let chunk = String::from_utf8_lossy(&buffer[..read]).into_owned();
                if tx.blocking_send(PtyEvent::Output(chunk)).is_err() {
                    // Receiver gone: the session was closed. Stop quietly.
                    return;
                }
            }
            Err(err) if err.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(err) => {
                let _ = tx.blocking_send(PtyEvent::Error(err.to_string()));
                break;
            }
        }
    }
    let _ = tx.blocking_send(PtyEvent::Exit(wait_for_exit(&child)));
}

fn wait_for_exit(child: &SharedChild) -> PtyExit {
    for _ in 0..EXIT_POLL_ATTEMPTS {
        let status = child
            .lock()
            .ok()
            .and_then(|mut c| c.try_wait().ok().flatten());
        if let Some(status) = status {
            return PtyExit {
                code: Some(status.exit_code() as i32),
                success: status.success(),
            };
        }
        std::thread::sleep(std::time::Duration::from_millis(EXIT_POLL_INTERVAL_MS));
    }
    PtyExit {
        code: None,
        success: false,
    }
}
