/**
 * Conventional-commit types, offered from the commit box's right-click menu.
 *
 * The list is the common one (the Angular convention that most tooling
 * reads), in the order people reach for them. Each is a type, not a message:
 * picking one only writes the `type: ` at the start of the box.
 */
export const COMMIT_TYPES = [
  { type: "feat", label: "feat: a new feature" },
  { type: "fix", label: "fix: a bug fix" },
  { type: "docs", label: "docs: documentation only" },
  { type: "refactor", label: "refactor: no behaviour change" },
  { type: "test", label: "test: tests only" },
  { type: "perf", label: "perf: a performance change" },
  { type: "style", label: "style: formatting only" },
  { type: "build", label: "build: build or dependencies" },
  { type: "ci", label: "ci: CI configuration" },
  { type: "chore", label: "chore: anything else" },
] as const;

/** `type`, optional `(scope)`, optional `!`, colon, then any spaces. */
const PREFIX = /^([a-z]+)(\([^)\n]*\))?(!)?:[ \t]*/;

/**
 * What to write at the start of `message` to give it `type`, and how much of
 * the start it replaces.
 *
 * A message that already has a type has that type *swapped*, keeping its
 * scope and its breaking-change `!` - changing `fix(tree): ...` to a feature
 * should not throw away the `(tree)` somebody typed. A message without one
 * gets the type put in front of it.
 */
export function withCommitType(
  message: string,
  type: string,
): { replace: number; insert: string } {
  const match = PREFIX.exec(message);
  if (!match) return { replace: 0, insert: `${type}: ` };
  const [whole, , scope = "", bang = ""] = match;
  return { replace: whole.length, insert: `${type}${scope}${bang}: ` };
}
