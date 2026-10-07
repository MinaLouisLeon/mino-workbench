import { ArrowRight, Download, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkbenchPreview } from "@/components/site/WorkbenchPreview";
import { hero, repo } from "@/content/meta";
import type { Release } from "@/lib/release";

type HeroProps = {
  release: Release;
};

/**
 * The first screen: what it is, then a picture of it.
 *
 * The download button carries the version when GitHub answered and carries
 * nothing when it did not - see `lib/release.ts`. It never carries a spinner
 * or a dash, because the page is rendered on the server and there is no
 * moment at which the reader is waiting on that call.
 */
export function Hero({ release }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <Backdrop />

      <div className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 font-mono text-xs text-text-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          {hero.eyebrow}
        </p>

        <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {hero.headline}{" "}
          <span className="text-accent">{hero.headlineAccent}</span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-text-muted">
          {hero.body}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <a href={release.href} target="_blank" rel="noreferrer">
              <Download aria-hidden />
              {hero.primaryCta}
              {release.version ? (
                <span className="font-mono text-xs opacity-70">
                  {release.version}
                </span>
              ) : null}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={repo.url} target="_blank" rel="noreferrer">
              <Github aria-hidden />
              {hero.secondaryCta}
              <ArrowRight aria-hidden />
            </a>
          </Button>
        </div>

        <p className="mt-5 text-sm text-text-faint">{hero.note}</p>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-28">
        <WorkbenchPreview />
      </div>
    </section>
  );
}

/**
 * The wash behind the hero: a hairline grid, faded out, under one soft glow.
 *
 * Both are written with `var(--color-*)` rather than a hex value, so this
 * stays a file with no colour in it even though it is the only decorative
 * thing on the page.
 */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -top-40 left-1/4 size-[36rem] rounded-full bg-[radial-gradient(circle,var(--color-accent-muted),transparent_65%)] blur-3xl opacity-60" />
    </div>
  );
}
