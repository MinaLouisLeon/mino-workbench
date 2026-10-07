/**
 * The still life in the hero.
 *
 * Rows and lines only - `WorkbenchPreview` decides how any of it looks. The
 * text is real: these are files that exist in the repository and a `ls` whose
 * columns are the ones Nushell actually prints.
 */
export type TreeRow = {
  name: string;
  depth: number;
  kind: "folder" | "file";
  status?: "modified" | "added";
  open?: boolean;
};

export const treeRows: readonly TreeRow[] = [
  { name: "crates", depth: 0, kind: "folder", open: true },
  { name: "mino-core", depth: 1, kind: "folder", open: true },
  { name: "src", depth: 2, kind: "folder", open: true },
  { name: "transport.rs", depth: 3, kind: "file", status: "modified" },
  { name: "error.rs", depth: 3, kind: "file" },
  { name: "mino-agent", depth: 1, kind: "folder" },
  { name: "apps", depth: 0, kind: "folder", open: true },
  { name: "desktop", depth: 1, kind: "folder" },
  { name: "ui", depth: 1, kind: "folder" },
  { name: "Cargo.toml", depth: 0, kind: "file", status: "added" },
];

export type TerminalLine = {
  text: string;
  tone: "prompt" | "command" | "output" | "accent";
};

export const terminalLines: readonly TerminalLine[] = [
  { text: "~/mino-workbench", tone: "prompt" },
  { text: "ls crates | select name type size", tone: "command" },
  { text: " # │ name        │ type │ size", tone: "output" },
  { text: " 0 │ mino-core   │ dir  │ 4.1 kB", tone: "output" },
  { text: " 1 │ mino-agent  │ dir  │ 4.1 kB", tone: "output" },
  { text: "~/mino-workbench", tone: "prompt" },
  { text: "git status --short", tone: "command" },
  { text: " M crates/mino-core/src/transport.rs", tone: "accent" },
];

export type EditorLine = {
  number: number;
  text: string;
};

export const editorLines: readonly EditorLine[] = [
  { number: 41, text: "#[async_trait]" },
  { number: 42, text: "pub trait Transport: Send + Sync {" },
  { number: 43, text: "    /// Every filesystem call starts here." },
  { number: 44, text: "    async fn read_dir(&self, path: &Path)" },
  { number: 45, text: "        -> Result<Vec<Entry>, TransportError>;" },
  { number: 46, text: "" },
  { number: 47, text: "    fn git(&self) -> Option<&dyn GitTransport>;" },
  { number: 48, text: "}" },
];
