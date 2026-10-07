/**
 * Names, links and the copy that is not a list.
 *
 * Everything a visitor reads lives in `src/content/`. Components here are
 * presentational: they lay copy out, they do not author it. This is the same
 * `messages.ts` convention the panes in `apps/ui` use, for the same reason -
 * this app ships in English only, and a translation pass one day should be a
 * pass over one folder rather than over every component.
 */
export const repo = {
  owner: "MinaLouisLeon",
  name: "mino-workbench",
  url: "https://github.com/MinaLouisLeon/mino-workbench",
  releases: "https://github.com/MinaLouisLeon/mino-workbench/releases/latest",
  docs: "https://github.com/MinaLouisLeon/mino-workbench/tree/main/docs/mino-workbench",
} as const;

export const site = {
  name: "Mino Workbench",
  tagline: "A three-pane Nushell workbench.",
  description:
    "An interactive terminal, a lazy-loaded file tree and an editor, over one transport interface. Local or over SSH, with git and GitHub built in.",
} as const;

export const nav = [
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Security", href: "#security" },
  { label: "Install", href: "#install" },
] as const;

export const hero = {
  eyebrow: "Free and open source · MIT",
  headline: "Terminal, tree and editor.",
  headlineAccent: "One interface underneath.",
  body: "Nushell in a real PTY, split up to four ways. A file tree that never walks a directory you did not open. An editor that refuses to overwrite work it did not see change. The same three panes against your machine or a host over SSH.",
  primaryCta: "Download for Windows",
  secondaryCta: "View on GitHub",
  note: "Windows installer. Builds are not code-signed, so SmartScreen warns on first run.",
} as const;

export const rule = {
  eyebrow: "The rule it is built around",
  quote:
    "Every filesystem, PTY and shell call goes through one Transport interface.",
  body: [
    "No UI component and no Tauri command touches the filesystem or spawns a process. If a pane needs data, it needs a transport method - and adding one means adding it to the trait, its three implementations, the command list and the TypeScript client.",
    "Three implementations exist so the interface is proven against three shapes rather than fitted to one. Rust owns the domain types; the TypeScript is generated from them, so the two halves cannot drift.",
  ],
} as const;

export const install = {
  eyebrow: "Install",
  heading: "Two commands from a clone to a window.",
  body: "Needs Node 20.11 or newer and the Rust toolchain pinned in the repository. Nushell is optional: without `nu` on the PATH the terminal falls back to your default shell and says so.",
  snippet: [
    "git clone https://github.com/MinaLouisLeon/mino-workbench",
    "cd mino-workbench",
    "",
    "npm install",
    "npm run desktop",
  ].join("\n"),
  aside:
    "Or take the installer: merging into main verifies the branch, bumps the version, builds the .exe and publishes a release, with no manual step anywhere in it.",
} as const;

export const footer = {
  blurb:
    "Built as a React and TypeScript UI over a shared Rust core, compiled into both a Tauri desktop app and a standalone agent daemon.",
  links: [
    { label: "GitHub", href: repo.url },
    { label: "Documentation", href: repo.docs },
    { label: "Releases", href: repo.releases },
    {
      label: "MIT licence",
      href: "https://github.com/MinaLouisLeon/mino-workbench/blob/main/LICENSE",
    },
  ],
} as const;
