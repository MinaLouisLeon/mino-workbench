export type Guarantee = {
  title: string;
  body: string;
};

/**
 * The security posture, in the app's own words.
 *
 * These are guarantees the code enforces rather than intentions, which is why
 * each one names the thing that would have to break for it to be false.
 */
export const guarantees: readonly Guarantee[] = [
  {
    title: "No credential, anywhere",
    body: "Not on disk, not in a log, not in browser storage, not in memory for the length of one call. GitHub goes through gh and remotes go through git's own credential helper, the SSH agent or the OS keychain. The app can tell you to run `gh auth login`; it can never offer to do it for you.",
  },
  {
    title: "Nothing outside the folder you opened",
    body: "Reads and writes alike. A path is canonicalised and checked for containment before any syscall runs, so a path that resolves outside the connected root is refused rather than served.",
  },
  {
    title: "No caller value on a command line",
    body: "Nushell values are bound as environment parameters and pipeline text is fixed program text. Git is called with an argv array. A gh subcommand cannot be named by a caller at all - it is an enum, and the program text for each variant is written down.",
  },
  {
    title: "Host keys are checked",
    body: "SSH authentication is a key file or an agent. An unknown or changed host key is refused: there is no accept-anything mode and no trust on first use, and no password or passphrase is ever requested or held.",
  },
  {
    title: "The daemon stays on loopback",
    body: "The standalone agent has no authentication yet, so it binds to loopback only and refuses a routable bind address outright rather than trusting the operator to notice.",
  },
  {
    title: "Remote output is redacted",
    body: "A remote URL can carry a token and git prints remote URLs unprompted, so no text from a call that touched a network reaches a message, a result or a log without passing through the redactor first.",
  },
];
