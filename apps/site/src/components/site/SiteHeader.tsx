import Link from "next/link";
import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MinoMark } from "@/components/site/MinoMark";
import { nav, repo, site } from "@/content/meta";

/**
 * The sticky top bar.
 *
 * The nav collapses to nothing below `md` rather than into a drawer: there are
 * four in-page anchors behind it, and a hamburger that opens a list of four
 * links to sections the reader is about to scroll past anyway is a component
 * with a state machine and no job.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <MinoMark className="size-7" />
          <span className="text-sm font-semibold tracking-tight">
            {site.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <a href={repo.url} target="_blank" rel="noreferrer">
              <Github aria-hidden />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
          <Button asChild size="sm">
            <a href={repo.releases} target="_blank" rel="noreferrer">
              Download
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
