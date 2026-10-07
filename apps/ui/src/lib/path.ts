/**
 * Path helpers for display only.
 *
 * These never decide what is read: the transport's path guard is the only
 * authority on which paths are reachable. `splitSegments` is the degrade path
 * for the breadcrumb when the structured `path split` call is unavailable.
 *
 * Both helpers accept either separator, because the path style belongs to the
 * target, not to the machine running the UI.
 */
export function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index === -1 ? trimmed : trimmed.slice(index + 1);
}

/** Breadcrumb segments. Empty pieces from repeated separators are dropped. */
export function splitSegments(path: string): string[] {
  return path.split(/[\\/]+/).filter((segment) => segment.length > 0);
}

/** The folder a path sits in. Display and bookkeeping only, like the rest. */
export function dirname(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (index <= 0) return index === 0 ? trimmed.slice(0, 1) : trimmed;
  return trimmed.slice(0, index);
}

/** The separator a path already uses, so a joined path stays in its style. */
export function separatorOf(path: string): "/" | "\\" {
  return path.includes("\\") && !path.includes("/") ? "\\" : "/";
}

export function joinPath(folder: string, name: string): string {
  const separator = separatorOf(folder);
  return folder.endsWith(separator) ? `${folder}${name}` : `${folder}${separator}${name}`;
}

/** True when `path` is `ancestor` or anything beneath it. */
export function isWithin(path: string, ancestor: string): boolean {
  if (path === ancestor) return true;
  const base = ancestor.replace(/[\\/]+$/, "");
  return path.startsWith(`${base}/`) || path.startsWith(`${base}\\`);
}

/**
 * `path` relative to `root`, in `/` style - the form a README, an import or
 * a git command wants. A path outside `root` comes back unchanged.
 */
export function relativeTo(root: string, path: string): string {
  if (path === root) return ".";
  if (!isWithin(path, root)) return path;
  const base = root.replace(/[\\/]+$/, "");
  return path.slice(base.length + 1).replace(/\\/g, "/");
}
