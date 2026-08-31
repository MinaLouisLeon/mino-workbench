import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionProps = {
  id: string;
  eyebrow: string;
  heading: ReactNode;
  lead?: string;
  children: ReactNode;
  className?: string;
};

/**
 * One band of the page: an anchor, a mono eyebrow, a heading and a lead.
 *
 * Every section on this page has that shape, so it is written once. The
 * heading is a node rather than a string because two of them colour half of
 * themselves, and a `headingAccent` prop would only be a worse way to say the
 * same thing.
 */
export function Section({
  id,
  eyebrow,
  heading,
  lead,
  children,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("border-t border-border/70 py-20 sm:py-28", className)}
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {heading}
        </h2>
        {lead ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted">
            {lead}
          </p>
        ) : null}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
