import {
  FileCode2,
  FolderTree,
  GitBranch,
  Github,
  Network,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  detail: string;
};

export const features: readonly Feature[] = [
  {
    icon: TerminalSquare,
    title: "Terminal",
    body: "Nushell in a real PTY, split into up to four shells side by side.",
    detail:
      "Without `nu` on the PATH it falls back to your platform's default shell and tells you it did, rather than failing at the first prompt.",
  },
  {
    icon: FolderTree,
    title: "File tree",
    body: "Lazy-loaded one directory at a time. Never a recursive walk.",
    detail:
      "Opening a folder reads that folder. A repository with a hundred thousand files costs the same as one with ten.",
  },
  {
    icon: FileCode2,
    title: "Editor",
    body: "Read and save, with syntax highlighting by extension.",
    detail:
      "Saving refuses to overwrite a file that changed on disk since it was opened - the conflict is a sentence, not a silent loss.",
  },
  {
    icon: Network,
    title: "Over SSH",
    body: "The same three panes against a remote host.",
    detail:
      "Files travel over SFTP and shells over SSH channels. Host keys are checked against known_hosts, with no accept-anything mode and no trust on first use.",
  },
  {
    icon: GitBranch,
    title: "Git",
    body: "Status, staging, diff, commit, branches, stash, remotes and conflicts.",
    detail:
      "Badges in the tree, a branch in the header and a search that skips what .gitignore skips all fall out of a single status call, so three readings of one tree cannot disagree.",
  },
  {
    icon: Github,
    title: "GitHub",
    body: "CI status, pull requests, issues, and opening a file on the web.",
    detail:
      "Every request shells out to the gh CLI, which owns its own authentication. There is no token in this application to leak.",
  },
];

export type Transport = {
  name: string;
  path: string;
  status: string;
  state: "working" | "planned";
  note: string;
};

export const transports: readonly Transport[] = [
  {
    name: "Local",
    path: "crates/mino-core/src/local/",
    status: "Working",
    state: "working",
    note: "Files, PTYs and shells on this machine, git and GitHub included.",
  },
  {
    name: "SSH",
    path: "crates/mino-core/src/ssh/",
    status: "Working",
    state: "working",
    note: "SFTP for files, SSH channels for shells, and the remote host's own git and gh.",
  },
  {
    name: "Remote agent",
    path: "crates/mino-core/src/remote/",
    status: "Not built yet",
    state: "planned",
    note: "Compiles and answers with a typed Unimplemented, which renders as a sentence you can act on.",
  },
];
