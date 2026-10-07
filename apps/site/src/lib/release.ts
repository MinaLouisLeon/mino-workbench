import { repo } from "@/content/meta";

export type Release = {
  /** `v0.1.4`, or null when the API could not be reached. */
  version: string | null;
  /** Where the download button goes. Always a working link. */
  href: string;
};

const ENDPOINT = `https://api.github.com/repos/${repo.owner}/${repo.name}/releases/latest`;

/**
 * The version on the download button.
 *
 * Unauthenticated GitHub requests are rate-limited per IP, and a build machine
 * shares its IP generously, so this is written to survive being refused: an
 * hour of caching, a short timeout, and a fallback that is the releases page
 * itself. The button works whether or not this call does - the version label
 * is the only thing at stake, and a missing label is not a broken page.
 */
export async function latestRelease(): Promise<Release> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });

    if (!response.ok) return { version: null, href: repo.releases };

    const body: unknown = await response.json();
    const tag = readTag(body);

    return { version: tag, href: installerFrom(body) ?? repo.releases };
  } catch {
    return { version: null, href: repo.releases };
  }
}

function readTag(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const tag = (body as { tag_name?: unknown }).tag_name;
  return typeof tag === "string" ? tag : null;
}

/**
 * The Windows installer, if this release carries one.
 *
 * Windows is the only target the release workflow builds, and the bundle
 * format is NSIS - so the asset is the one `.exe`. A release without one is a
 * release worth sending somebody to the page for rather than guessing at.
 */
function installerFrom(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const assets = (body as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return null;

  for (const asset of assets) {
    if (typeof asset !== "object" || asset === null) continue;
    const { name, browser_download_url: url } = asset as Record<string, unknown>;
    if (typeof name === "string" && name.endsWith(".exe") && typeof url === "string") {
      return url;
    }
  }
  return null;
}
